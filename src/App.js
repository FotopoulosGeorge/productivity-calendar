// src/App.js - COMPLETE FINAL VERSION with Week Isolation
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import WeeklyBanner from './components/WeeklyBanner';
import DayCard from './components/DayCard';
import SyncStatusBanner from './components/SyncStatusBanner';
import { getStartOfWeek, formatDateKey} from './utils/dateUtils';
import { loadData, saveData } from './utils/storageUtils';
import { generateTaskId, deepCloneTask } from './utils/taskUtils';
import './styles/App.css';

const App = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState({});
  const [weeklyProgress, setWeeklyProgress] = useState({ completed: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  // 🆕 WEEK ISOLATION: Calculate week identifier from date
  const calculateWeekIdentifier = useCallback((dateString) => {
    const date = new Date(dateString);
    
    // Get the Monday of this week (start of week)
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    
    // Create a unique week identifier: YYYY-MM-DD format of the Monday
    return monday.toISOString().split('T')[0];
  }, []);

// 🆕 ENHANCED: Create recurring task with STRICT week isolation
  const createRecurringTaskWithStrictWeekContext = useCallback((taskType, dateKey) => {
    const baseId = generateTaskId();
    const weekId = calculateWeekIdentifier(dateKey);
    const dayName = new Date(dateKey).toLocaleDateString('en-US', { weekday: 'long' });
    
    const commonProps = {
      id: baseId,
      lastModified: new Date().toISOString(),
      dateCreated: dateKey,
      weekContext: weekId,
      taskType: taskType,
      isRecurring: true,
      // 🔒 Add week-specific identifiers to prevent cross-contamination
      weekSpecificId: `${taskType}_${weekId}`,
      instanceId: `${taskType}_${dateKey}` // Unique per exact date
    };

    switch (taskType) {
      case 'planning':
        return {
          ...commonProps,
          title: 'Weekly Planning',
          displayTitle: `Weekly Planning (Week of ${formatWeekDisplay(weekId)})`, // Clearer title
          steps: [
            { 
              id: `${baseId}_step_1`,
              description: 'Review last week\'s achievements', 
              status: 'pending' 
            },
            { 
              id: `${baseId}_step_2`,
              description: 'Set 3 key goals for this week', 
              status: 'pending' 
            },
            { 
              id: `${baseId}_step_3`,
              description: 'Plan daily priorities', 
              status: 'pending' 
            },
            { 
              id: `${baseId}_step_4`,
              description: 'Schedule important tasks', 
              status: 'pending' 
            }
          ],
          reflection: ''
        };

      case 'reflection':
        return {
          ...commonProps,
          title: 'Friday Reflection',
          displayTitle: `Friday Reflection (Week of ${formatWeekDisplay(weekId)})`,
          steps: [
            { 
              id: `${baseId}_step_1`,
              description: 'Review week\'s accomplishments', 
              status: 'pending' 
            },
            { 
              id: `${baseId}_step_2`,
              description: 'Identify lessons learned', 
              status: 'pending' 
            },
            { 
              id: `${baseId}_step_3`,
              description: 'Note areas for improvement', 
              status: 'pending' 
            },
            { 
              id: `${baseId}_step_4`,
              description: 'Celebrate wins', 
              status: 'pending' 
            }
          ],
          reflection: ''
        };

      case 'checkin':
        return {
          ...commonProps,
          title: 'Daily Check-in',
          displayTitle: `Daily Check-in (${dayName}, ${formatDateDisplay(dateKey)})`,
          steps: [
            { 
              id: `${baseId}_step_1`,
              description: 'Review today\'s priorities', 
              status: 'pending' 
            },
            { 
              id: `${baseId}_step_2`,
              description: 'Complete 3 most important tasks', 
              status: 'pending' 
            },
            { 
              id: `${baseId}_step_3`,
              description: 'Plan tomorrow\'s focus', 
              status: 'pending' 
            }
          ],
          reflection: '',
          dayContext: dateKey
        };

      default:
        return {
          ...commonProps,
          title: 'New Task',
          steps: [{ 
            id: `${baseId}_step_1`,
            description: 'Complete task', 
            status: 'pending' 
          }],
          reflection: '',
          isRecurring: false
        };
    }
  }, [calculateWeekIdentifier]);


  const validateAndCleanData = useCallback((data) => {
    console.log('🔍 Validating data structure...', { type: typeof data, keys: data ? Object.keys(data).length : 0 });
    
    if (!data || typeof data !== 'object') {
      console.log('⚠️ Data is null or not an object, returning empty');
      return {};
    }

    const cleanedData = {};
    
    // Remove sync metadata first
    const { lastSyncedAt, syncedFrom, localTimestamp, syncVersion, mergeInfo, ...taskData } = data;
    
    Object.keys(taskData).forEach(dateKey => {
      const dayData = taskData[dateKey];
      
      // Validate that each day has an array of tasks
      if (Array.isArray(dayData)) {
        // Validate each task has the required structure
        cleanedData[dateKey] = dayData.map((task, index) => {
          if (!task || typeof task !== 'object') {
            console.warn(`⚠️ Invalid task at ${dateKey}[${index}], creating default`);
            return createRecurringTaskWithStrictWeekContext('default', dateKey);
          }
          
          // 🔒 ENHANCED: Ensure task has week isolation properties
          const weekContext = task.weekContext || calculateWeekIdentifier(dateKey);
          
          return {
            id: task.id || generateTaskId(),
            title: task.title || 'Untitled Task',
            steps: Array.isArray(task.steps) ? task.steps : [
              { description: 'Complete task', status: 'pending' }
            ],
            reflection: task.reflection || '',
            lastModified: task.lastModified || new Date().toISOString(),
            // 🔒 Add week isolation properties
            dateCreated: task.dateCreated || dateKey,
            weekContext: weekContext,
            taskType: task.taskType || 'default',
            isRecurring: task.isRecurring || false,
            weekSpecificId: task.weekSpecificId || `${task.taskType || 'default'}_${weekContext}`,
            instanceId: task.instanceId || `${task.taskType || 'default'}_${dateKey}`
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
  }, [ calculateWeekIdentifier, createRecurringTaskWithStrictWeekContext]);

  
  // Helper functions for display
  const formatWeekDisplay = (weekId) => {
    const date = new Date(weekId);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateDisplay = (dateKey) => {
    const date = new Date(dateKey);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const createInitialData = useCallback((date) => {
    const startOfWeek = getStartOfWeek(date);
    const initialData = {};
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      const dateKey = formatDateKey(date);
      const dayOfWeek = date.getDay();
      
      initialData[dateKey] = [];
      
      // 🔒 ENHANCED: Use strict week context for initial tasks
      if (dayOfWeek === 0) {
        initialData[dateKey].push(createRecurringTaskWithStrictWeekContext('planning', dateKey));
      } else if (dayOfWeek === 5) {
        initialData[dateKey].push(createRecurringTaskWithStrictWeekContext('reflection', dateKey));
      } else if (dayOfWeek !== 6) {
        initialData[dateKey].push(createRecurringTaskWithStrictWeekContext('checkin', dateKey));
      }
    }
    
    return initialData;
  }, [createRecurringTaskWithStrictWeekContext]);

  const initializeApp = useCallback(async () => {
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
  }, [currentDate, createInitialData, validateAndCleanData]);

  useEffect(() => {
    // CRITICAL: Only initialize once
    if (!hasInitialized) {
      initializeApp();
      setHasInitialized(true);
    }
  }, [hasInitialized, initializeApp]);

  const isViewingCurrentWeek = (displayedDate) => {
    const today = new Date();
    const currentWeekStart = getStartOfWeek(new Date(today));
    const displayedWeekStart = getStartOfWeek(new Date(displayedDate));
    

    // Compare just the date parts, not time
    const currentWeekDateString = currentWeekStart.toDateString();
    const displayedWeekDateString = displayedWeekStart.toDateString();
    
    return currentWeekDateString === displayedWeekDateString;
  };

  // 🔍 ENHANCED: Better detection of existing recurring tasks with week context
  const hasRecurringTaskOfType = (tasks, taskType, dateKey) => {
    if (!Array.isArray(tasks)) return false;
    
    const recurringTitles = {
      'planning': 'Weekly Planning',
      'reflection': 'Friday Reflection', 
      'checkin': 'Daily Check-in'
    };
    
    const expectedTitle = recurringTitles[taskType];
    const currentWeek = calculateWeekIdentifier(dateKey);
    
    // 🔒 Check if there's already a task with this title AND correct week context
    const existingTask = tasks.find(task => {
      const taskWeek = task.weekContext || calculateWeekIdentifier(task.dateCreated || dateKey);
      return task.title === expectedTitle && taskWeek === currentWeek;
    });
    
    if (existingTask) {
      console.log(`✅ Found existing ${taskType} task for week ${currentWeek}:`, {
        title: existingTask.title,
        completed: existingTask.steps?.filter(s => s.status === 'complete').length || 0,
        total: existingTask.steps?.length || 0,
        hasReflection: !!(existingTask.reflection?.trim()),
        weekContext: existingTask.weekContext
      });
      return true;
    }
    
    return false;
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

  // 🔄 ENHANCED: Task update that preserves week isolation
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
    
    // 🔒 ENHANCED: Preserve important task identity fields and week context
    const currentTask = newTasks[dateKey][taskIndex]; // This is the "originalTask" - just the current task before modification
    const weekContext = currentTask.weekContext || calculateWeekIdentifier(dateKey);
    
    newTasks[dateKey][taskIndex] = {
      ...updatedTask,
      id: currentTask.id, // Preserve original ID
      dateCreated: currentTask.dateCreated || dateKey, // Preserve or set date context
      weekContext: weekContext, // Ensure week context
      taskType: currentTask.taskType || updatedTask.taskType || 'default', // Preserve task type
      isRecurring: currentTask.isRecurring || updatedTask.isRecurring || false,
      weekSpecificId: currentTask.weekSpecificId || `${currentTask.taskType || 'default'}_${weekContext}`,
      instanceId: currentTask.instanceId || `${currentTask.taskType || 'default'}_${dateKey}`,
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
  
  // 🔄 ENHANCED: Task addition with week isolation
  const handleAddTask = async (dateKey) => {
    console.log('➕ Adding task to:', dateKey);
    
    const newTasks = {...tasks};
    if (!newTasks[dateKey] || !Array.isArray(newTasks[dateKey])) {
      newTasks[dateKey] = [];
    }
    
    // 🔒 Create new task with strict week context
    const newTask = createRecurringTaskWithStrictWeekContext('default', dateKey);
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

  // 🔄 ENHANCED: Move task with week isolation validation
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
    
    const currentTask = newTasks[fromDateKey][taskIndex]; // The task being moved
    
    // 🔒 ENHANCED: For recurring tasks, prevent moving to inappropriate dates/weeks
    const recurringTitles = ['Weekly Planning', 'Friday Reflection', 'Daily Check-in'];
    if (recurringTitles.includes(currentTask.title)) {
      const toDate = new Date(toDateKey);
      const dayOfWeek = toDate.getDay();
      const fromWeek = calculateWeekIdentifier(fromDateKey);
      const toWeek = calculateWeekIdentifier(toDateKey);
      
      // Check if this recurring task makes sense for the target day
      const validMove = 
        (currentTask.title === 'Weekly Planning' && dayOfWeek === 0) ||
        (currentTask.title === 'Friday Reflection' && dayOfWeek === 5) ||
        (currentTask.title === 'Daily Check-in' && dayOfWeek >= 1 && dayOfWeek <= 4);
      
      if (!validMove) {
        console.warn(`⚠️ Cannot move ${currentTask.title} to inappropriate day`);
        alert(`${currentTask.title} can only be on appropriate days of the week.`);
        return;
      }
      
      // 🔒 CRITICAL: Warn about cross-week moves for recurring tasks
      if (fromWeek !== toWeek) {
        const confirmed = window.confirm(
          `You're moving "${currentTask.title}" from week ${formatWeekDisplay(fromWeek)} to week ${formatWeekDisplay(toWeek)}. ` +
          `This will create a new instance for the target week. Continue?`
        );
        if (!confirmed) return;
      }
      
      // Check if there's already a similar recurring task on the target date
      const existingRecurring = newTasks[toDateKey].find(task => {
        const taskWeek = task.weekContext || calculateWeekIdentifier(task.dateCreated || toDateKey);
        const targetWeek = calculateWeekIdentifier(toDateKey);
        return task.title === currentTask.title && taskWeek === targetWeek;
      });
      
      if (existingRecurring) {
        console.warn(`⚠️ ${currentTask.title} already exists on ${toDateKey} for week ${toWeek}`);
        alert(`There's already a ${currentTask.title} task for that week.`);
        return;
      }
    }
    
    // 🔒 Create moved task with updated week context
    const toWeekContext = calculateWeekIdentifier(toDateKey);
    const taskToMove = {
      ...deepCloneTask(currentTask),
      id: generateTaskId(), // New ID for moved task
      dateCreated: toDateKey, // Update date context
      weekContext: toWeekContext, // Update week context
      weekSpecificId: `${currentTask.taskType || 'default'}_${toWeekContext}`,
      instanceId: `${currentTask.taskType || 'default'}_${toDateKey}`,
      lastModified: new Date().toISOString(),
      _movedFrom: fromDateKey // Track where it came from
    };
    
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

  // 🔄 ENHANCED: Task generation with strict week isolation
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
      
      // 🔒 ENHANCED: More careful recurring task creation with week context
      if (dayOfWeek === 0 && !hasRecurringTaskOfType(updatedTasks[dateKey], 'planning', dateKey)) {
        const newTask = createRecurringTaskWithStrictWeekContext('planning', dateKey);
        updatedTasks[dateKey].push(newTask);
        tasksAdded = true;
        console.log(`➕ Created Weekly Planning for ${dateKey} (Week: ${newTask.weekContext})`);
      } else if (dayOfWeek === 5 && !hasRecurringTaskOfType(updatedTasks[dateKey], 'reflection', dateKey)) {
        const newTask = createRecurringTaskWithStrictWeekContext('reflection', dateKey);
        updatedTasks[dateKey].push(newTask);
        tasksAdded = true;
        console.log(`➕ Created Friday Reflection for ${dateKey} (Week: ${newTask.weekContext})`);
      } else if (dayOfWeek !== 6 && dayOfWeek !== 0 && dayOfWeek !== 5 && 
                !hasRecurringTaskOfType(updatedTasks[dateKey], 'checkin', dateKey)) {
        const newTask = createRecurringTaskWithStrictWeekContext('checkin', dateKey);
        updatedTasks[dateKey].push(newTask);
        tasksAdded = true;
        console.log(`➕ Created Daily Check-in for ${dateKey} (Week: ${newTask.weekContext})`);
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
        <SyncStatusBanner />

        {renderWeekView()}
      </div>
    </div>
  );
};

export default App;