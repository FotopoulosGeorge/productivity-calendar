# Productivity Calendar

A clean, intuitive productivity calendar for tracking weekly tasks and progress. Available as a web app and cross-platform desktop application.

## 🌐 Try It Now

**Live Demo:** [https://fotopoulosgeorge.github.io/productivity-calendar](https://fotopoulosgeorge.github.io/productivity-calendar)

## ✨ Key Features

- **Weekly Task Management** - Plan and track tasks across the entire week
- **Multi-Step Tasks** - Break down complex tasks with completion tracking
- **Progress Visualization** - Weekly progress indicators with completion percentages
- **Task Reflections** - Add notes for learning and growth
- **Smart Scheduling** - Automatic daily check-ins and weekly planning prompts
- **Cross-Platform** - Works in browser or as desktop app (Windows, macOS, Linux)

### ☁️ Google Drive Sync (Optional)
- **Cross-Device Access** - Sync across phone, laptop, desktop, anywhere
- **Automatic Backup** - Real-time cloud storage in your personal Google Drive
- **Offline Support** - Works offline, syncs when connected
- **Smart Merging** - Intelligent conflict resolution for multi-device usage
- **Secure & Private** - Only this app can access its data files

## 🚀 Get Started

### Option 1: Use in Browser
Visit the [live demo](https://fotopoulosgeorge.github.io/productivity-calendar) - no installation required.

### Option 2: Desktop App
1. Download from [Releases](https://github.com/fotopoulosgeorge/productivity-calendar/releases)
2. Run the installer:
   - **Windows**: `.exe` installer
   - **macOS**: `.dmg` file
   - **Linux**: `.AppImage` file

### Option 3: Run from Source
```bash
git clone https://github.com/fotopoulosgeorge/productivity-calendar.git
cd productivity-calendar
npm install
npm start              # Web version
npm run electron:dev   # Desktop version
```

## 🛠️ Development

### Scripts
```bash
npm start                    # React development server
npm run electron:dev         # Electron + React development
npm run build               # Build for production
npm run electron:build      # Build desktop app
npm run deploy              # Deploy to GitHub Pages
```

### Tech Stack
- **Frontend**: React 18, Lucide React
- **Desktop**: Electron 27
- **Storage**: localStorage + Google Drive API
- **Auth**: OAuth 2.0 client-side flow
- **Build**: electron-builder, GitHub Actions

## 🔒 Privacy & Security

- **Local-First**: Works completely offline without accounts
- **Optional Sync**: Google Drive integration is entirely optional
- **Minimal Permissions**: Only accesses app-created files in your Drive
- **No Tracking**: Zero analytics, tracking, or data collection
- **Open Source**: Full transparency with source code available

## 📱 Storage Options

- **Web**: Browser localStorage + optional Google Drive
- **Desktop**: Local files + optional Google Drive
- **Backup**: Export/import JSON for data portability
- **Migration**: Automatic data migration between versions

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/fotopoulosgeorge/productivity-calendar/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fotopoulosgeorge/productivity-calendar/discussions)

---

**Made with ❤️**