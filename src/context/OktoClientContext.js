import React, { createContext, useContext } from 'react';
import { useOkto } from "@okto_web3/react-sdk";

const OktoClientContext = createContext();

export const OktoClientProvider = ({ children }) => {
  const oktoClient = useOkto();

  return (
    <OktoClientContext.Provider value={oktoClient}>
      {children}
    </OktoClientContext.Provider>
  );
};

export const useGlobalOktoClient = () => {
  const context = useContext(OktoClientContext);
  if (!context) {
    throw new Error('useGlobalOktoClient must be used within an OktoClientProvider');
  }
  return context;
};
