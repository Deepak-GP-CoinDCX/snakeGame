import { GoogleOAuthProvider, googleLogout } from '@react-oauth/google';
import { useState } from 'react';
import SnakesGame from "./SnakesGame";
import Login from './components/Login';

const GOOGLE_CLIENT_ID = "870353306344-qcbm04ctma0ejm39cf0qj61b6u17u9vg.apps.googleusercontent.com"; // Replace with your client ID

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogout = () => {
    // googleLogout();
    setIsAuthenticated(false);
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {!isAuthenticated ? (
        <Login setIsAuthenticated={setIsAuthenticated} />
      ) : (
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleLogout}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              padding: '8px 16px',
              backgroundColor: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
          <SnakesGame />
        </div>
      )}
    </GoogleOAuthProvider>
  );
}

export default App;
