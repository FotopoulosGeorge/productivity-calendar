// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import WeeklyBanner from './components/WeeklyBanner';
import DayCard from './components/DayCard';
import { getStartOfWeek, formatDateKey} from './utils/dateUtils';
import { loadData, saveData } from './utils/storageUtils';
import { generateTaskId, deepCloneTask, createRecurringTask } from './utils/taskUtils';
import './styles/App.css';

const App = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState({});
  const [weeklyProgress, setWeeklyProgress] = useState({ completed: 0, total: 0 });
  
  useEffect(() => {
    // Load data from storage or create initial data
    const savedData = loadData();
    if (savedData && Object.keys(savedData).length > 0) {
      // Ensure all tasks have unique IDs
      const tasksWithIds = {};
      Object.keys(savedData).forEach(dateKey => {
        tasksWithIds[dateKey] = savedData[dateKey].map(task => ({
          ...task,
          id: task.id || generateTaskId()
        }));
      });
      setTasks(tasksWithIds);
      saveData(tasksWithIds);
    } else {
      const initialData = createInitialData(currentDate);
      setTasks(initialData);
      saveData(initialData);
    }
  }, []); // Remove currentDate dependency to prevent recreation

  const calculateWeeklyProgress = useCallback(() => {
    const startOfWeek = getStartOfWeek(currentDate);
    let completed = 0;
    let total = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      const dateKey = formatDateKey(date);
      
      if (tasks[dateKey]) {
        tasks[dateKey].forEach(task => {
          if (task.steps) {
            task.steps.forEach(step => {
              const isComplete = step.status === 'complete';
              total += 1;
              if (isComplete) {
                completed += 1;
              }
            });
          }
        });
      }
    }
    
    setWeeklyProgress({ completed, total });
  }, [currentDate, tasks]);

  useEffect(() => {
    calculateWeeklyProgress();
  }, [tasks, currentDate, calculateWeeklyProgress]); 

  const handleTaskUpdate = (dateKey, taskIndex, updatedTask) => {
    const newTasks = {...tasks};
    // Ensure we're updating the specific task instance
    newTasks[dateKey][taskIndex] = {
      ...updatedTask,
      id: newTasks[dateKey][taskIndex].id // Preserve the original ID
    };
    setTasks(newTasks);
    saveData(newTasks);
  };
  
  const handleAddTask = (dateKey) => {
    const newTasks = {...tasks};
    if (!newTasks[dateKey]) {
      newTasks[dateKey] = [];
    }
    
    newTasks[dateKey].push(createRecurringTask('default'));
    
    setTasks(newTasks);
    saveData(newTasks);
  };

  const handleDeleteTask = (dateKey, taskIndex) => {
    const newTasks = {...tasks};
    newTasks[dateKey].splice(taskIndex, 1);
    setTasks(newTasks);
    saveData(newTasks);
  };

  const handleMoveTask = (fromDateKey, taskIndex, toDateKey) => {
    const newTasks = {...tasks};
    
    // If the destination date doesn't have an array yet, create one
    if (!newTasks[toDateKey]) {
      newTasks[toDateKey] = [];
    }
    
    // Deep clone the task to avoid reference issues
    const taskToMove = deepCloneTask(newTasks[fromDateKey][taskIndex]);
    
    // Generate new ID for the moved task to ensure uniqueness
    taskToMove.id = generateTaskId();
    
    // Add to new date
    newTasks[toDateKey].push(taskToMove);
    
    // Remove from original date
    newTasks[fromDateKey].splice(taskIndex, 1);
    
    setTasks(newTasks);
    saveData(newTasks);
  };
  
  const createInitialData = (date) => {
    const startOfWeek = getStartOfWeek(date);
    const initialData = {};
    
    // Add recurring tasks based on day of week
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      const dateKey = formatDateKey(date);
      const dayOfWeek = date.getDay();
      
      initialData[dateKey] = [];
      
      // Add recurring tasks with unique IDs
      if (dayOfWeek === 0) { // Sunday
        initialData[dateKey].push(createRecurringTask('planning'));
      } else if (dayOfWeek === 5) { // Friday
        initialData[dateKey].push(createRecurringTask('reflection'));
      } else if (dayOfWeek !== 6) { // Monday-Thursday
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
        
        // Add recurring tasks with unique IDs
        if (dayOfWeek === 0) { // Sunday
          updatedTasks[dateKey].push({
            id: generateTaskId(),
            title: "Weekly Planning",
            steps: [
              { description: "Review previous week", status: "pending" },
              { description: "Set new goals", status: "pending" },
              { description: "Schedule important tasks", status: "pending" }
            ],
            reflection: ""
          });
        } else if (dayOfWeek === 5) { // Friday
          updatedTasks[dateKey].push({
            id: generateTaskId(),
            title: "Friday Reflection",
            steps: [
              { description: "Review week's accomplishments", status: "pending" },
              { description: "Note learnings", status: "pending" },
              { description: "Plan for next week", status: "pending" }
            ],
            reflection: ""
          });
        } else if (dayOfWeek !== 6) { // Monday-Thursday
          updatedTasks[dateKey].push({
            id: generateTaskId(),
            title: "Daily Check-in",
            steps: [
              { description: "Review today's tasks", status: "pending" },
              { description: "Set priorities", status: "pending" }
            ],
            reflection: ""
          });
        }
      }
    }
    
    return { updatedTasks, tasksAdded };
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
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(newDate.getDate() - 7);
                setCurrentDate(newDate);
                
                // Generate tasks for the new week if they don't exist
                const startOfWeek = getStartOfWeek(newDate);
                const { updatedTasks, tasksAdded } = generateTasksForWeek(startOfWeek);
                
                if (tasksAdded) {
                  setTasks(updatedTasks);
                  saveData(updatedTasks);
                }
              }}
            >
             &lt; Previous Week
            </button>
            
            <button 
              className="today-button"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </button>
            <button 
              className="nav-button"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(newDate.getDate() + 7);
                setCurrentDate(newDate);
                
                // Generate tasks for the new week if they don't exist
                const startOfWeek = getStartOfWeek(newDate);
                const { updatedTasks, tasksAdded } = generateTasksForWeek(startOfWeek);
                
                if (tasksAdded) {
                  setTasks(updatedTasks);
                  saveData(updatedTasks);
                }
              }}
            >
              Next Week &gt;
            </button>
          </div>
        </div>
        {renderWeekView()}
      </div>
    </div>
  );
};

export default App;