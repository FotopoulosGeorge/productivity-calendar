// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // File system operations
    exportData: async (data) => {
      return await ipcRenderer.invoke('export-data', data);
    },
    importData: async () => {
      return await ipcRenderer.invoke('import-data');
    },
    
    // Menu event listeners
    onMenuExportData: (callback) => {
      ipcRenderer.on('menu-export-data', callback);
    },
    onMenuImportData: (callback) => {
      ipcRenderer.on('menu-import-data', callback);
    },
    
    // Remove event listeners
    removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    }
  }
);