// scripts/copy-electron.js
const fs = require('fs');
const path = require('path');

const srcDir = 'electron';
const destDir = 'build/electron';

function copyDirectory(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read all files in source directory
  const files = fs.readdirSync(src);
  
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      // Recursively copy subdirectories
      copyDirectory(srcPath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  });
}

// Check if electron directory exists
if (fs.existsSync(srcDir)) {
  console.log('Copying electron files to build directory...');
  copyDirectory(srcDir, destDir);
  console.log('Electron files copied successfully!');
} else {
  console.log('Electron directory not found, skipping copy.');
}