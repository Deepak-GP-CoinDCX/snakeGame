import ReactDOM from "react-dom/client";
import App from "./App";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { OktoProvider } from "@okto_web3/react-sdk";
import React from "react";
import { Buffer } from "buffer";

const config = {
  environment: import.meta.env.NEXT_PUBLIC_ENVIRONMENT ?? "",
  vendorPrivKey: import.meta.env.VITE_VENDOR_PRIV_KEY ?? "",
  vendorSWA: import.meta.env.VITE_VENDOR_SWA ?? "",
};
// Ensure Buffer is available globally
(globalThis as any).Buffer = Buffer;
console.log("config", config);
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <OktoProvider config={config}>
        <App />
      </OktoProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);


