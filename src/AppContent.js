import React from 'react';
import { useAuth } from './context/AuthContext';
import SnakeGame from './SnakeGame';
import Login from './Login';

function AppContent() {
  const { user, logout } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <div className="App">
      <div className="header">
        <div className="user-info">
          <img src={user.picture} alt="Profile" className="profile-pic" />
          <span>{user.name}</span>
        </div>
        <button className="logout-button" onClick={logout}>
          Logout
        </button>
      </div>
      <SnakeGame />
    </div>
  );
}

export default AppContent;
