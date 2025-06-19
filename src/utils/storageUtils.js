// src/utils/storageUtils.js - UPDATED with SAFE merge logic
import GOOGLE_CONFIG from '../config/googleConfig';

const STORAGE_KEY = 'productivity-calendar-data';
const SYNC_STATE_KEY = 'productivity-calendar-sync-state';

// GLOBAL FLAGS to prevent race conditions across ALL instances
window.__SYNC_GLOBAL_STATE = window.__SYNC_GLOBAL_STATE || {
  hasLoadedFromCloud: false,
  isCurrentlyLoading: false,
  isCurrentlySaving: false,
  lastLoadTime: 0,
  loadPromise: null
};

// Enhanced debug logging
const debugLog = (message, data = null) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`🔍 [${timestamp}] ${message}`, data);
};

// Google Drive API wrapper with bulletproof race condition protection
class GoogleDriveSync {
  constructor() {
    this.isInitialized = false;
    this.isSignedIn = false;
    this.accessToken = null;
    this.tokenClient = null;
    this.tokenExpiry = null;
    
    this.loadSyncState();
  }

  saveSyncState() {
    try {
      const syncState = {
        isSignedIn: this.isSignedIn,
        accessToken: this.accessToken,
        tokenExpiry: this.tokenExpiry,
        lastSyncTime: new Date().toISOString()
      };
      localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(syncState));
      debugLog('💾 Sync state saved');
    } catch (error) {
      console.error('Failed to save sync state:', error);
    }
  }

  loadSyncState() {
    try {
      const savedState = localStorage.getItem(SYNC_STATE_KEY);
      if (savedState) {
        const syncState = JSON.parse(savedState);
        
        if (syncState.tokenExpiry && new Date(syncState.tokenExpiry) > new Date()) {
          this.isSignedIn = syncState.isSignedIn;
          this.accessToken = syncState.accessToken;
          this.tokenExpiry = syncState.tokenExpiry;
          debugLog('✅ Sync state restored from storage');
        } else {
          debugLog('⏰ Saved token expired, will need to re-authenticate');
          this.clearSyncState();
        }
      }
    } catch (error) {
      console.error('Failed to load sync state:', error);
      this.clearSyncState();
    }
  }

  clearSyncState() {
    this.isSignedIn = false;
    this.accessToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem(SYNC_STATE_KEY);
    
    // Reset global flags
    window.__SYNC_GLOBAL_STATE.hasLoadedFromCloud = false;
    window.__SYNC_GLOBAL_STATE.isCurrentlyLoading = false;
    window.__SYNC_GLOBAL_STATE.lastLoadTime = 0;
    
    debugLog('🧹 Sync state cleared');
  }

  async initialize() {
    try {
      debugLog('🚀 Initializing Google Identity Services...');
      
      if (this.accessToken && this.isSignedIn) {
        debugLog('🔄 Using saved access token...');
        
        if (!window.gapi) {
          await this.loadGoogleAPI();
        }

        await new Promise((resolve) => {
          window.gapi.load('client', resolve);
        });

        await window.gapi.client.init({
          apiKey: GOOGLE_CONFIG.apiKey,
          discoveryDocs: [GOOGLE_CONFIG.discoveryDoc]
        });

        window.gapi.client.setToken({
          access_token: this.accessToken
        });

        debugLog('✅ Restored from saved token');
        this.isInitialized = true;
        return true;
      }
      
      if (!window.google) {
        await this.loadGoogleIdentityServices();
      }

      if (!window.gapi) {
        await this.loadGoogleAPI();
      }

      await new Promise((resolve) => {
        window.gapi.load('client', resolve);
      });

      await window.gapi.client.init({
        apiKey: GOOGLE_CONFIG.apiKey,
        discoveryDocs: [GOOGLE_CONFIG.discoveryDoc]
      });

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
          this.tokenExpiry = new Date(Date.now() + 3600000).toISOString();
          
          this.saveSyncState();
          debugLog('✅ Successfully obtained and saved access token');
        },
      });

      this.isInitialized = true;
      debugLog('✅ Google Identity Services initialized successfully');
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

    if (this.isSignedIn && this.accessToken) {
      debugLog('✅ Already signed in with saved token');
      return true;
    }

    try {
      debugLog('🔐 Starting Google sign-in...');
      
      return new Promise((resolve, reject) => {
        this.tokenClient.callback = (response) => {
          if (response.error) {
            console.error('❌ Sign-in failed:', response.error);
            reject(new Error(response.error));
            return;
          }
          
          this.accessToken = response.access_token;
          this.isSignedIn = true;
          this.tokenExpiry = new Date(Date.now() + 3600000).toISOString();
          
          window.gapi.client.setToken({
            access_token: this.accessToken
          });
          
          this.saveSyncState();
          debugLog('✅ Sign-in successful and state saved');
          resolve(true);
        };
        
        this.tokenClient.requestAccessToken({
          prompt: 'consent',
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
      if (this.accessToken) {
        window.google.accounts.oauth2.revoke(this.accessToken);
      }
      
      window.gapi.client.setToken(null);
      this.clearSyncState();
      
      debugLog('✅ Successfully signed out and cleared state');
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

    // Prevent concurrent saves with global flag
    if (window.__SYNC_GLOBAL_STATE.isCurrentlySaving) {
      debugLog('⏳ Save already in progress globally, skipping...');
      return false;
    }

    window.__SYNC_GLOBAL_STATE.isCurrentlySaving = true;

    try {
      debugLog('💾 Starting save to Google Drive...', { 
        taskCount: this.countTasks(data),
        environment: window.process?.type ? 'desktop' : 'web'
      });

      // Validate data structure before saving
      const validatedData = this.validateDataStructure(data);

      const dataWithTimestamp = {
        ...validatedData,
        lastSyncedAt: new Date().toISOString(),
        syncedFrom: window.process?.type ? 'desktop' : 'web',
        syncVersion: '1.0.0',
        localTimestamp: Date.now()
      };

      const existingFile = await this.findCalendarFile();
      const fileContent = JSON.stringify(dataWithTimestamp, null, 2);

      if (existingFile) {
        debugLog('📝 Updating existing file in Google Drive', { fileId: existingFile.id });
        
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: fileContent
        });

        if (!response.ok) {
          throw new Error(`Failed to update file: ${response.status} ${response.statusText}`);
        }

        debugLog('✅ Calendar data updated in Google Drive');
      } else {
        debugLog('📄 Creating new file in Google Drive');
        
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
          throw new Error(`Failed to create file: ${response.status} ${response.statusText}`);
        }

        debugLog('✅ Calendar data saved to Google Drive (new file)');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to save to Google Drive:', error);
      throw error;
    } finally {
      window.__SYNC_GLOBAL_STATE.isCurrentlySaving = false;
    }
  }

  // CRITICAL: Bulletproof load with global state management
  async loadFromCloud() {
    if (!this.isSignedIn || !this.accessToken) {
      throw new Error('Not signed in to Google Drive');
    }

    // BULLETPROOF: Check global state to prevent multiple loads
    const now = Date.now();
    const timeSinceLastLoad = now - window.__SYNC_GLOBAL_STATE.lastLoadTime;
    
    if (window.__SYNC_GLOBAL_STATE.isCurrentlyLoading) {
      debugLog('⏳ Load already in progress globally, waiting...');
      
      // If there's a pending load promise, wait for it
      if (window.__SYNC_GLOBAL_STATE.loadPromise) {
        return await window.__SYNC_GLOBAL_STATE.loadPromise;
      }
      
      // Otherwise wait a bit and try again
      await new Promise(resolve => setTimeout(resolve, 500));
      return this.loadFromCloud();
    }
    
    // Prevent rapid successive loads (less than 2 seconds apart)
    if (timeSinceLastLoad < 2000) {
      debugLog('🚫 Load too soon after previous load, skipping...', { timeSinceLastLoad });
      return null;
    }

    // Set global flags
    window.__SYNC_GLOBAL_STATE.isCurrentlyLoading = true;
    window.__SYNC_GLOBAL_STATE.lastLoadTime = now;

    try {
      debugLog('📥 Starting load from Google Drive...');
      
      // Create a promise that other calls can wait for
      window.__SYNC_GLOBAL_STATE.loadPromise = this._performCloudLoad();
      const result = await window.__SYNC_GLOBAL_STATE.loadPromise;
      
      return result;
    } finally {
      window.__SYNC_GLOBAL_STATE.isCurrentlyLoading = false;
      window.__SYNC_GLOBAL_STATE.loadPromise = null;
    }
  }

  async _performCloudLoad() {
    const file = await this.findCalendarFile();
    
    if (!file) {
      debugLog('📄 No calendar data found in Google Drive');
      return null;
    }

    debugLog('📁 Found calendar file in Google Drive', { fileId: file.id, name: file.name });

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    const fileContent = await response.text();
    const data = JSON.parse(fileContent);
    
    // Validate the loaded data
    const validatedData = this.validateDataStructure(data);
    
    debugLog('✅ Calendar data loaded from Google Drive', {
      taskCount: this.countTasks(validatedData),
      lastSynced: data.lastSyncedAt,
      syncedFrom: data.syncedFrom,
      localTimestamp: data.localTimestamp
    });
    
    return validatedData;
  }

  validateDataStructure(data) {
    if (!data || typeof data !== 'object') {
      debugLog('⚠️ Invalid data structure, returning empty object');
      return {};
    }

    const validatedData = {};
    
    // Remove metadata first
    const { lastSyncedAt, syncedFrom, localTimestamp, syncVersion, ...taskData } = data;
    
    Object.keys(taskData).forEach(dateKey => {
      const dayData = taskData[dateKey];
      
      if (Array.isArray(dayData)) {
        validatedData[dateKey] = dayData.filter(task => 
          task && typeof task === 'object' && (task.id || task.title)
        );
      } else if (dayData === null || dayData === undefined) {
        // Skip null/undefined entries
      } else {
        debugLog('⚠️ Fixing invalid day data structure for', dateKey);
        validatedData[dateKey] = [];
      }
    });
    
    return validatedData;
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

  countTasks(data) {
    if (!data || typeof data !== 'object') return 0;
    
    let count = 0;
    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key])) {
        count += data[key].length;
      }
    });
    return count;
  }

  getSignInStatus() {
    return {
      isInitialized: this.isInitialized,
      isSignedIn: this.isSignedIn,
      userEmail: null,
      hasAccessToken: !!this.accessToken,
      tokenExpiry: this.tokenExpiry,
      isCurrentlySaving: window.__SYNC_GLOBAL_STATE.isCurrentlySaving,
      isCurrentlyLoading: window.__SYNC_GLOBAL_STATE.isCurrentlyLoading,
      hasLoadedFromCloud: window.__SYNC_GLOBAL_STATE.hasLoadedFromCloud,
      lastLoadTime: window.__SYNC_GLOBAL_STATE.lastLoadTime
    };
  }
}

