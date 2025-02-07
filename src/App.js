import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import AppContent from './AppContent';
import './App.css';
import { Buffer } from "buffer";
import { OktoProvider } from "@okto_web3/react-sdk";
const GOOGLE_CLIENT_ID="870353306344-qcbm04ctma0ejm39cf0qj61b6u17u9vg.apps.googleusercontent.com";
// Ensure Buffer is available globally

const defaultConfig = {
  environment: "sandbox",
  vendorPrivKey: "0xadf2181a7b2dec0f1ed22061ab31bd6182691c619d9e874a956e71ab7ecca413",
  vendorSWA: "0x6b6Fad2600Bc57075ee560A6fdF362FfefB9dC3C",
};
const config = {
  environment:  defaultConfig.environment,
  vendorPrivKey:
defaultConfig.vendorPrivKey,
  vendorSWA: defaultConfig.vendorSWA,
};
global.Buffer = Buffer;

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
      <OktoProvider config={config}>
        <AppContent />
        </OktoProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
