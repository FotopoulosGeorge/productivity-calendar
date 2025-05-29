// src/components/WeeklyBanner.js
import React from 'react';
import '../styles/components/WeeklyBanner.css';

const WeeklyBanner = ({ progress }) => {
  const percentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  
  return (
    <div className="weekly-banner">
      <h2 className="banner-title">Weekly Progress</h2>
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