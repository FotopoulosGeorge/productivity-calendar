// src/utils/taskUtils.js

/**
 * Generate a unique ID for tasks
 * @returns {string} Unique task ID
 */
export const generateTaskId = () => {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Deep clone a task object to avoid reference issues
 * @param {Object} task - The task to clone
 * @returns {Object} Deep cloned task
 */
export const deepCloneTask = (task) => {
  return {
    ...task,
    id: task.id || generateTaskId(),
    steps: task.steps ? task.steps.map(step => ({ ...step })) : [],
    reflection: task.reflection || ""
  };
};

/**
 * Create a recurring task with unique ID
 * @param {string} type - Type of recurring task ('planning', 'reflection', 'checkin')
 * @returns {Object} New task object
 */
export const createRecurringTask = (type) => {
  const generateConsistentId = (taskType, date) => {
    if (date) {
      return `recurring_${taskType}_${date}`;
    }
    return generateTaskId(); // Fallback to random ID
  };
  const baseTask = {
    id: generateTaskId(),
    reflection: ""
  };

  switch (type) {
    case 'planning':
      return {
        ...baseTask,
        title: "Weekly Planning",
        steps: [
          { description: "Review previous week", status: "pending" },
          { description: "Set new goals", status: "pending" },
          { description: "Schedule important tasks", status: "pending" }
        ]
      };
    
    case 'reflection':
      return {
        ...baseTask,
        title: "Friday Reflection",
        steps: [
          { description: "Review week's accomplishments", status: "pending" },
          { description: "Note learnings", status: "pending" },
          { description: "Plan for next week", status: "pending" }
        ]
      };
    
    case 'checkin':
      return {
        ...baseTask,
        title: "Daily Check-in",
        steps: [
          { description: "Review today's tasks", status: "pending" },
          { description: "Set priorities", status: "pending" }
        ]
      };
    
    default:
      return {
        ...baseTask,
        title: "New Task",
        steps: [
          { description: "First step", status: "pending" }
        ]
      };
  }
};