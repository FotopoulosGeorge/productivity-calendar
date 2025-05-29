// src/components/StepItem.js
import React from 'react';
import { CheckSquare, Square, X } from 'lucide-react';
import '../styles/components/StepItem.css';

const StepItem = ({ step, index, onToggleStatus, onUpdateDescription, onRemove }) => {
  return (
    <div className="step-item">
      <button 
        onClick={() => onToggleStatus(index)}
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
        onChange={(e) => onUpdateDescription(index, e.target.value)}
        className={`step-description-input ${
          step.status === 'complete' ? 'step-complete' : ''
        }`}
      />
      <button 
        onClick={() => onRemove(index)}
        className="step-remove-button"
      >
        <X className="step-remove-icon" />
      </button>
    </div>
  );
};

export default StepItem;