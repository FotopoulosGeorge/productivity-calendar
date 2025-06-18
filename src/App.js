// src/App.js - Updated with Google Drive Sync
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import WeeklyBanner from './components/WeeklyBanner';
import DayCard from './components/DayCard';
import SyncStatusBanner from './components/SyncStatusBanner';
import { getStartOfWeek, formatDateKey} from './utils/dateUtils';
import { loadData, saveData } from './utils/storageUtils';
import { generateTaskId, deepCloneTask, createRecurringTask } from './utils/taskUtils';
import './styles/App.css';
import './styles/components/SyncStatusBanner.css';


const App = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState({});
  const [weeklyProgress, setWeeklyProgress] = useState({ completed: 0, total: 0 });
  const [syncStatus, setSyncStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    setIsLoading(true);
    try {
      // Load data from storage (will automatically check Google Drive if connected)
      const savedData = await loadData();
      
      if (savedData && Object.keys(savedData).length > 0) {
        // Remove sync metadata before processing tasks
        const { lastSyncedAt, syncedFrom, ...taskData } = savedData;
        
        // Ensure all tasks have unique IDs
        const tasksWithIds = {};
        Object.keys(taskData).forEach(dateKey => {
          tasksWithIds[dateKey] = taskData[dateKey].map(task => ({
            ...task,
            id: task.id || generateTaskId()
          }));
        });
        setTasks(tasksWithIds);
        
        // Save back with IDs if they were missing
        if (JSON.stringify(tasksWithIds) !== JSON.stringify(taskData)) {
          await saveData(tasksWithIds);
        }
      } else {
        const initialData = createInitialData(currentDate);
        setTasks(initialData);
        await saveData(initialData);
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      // Fallback to creating initial data
      const initialData = createInitialData(currentDate);
      setTasks(initialData);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWeeklyProgress = useCallback(() => {
    const startOfWeek = getStartOfWeek(currentDate);
    let completed = 0;
    let total = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      const dateKey = formatDateKey(date);
      
      if (tasks[dateKey]) {
        const dayTasks = tasks[dateKey];
        for (let taskIndex = 0; taskIndex < dayTasks.length; taskIndex++) {
          const task = dayTasks[taskIndex];
          if (task.steps) {
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
    calculateWeeklyProgress();
  }, [calculateWeeklyProgress]);

  const handleTaskUpdate = async (dateKey, taskIndex, updatedTask) => {
    const newTasks = {...tasks};
    newTasks[dateKey][taskIndex] = {
      ...updatedTask,
      id: newTasks[dateKey][taskIndex].id,
      lastModified: new Date().toISOString()
    };
    setTasks(newTasks);
    
    // Save with sync
    try {
      await saveData(newTasks);
    } catch (error) {
      console.error('Failed to save task update:', error);
      // Continue anyway - user can manually sync later
    }
  };
  
  const handleAddTask = async (dateKey) => {
    const newTasks = {...tasks};
    if (!newTasks[dateKey]) {
      newTasks[dateKey] = [];
    }
    
    const newTask = createRecurringTask('default');
    newTask.lastModified = new Date().toISOString();
    newTasks[dateKey].push(newTask);
    
    setTasks(newTasks);
    
    try {
      await saveData(newTasks);
    } catch (error) {
      console.error('Failed to save new task:', error);
    }
  };

  const handleDeleteTask = async (dateKey, taskIndex) => {
    const newTasks = {...tasks};
    newTasks[dateKey].splice(taskIndex, 1);
    setTasks(newTasks);
    
    try {
      await saveData(newTasks);
    } catch (error) {
      console.error('Failed to save task deletion:', error);
    }
  };

  const handleMoveTask = async (fromDateKey, taskIndex, toDateKey) => {
    const newTasks = {...tasks};
    
    if (!newTasks[toDateKey]) {
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
    } catch (error) {
      console.error('Failed to save task move:', error);
    }
  };

  const handleSyncStatusChange = (newSyncStatus) => {
    setSyncStatus(newSyncStatus);
    
    // If sync was just enabled and we have different data, reload
    if (newSyncStatus.syncEnabled && newSyncStatus.status === 'connected') {
      // Optionally reload data to get latest from cloud
      // initializeApp();
    }
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
      
      if (!updatedTasks[dateKey] || updatedTasks[dateKey].length === 0) {
        const dayOfWeek = date.getDay();
        updatedTasks[dateKey] = [];
        tasksAdded = true;
        
        if (dayOfWeek === 0) {
          updatedTasks[dateKey].push(createRecurringTask('planning'));
        } else if (dayOfWeek === 5) {
          updatedTasks[dateKey].push(createRecurringTask('reflection'));
        } else if (dayOfWeek !== 6) {
          updatedTasks[dateKey].push(createRecurringTask('checkin'));
        }
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
            return (
              <DayCard 
                key={index} 
                date={date} 
                tasks={tasks[dateKey] || []} 
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
              className="today-button"
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