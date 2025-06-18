// electron/main.js
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

function createWindow() {
  if (process.platform === 'win32') {
  app.setAppUserModelId('com.yourname.productivitycalendar');
  }
    // Determine the correct icon path
  const iconPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'icons', 'icon.ico')  // Production
    : path.join(__dirname, '../icons/icon.ico');            // Development
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,   
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true, // Keep security enabled
      allowRunningInsecureContent: false,
      // Allow Google domains for authentication
      additionalArguments: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    },
    icon: iconPath,
    title: 'Productivity Calendar',
  });

  const session = mainWindow.webContents.session;

  // Set permissions for Google APIs
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['notifications', 'geolocation', 'media', 'camera', 'microphone'];
    return callback(allowedPermissions.includes(permission));
  });

  // Configure CSP to allow Google domains
  session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; ` +
          `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://www.googleapis.com https://ssl.gstatic.com https://www.gstatic.com; ` +
          `connect-src 'self' https://apis.google.com https://accounts.google.com https://www.googleapis.com https://oauth2.googleapis.com https://content.googleapis.com; ` +
          `frame-src 'self' https://accounts.google.com https://content.googleapis.com; ` +
          `img-src 'self' data: https:; ` +
          `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
          `font-src 'self' https://fonts.gstatic.com;`
        ]
      }
    });
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.platform === 'win32') {
      mainWindow.setIcon(iconPath);
    }
  });


  // Check if we're in development or production
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    // In development, load from localhost
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built app
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up menu
  setupAppMenu();
}

// Create window when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for file operations
ipcMain.handle('export-data', async (event, data) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Calendar Data',
    defaultPath: `productivity-calendar-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });

  if (filePath) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  return { success: false, error: 'Export cancelled' };
});

ipcMain.handle('import-data', async (event) => {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Import Calendar Data',
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });

  if (filePaths && filePaths.length > 0) {
    try {
      const data = fs.readFileSync(filePaths[0], 'utf8');
      return { success: true, data: JSON.parse(data) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  return { success: false, error: 'Import cancelled' };
});



// Setup application menu
function setupAppMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Export Data',
          click: () => {
            mainWindow.webContents.send('menu-export-data');
          },
        },
        {
          label: 'Import Data',
          click: () => {
            mainWindow.webContents.send('menu-import-data');
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: 'About Productivity Calendar',
              message: 'Productivity Calendar',
              detail: 'A simple desktop calendar app for tracking tasks and progress.\n\nVersion: 1.0.0',
              buttons: ['OK'],
              icon: path.join(__dirname, '../public/favicon.ico'),
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}