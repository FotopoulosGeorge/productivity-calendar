// src/components/SyncStatusBanner.js - Fixed version with working merge
import React, { useState, useEffect, useCallback } from 'react';
import { Cloud, CloudOff, Loader, AlertCircle, CheckCircle, Settings, X, Info } from 'lucide-react';
import { enableGoogleSync, disableGoogleSync, getSyncStatus} from '../utils/storageUtils';
import '../styles/components/SyncStatusBanner.css';


const SYNC_DISMISSED_KEY = 'productivity-calendar-sync-dismissed';

const SyncStatusBanner = ({ onSyncStatusChange }) => {
  const [syncStatus, setSyncStatus] = useState({
    syncEnabled: false,
    status: 'disconnected',
    lastSyncTime: null,
    googleSignInStatus: { isInitialized: false, isSignedIn: false, userEmail: null }
  });
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeInfo, setMergeInfo] = useState(null);

  const checkSyncStatus = useCallback(async () => {
    try {
      const status = await getSyncStatus();
      setSyncStatus(status);
      if (onSyncStatusChange) {
        onSyncStatusChange(status);
      }
    } catch (error) {
      console.error('Failed to check sync status:', error);
    }
  }, [onSyncStatusChange]);

  useEffect(() => {
    checkSyncStatus();
    checkDismissedState();
    
    const interval = setInterval(checkSyncStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [checkSyncStatus]);

  const checkDismissedState = () => {
    const dismissed = localStorage.getItem(SYNC_DISMISSED_KEY) === 'true';
    setIsDismissed(dismissed);
  };

  const handleDismiss = () => {
    localStorage.setItem(SYNC_DISMISSED_KEY, 'true');
    setIsDismissed(true);
  };

  const handleShowSyncOptions = () => {
    localStorage.removeItem(SYNC_DISMISSED_KEY);
    setIsDismissed(false);
  };

  const countLocalTasks = (data) => {
    if (!data || typeof data !== 'object') return 0;
    
    let count = 0;
    Object.keys(data).forEach(dateKey => {
      if (Array.isArray(data[dateKey])) {
        count += data[dateKey].length;
      }
    });
    return count;
  };

  const handleEnableSync = async () => {
    setIsLoading(true);
    try {
      // Check if there's local data that might conflict
      const localDataStr = localStorage.getItem('productivity-calendar-data');
      if (localDataStr) {
        const localData = JSON.parse(localDataStr);
        const taskCount = countLocalTasks(localData);
        
        if (taskCount > 0) {
          setMergeInfo({
            localTaskCount: taskCount,
            message: `You have ${taskCount} tasks stored locally. When you connect to Google Drive, we'll check for existing cloud data and merge them safely.`
          });
          setShowMergeDialog(true);
          setIsLoading(false);
          return;
        }
      }
      
      // No local data, proceed directly
      await performSyncEnable();
    } catch (error) {
      console.error('Failed to prepare sync:', error);
      alert('Failed to prepare Google Drive sync. Please try again.');
      setIsLoading(false);
    }
  };

  const performSyncEnable = async () => {
    try {
      setIsLoading(true);
      const success = await enableGoogleSync();
      
      if (success) {
        await checkSyncStatus();
        localStorage.removeItem(SYNC_DISMISSED_KEY); // Clear dismissed state when sync is enabled
        console.log('✅ Sync enabled successfully');
      } else {
        alert('Failed to connect to Google Drive. Please check your internet connection and try again.');
      }
    } catch (error) {
      console.error('Failed to enable sync:', error);
      alert('Failed to connect to Google Drive. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmMerge = async () => {
    setShowMergeDialog(false);
    await performSyncEnable();
  };

  const handleCancelMerge = () => {
    setShowMergeDialog(false);
    setIsLoading(false);
  };

  const handleDisableSync = async () => {
    if (window.confirm('Are you sure you want to disconnect Google Drive sync? Your data will remain safely stored on both your device and Google Drive.')) {
      setIsLoading(true);
      try {
        await disableGoogleSync();
        await checkSyncStatus();
      } catch (error) {
        console.error('Failed to disable sync:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <Loader className="sync-icon spinning" />;
    
    switch (syncStatus.status) {
      case 'connected':
        return <CheckCircle className="sync-icon success" />;
      case 'syncing':
        return <Loader className="sync-icon spinning" />;
      case 'error':
        return <AlertCircle className="sync-icon error" />;
      default:
        return <CloudOff className="sync-icon disconnected" />;
    }
  };

  const getStatusText = () => {
    if (isLoading) return 'Connecting...';
    
    switch (syncStatus.status) {
      case 'connected':
        return `Synced${syncStatus.lastSyncTime ? ` • ${formatLastSync(syncStatus.lastSyncTime)}` : ''}`;
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Sync error - using local storage';
      default:
        return 'Local storage only';
    }
  };

  const formatLastSync = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const syncTime = new Date(timestamp);
    const diffMs = now - syncTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return syncTime.toLocaleDateString();
  };

  const renderSyncButton = () => {
    if (syncStatus.syncEnabled) {
      return (
        <button
          onClick={handleDisableSync}
          disabled={isLoading}
          className="sync-button disconnect"
        >
          <Cloud className="button-icon" />
          Disconnect
        </button>
      );
    } else {
      return (
        <button
          onClick={handleEnableSync}
          disabled={isLoading}
          className="sync-button connect"
        >
          <Cloud className="button-icon" />
          {isLoading ? 'Connecting...' : 'Connect Google Drive'}
        </button>
      );
    }
  };

  const renderMergeDialog = () => {
    if (!showMergeDialog || !mergeInfo) return null;

    return (
      <div className="merge-dialog-overlay" onClick={(e) => e.target === e.currentTarget && handleCancelMerge()}>
        <div className="merge-dialog">
          <div className="merge-dialog-header">
            <h3>🔄 Merge Your Calendar Data</h3>
            <button 
              onClick={handleCancelMerge}
              className="merge-dialog-close"
            >
              <X size={20} />
            </button>
          </div>
          
          <p>{mergeInfo.message}</p>
          
          <div className="merge-stats">
            <div className="merge-stat">
              <strong>{mergeInfo.localTaskCount}</strong> local tasks found
            </div>
            <div className="merge-note">
              <Info size={16} />
              <span>Your local data will be safely preserved. If you have tasks in Google Drive from another device, we'll use the most recent version.</span>
            </div>
          </div>
          
          <div className="merge-actions">
            <button
              onClick={handleCancelMerge}
              className="merge-button cancel"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmMerge}
              className="merge-button confirm"
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'Connect & Merge'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // If sync is enabled, always show the banner
  if (syncStatus.syncEnabled) {
    return (
      <>
        <div className={`sync-status-banner ${syncStatus.status}`}>
          <div className="sync-main-content">
            <div className="sync-status-info">
              {getStatusIcon()}
              <div className="sync-text">
                <div className="sync-primary-text">{getStatusText()}</div>
                {syncStatus.googleSignInStatus.tokenExpiry && (
                  <div className="sync-secondary-text">
                    Connected to Google Drive
                  </div>
                )}
              </div>
            </div>
            
            <div className="sync-actions">
              {renderSyncButton()}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="sync-details-button"
                title="Sync details"
              >
                <Settings className="button-icon" />
              </button>
            </div>
          </div>

          {showDetails && (
            <div className="sync-details">
              <div className="sync-detail-row">
                <span className="detail-label">Status:</span>
                <span className="detail-value">{syncStatus.status}</span>
              </div>
              <div className="sync-detail-row">
                <span className="detail-label">Google API:</span>
                <span className="detail-value">
                  {syncStatus.googleSignInStatus.isInitialized ? 'Loaded' : 'Not loaded'}
                </span>
              </div>
              {syncStatus.lastSyncTime && (
                <div className="sync-detail-row">
                  <span className="detail-label">Last sync:</span>
                  <span className="detail-value">
                    {new Date(syncStatus.lastSyncTime).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="sync-info-text">
                <p>
                  <strong>How it works:</strong> Your calendar data is stored in your personal Google Drive. 
                  Only this app can access its own files. Changes are automatically saved to both your device and Google Drive.
                </p>
              </div>
            </div>
          )}
        </div>
        {renderMergeDialog()}
      </>
    );
  }

  // If sync is not enabled and user hasn't dismissed, show invitation
  if (!isDismissed) {
    return (
      <>
        <div className="sync-status-banner invitation">
          <div className="sync-main-content">
            <div className="sync-status-info">
              <Info className="sync-icon info" />
              <div className="sync-text">
                <div className="sync-primary-text">
                  Want to sync your calendar across devices?
                </div>
                <div className="sync-secondary-text">
                  Connect Google Drive to access your tasks on phone, laptop, and anywhere you go.
                </div>
              </div>
            </div>
            
            <div className="sync-actions">
              <button
                onClick={handleEnableSync}
                disabled={isLoading}
                className="sync-button connect"
              >
                <Cloud className="button-icon" />
                {isLoading ? 'Connecting...' : 'Connect Google Drive'}
              </button>
              <button
                onClick={handleDismiss}
                className="sync-dismiss-button"
                title="Don't ask again"
              >
                <X className="button-icon" />
              </button>
            </div>
          </div>
        </div>
        {renderMergeDialog()}
      </>
    );
  }

  // If dismissed, show small "enable sync" option in corner
  return (
    <div className="sync-enable-corner">
      <button
        onClick={handleShowSyncOptions}
        className="sync-corner-button"
        title="Enable Google Drive sync"
      >
        <CloudOff className="button-icon" />
        <span>Enable Sync</span>
      </button>
    </div>
  );
};

export default SyncStatusBanner;