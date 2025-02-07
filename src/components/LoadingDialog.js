import React from 'react';
import './LoadingDialog.css';

export const LoadingDialog = ({ message }) => (
  <div className="loading-overlay">
    <div className="loading-dialog">
      <div className="loading-spinner"></div>
      <p>{message}</p>
    </div>
  </div>
);
