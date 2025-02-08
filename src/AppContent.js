import React from 'react';
import { useAuth } from './context/AuthContext';
import SnakeGame from './SnakeGame';
import Login from './Login';
import { GoogleLogin } from '@react-oauth/google';
import './AppContent.css';

function AppContent() {
  const { user, logout } = useAuth();

  return (
    <div className="App">
      {!user ? (
        <Login />
      ) : (
        <>
          <div className="user-info">
            <div className="user-content">
              <img src={user.picture} alt={user.name} className="user-avatar" />
              <span className="user-name">Welcome, {user.name}!</span>
              <button onClick={logout} className="logout-button">
                Logout
              </button>
            </div>
          </div>
          <main>
            <SnakeGame user={user} />
          </main>
        </>
      )}
    </div>
  );
}

export default AppContent;
