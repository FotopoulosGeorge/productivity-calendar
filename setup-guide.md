# Productivity Calendar App - Setup Guide

## Prerequisites
- Node.js (v16 or newer)
- npm or yarn package manager

## Installation

1. Clone or download the project files to your local machine
2. Open a terminal and navigate to the project directory
3. Install dependencies:

```bash
npm install
```

## Development

To run the application in development mode:

```bash
# Run the React development server and Electron together
npm run electron:dev
```

This will start the React development server and launch the Electron app that connects to it.

## Building for Production

To create a production build:

```bash
# Build the React app and package it with Electron
npm run electron:build
```

This will create distributable packages in the `dist` folder, ready for installation on various platforms (Windows, macOS, Linux).

## Project Structure

The application is organized into multiple files for maintainability:

- **electron/** - Contains Electron-specific code
  - `main.js` - Main Electron process
  - `preload.js` - Preload script for secure IPC communication
  - `clean.ps1` - Ensures clean build for updates

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

## Features

- **Weekly Calendar View** - Shows all days of the week
- **Task Management** - Add, edit, and track tasks for each day
- **Step Tracking** - Break tasks into steps with complete/pending status
- **Reflection Notes** - Add reflections to any task
- **Progress Tracking** - See your overall weekly progress
- **Recurring Tasks** - Automatic tasks for planning (Sunday), reflection (Friday), and daily check-ins
- **Data Persistence** - All your data is saved locally
- **Import/Export** - Backup and restore your data

## Customization

You can customize the application by:

1. Modifying the CSS files in the `src/styles/` directory
2. Adding new components or features by extending existing files
3. Changing recurring tasks in the `createInitialData` function in `App.js`

## Troubleshooting

If you encounter issues:

- Check the console for errors (View > Toggle Developer Tools)
- Ensure all dependencies are installed correctly
- Try clearing local storage data if the app behaves unexpectedly
- For build issues, check the Electron and React documentation
