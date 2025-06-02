// src/utils/storageUtils.js

const STORAGE_KEY = 'productivity-calendar-data';

// Generate unique ID for tasks
const generateTaskId = () => {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Migrate old data format to include task IDs
const migrateData = (data) => {
  if (!data) return data;
  
  let migrationNeeded = false;
  const migratedData = {};
  
  Object.keys(data).forEach(dateKey => {
    migratedData[dateKey] = data[dateKey].map(task => {
      if (!task.id) {
        migrationNeeded = true;
        return {
          ...task,
          id: generateTaskId()
        };
      }
      return task;
    });
  });
  
  if (migrationNeeded) {
    console.log('Migrated tasks to include unique IDs');
  }
  
  return migratedData;
};

/**
 * Loads task data from local storage
 * @returns {Object|null} The stored task data or null if not found
 */
export const loadData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsedData = JSON.parse(data);
      // Ensure all tasks have IDs
      return migrateData(parsedData);
    }
    return null;
  } catch (error) {
    console.error('Error loading data from localStorage:', error);
    return null;
  }
};

/**
 * Saves task data to local storage
 * @param {Object} data - The task data to save
 * @returns {boolean} Success status
 */
export const saveData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving data to localStorage:', error);
    return false;
  }
};

/**
 * Exports all task data as a JSON file for backup
 */
export const exportData = () => {
  try {
    const data = loadData();
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
    console.error('Error exporting data:', error);
    return false;
  }
};

/**
 * Imports task data from a JSON file
 * @param {File} file - The JSON file to import
 * @returns {Promise<boolean>} Success status
 */
export const importData = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        // Migrate imported data to ensure IDs
        const migratedData = migrateData(data);
        saveData(migratedData);
        resolve(true);
      } catch (error) {
        console.error('Error parsing import file:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading import file:', error);
      reject(error);
    };
    
    reader.readAsText(file);
  });
};