import React from 'react';
import { useAuth } from './context/AuthContext';
import SnakeGame from './SnakeGame';
import Login from './Login';
import { GoogleLogin } from '@react-oauth/google';

function AppContent() {
  const { user, logout } = useAuth();

  return (
    <div className="App">
      <header className="App-header">
        <h1>Snake Game</h1>
        {!user ? (
          <div className="login-container" style={{ height: '100px' }}>
            <Login />
          </div>
        ) : (
          <div className="user-info">
            <img src={user.picture} alt={user.name} className="user-avatar" />
            <span>Welcome, {user.name}!</span>
            <button
              onClick={logout}
              className="logout-button"
              style={{
                marginLeft: '10px',
                padding: '5px 10px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#ff4444',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        )}
      </header>

      <main>
        <SnakeGame user={user} />
      </main>
    </div>
  );
}

export default AppContent;
