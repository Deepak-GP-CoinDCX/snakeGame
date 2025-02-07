import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import AppContent from './AppContent';
import './App.css';

const GOOGLE_CLIENT_ID="870353306344-qcbm04ctma0ejm39cf0qj61b6u17u9vg.apps.googleusercontent.com"
function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
