// src/components/ImprovedSyncStatusBanner.js
import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Loader, AlertCircle, CheckCircle, Settings, X, Info } from 'lucide-react';
import { enableGoogleSync, disableGoogleSync, getSyncStatus } from '../utils/storageUtils';
import '../styles/components/SyncStatusBanner.css';

const SYNC_DISMISSED_KEY = 'productivity-calendar-sync-dismissed';

const ImprovedSyncStatusBanner = ({ onSyncStatusChange }) => {
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

  useEffect(() => {
    checkSyncStatus();
    checkDismissedState();
    
    const interval = setInterval(checkSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const checkSyncStatus = async () => {
    try {
      const status = await getSyncStatus();
      setSyncStatus(status);
      if (onSyncStatusChange) {
        onSyncStatusChange(status);
      }
    } catch (error) {
      console.error('Failed to check sync status:', error);
    }
  };

  const handleEnableSync = async () => {
    setIsLoading(true);
    try {
      // Check if there's local data that might conflict
      const localData = localStorage.getItem('productivity-calendar-data');
      if (localData) {
        const parsedLocal = JSON.parse(localData);
        const hasLocalTasks = Object.keys(parsedLocal).some(key => 
          parsedLocal[key] && parsedLocal[key].length > 0
        );
        
        if (hasLocalTasks) {
          setMergeInfo({
            localTaskCount: Object.values(parsedLocal).flat().length,
            message: "You have local calendar data. When you connect to Google Drive, we'll merge your existing tasks with any cloud data."
          });
          setShowMergeDialog(true);
          setIsLoading(false);
          return;
        }
      }
      
      await performSyncEnable();
    } catch (error) {
      console.error('Failed to enable sync:', error);
      alert('Failed to connect to Google Drive. Please check your internet connection and try again.');
      setIsLoading(false);
    }
  };

  const performSyncEnable = async () => {
    const success = await enableGoogleSync();
    if (success) {
      await checkSyncStatus();
      localStorage.removeItem(SYNC_DISMISSED_KEY); // Clear dismissed state when sync is enabled
    } else {
      alert('Failed to connect to Google Drive. Please try again.');
    }
    setIsLoading(false);
  };

  const handleConfirmMerge = async () => {
    setShowMergeDialog(false);
    setIsLoading(true);
    await performSyncEnable();
  };

  const handleDisableSync = async () => {
    if (window.confirm('Are you sure you want to disconnect Google Drive sync? Your data will remain on both devices.')) {
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
          Sync with Google Drive
        </button>
      );
    }
  };

  // If sync is enabled, always show the banner
  if (syncStatus.syncEnabled) {
    return (
      <div className={`sync-status-banner ${syncStatus.status}`}>
        <div className="sync-main-content">
          <div className="sync-status-info">
            {getStatusIcon()}
            <div className="sync-text">
              <div className="sync-primary-text">{getStatusText()}</div>
              {syncStatus.googleSignInStatus.userEmail && (
                <div className="sync-secondary-text">
                  {syncStatus.googleSignInStatus.userEmail}
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

        {renderMergeDialog()}
      </div>
    );
  }

  // If sync is not enabled and user hasn't dismissed, show invitation
  if (!isDismissed) {
    return (
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

        {renderMergeDialog()}
      </div>
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

  function renderMergeDialog() {
    if (!showMergeDialog || !mergeInfo) return null;

    return (
      <div className="merge-dialog-overlay">
        <div className="merge-dialog">
          <h3>Merge Your Calendar Data</h3>
          <p>{mergeInfo.message}</p>
          <div className="merge-stats">
            <div className="merge-stat">
              <strong>{mergeInfo.localTaskCount}</strong> local tasks found
            </div>
          </div>
          <div className="merge-actions">
            <button
              onClick={() => setShowMergeDialog(false)}
              className="merge-button cancel"
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
          <div className="merge-note">
            <small>
              <strong>Safe merge:</strong> Your local tasks will be preserved. 
              If you have tasks in Google Drive from another device, we'll combine them.
            </small>
          </div>
        </div>
      </div>
    );
  }
};

export default ImprovedSyncStatusBanner;