// src/components/TaskItem.js
import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, Square, X, FileText } from 'lucide-react';
import { getStartOfWeek, formatDateKey } from '../utils/dateUtils';
import '../styles/components/TaskItem.css';

const TaskItem = ({ task, onUpdate, onDeleteTask, onMoveTask }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editedTask, setEditedTask] = useState(() => ({
    ...task,
    id: task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }));
  const textareaRef = useRef(null);
  
  // Update local state when task prop changes
  useEffect(() => {
    setEditedTask(prevEditedTask => ({
      ...task,
      id: task.id || prevEditedTask.id
    }));
  }, [task]); // Only depend on task prop
  
  const handleTitleChange = (e) => {
    const updatedTask = { ...editedTask, title: e.target.value };
    setEditedTask(updatedTask);

    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editedTask.title]);
  
  const handleReflectionChange = (e) => {
    const updatedTask = { ...editedTask, reflection: e.target.value };
    setEditedTask(updatedTask);
    onUpdate(updatedTask);
  };
  
  const updateStep = (index, field, value) => {
    const updatedSteps = editedTask.steps.map((step, i) => 
      i === index ? { ...step, [field]: value } : step
    );
    
    const newTask = { ...editedTask, steps: updatedSteps };
    setEditedTask(newTask);
    onUpdate(newTask);
  };
  
  const addStep = () => {
    const updatedSteps = [...editedTask.steps, { description: "", status: "pending" }];
    const newTask = { ...editedTask, steps: updatedSteps };
    setEditedTask(newTask);
    onUpdate(newTask);
  };
  
  const removeStep = (index) => {
    const updatedSteps = editedTask.steps.filter((_, i) => i !== index);
    const newTask = { ...editedTask, steps: updatedSteps };
    setEditedTask(newTask);
    onUpdate(newTask);
  };
  
  const toggleStatus = (index) => {
    const currentStatus = editedTask.steps[index].status;
    const newStatus = currentStatus === 'complete' ? 'pending' : 'complete';
    updateStep(index, 'status', newStatus);
  };
  
  const completeCount = editedTask.steps.filter(s => s.status === 'complete').length;
  
  const getMultipleWeekDates = () => {
    const weeks = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Previous week
    const prevWeekStart = getStartOfWeek(new Date());
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    
    // Current week
    const currentWeekStart = getStartOfWeek(new Date());
    
    // Next week
    const nextWeekStart = getStartOfWeek(new Date());
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    
    const weekStarts = [
      { start: prevWeekStart, label: 'Previous Week' },
      { start: currentWeekStart, label: 'This Week' },
      { start: nextWeekStart, label: 'Next Week' }
    ];
    
    weekStarts.forEach(({ start, label }) => {
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        weekDays.push({
          dateKey: formatDateKey(date),
          name: dayNames[i],
          date: date.getDate(),
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          fullDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
      weeks.push({ label, days: weekDays });
    });
    
    return weeks;
  };

  const renderTaskActions = () => {
    if (!isExpanded) return null;
    
    const weeks = getMultipleWeekDates();

    return (
      <div className="task-actions">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Are you sure you want to delete this task?')) {
              onDeleteTask();
            }
          }}
          className="task-delete-button"
        >
          Delete
        </button>

        <div className="task-move-container">
          <select 
            onChange={(e) => {
              if (e.target.value) {
                onMoveTask(e.target.value);
                e.target.value = ''; // Reset selection
              }
            }}
            defaultValue=""
            className="task-move-select"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="" disabled>Move to...</option>
            {weeks.map((week, weekIndex) => (
              <optgroup key={weekIndex} label={week.label}>
                {week.days.map((day, dayIndex) => (
                  <option key={`${weekIndex}-${dayIndex}`} value={day.dateKey}>
                    {day.name} ({day.fullDate})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="task-item">
      <div className="task-header" onClick={() => setIsExpanded(!isExpanded)}>
        <textarea 
          ref={textareaRef} 
          value={editedTask.title} 
          onChange={handleTitleChange}
          onBlur={() => onUpdate(editedTask)}
          className="task-title-textarea"
          onClick={(e) => e.stopPropagation()}
          style={{
            height: 'auto',
            overflow: 'hidden' 
          }}
        />
        <span className="task-progress">
          {completeCount}/{editedTask.steps.length}
        </span>
      </div>
      
      {isExpanded && (
        <div className="task-details">
          <div className="steps-container">
            {editedTask.steps.map((step, index) => (
              <div key={index} className="step-row">
                <button 
                  onClick={() => toggleStatus(index)}
                  className="step-status-button"
                >
                  {step.status === 'complete' ? 
                    <CheckSquare className="step-complete-icon" /> : 
                    <Square className="step-pending-icon" />
                  }
                </button>
                <input 
                  type="text" 
                  value={step.description} 
                  onChange={(e) => updateStep(index, 'description', e.target.value)}
                  className={`step-description-input ${
                    step.status === 'complete' ? 'step-complete' : ''
                  }`}
                />
                <button 
                  onClick={() => removeStep(index)}
                  className="step-remove-button"
                >
                  <X className="step-remove-icon" />
                </button>
              </div>
            ))}
          </div>
          
          <button 
            onClick={addStep}
            className="add-step-button"
          >
            + Add Step
          </button>
          
          <div className="reflection-container">
            <div className="reflection-header">
              <FileText className="reflection-icon" />
              Reflect
            </div>
            <textarea 
              value={editedTask.reflection}
              onChange={handleReflectionChange}
              className="reflection-textarea"
              placeholder="Your reflections..."
            />
          </div>
          {renderTaskActions()}
        </div>
      )}
    </div>
  );
};

export default TaskItem;