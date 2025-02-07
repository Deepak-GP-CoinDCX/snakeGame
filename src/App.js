import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import SnakeGame from './SnakeGame';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      console.log('Login success, decoded user:', decoded); // Debug log
      setUser({
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture
      });
    } catch (error) {
      console.error('Error decoding credentials:', error);
    }
  };

  const handleLoginError = () => {
    console.error('Login Failed');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Snake Game</h1>
        {!user ? (
          <div className="login-container">
            <p>Please login to play</p>
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={handleLoginError}
              useOneTap
            />
          </div>
        ) : (
          <div className="user-info">
            <img src={user.picture} alt={user.name} className="user-avatar" />
            <span>Welcome, {user.name}!</span>
          </div>
        )}
      </header>
      
      <main>
        <SnakeGame user={user} />
      </main>
    </div>
  );
}

export default App;
