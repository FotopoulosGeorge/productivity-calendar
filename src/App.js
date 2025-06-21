// src/App.js 
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import WeeklyBanner from './components/WeeklyBanner';
import DayCard from './components/DayCard';
import SyncStatusBanner from './components/SyncStatusBanner';
import { getStartOfWeek, formatDateKey} from './utils/dateUtils';
import { loadData, saveData } from './utils/storageUtils';
import { generateTaskId, deepCloneTask, createRecurringTask } from './utils/taskUtils';
import './styles/App.css';

const App = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState({});
  const [weeklyProgress, setWeeklyProgress] = useState({ completed: 0, total: 0 });
  const [syncStatus, setSyncStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    // CRITICAL: Only initialize once
    if (!hasInitialized) {
      initializeApp();
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  const validateAndCleanData = (data) => {
    console.log('🔍 Validating data structure...', { type: typeof data, keys: data ? Object.keys(data).length : 0 });
    
    if (!data || typeof data !== 'object') {
      console.log('⚠️ Data is null or not an object, returning empty');
      return {};
    }

    const cleanedData = {};
    
    // Remove sync metadata first
    const { lastSyncedAt, syncedFrom, localTimestamp, syncVersion, ...taskData } = data;
    
    Object.keys(taskData).forEach(dateKey => {
      const dayData = taskData[dateKey];
      
      // Validate that each day has an array of tasks
      if (Array.isArray(dayData)) {
        // Validate each task has the required structure
        cleanedData[dateKey] = dayData.map((task, index) => {
          if (!task || typeof task !== 'object') {
            console.warn(`⚠️ Invalid task at ${dateKey}[${index}], creating default`);
            return createRecurringTask('default');
          }
          
          // Ensure task has required properties
          return {
            id: task.id || generateTaskId(),
            title: task.title || 'Untitled Task',
            steps: Array.isArray(task.steps) ? task.steps : [
              { description: 'Complete task', status: 'pending' }
            ],
            reflection: task.reflection || '',
            lastModified: task.lastModified || new Date().toISOString()
          };
        });
      } else if (dayData !== undefined && dayData !== null) {
        console.warn(`⚠️ Invalid day data for ${dateKey}, expected array but got:`, typeof dayData);
        cleanedData[dateKey] = [];
      }
    });
    
    console.log('✅ Data validation complete', { 
      originalKeys: Object.keys(data).length,
      cleanedKeys: Object.keys(cleanedData).length,
      totalTasks: Object.values(cleanedData).flat().length
    });
    
    return cleanedData;
  };

  const initializeApp = async () => {
    console.log('🚀 Initializing app (single call)...');
    setIsLoading(true);
    
    try {
      // CRITICAL: Single call to loadData
      console.log('📥 Loading data (one time only)...');
      const savedData = await loadData();
      console.log('📊 Raw data loaded:', { 
        hasData: !!savedData, 
        type: typeof savedData,
        keys: savedData ? Object.keys(savedData).length : 0
      });
      
      if (savedData && Object.keys(savedData).length > 0) {
        // Clean and validate the data structure
        const cleanedTasks = validateAndCleanData(savedData);
        
        console.log('✅ Setting cleaned tasks:', {
          taskCount: Object.values(cleanedTasks).flat().length,
          dateKeys: Object.keys(cleanedTasks)
        });
        
        setTasks(cleanedTasks);
        
        // Save the cleaned data back (in case it was corrupted)
        if (Object.keys(cleanedTasks).length > 0) {
          console.log('💾 Saving cleaned data back to storage...');
          await saveData(cleanedTasks);
        }
      } else {
        console.log('📝 No saved data, creating initial data...');
        const initialData = createInitialData(currentDate);
        const cleanedInitial = validateAndCleanData(initialData);
        setTasks(cleanedInitial);
        await saveData(cleanedInitial);
      }
      
      console.log('✅ App initialization complete');
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      // Fallback to creating initial data
      const initialData = createInitialData(currentDate);
      const cleanedInitial = validateAndCleanData(initialData);
      setTasks(cleanedInitial);
    } finally {
      setIsLoading(false);
    }
  };

    const isViewingCurrentWeek = (displayedDate) => {
      const today = new Date();
      const currentWeekStart = getStartOfWeek(new Date(today));
      const displayedWeekStart = getStartOfWeek(new Date (displayedDate));
      

        // Compare just the date parts, not time
      const currentWeekDateString = currentWeekStart.toDateString();
      const displayedWeekDateString = displayedWeekStart.toDateString();
      
       return currentWeekDateString === displayedWeekDateString;
    };
    // Add this helper function near the top of App.js
    const hasRecurringTaskOfType = (tasks, taskType) => {
      if (!Array.isArray(tasks)) return false;
      
      const recurringTitles = {
        'planning': 'Weekly Planning',
        'reflection': 'Friday Reflection', 
        'checkin': 'Daily Check-in'
      };
      
      const expectedTitle = recurringTitles[taskType];
      return tasks.some(task => task.title === expectedTitle);
    };
  const calculateWeeklyProgress = useCallback(() => {
    const startOfWeek = getStartOfWeek(currentDate);
    let completed = 0;
    let total = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      const dateKey = formatDateKey(date);
      
      if (tasks[dateKey] && Array.isArray(tasks[dateKey])) {
        const dayTasks = tasks[dateKey];
        for (let taskIndex = 0; taskIndex < dayTasks.length; taskIndex++) {
          const task = dayTasks[taskIndex];
          if (task.steps && Array.isArray(task.steps)) {
            for (let stepIndex = 0; stepIndex < task.steps.length; stepIndex++) {
              const step = task.steps[stepIndex];
              const isComplete = step.status === 'complete';
              total += 1;
              if (isComplete) {
                completed += 1;
              }
            }
          }
        }
      }
    }
    
    setWeeklyProgress({ completed, total });
  }, [currentDate, tasks]);

  useEffect(() => {
    if (!isLoading) {
      calculateWeeklyProgress();
    }
  }, [calculateWeeklyProgress, isLoading]);

  const handleTaskUpdate = async (dateKey, taskIndex, updatedTask) => {
    console.log('📝 Updating task:', { dateKey, taskIndex, taskId: updatedTask.id });
    
    const newTasks = {...tasks};
    
    // Validate the date key exists and is an array
    if (!newTasks[dateKey] || !Array.isArray(newTasks[dateKey])) {
      console.warn('⚠️ Invalid dateKey or not an array:', dateKey);
      newTasks[dateKey] = [];
    }
    
    // Validate task index
    if (taskIndex < 0 || taskIndex >= newTasks[dateKey].length) {
      console.warn('⚠️ Invalid taskIndex:', taskIndex);
      return;
    }
    
    newTasks[dateKey][taskIndex] = {
      ...updatedTask,
      id: newTasks[dateKey][taskIndex].id,
      lastModified: new Date().toISOString()
    };
    
    setTasks(newTasks);
    
    try {
      await saveData(newTasks);
      console.log('✅ Task update saved successfully');
    } catch (error) {
      console.error('❌ Failed to save task update:', error);
    }
  };
  
  const handleAddTask = async (dateKey) => {
    console.log('➕ Adding task to:', dateKey);
    
    const newTasks = {...tasks};
    if (!newTasks[dateKey] || !Array.isArray(newTasks[dateKey])) {
      newTasks[dateKey] = [];
    }
    
    const newTask = createRecurringTask('default');
    newTask.lastModified = new Date().toISOString();
    newTasks[dateKey].push(newTask);
    
    setTasks(newTasks);
    
    try {
      await saveData(newTasks);
      console.log('✅ New task saved successfully', { dateKey, taskCount: newTasks[dateKey].length });
    } catch (error) {
      console.error('❌ Failed to save new task:', error);
    }
  };

  const handleDeleteTask = async (dateKey, taskIndex) => {
    console.log('🗑️ Deleting task:', { dateKey, taskIndex });
    
    const newTasks = {...tasks};
    
    if (!newTasks[dateKey] || !Array.isArray(newTasks[dateKey])) {
      console.warn('⚠️ Cannot delete from invalid dateKey:', dateKey);
      return;
    }
    
    if (taskIndex < 0 || taskIndex >= newTasks[dateKey].length) {
      console.warn('⚠️ Cannot delete invalid taskIndex:', taskIndex);
      return;
    }
    
    newTasks[dateKey].splice(taskIndex, 1);
    setTasks(newTasks);
    
    try {
      await saveData(newTasks);
      console.log('✅ Task deletion saved successfully');
    } catch (error) {
      console.error('❌ Failed to save task deletion:', error);
    }
  };

  const handleMoveTask = async (fromDateKey, taskIndex, toDateKey) => {
    console.log('🔄 Moving task:', { fromDateKey, taskIndex, toDateKey });
    
    const newTasks = {...tasks};
    
    // Validate source
    if (!newTasks[fromDateKey] || !Array.isArray(newTasks[fromDateKey])) {
      console.warn('⚠️ Cannot move from invalid dateKey:', fromDateKey);
      return;
    }
    
    if (taskIndex < 0 || taskIndex >= newTasks[fromDateKey].length) {
      console.warn('⚠️ Cannot move invalid taskIndex:', taskIndex);
      return;
    }
    
    // Ensure destination exists
    if (!newTasks[toDateKey] || !Array.isArray(newTasks[toDateKey])) {
      newTasks[toDateKey] = [];
    }
    
    const taskToMove = deepCloneTask(newTasks[fromDateKey][taskIndex]);
    taskToMove.id = generateTaskId();
    taskToMove.lastModified = new Date().toISOString();
    
    newTasks[toDateKey].push(taskToMove);
    newTasks[fromDateKey].splice(taskIndex, 1);
    
    setTasks(newTasks);
    
    try {
      await saveData(newTasks);
      console.log('✅ Task move saved successfully');
    } catch (error) {
      console.error('❌ Failed to save task move:', error);
    }
  };

  const handleSyncStatusChange = (newSyncStatus) => {
    setSyncStatus(newSyncStatus);
  };
  
  const createInitialData = (date) => {
    const startOfWeek = getStartOfWeek(date);
    const initialData = {};
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      const dateKey = formatDateKey(date);
      const dayOfWeek = date.getDay();
      
      initialData[dateKey] = [];
      
      if (dayOfWeek === 0) {
        initialData[dateKey].push(createRecurringTask('planning'));
      } else if (dayOfWeek === 5) {
        initialData[dateKey].push(createRecurringTask('reflection'));
      } else if (dayOfWeek !== 6) {
        initialData[dateKey].push(createRecurringTask('checkin'));
      }
    }
    
    return initialData;
  };



  const generateTasksForWeek = (weekStartDate) => {
    const updatedTasks = {...tasks};
    let tasksAdded = false;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + i);
      const dateKey = formatDateKey(date);
      const dayOfWeek = date.getDay();
      
      // Ensure day exists as array
      if (!updatedTasks[dateKey] || !Array.isArray(updatedTasks[dateKey])) {
        updatedTasks[dateKey] = [];
      }
      
      // Only add recurring tasks if the specific type doesn't exist
      if (dayOfWeek === 0 && !hasRecurringTaskOfType(updatedTasks[dateKey], 'planning')) {
        updatedTasks[dateKey].push(createRecurringTask('planning', dateKey));
        tasksAdded = true;
      } else if (dayOfWeek === 5 && !hasRecurringTaskOfType(updatedTasks[dateKey], 'reflection')) {
        updatedTasks[dateKey].push(createRecurringTask('reflection'));
        tasksAdded = true;
      } else if (dayOfWeek !== 6 && dayOfWeek !== 0 && dayOfWeek !== 5 && 
                !hasRecurringTaskOfType(updatedTasks[dateKey], 'checkin')) {
        updatedTasks[dateKey].push(createRecurringTask('checkin'));
        tasksAdded = true;
      }
    }
    
    return { updatedTasks, tasksAdded };
  };

  const handleWeekNavigation = async (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
    
    const startOfWeek = getStartOfWeek(newDate);
    const { updatedTasks, tasksAdded } = generateTasksForWeek(startOfWeek);
    
    if (tasksAdded) {
      setTasks(updatedTasks);
      try {
        await saveData(updatedTasks);
      } catch (error) {
        console.error('Failed to save week navigation changes:', error);
      }
    }
  };

  const renderWeekView = () => {
    const startOfWeek = getStartOfWeek(currentDate);
    const daysOfWeek = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      daysOfWeek.push(date);
    }
    
    return (
      <div className="week-view">
        <WeeklyBanner progress={weeklyProgress} tasks={tasks}/>
        <div className="days-grid">
          {daysOfWeek.map((date, index) => {
            const dateKey = formatDateKey(date);
            const dayTasks = tasks[dateKey] || [];
            
            return (
              <DayCard 
                key={index} 
                date={date} 
                tasks={Array.isArray(dayTasks) ? dayTasks : []} 
                onTaskUpdate={(taskIndex, updatedTask) => handleTaskUpdate(dateKey, taskIndex, updatedTask)}
                onAddTask={() => handleAddTask(dateKey)}
                onDeleteTask={(taskIndex) => handleDeleteTask(dateKey, taskIndex)}
                onMoveTask={(taskIndex, toDateKey) => handleMoveTask(dateKey, taskIndex, toDateKey)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="app-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your calendar...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="app-container">
      <div className="app-content">
        <div className="app-header">
          <h1 className="app-title">
            <Calendar className="icon" />
            Productivity Calendar
          </h1>
          <div className="app-controls">
            <button 
              className="nav-button"
              onClick={() => handleWeekNavigation(-1)}
            >
             &lt; Previous Week
            </button>
            
            <button 
              className={`week-button ${isViewingCurrentWeek(currentDate) ? 'current-week-active' : 'current-week-inactive'}`}
              onClick={() => setCurrentDate(new Date())}
            >
              Current Week
            </button>
            
            <button 
              className="nav-button"
              onClick={() => handleWeekNavigation(1)}
            >
              Next Week &gt;
            </button>
          </div>
        </div>
        

        {/* Google Drive Sync Status */}
        <SyncStatusBanner onSyncStatusChange={handleSyncStatusChange} />

        {renderWeekView()}
      </div>
    </div>
  );
};

export default App;