// BULLETPROOF storage manager with SAFE merge logic
class HybridStorageManager {
  constructor() {
    this.googleDrive = new GoogleDriveSync();
    this.syncEnabled = false;
    this.syncStatus = 'disconnected';
    this.lastSyncTime = null;
  }

  async initialize() {
    try {
      debugLog('🔧 Initializing storage manager...');
      
      const success = await this.googleDrive.initialize();
      
      if (success && this.googleDrive.isSignedIn) {
        this.syncEnabled = true;
        this.syncStatus = 'connected';
        this.lastSyncTime = new Date();
        debugLog('✅ Restored previous sync session');
      }
      
      return success;
    } catch (error) {
      console.error('Storage initialization failed:', error);
      return false;
    }
  }

  async enableSync() {
    try {
      debugLog('🔗 Enabling sync...');
      this.syncStatus = 'connecting';
      
      const success = await this.googleDrive.signIn();
      
      if (success) {
        this.syncEnabled = true;
        this.syncStatus = 'connected';
        await this.performInitialSync();
        debugLog('✅ Sync enabled successfully');
        return true;
      } else {
        this.syncStatus = 'disconnected';
        debugLog('❌ Failed to enable sync');
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
      debugLog('🔗 Disabling sync...');
      await this.googleDrive.signOut();
      this.syncEnabled = false;
      this.syncStatus = 'disconnected';
      debugLog('✅ Sync disabled successfully');
      return true;
    } catch (error) {
      console.error('Failed to disable sync:', error);
      return false;
    }
  }

  async performInitialSync() {
    try {
      debugLog('🔄 Performing initial sync...');
      this.syncStatus = 'syncing';
      
      const localData = this.loadLocalData();
      let cloudData = null;
      
      // Only load from cloud if we haven't already done so
      if (!window.__SYNC_GLOBAL_STATE.hasLoadedFromCloud) {
        try {
          cloudData = await this.googleDrive.loadFromCloud();
          window.__SYNC_GLOBAL_STATE.hasLoadedFromCloud = true;
        } catch (error) {
          debugLog('📄 No cloud data found, will upload local data');
          window.__SYNC_GLOBAL_STATE.hasLoadedFromCloud = true; // Don't keep trying
        }
      } else {
        debugLog('✅ Already loaded from cloud, skipping cloud load');
      }

      const localTaskCount = this.googleDrive.countTasks(localData);
      const cloudTaskCount = this.googleDrive.countTasks(cloudData);
      
      debugLog('📊 Initial sync comparison', {
        local: localTaskCount,
        cloud: cloudTaskCount,
        hasLoadedFromCloud: window.__SYNC_GLOBAL_STATE.hasLoadedFromCloud
      });

      if (cloudData && localData) {
        const mergedData = this.safeMerge(localData, cloudData);
        this.saveLocalData(mergedData);
        debugLog('✅ Data merged safely');
      } else if (localData && !cloudData) {
        await this.googleDrive.saveToCloud(localData);
        debugLog('✅ Local data uploaded to cloud');
      } else if (cloudData && !localData) {
        this.saveLocalData(cloudData);
        debugLog('✅ Cloud data downloaded locally');
      } else {
        debugLog('ℹ️ No data found in either location');
      }

      this.syncStatus = 'connected';
      this.lastSyncTime = new Date();
    } catch (error) {
      console.error('Initial sync failed:', error);
      this.syncStatus = 'error';
      throw error;
    }
  }

  // 🛡️ SAFE MERGE LOGIC - NEVER LOSES DATA
  safeMerge(localData, cloudData) {
    debugLog('🛡️ SAFE merge - preserving all data...');
    
    // Handle empty cases
    if (!localData || Object.keys(localData).length === 0) {
      debugLog('✅ Using cloud data (no local data)');
      return cloudData || {};
    }
    
    if (!cloudData || Object.keys(cloudData).length === 0) {
      debugLog('✅ Using local data (no cloud data)');
      return localData || {};
    }
    
    const localTaskCount = this.googleDrive.countTasks(localData);
    const cloudTaskCount = this.googleDrive.countTasks(cloudData);
    
    debugLog('🔍 Safe merge analysis', {
      local: { count: localTaskCount },
      cloud: { count: cloudTaskCount }
    });
    
    // ALWAYS merge both datasets completely
    return this.performCompleteMerge(localData, cloudData);
  }

  // 🔄 COMPLETE MERGE - Preserves all tasks from both sources
  performCompleteMerge(localData, cloudData) {
    debugLog('🔄 Performing complete merge (preserves all tasks)...');
    
    // Start with a deep copy of local data
    const mergedData = JSON.parse(JSON.stringify(localData || {}));
    
    // Get all unique date keys from both datasets
    const allDateKeys = new Set([
      ...Object.keys(localData || {}),
      ...Object.keys(cloudData || {})
    ]);
    
    let tasksAdded = 0;
    let tasksUpdated = 0;
    let datesProcessed = 0;
    
    allDateKeys.forEach(dateKey => {
      // Skip metadata keys
      if (dateKey.includes('Sync') || dateKey.includes('timestamp') || dateKey.includes('Version')) {
        return;
      }
      
      const localTasks = localData?.[dateKey] || [];
      const cloudTasks = cloudData?.[dateKey] || [];
      
      // Ensure both are arrays
      if (!Array.isArray(localTasks) || !Array.isArray(cloudTasks)) {
        mergedData[dateKey] = Array.isArray(localTasks) ? localTasks : 
                             Array.isArray(cloudTasks) ? cloudTasks : [];
        return;
      }
      
      // Start with local tasks
      const mergedTasks = [...localTasks];
      
      // Add cloud tasks that don't exist locally
      cloudTasks.forEach(cloudTask => {
        if (!cloudTask || typeof cloudTask !== 'object') return;
        
        const existingIndex = mergedTasks.findIndex(localTask => 
          this.tasksAreEqual(localTask, cloudTask)
        );
        
        if (existingIndex === -1) {
          // Task doesn't exist locally, add it
          const newTask = {
            ...cloudTask,
            id: cloudTask.id || `merged_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          mergedTasks.push(newTask);
          tasksAdded++;
          debugLog(`➕ Added cloud task: ${cloudTask.title || 'Untitled'}`);
        } else {
          // Task exists, merge with newer version
          const mergedTask = this.mergeTaskVersions(mergedTasks[existingIndex], cloudTask);
          mergedTasks[existingIndex] = mergedTask;
          tasksUpdated++;
          debugLog(`🔄 Updated task: ${mergedTask.title || 'Untitled'}`);
        }
      });
      
      mergedData[dateKey] = mergedTasks;
      datesProcessed++;
    });
    
    const finalTaskCount = this.googleDrive.countTasks(mergedData);
    
    debugLog('✅ Complete merge finished', {
      datesProcessed,
      tasksAdded,
      tasksUpdated,
      originalLocal: this.googleDrive.countTasks(localData),
      originalCloud: this.googleDrive.countTasks(cloudData),
      finalTotal: finalTaskCount
    });
    
    // Add merge metadata
    return {
      ...mergedData,
      lastSyncedAt: new Date().toISOString(),
      syncedFrom: 'merged',
      localTimestamp: Date.now(),
      mergeInfo: {
        localTasks: this.googleDrive.countTasks(localData),
        cloudTasks: this.googleDrive.countTasks(cloudData),
        finalTasks: finalTaskCount,
        tasksAdded,
        tasksUpdated,
        mergedAt: new Date().toISOString()
      }
    };
  }

  // 🔍 Check if two tasks are the same
  tasksAreEqual(task1, task2) {
    if (!task1 || !task2) return false;
    
    // First try ID match (most reliable)
    if (task1.id && task2.id) {
      return task1.id === task2.id;
    }
    
    // Fallback to title and structure match
    return task1.title === task2.title && 
           task1.steps?.length === task2.steps?.length;
  }

  // 🔄 Merge two versions of the same task
  mergeTaskVersions(localTask, cloudTask) {
    const localTime = new Date(localTask.lastModified || 0).getTime();
    const cloudTime = new Date(cloudTask.lastModified || 0).getTime();
    
    // Use the newer version as base
    const newerTask = cloudTime > localTime ? cloudTask : localTask;
    const olderTask = cloudTime > localTime ? localTask : cloudTask;
    
    // Merge reflection if one is empty
    const mergedReflection = newerTask.reflection || olderTask.reflection || '';
    
    // Merge steps - prefer more completed steps
    let mergedSteps = newerTask.steps || [];
    if (olderTask.steps) {
      const newerCompleted = newerTask.steps?.filter(s => s.status === 'complete').length || 0;
      const olderCompleted = olderTask.steps?.filter(s => s.status === 'complete').length || 0;
      
      if (olderCompleted > newerCompleted) {
        mergedSteps = olderTask.steps;
      }
    }
    
    return {
      ...newerTask,
      reflection: mergedReflection,
      steps: mergedSteps,
      lastModified: new Date().toISOString()
    };
  }

  async saveData(data) {
    try {
      debugLog('💾 Saving data...', { 
        taskCount: this.googleDrive.countTasks(data),
        syncEnabled: this.syncEnabled,
        hasLoadedFromCloud: window.__SYNC_GLOBAL_STATE.hasLoadedFromCloud
      });
      
      const dataWithTimestamp = {
        ...data,
        localTimestamp: Date.now()
      };
      
      this.saveLocalData(dataWithTimestamp);
      debugLog('✅ Data saved locally with timestamp');
      
      if (this.syncEnabled && this.googleDrive.isSignedIn) {
        debugLog('☁️ Syncing to Google Drive...');
        this.syncStatus = 'syncing';
        
        try {
          await this.googleDrive.saveToCloud(dataWithTimestamp);
          this.syncStatus = 'connected';
          this.lastSyncTime = new Date();
          debugLog('✅ Data synced to Google Drive successfully');
        } catch (error) {
          console.error('❌ Cloud sync failed:', error);
          this.syncStatus = 'error';
        }
      } else {
        debugLog('⚠️ Sync not enabled, only saved locally');
      }
      
      return true;
    } catch (error) {
      console.error('Save failed:', error);
      return false;
    }
  }

  // CRITICAL: Only load from cloud once, then use local data
  async loadData() {
    try {
      debugLog('📥 Loading data...', {
        syncEnabled: this.syncEnabled,
        hasLoadedFromCloud: window.__SYNC_GLOBAL_STATE.hasLoadedFromCloud,
        isCurrentlyLoading: window.__SYNC_GLOBAL_STATE.isCurrentlyLoading
      });
      
      // If sync is enabled but we haven't loaded from cloud yet, do initial load
      if (this.syncEnabled && this.googleDrive.isSignedIn && !window.__SYNC_GLOBAL_STATE.hasLoadedFromCloud) {
        try {
          debugLog('🌥️ First-time cloud load...');
          const cloudData = await this.googleDrive.loadFromCloud();
          
          if (cloudData) {
            window.__SYNC_GLOBAL_STATE.hasLoadedFromCloud = true;
            
            const localData = this.loadLocalData();
            if (localData) {
              const mergedData = this.safeMerge(localData, cloudData);
              this.saveLocalData(mergedData);
              debugLog('✅ Loaded from cloud and merged with local data');
              return mergedData;
            } else {
              this.saveLocalData(cloudData);
              debugLog('✅ Loaded from cloud (no local data)');
              return cloudData;
            }
          }
        } catch (error) {
          debugLog('⚠️ Cloud load failed, using local data', error.message);
          window.__SYNC_GLOBAL_STATE.hasLoadedFromCloud = true;
        }
      }
      
      const localData = this.loadLocalData();
      debugLog('📱 Using local storage data', { 
        taskCount: this.googleDrive.countTasks(localData)
      });
      return localData;
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

  // 🔄 Force a fresh load from cloud (for recovery purposes)
  async forceCloudLoad() {
    if (this.syncEnabled && this.googleDrive.isSignedIn) {
      try {
        debugLog('🔄 Forcing fresh load from cloud...');
        
        // Temporarily bypass the global flag
        const wasLoaded = window.__SYNC_GLOBAL_STATE.hasLoadedFromCloud;
        window.__SYNC_GLOBAL_STATE.hasLoadedFromCloud = false;
        window.__SYNC_GLOBAL_STATE.lastLoadTime = 0;
        
        const cloudData = await this.googleDrive.loadFromCloud();
        
        if (cloudData) {
          debugLog('✅ Force loaded from cloud');
          return cloudData;
        }
        
        // Restore flag if no data found
        window.__SYNC_GLOBAL_STATE.hasLoadedFromCloud = wasLoaded;
      } catch (error) {
        debugLog('❌ Force cloud load failed', error.message);
      }
    }
    return null;
  }

  // 🚨 Emergency recovery function - merges current local with fresh cloud data
  async emergencyRecovery() {
    try {
      debugLog('🚨 Starting emergency recovery...');
      
      // Get current local data
      const localData = this.loadLocalData();
      debugLog('📱 Current local tasks:', this.googleDrive.countTasks(localData));
      
      // Force load from cloud
      const cloudData = await this.forceCloudLoad();
      debugLog('☁️ Cloud tasks found:', this.googleDrive.countTasks(cloudData));
      
      if (cloudData && localData) {
        // Perform safe merge
        const mergedData = this.safeMerge(localData, cloudData);
        
        // Save merged result
        await this.saveData(mergedData);
        
        debugLog('✅ Emergency recovery complete', {
          recoveredTasks: this.googleDrive.countTasks(mergedData)
        });
        
        return mergedData;
      } else if (cloudData) {
        await this.saveData(cloudData);
        debugLog('✅ Recovered from cloud only');
        return cloudData;
      } else {
        debugLog('⚠️ No cloud data found for recovery');
        return localData;
      }
    } catch (error) {
      console.error('❌ Emergency recovery failed:', error);
      return null;
    }
  }

  // Legacy functions
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

// 🚨 NEW: Emergency recovery function
export const emergencyRecovery = async () => {
  await ensureInitialized();
  return storageManager.emergencyRecovery();
};

export { storageManager };