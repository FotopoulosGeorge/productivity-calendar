// src/config/googleConfig.js
// Google Drive API Configuration

const GOOGLE_CONFIG = {
  // Your OAuth 2.0 Client ID from Google Cloud Console
  clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
  
  // API Key from Google Cloud Console
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
  
  // Google Drive API discovery document
  discoveryDoc: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  
  // Scopes - we only need file access for app-created files
  scopes: 'https://www.googleapis.com/auth/drive.file',
  
  // File name for storing calendar data
  fileName: 'productivity-calendar-data.json'
};

export default GOOGLE_CONFIG;
