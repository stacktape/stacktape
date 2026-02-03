import http from 'node:http';
import crypto from 'node:crypto';
import { openBrowser } from '../../_utils/browser';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { COGNITO_CONFIG } from 'src/config/params';

const cognitoClient = new CognitoIdentityProviderClient({ region: COGNITO_CONFIG.region });

// ============ Email/Password Authentication ============

export type SignUpResult = {
  success: boolean;
  userConfirmed: boolean;
  error?: string;
};

/**
 * Sign up with email and password - directly to Cognito (password never touches our server)
 */
export const signUpWithEmail = async (params: {
  email: string;
  password: string;
  name: string;
}): Promise<SignUpResult> => {
  try {
    const result = await cognitoClient.send(
      new SignUpCommand({
        ClientId: COGNITO_CONFIG.clientId,
        Username: params.email,
        Password: params.password,
        UserAttributes: [
          { Name: 'email', Value: params.email },
          { Name: 'custom:fullName', Value: params.name }
        ]
      })
    );

    return {
      success: true,
      userConfirmed: result.UserConfirmed || false
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('already exists')) {
      return { success: false, userConfirmed: false, error: 'An account with this email already exists' };
    }
    if (message.includes('password') || message.includes('Password')) {
      return {
        success: false,
        userConfirmed: false,
        error: 'Password does not meet requirements (min 8 chars, include number)'
      };
    }

    return { success: false, userConfirmed: false, error: message };
  }
};

/**
 * Verify email with confirmation code
 */
export const confirmSignUp = async (params: {
  email: string;
  code: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    await cognitoClient.send(
      new ConfirmSignUpCommand({
        ClientId: COGNITO_CONFIG.clientId,
        Username: params.email,
        ConfirmationCode: params.code
      })
    );

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('Invalid') || message.includes('CodeMismatch')) {
      return { success: false, error: 'Invalid verification code' };
    }
    if (message.includes('expired')) {
      return { success: false, error: 'Verification code has expired' };
    }

    return { success: false, error: message };
  }
};

/**
 * Resend confirmation code
 */
export const resendConfirmationCode = async (params: {
  email: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    await cognitoClient.send(
      new ResendConfirmationCodeCommand({
        ClientId: COGNITO_CONFIG.clientId,
        Username: params.email
      })
    );
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
};

/**
 * Authenticate with email and password, get tokens
 */
export const authenticateWithPassword = async (params: {
  email: string;
  password: string;
}): Promise<{ success: boolean; accessToken?: string; idToken?: string; refreshToken?: string; error?: string }> => {
  try {
    const result = await cognitoClient.send(
      new InitiateAuthCommand({
        ClientId: COGNITO_CONFIG.clientId,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: params.email,
          PASSWORD: params.password
        }
      })
    );

    if (result.AuthenticationResult) {
      return {
        success: true,
        accessToken: result.AuthenticationResult.AccessToken,
        idToken: result.AuthenticationResult.IdToken,
        refreshToken: result.AuthenticationResult.RefreshToken
      };
    }

    // Handle MFA or other challenges if needed
    if (result.ChallengeName) {
      return { success: false, error: `Authentication challenge: ${result.ChallengeName}` };
    }

    return { success: false, error: 'Authentication failed' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('Incorrect') || message.includes('NotAuthorized')) {
      return { success: false, error: 'Incorrect email or password' };
    }
    if (message.includes('not confirmed')) {
      return { success: false, error: 'Please verify your email first' };
    }

    return { success: false, error: message };
  }
};

// ============ Google OAuth with Local Callback Server ============

/**
 * Generate PKCE code verifier and challenge for secure OAuth
 */
const generatePKCE = () => {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
};

// Fixed port for OAuth callback - must be registered in Cognito app client
const OAUTH_CALLBACK_PORT = 19835;

/**
 * Find an available port for the local callback server
 * Uses a fixed port so it can be registered in Cognito callback URLs
 */
const findAvailablePort = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(OAUTH_CALLBACK_PORT, () => {
      server.close(() => resolve(OAUTH_CALLBACK_PORT));
    });
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${OAUTH_CALLBACK_PORT} is already in use. Please close the application using it.`));
      } else {
        reject(err);
      }
    });
  });
};

export type OAuthResult = {
  success: boolean;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  error?: string;
};

/**
 * Authenticate with Google OAuth using local callback server
 *
 * Flow:
 * 1. Start local HTTP server on random port
 * 2. Open browser to Cognito hosted UI with Google identity provider
 * 3. User authenticates with Google
 * 4. Cognito redirects to localhost with authorization code
 * 5. Exchange code for tokens
 */
export const authenticateWithGoogle = async (): Promise<OAuthResult> => {
  try {
    // 1. Find available port and generate PKCE
    const port = await findAvailablePort();
    const redirectUri = `http://localhost:${port}/callback`;
    const { verifier, challenge } = generatePKCE();
    const state = crypto.randomBytes(16).toString('hex');

    // 2. Create promise that resolves when we receive the callback
    const authCodePromise = new Promise<{ code: string; receivedState: string }>((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const url = new URL(req.url || '', `http://localhost:${port}`);

        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code');
          const receivedState = url.searchParams.get('state');
          const error = url.searchParams.get('error');

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                  <div style="text-align: center;">
                    <h1 style="color: #e53e3e;">Authentication Failed</h1>
                    <p>Error: ${error}</p>
                    <p>You can close this window.</p>
                  </div>
                </body>
              </html>
            `);
            server.close();
            reject(new Error(error));
            return;
          }

          if (code && receivedState) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                  <div style="text-align: center;">
                    <h1 style="color: #38a169;">Authentication Successful!</h1>
                    <p>You can close this window and return to your terminal.</p>
                  </div>
                </body>
              </html>
            `);
            server.close();
            resolve({ code, receivedState });
          } else {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<html><body>Missing code or state</body></html>');
          }
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      server.listen(port);

      // Timeout after 5 minutes
      setTimeout(
        () => {
          server.close();
          reject(new Error('Authentication timed out'));
        },
        5 * 60 * 1000
      );
    });

    // 3. Build authorization URL
    const authUrl = new URL(`https://${COGNITO_CONFIG.domain}/oauth2/authorize`);
    authUrl.searchParams.set('client_id', COGNITO_CONFIG.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('identity_provider', 'Google');
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);

    // 4. Open browser
    try {
      await openBrowser(authUrl.toString());
    } catch {
      // Browser may not open in some environments
    }

    // 5. Wait for callback
    const { code, receivedState } = await authCodePromise;

    // Verify state
    if (receivedState !== state) {
      return { success: false, error: 'State mismatch - possible CSRF attack' };
    }

    // 6. Exchange code for tokens
    const tokenUrl = `https://${COGNITO_CONFIG.domain}/oauth2/token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: COGNITO_CONFIG.clientId,
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return { success: false, error: `Token exchange failed: ${errorText}` };
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      id_token: string;
      refresh_token?: string;
    };

    return {
      success: true,
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
};

/**
 * Get the authorization URL for manual opening (fallback if auto-open fails)
 */
export const getGoogleAuthUrl = async (): Promise<{ url: string; port: number }> => {
  const port = await findAvailablePort();
  const redirectUri = `http://localhost:${port}/callback`;
  const { challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  const authUrl = new URL(`https://${COGNITO_CONFIG.domain}/oauth2/authorize`);
  authUrl.searchParams.set('client_id', COGNITO_CONFIG.clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('identity_provider', 'Google');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);

  return { url: authUrl.toString(), port };
};
