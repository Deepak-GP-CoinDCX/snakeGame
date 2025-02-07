import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { useOkto } from '@okto_web3/react-sdk';

interface LoginProps {
    setIsAuthenticated: (value: boolean) => void;
}

const Login = ({ setIsAuthenticated }: LoginProps) => {
    const oktoClient = useOkto();
    const handleAuthenticate = async (idToken: string) => {
        try {
            console.log('idToken:', idToken);

            const user = await oktoClient.loginUsingOAuth({
                idToken: idToken,
                provider: "google",
            });
            console.log("Authenticated with Okto:", user);

        } catch (error) {
            console.error("Authentication failed:", error);
            // Remove invalid token from storage
            localStorage.removeItem('googleIdToken');
        }
    };
    return (

        <div className="login-container">
            <h1>Welcome to Snake Game</h1>
            <div className="login-box">
                <h2>Please sign in to play</h2>
                <GoogleLogin
                    onSuccess={(credentialResponse) => {
                        // const decoded = (credentialResponse.credential || '');
                        console.log(credentialResponse.credential);
                        setIsAuthenticated(true);
                        if (credentialResponse.credential) {
                            console.log('Credential:', credentialResponse.credential);
                            handleAuthenticate(credentialResponse.credential);
                        } else {
                            console.log('No credential in response');
                        }

                    }}
                    onError={() => {
                        console.log('Login Failed');
                    }}
                    useOneTap={false} // Optional

                />
            </div>
        </div>
    );
};

export default Login;
