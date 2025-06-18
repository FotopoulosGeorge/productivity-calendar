// src/utils/storageUtils.js - Updated with Google Identity Services (GIS)
import GOOGLE_CONFIG from '../config/googleConfig';

const STORAGE_KEY = 'productivity-calendar-data';

// Google Drive API wrapper using new Google Identity Services
class GoogleDriveSync {
  constructor() {
    this.isInitialized = false;
    this.isSignedIn = false;
    this.accessToken = null;
    this.tokenClient = null;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Google Identity Services...');
      
      // Load Google Identity Services (GIS) - the new way
      if (!window.google) {
        await this.loadGoogleIdentityServices();
      }

      // Load Google API client for Drive API calls
      if (!window.gapi) {
        await this.loadGoogleAPI();
      }

      // Initialize GAPI client (for API calls, not auth)
      await new Promise((resolve) => {
        window.gapi.load('client', resolve);
      });

      await window.gapi.client.init({
        apiKey: GOOGLE_CONFIG.apiKey,
        discoveryDocs: [GOOGLE_CONFIG.discoveryDoc]
      });

      // Initialize Google Identity Services token client
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.clientId,
        scope: GOOGLE_CONFIG.scopes,
        callback: (response) => {
          if (response.error) {
            console.error('Token response error:', response.error);
            return;
          }
          
          this.accessToken = response.access_token;
          this.isSignedIn = true;
          console.log('✅ Successfully obtained access token');
        },
      });

      this.isInitialized = true;
      console.log('✅ Google Identity Services initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Identity Services:', error);
      return false;
    }
  }

  loadGoogleIdentityServices() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.head.appendChild(script);
    });
  }

  async signIn() {
    if (!this.isInitialized) {
      throw new Error('Google Identity Services not initialized');
    }

    try {
      console.log('🔐 Starting Google sign-in...');
      
      // Request access token using new GIS method
      return new Promise((resolve, reject) => {
        this.tokenClient.callback = (response) => {
          if (response.error) {
            console.error('❌ Sign-in failed:', response.error);
            reject(new Error(response.error));
            return;
          }
          
          this.accessToken = response.access_token;
          this.isSignedIn = true;
          
          // Set the access token for GAPI client
          window.gapi.client.setToken({
            access_token: this.accessToken
          });
          
          console.log('✅ Sign-in successful');
          resolve(true);
        };
        
        // Trigger the sign-in flow
        this.tokenClient.requestAccessToken({
          prompt: 'consent', // Force consent screen for testing
        });
      });
    } catch (error) {
      console.error('❌ Sign-in error:', error);
      return false;
    }
  }

  async signOut() {
    if (!this.isSignedIn) return false;

    try {
      // Revoke the access token
      if (this.accessToken) {
        window.google.accounts.oauth2.revoke(this.accessToken);
      }
      
      // Clear GAPI client token
      window.gapi.client.setToken(null);
      
      this.accessToken = null;
      this.isSignedIn = false;
      
      console.log('✅ Successfully signed out');
      return true;
    } catch (error) {
      console.error('❌ Sign-out failed:', error);
      return false;
    }
  }

  async saveToCloud(data) {
    if (!this.isSignedIn || !this.accessToken) {
      throw new Error('Not signed in to Google Drive');
    }

    try {
      // Add timestamp to data
      const dataWithTimestamp = {
        ...data,
        lastSyncedAt: new Date().toISOString(),
        syncedFrom: window.process?.type ? 'desktop' : 'web'
      };

      const existingFile = await this.findCalendarFile();
      const fileContent = JSON.stringify(dataWithTimestamp, null, 2);

      if (existingFile) {
        // Update existing file using fetch (more reliable than gapi.client.request)
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: fileContent
        });

        if (!response.ok) {
          throw new Error(`Failed to update file: ${response.statusText}`);
        }

        console.log('✅ Calendar data updated in Google Drive');
      } else {
        // Create new file using multipart upload
        const metadata = {
          name: GOOGLE_CONFIG.fileName,
          description: 'Productivity Calendar backup data'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
        form.append('file', new Blob([fileContent], {type: 'application/json'}));

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
          body: form
        });

        if (!response.ok) {
          throw new Error(`Failed to create file: ${response.statusText}`);
        }

        console.log('✅ Calendar data saved to Google Drive');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to save to Google Drive:', error);
      throw error;
    }
  }

  async loadFromCloud() {
    if (!this.isSignedIn || !this.accessToken) {
      throw new Error('Not signed in to Google Drive');
    }

    try {
      const file = await this.findCalendarFile();
      
      if (!file) {
        console.log('📄 No calendar data found in Google Drive');
        return null;
      }

      // Download file content using fetch
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const fileContent = await response.text();
      const data = JSON.parse(fileContent);
      
      console.log('✅ Calendar data loaded from Google Drive');
      return data;
    } catch (error) {
      console.error('❌ Failed to load from Google Drive:', error);
      throw error;
    }
  }

  async findCalendarFile() {
    try {
      const response = await window.gapi.client.drive.files.list({
        q: `name='${GOOGLE_CONFIG.fileName}' and trashed=false`,
        spaces: 'drive'
      });

      const files = response.result.files;
      return files && files.length > 0 ? files[0] : null;
    } catch (error) {
      console.error('❌ Failed to search for calendar file:', error);
      throw error;
    }
  }

  getSignInStatus() {
    return {
      isInitialized: this.isInitialized,
      isSignedIn: this.isSignedIn,
      userEmail: null, // GIS doesn't provide profile info by default
      hasAccessToken: !!this.accessToken
    };
  }
}

