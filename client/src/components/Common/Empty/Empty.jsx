import React from 'react';
import './Empty.css';

const Empty = ({ 
  message = "No data available", 
  description = "There's nothing to show here yet.",
  icon = "📭",
  actionButton = null
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        {icon}
      </div>
      <h3 className="empty-state__message">
        {message}
      </h3>
      <p className="empty-state__description">
        {description}
      </p>
      {actionButton && (
        <div className="empty-state__action">
          {actionButton}
        </div>
      )}
    </div>
  );
};

export default Empty;
