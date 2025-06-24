// UPDATED taskUtils.js - Enhanced createRecurringTask function

// Generate unique task ID
export const generateTaskId = () => {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Deep clone a task to avoid reference issues
export const deepCloneTask = (task) => {
  return JSON.parse(JSON.stringify(task));
};

// 🆕 ENHANCED: Create recurring task with date context and unique identity
export const createRecurringTask = (taskType, dateKey = null) => {
  const currentDate = dateKey || new Date().toISOString().split('T')[0];
  const baseId = generateTaskId();
  
  const commonProps = {
    id: baseId,
    lastModified: new Date().toISOString(),
    dateCreated: currentDate,
    taskType: taskType, // Track the type for better identification
    isRecurring: true, // Flag to identify recurring tasks
  };

  switch (taskType) {
    case 'planning':
      return {
        ...commonProps,
        title: 'Weekly Planning',
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
        reflection: '',
        category: 'planning',
        weekContext: getWeekIdentifier(currentDate) // Add week context
      };

    case 'reflection':
      return {
        ...commonProps,
        title: 'Friday Reflection',
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
        reflection: '',
        category: 'reflection',
        weekContext: getWeekIdentifier(currentDate)
      };

    case 'checkin':
      return {
        ...commonProps,
        title: 'Daily Check-in',
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
        category: 'checkin',
        dayContext: currentDate // Add specific day context
      };

    case 'default':
    default:
      return {
        ...commonProps,
        title: 'New Task',
        steps: [
          { 
            id: `${baseId}_step_1`,
            description: 'Complete task', 
            status: 'pending' 
          }
        ],
        reflection: '',
        category: 'custom',
        isRecurring: false // Default tasks are not recurring
      };
  }
};

// 🆕 Helper function to get week identifier for better task grouping
const getWeekIdentifier = (dateString) => {
  const date = new Date(dateString);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - startOfYear) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
};

// 🆕 Helper function to check if a task is a recurring task
export const isRecurringTask = (task) => {
  const recurringTitles = ['Weekly Planning', 'Friday Reflection', 'Daily Check-in'];
  return recurringTitles.includes(task.title) || task.isRecurring === true;
};

// 🆕 Helper function to get task completion status
export const getTaskCompletionStatus = (task) => {
  if (!task.steps || !Array.isArray(task.steps) || task.steps.length === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }
  
  const completed = task.steps.filter(step => step.status === 'complete').length;
  const total = task.steps.length;
  const percentage = Math.round((completed / total) * 100);
  
  return { completed, total, percentage };
};

// 🆕 Helper function to validate task structure
export const validateTaskStructure = (task) => {
  const errors = [];
  
  if (!task.id) {
    errors.push('Task missing ID');
  }
  
  if (!task.title || task.title.trim() === '') {
    errors.push('Task missing title');
  }
  
  if (!task.steps || !Array.isArray(task.steps)) {
    errors.push('Task missing or invalid steps array');
  } else {
    task.steps.forEach((step, index) => {
      if (!step.description) {
        errors.push(`Step ${index + 1} missing description`);
      }
      if (!['pending', 'complete'].includes(step.status)) {
        errors.push(`Step ${index + 1} has invalid status: ${step.status}`);
      }
    });
  }
  
  if (task.reflection === undefined) {
    errors.push('Task missing reflection field');
  }
  
  if (!task.lastModified) {
    errors.push('Task missing lastModified timestamp');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// 🆕 Helper function to repair task structure
export const repairTaskStructure = (task) => {
  const repaired = { ...task };
  
  // Fix missing ID
  if (!repaired.id) {
    repaired.id = generateTaskId();
  }
  
  // Fix missing title
  if (!repaired.title || repaired.title.trim() === '') {
    repaired.title = 'Untitled Task';
  }
  
  // Fix missing or invalid steps
  if (!repaired.steps || !Array.isArray(repaired.steps)) {
    repaired.steps = [{ 
      id: `${repaired.id}_step_1`,
      description: 'Complete task', 
      status: 'pending' 
    }];
  } else {
    // Repair individual steps
    repaired.steps = repaired.steps.map((step, index) => ({
      id: step.id || `${repaired.id}_step_${index + 1}`,
      description: step.description || `Step ${index + 1}`,
      status: ['pending', 'complete'].includes(step.status) ? step.status : 'pending'
    }));
  }
  
  // Fix missing reflection
  if (repaired.reflection === undefined) {
    repaired.reflection = '';
  }
  
  // Fix missing timestamp
  if (!repaired.lastModified) {
    repaired.lastModified = new Date().toISOString();
  }
  
  // Add missing recurring task properties
  if (isRecurringTask(repaired) && !repaired.isRecurring) {
    repaired.isRecurring = true;
    if (!repaired.taskType) {
      if (repaired.title === 'Weekly Planning') repaired.taskType = 'planning';
      else if (repaired.title === 'Friday Reflection') repaired.taskType = 'reflection';
      else if (repaired.title === 'Daily Check-in') repaired.taskType = 'checkin';
    }
  }
  
  return repaired;
};

// 🆕 Helper function to compare task versions for merging
export const compareTaskVersions = (task1, task2) => {
  const status1 = getTaskCompletionStatus(task1);
  const status2 = getTaskCompletionStatus(task2);
  
  const time1 = new Date(task1.lastModified || 0).getTime();
  const time2 = new Date(task2.lastModified || 0).getTime();
  
  return {
    task1: {
      completion: status1,
      lastModified: time1,
      hasReflection: !!(task1.reflection && task1.reflection.trim())
    },
    task2: {
      completion: status2,
      lastModified: time2,
      hasReflection: !!(task2.reflection && task2.reflection.trim())
    },
    recommendation: {
      preferTask1: status1.percentage > status2.percentage || 
                   (status1.percentage === status2.percentage && time1 > time2),
      reason: status1.percentage > status2.percentage ? 'better completion' :
              status1.percentage === status2.percentage && time1 > time2 ? 'more recent' :
              'task2 has better completion or is more recent'
    }
  };
};