// Enhanced storage manager (same as before, but uses new GoogleDriveSync)
class HybridStorageManager {
  constructor() {
    this.googleDrive = new GoogleDriveSync();
    this.syncEnabled = false;
    this.syncStatus = 'disconnected';
    this.lastSyncTime = null;
  }

  async initialize() {
    try {
      const success = await this.googleDrive.initialize();
      if (success && this.googleDrive.isSignedIn) {
        this.syncEnabled = true;
        this.syncStatus = 'connected';
        this.lastSyncTime = new Date();
      }
      return success;
    } catch (error) {
      console.error('Storage initialization failed:', error);
      return false;
    }
  }

  async enableSync() {
    try {
      this.syncStatus = 'connecting';
      const success = await this.googleDrive.signIn();
      
      if (success) {
        this.syncEnabled = true;
        this.syncStatus = 'connected';
        await this.performInitialSync();
        return true;
      } else {
        this.syncStatus = 'disconnected';
        return false;
      }
    } catch (error) {
      console.error('Failed to enable sync:', error);
      this.syncStatus = 'error';
      return false;
    }
  }

  async disableSync() {
    try {
      await this.googleDrive.signOut();
      this.syncEnabled = false;
      this.syncStatus = 'disconnected';
      return true;
    } catch (error) {
      console.error('Failed to disable sync:', error);
      return false;
    }
  }

  async performInitialSync() {
    try {
      this.syncStatus = 'syncing';
      
      const localData = this.loadLocalData();
      let cloudData = null;
      
      try {
        cloudData = await this.googleDrive.loadFromCloud();
      } catch (error) {
        console.log('No cloud data found, using local data');
      }

      if (cloudData && localData) {
        const mergedData = this.mergeData(localData, cloudData);
        await this.saveData(mergedData);
      } else if (localData && !cloudData) {
        await this.googleDrive.saveToCloud(localData);
      } else if (cloudData && !localData) {
        this.saveLocalData(cloudData);
      }

      this.syncStatus = 'connected';
      this.lastSyncTime = new Date();
    } catch (error) {
      console.error('Initial sync failed:', error);
      this.syncStatus = 'error';
      throw error;
    }
  }

  mergeData(localData, cloudData) {
    const localTimestamp = localData.lastSyncedAt ? new Date(localData.lastSyncedAt) : new Date(0);
    const cloudTimestamp = cloudData.lastSyncedAt ? new Date(cloudData.lastSyncedAt) : new Date(0);
    
    if (cloudTimestamp > localTimestamp) {
      console.log('Using cloud data (more recent)');
      return cloudData;
    } else {
      console.log('Using local data (more recent)');
      return localData;
    }
  }

  async saveData(data) {
    try {
      this.saveLocalData(data);
      
      if (this.syncEnabled && this.googleDrive.isSignedIn) {
        this.syncStatus = 'syncing';
        await this.googleDrive.saveToCloud(data);
        this.syncStatus = 'connected';
        this.lastSyncTime = new Date();
      }
      
      return true;
    } catch (error) {
      console.error('Save failed:', error);
      this.syncStatus = 'error';
      return false;
    }
  }

  async loadData() {
    try {
      if (this.syncEnabled && this.googleDrive.isSignedIn) {
        try {
          const cloudData = await this.googleDrive.loadFromCloud();
          if (cloudData) {
            this.saveLocalData(cloudData);
            return cloudData;
          }
        } catch (error) {
          console.warn('Cloud load failed, falling back to local data:', error);
        }
      }
      
      return this.loadLocalData();
    } catch (error) {
      console.error('Load failed:', error);
      return null;
    }
  }

  saveLocalData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Local save failed:', error);
      return false;
    }
  }

  loadLocalData() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Local load failed:', error);
      return null;
    }
  }

  getSyncStatus() {
    return {
      syncEnabled: this.syncEnabled,
      status: this.syncStatus,
      lastSyncTime: this.lastSyncTime,
      googleSignInStatus: this.googleDrive.getSignInStatus()
    };
  }

  // Legacy functions for backward compatibility
  async exportData() {
    try {
      const data = await this.loadData();
      if (!data) {
        throw new Error('No data to export');
      }
      
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      
      const exportFileName = `productivity-calendar-backup-${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
      
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      return false;
    }
  }

  importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target.result);
          await this.saveData(data);
          resolve(true);
        } catch (error) {
          console.error('Import failed:', error);
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

// Create and export the global storage manager
const storageManager = new HybridStorageManager();

// Initialize on load
let initPromise = null;
const ensureInitialized = () => {
  if (!initPromise) {
    initPromise = storageManager.initialize();
  }
  return initPromise;
};

// Export legacy functions for backward compatibility
export const loadData = async () => {
  await ensureInitialized();
  return storageManager.loadData();
};

export const saveData = async (data) => {
  await ensureInitialized();
  return storageManager.saveData(data);
};

export const exportData = async () => {
  await ensureInitialized();
  return storageManager.exportData();
};

export const importData = async (file) => {
  await ensureInitialized();
  return storageManager.importData(file);
};

// Export new sync functions
export const enableGoogleSync = async () => {
  await ensureInitialized();
  return storageManager.enableSync();
};

export const disableGoogleSync = async () => {
  await ensureInitialized();
  return storageManager.disableSync();
};

export const getSyncStatus = async () => {
  await ensureInitialized();
  return storageManager.getSyncStatus();
};

export { storageManager };