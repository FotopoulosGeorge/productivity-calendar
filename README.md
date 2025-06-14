# Productivity Calendar

A clean, intuitive productivity calendar application for tracking tasks and weekly progress. Available both as a web application and cross-platform desktop app.

## 🌐 Live Demo

**Try it now:** [https://fotopoulosgeorge.github.io/productivity-calendar](https://fotopoulosgeorge.github.io/productivity-calendar)

## ✨ Features

- **Weekly View**: Plan and track tasks across the entire week
- **Task Management**: Create tasks with multiple steps and track completion
- **Progress Tracking**: Visual weekly progress indicators with completion percentages
- **Reflection Notes**: Add reflections to tasks for better learning and growth
- **Recurring Tasks**: Automatic daily check-ins, weekly planning, and Friday reflections
- **Task Moving**: Easily move tasks between days and weeks
- **Data Persistence**: All data persists locally (browser localStorage or app storage)
- **Import/Export**: Backup and restore your data as JSON files
- **Cross-Platform**: Desktop apps for Windows, macOS, and Linux

## 🚀 Usage Options

### Option 1: Use in Browser (Recommended for trying it out)
Simply visit the [live demo](https://fotopoulosgeorge.github.io/productivity-calendar) - no installation required.

### Option 2: Install Desktop App (Best for daily use)

1. **Download the latest release** from the [Releases page](https://github.com/fotopoulosgeorge/productivity-calendar/releases)
2. **Run the installer** for your operating system:
   - **Windows**: Download and run the `.exe` installer
   - **macOS**: Download and open the `.dmg` file  
   - **Linux**: Download and run the `.AppImage` file

### Option 3: Run Locally from Source

```bash
# Clone the repository
git clone https://github.com/fotopoulosgeorge/productivity-calendar.git
cd productivity-calendar

# Install dependencies
npm install

# For web development
npm start

# For desktop development  
npm run electron:dev

# Build desktop app
npm run electron:build
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm start                    # Start React development server
npm run electron:dev         # Start React + Electron in development mode

# Building
npm run build               # Build React app for production
npm run electron:build      # Build desktop app for current platform
npm run electron:build-all  # Build for all platforms (Windows, macOS, Linux)

# Deployment
npm run deploy              # Deploy web version to GitHub Pages
```

### Project Structure

```
productivity-calendar/
├── .github/workflows/       # GitHub Actions for automated builds
│   └── build.yml           # Build and release workflow
├── buildResources/         # Electron builder resources
│   └── entitlements.amc.plist
├── electron/               # Electron main process files
│   ├── main.js            # Main Electron process
│   └── preload.js         # Preload script for secure IPC
├── icons/                  # Application icons (all platforms)
├── public/                 # Static files for React app
│   └── index.html         # HTML template
├── scripts/               # Build scripts
│   └── copy-electron.js   # Copy Electron files to build
├── src/                   # React application source
│   ├── components/        # React components
│   │   ├── DayCard.js     # Individual day display
│   │   ├── StepItem.js    # Task step component
│   │   ├── TaskItem.js    # Task management component
│   │   └── WeeklyBanner.js # Progress banner
│   ├── styles/            # CSS styling
│   │   ├── components/    # Component-specific styles
│   │   ├── App.css        # Main app styles
│   │   └── index.css      # Global styles
│   ├── utils/             # Utility functions
│   │   ├── dateUtils.js   # Date manipulation helpers
│   │   ├── storageUtils.js # LocalStorage operations
│   │   └── taskUtils.js   # Task creation and management
│   ├── App.js             # Main React component
│   └── index.js           # React entry point
├── .gitignore             # Git ignore rules
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## 🔧 Technical Stack

- **Frontend**: React 18, Lucide React (icons)
- **Desktop**: Electron 27
- **Build**: electron-builder, GitHub Actions
- **Styling**: CSS with component-based architecture
- **Storage**: localStorage (web), local files (desktop)

## 📊 Data Management

- **Web Version**: Uses browser localStorage
- **Desktop Version**: Uses Electron's local storage
- **Backup**: Export/Import functionality for data portability
- **Migration**: Automatic data migration for version updates

## 🚀 Deployment

### Web Deployment
The web version auto-deploys to GitHub Pages when you run:
```bash
npm run deploy
```

### Desktop App Releases
Desktop releases are automated via GitHub Actions:
1. Tag a release: `git tag v1.0.0 && git push origin v1.0.0`
2. GitHub Actions automatically builds for all platforms
3. Installers are attached to the GitHub release

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs or request features in [GitHub Issues](https://github.com/fotopoulosgeorge/productivity-calendar/issues)
- **Discussions**: Join conversations in [GitHub Discussions](https://github.com/fotopoulosgeorge/productivity-calendar/discussions)

---

**Made with ❤️**