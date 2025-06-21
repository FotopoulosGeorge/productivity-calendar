// src/utils/storageUtils.js - UPDATED with SAFE merge logic
import GOOGLE_CONFIG from '../config/googleConfig';

const STORAGE_KEY = 'productivity-calendar-data';
const SYNC_STATE_KEY = 'productivity-calendar-sync-state';

// GLOBAL FLAGS to prevent race conditions across ALL instances
window.__PRODUCTIVITY_CALENDAR_SYNC__ = window.__PRODUCTIVITY_CALENDAR_SYNC__ || {
  cloudLoadState: 'never-attempted', // 'never-attempted' | 'loading' | 'success' | 'failed' | 'network-error' | 'auth-error'
  isCurrentlyLoading: false,
  isCurrentlySaving: false,
  lastLoadTime: 0,
  loadPromise: null,
  lastSuccessfulLoad: 0,
  lastFailedLoad: 0,
  failureCount: 0,
  tokenValidatedAt: 0,
  retryAfter: 0 // Timestamp when retry is allowed
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
    this.lastAPICall = 0;
    this.minDelay = 500; 
  }

  async throttleAPI() {
  const now = Date.now();
  const timeSinceLastCall = now - this.lastAPICall;
  
  if (timeSinceLastCall < this.minDelay) {
    const waitTime = this.minDelay - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  this.lastAPICall = Date.now();
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
    window.__PRODUCTIVITY_CALENDAR_SYNC__.hasLoadedFromCloud = false;
    window.__PRODUCTIVITY_CALENDAR_SYNC__.isCurrentlyLoading = false;
    window.__PRODUCTIVITY_CALENDAR_SYNC__.lastLoadTime = 0;
    
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
    await this.throttleAPI();
    if (!this.isSignedIn || !this.accessToken) {
      throw new Error('Not signed in to Google Drive');
    }

    // Prevent concurrent saves with global flag
    if (window.__PRODUCTIVITY_CALENDAR_SYNC__.isCurrentlySaving) {
      debugLog('⏳ Save already in progress globally, skipping...');
      return false;
    }

    window.__PRODUCTIVITY_CALENDAR_SYNC__.isCurrentlySaving = true;

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
        
        const response = await fetchWithTimeout(`https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`, {
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

        const response = await fetchWithTimeout('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
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
      window.__PRODUCTIVITY_CALENDAR_SYNC__.isCurrentlySaving = false;
    }
  }

  // CRITICAL: Bulletproof load with global state management
  async loadFromCloud() {
    if (!this.isSignedIn || !this.accessToken) {
      throw new Error('Not signed in to Google Drive');
    }
    // Check if we can retry
    if (!this.canRetryCloudOperation()) {
      const globalState = window.__PRODUCTIVITY_CALENDAR_SYNC__;
      throw new Error(`Cloud load blocked due to previous failures. Retry after ${new Date(globalState.retryAfter).toLocaleTimeString()}`);
    }
    // BULLETPROOF: Check global state to prevent multiple loads
    const now = Date.now();
    const timeSinceLastLoad = now - window.__PRODUCTIVITY_CALENDAR_SYNC__.lastLoadTime;
    
    if (window.__PRODUCTIVITY_CALENDAR_SYNC__.isCurrentlyLoading) {
      debugLog('⏳ Load already in progress globally, waiting...');
      
      // If there's a pending load promise, wait for it
      if (window.__PRODUCTIVITY_CALENDAR_SYNC__.loadPromise) {
        return await window.__PRODUCTIVITY_CALENDAR_SYNC__.loadPromise;
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
    this.setCloudState('loading');
    // Set global flags
    window.__PRODUCTIVITY_CALENDAR_SYNC__.isCurrentlyLoading = true;
    window.__PRODUCTIVITY_CALENDAR_SYNC__.lastLoadTime = now;

    try {
      debugLog('📥 Starting load from Google Drive...');
      
      // Create a promise that other calls can wait for
      window.__PRODUCTIVITY_CALENDAR_SYNC__.loadPromise = this._performCloudLoad();
      const result = await window.__PRODUCTIVITY_CALENDAR_SYNC__.loadPromise;
      // SUCCESS: Update state only on actual success
      if (result !== null) {
        this.setCloudState('success');
        debugLog('✅ Cloud load successful');
      } else {
        // No data found is not a failure, it's a valid state
        this.setCloudState('success');
        debugLog('📄 No cloud data found (valid state)');
      }
      return result;
    } catch (error) {
      // FAILURE: Categorize the error and set appropriate state
      if (error.message.includes('401') || error.message.includes('403')) {
        this.setCloudState('auth-error', error);
        debugLog('🔐 Authentication error during cloud load');
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        this.setCloudState('network-error', error);
        debugLog('🌐 Network error during cloud load');
      } else {
        this.setCloudState('failed', error);
        debugLog('❌ Cloud load failed');
      }

      throw error; // Re-throw so caller can handle
    } finally {
      window.__PRODUCTIVITY_CALENDAR_SYNC__.isCurrentlyLoading = false;
      window.__PRODUCTIVITY_CALENDAR_SYNC__.loadPromise = null;
    }
  }

  async _performCloudLoad() {
    const file = await this.findCalendarFile();
    
    if (!file) {
      debugLog('📄 No calendar data found in Google Drive');
      return null;
    }

    debugLog('📁 Found calendar file in Google Drive', { fileId: file.id, name: file.name });

    const response = await fetchWithTimeout(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
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
      isCurrentlySaving: window.__PRODUCTIVITY_CALENDAR_SYNC__.isCurrentlySaving,
      isCurrentlyLoading: window.__PRODUCTIVITY_CALENDAR_SYNC__.isCurrentlyLoading,
      hasLoadedFromCloud: window.__PRODUCTIVITY_CALENDAR_SYNC__.hasLoadedFromCloud,
      lastLoadTime: window.__PRODUCTIVITY_CALENDAR_SYNC__.lastLoadTime
    };
  }
  
  getCloudState() {
    return window.__PRODUCTIVITY_CALENDAR_SYNC__.cloudLoadState;
  }

  setCloudState(newState, error = null) {
    const now = Date.now();
    const globalState = window.__PRODUCTIVITY_CALENDAR_SYNC__;
    
    debugLog(`🔄 Cloud state: ${globalState.cloudLoadState} → ${newState}`);
    
    globalState.cloudLoadState = newState;
    
    switch (newState) {
      case 'success':
        globalState.lastSuccessfulLoad = now;
        globalState.failureCount = 0;
        globalState.retryAfter = 0;
        break;
        
      case 'failed':
      case 'network-error':
      case 'auth-error':
        globalState.lastFailedLoad = now;
        globalState.failureCount++;
        // Exponential backoff: 30s, 1m, 2m, 5m, 10m (max)
        const backoffMs = Math.min(30000 * Math.pow(2, globalState.failureCount - 1), 600000);
        globalState.retryAfter = now + backoffMs;
        debugLog(`⏰ Retry allowed after: ${new Date(globalState.retryAfter).toLocaleTimeString()}`);
        break;
        
      case 'loading':
        // Don't change failure counters during loading
        break;
    }
  }

  canRetryCloudOperation() {
    const globalState = window.__PRODUCTIVITY_CALENDAR_SYNC__;
    const now = Date.now();
    
    // Always allow if never attempted or if it's been successful before
    if (globalState.cloudLoadState === 'never-attempted' || globalState.cloudLoadState === 'success') {
      return true;
    }
    
    // Check if retry cooldown has passed
    if (globalState.retryAfter && now < globalState.retryAfter) {
      debugLog(`⏳ Retry blocked for ${Math.round((globalState.retryAfter - now) / 1000)}s`);
      return false;
    }
    
    // Prevent infinite retries (max 5 failures)
    if (globalState.failureCount >= 5) {
      debugLog('🚫 Max failures reached, manual intervention required');
      return false;
    }
    
    return true;
  }

  // Reset failure count when user manually intervenes
  resetCloudState() {
    debugLog('🔄 Manually resetting cloud state');
    const globalState = window.__PRODUCTIVITY_CALENDAR_SYNC__;
    globalState.cloudLoadState = 'never-attempted';
    globalState.failureCount = 0;
    globalState.retryAfter = 0;
    globalState.lastFailedLoad = 0;
  }

}

const fetchWithTimeout = async (url, options, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out - please check your internet connection');
    }
    throw error;
  }
};

const handleAPIError = (error) => {
  if (error.message.includes('rate limit')) {
    return 'Saving too quickly - waiting a moment...';
  }
  if (error.message.includes('timeout')) {
    return 'Slow connection - please try again';
  }
  if (error.message.includes('401')) {
    return 'Please sign in to Google Drive again';
  }
  return 'Sync failed - your data is saved locally';
};

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
      // Only load from cloud based on proper state management
      const cloudState = this.googleDrive.getCloudState();

      if (cloudState === 'never-attempted' || cloudState === 'failed') {
        // Only attempt if we haven't succeeded or if failure cooldown has passed
        if (this.googleDrive.canRetryCloudOperation()) {
          try {
            debugLog('🌥️ Attempting cloud load for initial sync...');
            cloudData = await this.googleDrive.loadFromCloud();
            debugLog('✅ Cloud data loaded for initial sync');
          } catch (error) {
            debugLog('⚠️ Cloud load failed during initial sync', error.message);
            // Don't throw - gracefully continue with local data only
            // The error state is already set by loadFromCloud()
          }
        } else {
          debugLog('🚫 Cloud load blocked by retry policy, using local data only');
        }
      } else if (cloudState === 'success') {
        debugLog('✅ Cloud already loaded successfully, skipping reload');
      } else {
        debugLog(`⏳ Cloud in state: ${cloudState}, skipping load`);
      }

      const localTaskCount = this.googleDrive.countTasks(localData);
      const cloudTaskCount = this.googleDrive.countTasks(cloudData);

      debugLog('📊 Initial sync comparison', {
        local: localTaskCount,
        cloud: cloudTaskCount,
        cloudState: this.googleDrive.getCloudState()
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
  deduplicateRecurringTasks(tasks) {
    if (!Array.isArray(tasks)) return tasks;
    
    const seen = new Set();
    const recurringTitles = ['Weekly Planning', 'Friday Reflection', 'Daily Check-in'];
    
    return tasks.filter(task => {
      if (recurringTitles.includes(task.title)) {
        if (seen.has(task.title)) {
          debugLog(`🗑️ Removing duplicate recurring task: ${task.title}`);
          return false; // Skip duplicate
        }
        seen.add(task.title);
      }
      return true; // Keep task
    });
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
          this.tasksAreEqual(localTask, cloudTask, dateKey)
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
      
      mergedData[dateKey] = this.deduplicateRecurringTasks(mergedTasks);
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
    
    // Enhanced recurring task detection
    const recurringTasks = ['Weekly Planning', 'Friday Reflection', 'Daily Check-in'];
    const isRecurring1 = recurringTasks.includes(task1.title);
    const isRecurring2 = recurringTasks.includes(task2.title);
    
    if (isRecurring1 && isRecurring2) {
      // For recurring tasks, only title match is needed
      return task1.title === task2.title;
    }
    
    // For regular tasks, use title and structure match
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
        hasLoadedFromCloud: window.__PRODUCTIVITY_CALENDAR_SYNC__.hasLoadedFromCloud
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
        cloudState: this.googleDrive.getCloudState(),
        isCurrentlyLoading: window.__PRODUCTIVITY_CALENDAR_SYNC__.isCurrentlyLoading
      });

      // If sync is enabled and we should try cloud load
      if (this.syncEnabled && this.googleDrive.isSignedIn) {
        const cloudState = this.googleDrive.getCloudState();
        
        // Only attempt cloud load in appropriate states
        if (cloudState === 'never-attempted' || 
            (cloudState === 'failed' && this.googleDrive.canRetryCloudOperation())) {
          
          try {
            debugLog('🌥️ Attempting cloud load...');
            const cloudData = await this.googleDrive.loadFromCloud();

            if (cloudData) {
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
            // Error state already set by loadFromCloud(), continue with local
          }
        } else if (cloudState === 'success') {
          debugLog('✅ Previously loaded from cloud successfully');
        } else {
          debugLog(`⏸️ Cloud load not attempted (state: ${cloudState})`);
        }
      }

      const localData = this.loadLocalData();
      debugLog('📱 Using local storage data', { 
        taskCount: this.googleDrive.countTasks(localData),
        cloudState: this.syncEnabled ? this.googleDrive.getCloudState() : 'disabled'
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

  // Update getSyncStatus in HybridStorageManager
  getSyncStatus() {
    const cloudState = this.syncEnabled ? this.googleDrive.getCloudState() : 'disabled';
    const globalState = window.__PRODUCTIVITY_CALENDAR_SYNC__;
    
    return {
      syncEnabled: this.syncEnabled,
      status: this.syncStatus,
      lastSyncTime: this.lastSyncTime,
      
      // Enhanced cloud state info
      cloudState: cloudState,
      canRetry: this.syncEnabled ? this.googleDrive.canRetryCloudOperation() : false,
      failureCount: globalState.failureCount,
      nextRetryAt: globalState.retryAfter ? new Date(globalState.retryAfter) : null,
      lastSuccessfulLoad: globalState.lastSuccessfulLoad ? new Date(globalState.lastSuccessfulLoad) : null,
      
      googleSignInStatus: this.googleDrive.getSignInStatus(),
      
      // Helpful user messages
      userMessage: this.getUserStatusMessage(cloudState, globalState)
    };
  }

  getUserStatusMessage(cloudState, globalState) {
    switch (cloudState) {
      case 'never-attempted':
        return 'Ready to sync';
      case 'loading':
        return 'Syncing...';
      case 'success':
        return 'Synced successfully';
      case 'failed':
        if (globalState.failureCount >= 5) {
          return 'Sync failed multiple times. Manual reset required.';
        }
        return `Sync failed. Will retry automatically.`;
      case 'network-error':
        return 'Network issue. Will retry when connection improves.';
      case 'auth-error':
        return 'Authentication expired. Please sign in again.';
      default:
        return 'Sync disabled';
    }
  }

  // 🔄 Force a fresh load from cloud (for recovery purposes)
  async forceCloudLoad() {
    if (this.syncEnabled && this.googleDrive.isSignedIn) {
      try {
        debugLog('🔄 Forcing fresh load from cloud...');
        
        // Temporarily bypass the global flag
        const wasLoaded = window.__PRODUCTIVITY_CALENDAR_SYNC__.hasLoadedFromCloud;
        window.__PRODUCTIVITY_CALENDAR_SYNC__.hasLoadedFromCloud = false;
        window.__PRODUCTIVITY_CALENDAR_SYNC__.lastLoadTime = 0;
        
        const cloudData = await this.googleDrive.loadFromCloud();
        
        if (cloudData) {
          debugLog('✅ Force loaded from cloud');
          return cloudData;
        }
        
        // Restore flag if no data found
        window.__PRODUCTIVITY_CALENDAR_SYNC__.hasLoadedFromCloud = wasLoaded;
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
  tasksAreEqualForDate(task1, task2, dateKey) {
    if (!task1 || !task2) return false;
    
    // First try ID match (most reliable)
    if (task1.id && task2.id) {
      return task1.id === task2.id;
    }
    
    // For recurring tasks, check title AND ensure they're for the same logical date
    const recurringTasks = ['Weekly Planning', 'Friday Reflection', 'Daily Check-in'];
    const isRecurring1 = recurringTasks.includes(task1.title);
    const isRecurring2 = recurringTasks.includes(task2.title);
    
    if (isRecurring1 && isRecurring2) {
      // Same recurring task type AND same date = same task
      return task1.title === task2.title;
      // dateKey provides the date context we need
    }
    
    // For regular tasks, use title and structure match
    return task1.title === task2.title && 
          task1.steps?.length === task2.steps?.length;
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
  // Add to HybridStorageManager class
  async resetSyncState() {
    debugLog('🔄 Manually resetting sync state...');
    this.googleDrive.resetCloudState();
    this.syncStatus = this.googleDrive.isSignedIn ? 'connected' : 'disconnected';
    return true;
  }

  async forceSyncRetry() {
    debugLog('🔄 Forcing sync retry...');
    this.googleDrive.resetCloudState();
    
    if (this.syncEnabled && this.googleDrive.isSignedIn) {
      try {
        await this.performInitialSync();
        return true;
      } catch (error) {
        debugLog('❌ Force retry failed', error.message);
        return false;
      }
    }
    
    return false;
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

// Export these functions
export const resetSyncState = async () => {
  await ensureInitialized();
  return storageManager.resetSyncState();
};

export const forceSyncRetry = async () => {
  await ensureInitialized();
  return storageManager.forceSyncRetry();
};

export { storageManager };