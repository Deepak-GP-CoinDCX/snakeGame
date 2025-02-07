import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from './context/AuthContext';
import './Login.css';

const Login = () => {
  const { login } = useAuth();

  const handleSuccess = (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    login({
      name: decoded.name,
      email: decoded.email,
      picture: decoded.picture,
    });
  };

  const handleError = () => {
    console.log('Login Failed');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Snake Game</h1>
        <p>Sign in to play and save your scores!</p>
        <div className="google-button-container">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
            useOneTap
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
