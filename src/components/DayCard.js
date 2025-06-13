// src/components/DayCard.js
import React from 'react';
import TaskItem from './TaskItem';
import { isSameDay } from '../utils/dateUtils';
import '../styles/components/DayCard.css';

const DayCard = ({ date, tasks, onTaskUpdate, onAddTask, onDeleteTask, onMoveTask }) => {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dayOfMonth = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const isToday = isSameDay(date, new Date());
  

  return (
    <div className={`day-card ${isToday ? 'day-card-today' : ''}`}>
      <div className="day-header">
        <div className="day-info">
          <div className={`day-name ${isToday ? 'day-name-today' : ''}`}>{dayOfWeek}</div>
          <div className="day-date">{month} {dayOfMonth}</div>
        </div>
        <button 
          onClick={onAddTask}
          className="add-task-button"
          title="Add Task"
        >
          +
        </button>
      </div>      

    <div className="tasks-container">
      {tasks.map((task, taskIndex) => (
        <TaskItem 
          key={task.id || `task-${taskIndex}-${date.getTime()}`} 
          task={task} 
          onUpdate={(updatedTask) => onTaskUpdate(taskIndex, updatedTask)} 
          onDeleteTask={() => onDeleteTask(taskIndex)}
          onMoveTask={(toDateKey) => onMoveTask(taskIndex, toDateKey)}
        />
      ))}
    </div>
    </div>
  );
};

export default DayCard;