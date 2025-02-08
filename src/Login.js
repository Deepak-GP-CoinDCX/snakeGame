import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from './context/AuthContext';
import './Login.css';
import { getPortfolio, tokenTransfer, useOkto } from "@okto_web3/react-sdk";
import { useGlobalOktoClient } from './context/OktoClientContext';
import Introduction from './components/Introduction';

const Login = () => {
  const { login } = useAuth();
  const oktoClient = useGlobalOktoClient(); 

  const handleSuccess = async (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    login({
      name: decoded.name,
      email: decoded.email,
      picture: decoded.picture,
      tokenId: credentialResponse.credential,
    });
    console.log(credentialResponse);
  };

  const handleError = () => {
    console.log('Login Failed');
  };

  return (
    <div className="login-container" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' }}>
      <div className="login-header">
        <div className="google-button-container">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
            useOneTap
          />
        </div>
      </div>
      <div className="login-content">
        <Introduction />
      </div>
    </div>
  );
};

export default Login;
