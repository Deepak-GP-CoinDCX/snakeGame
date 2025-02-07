import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from './context/AuthContext';
import './Login.css';
import { getPortfolio, tokenTransfer, useOkto } from "@okto_web3/react-sdk";
import { useGlobalOktoClient } from './context/OktoClientContext';

const Login = () => {
  const { login } = useAuth();
  const oktoClient = useGlobalOktoClient(); 

  const handleSuccess = async (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    login({
      name: decoded.name,
      email: decoded.email,
      picture: decoded.picture,
      tokenId: credentialResponse.credential, // Include the raw token
    });
    console.log(credentialResponse);
    const user = await oktoClient.loginUsingOAuth({
      idToken: credentialResponse.credential,
      provider: "google",
    });
    console.log(user);
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
