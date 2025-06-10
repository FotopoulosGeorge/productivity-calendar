# Productivity Calendar

A clean, intuitive productivity calendar application for tracking tasks and weekly progress. Available both as a web application and desktop app.

## 🌐 Live Demo

**Try it now:** [https://fotopoulosgeorge.github.io/productivity-calendar](https://fotopoulosgeorge.github.io/productivity-calendar)

## ✨ Features

- **Weekly View**: Plan and track tasks across the entire week
- **Task Management**: Create tasks with multiple steps and track completion
- **Progress Tracking**: Visual weekly progress indicators
- **Reflection Notes**: Add reflections to tasks for better learning
- **Recurring Tasks**: Automatic daily check-ins, weekly planning, and Friday reflections
- **Task Moving**: Easily move tasks between days
- **Local Storage**: All data persists in your browser/app

## 🚀 Usage Options

### Option 1: Use in Browser (Recommended for trying it out)
Simply visit the [live demo](https://fotopoulosgeorge.github.io/productivity-calendar) - no installation required.

### Option 2: Install Desktop App (Best for daily use)

1. **Download the latest release** from the [Releases page](https://github.com/yourusername/productivity-calendar/releases)
2. **Run the installer** for your operating system:
   - Windows: Download and run the `.exe` installer
   - macOS: Download and open the `.dmg` file
   - Linux: Download and run the `.AppImage` file

### Option 3: Run Locally from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/productivity-calendar.git
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

## 🛠️ For Developers

### Building Web Version
```bash
npm run build
npm run deploy  # Deploys to GitHub Pages
```

### Building Desktop Version
```bash
npm run electron:build
```

### Project Structure
```
- **src/** - React application source
  - `App.js` - Main application component
  - `index.js`
  - **components/** - UI components
    - `WeeklyBanner.js` - Top banner showing weekly progress
    - `DayCard.js` - Card component for each day
    - `TaskItem.js` - Component for individual tasks
    - `StepItem.js` - Component for task steps
  - **utils/** - Utility functions
    - `dateUtils.js` - Date manipulation functions
    - `storageUtils.js` - Local storage functions
    - `taskUtils.js` - Creates Unique ID for tasks
  - **styles/** - CSS files
  - **icons/** - Icon files
```

## 📱 Data Storage

- **Web Version**: Uses browser localStorage
- **Desktop Version**: Uses local storage within the app
- **Export/Import**: Features planned for future releases

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs or request features in [GitHub Issues](https://github.com/yourusername/productivity-calendar/issues)
- **Discussions**: Join conversations in [GitHub Discussions](https://github.com/yourusername/productivity-calendar/discussions)

---

**Made with ❤️**
