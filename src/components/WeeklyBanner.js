// src/components/WeeklyBanner.js
import React from 'react';
import '../styles/components/WeeklyBanner.css';

const getLastCheckinDate = (tasks) => {
  // Add null check first
  if (!tasks || typeof tasks !== 'object') {
    return null;
  }
  
  let lastCheckinDate = null;
  
  // Go through all dates in tasks
  Object.keys(tasks).forEach(dateKey => {
    const date = new Date(dateKey.split('-').join('/'));
    
    // Only look at past dates
    if (date < new Date()) {
      tasks[dateKey].forEach(task => {
        if (task.title === "Daily Check-in" && 
            task.steps.some(step => step.status === 'complete')) {
          
          if (!lastCheckinDate || date > lastCheckinDate) {
            lastCheckinDate = date;
          }
        }
      });
    }
  });
  
  return lastCheckinDate;
};

const WeeklyBanner = ({ progress, tasks }) => {
  const percentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  
  // Get the last check-in date
  const lastCheckin = getLastCheckinDate(tasks);
  
  // Calculate days since last check-in
  const daysSinceCheckin = lastCheckin ? 
    Math.floor((new Date() - lastCheckin) / (1000 * 60 * 60 * 24)) : null;
  
  return (
    <div className="weekly-banner">
      <h2 className="banner-title">Weekly Progress</h2>
      
      {/* Show last check-in info */}
      {daysSinceCheckin !== null && (
        <div className="last-checkin">
          Last check-in: {daysSinceCheckin === 0 ? 'Today' : 
            daysSinceCheckin === 1 ? 'Yesterday' : 
            `${daysSinceCheckin} days ago`}
        </div>
      )}
      
      <div className="banner-content">
        <div className="progress-text">
          <span className="progress-numbers">{progress.completed}/{progress.total}</span> tasks completed
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="progress-percentage">{percentage}%</div>
      </div>
    </div>
  );
};

export default WeeklyBanner;