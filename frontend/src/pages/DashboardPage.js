import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';

const DashboardPage = () => {
  const { currentUser, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Job Seeker Portal</h1>
        <div className="user-info">
          <span>Welcome, {currentUser.full_name}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      
      <main className="dashboard-content">
        <div className="dashboard-card">
          <h2>Welcome to Your Dashboard</h2>
          <p>Registration successful! Here's your account information:</p>
          
          <div className="user-details">
            <div className="detail-item">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{currentUser.full_name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{currentUser.email}</span>
            </div>
          </div>
          
          <div className="dashboard-actions">
            <button className="action-button">Complete Profile</button>
            <button className="action-button">Browse Jobs</button>
            <button className="action-button">Upload Resume</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;