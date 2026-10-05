import http from 'node:http';
import type { AddressInfo } from 'node:net';
import crypto from 'node:crypto';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  RespondToAuthChallengeCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { COGNITO_CONFIG } from 'src/config/params';
import { createFetchHandler } from 'src/aws/fetch-handler';
import { openBrowser } from '../browser';
import { oauthCallbackHeaders, renderOAuthCallbackPage, type OAuthCallbackPage } from './oauth-callback-page';

let cognitoClient: CognitoIdentityProviderClient | undefined;

/** Created on first use, so importing this module does no work. */
const getCognitoClient = (): CognitoIdentityProviderClient =>
  (cognitoClient ??= new CognitoIdentityProviderClient({
    region: COGNITO_CONFIG.region,
    requestHandler: createFetchHandler()
  }));

/**
 * Why a Cognito call failed, as a closed set a caller can branch on.
 *
 * The `error` strings below are written for the terminal flow and stay as they were. The init wizard
 * words its own messages, so it needs the kind of failure rather than a sentence to display.
 */
export type CognitoFailureCode =
  | 'account-exists'
  | 'password-rejected'
  | 'invalid-email'
  | 'code-mismatch'
  | 'code-expired'
  | 'email-not-confirmed'
  | 'invalid-credentials'
  | 'session-expired'
  | 'too-many-attempts'
  | 'password-reset-required'
  | 'network'
  | 'unknown';

/**
 * Classifies by the exception name the AWS SDK sets, and by the message only where one name covers
 * several situations (`NotAuthorizedException` is a wrong password, a locked account and an expired
 * challenge session alike).
 */
export const classifyCognitoFailure = (error: unknown): CognitoFailureCode => {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : '';

  if (name === 'UsernameExistsException' || message.includes('already exists')) return 'account-exists';
  if (name === 'InvalidPasswordException') return 'password-rejected';
  if (name === 'InvalidParameterException') {
    if (/password/i.test(message)) return 'password-rejected';
    return /email|username/i.test(message) ? 'invalid-email' : 'unknown';
  }
  if (name === 'CodeMismatchException') return 'code-mismatch';
  if (name === 'ExpiredCodeException') return 'code-expired';
  if (name === 'UserNotConfirmedException') return 'email-not-confirmed';
  if (name === 'PasswordResetRequiredException') return 'password-reset-required';
  if (
    name === 'LimitExceededException' ||
    name === 'TooManyRequestsException' ||
    name === 'TooManyFailedAttemptsException' ||
    /attempts exceeded/i.test(message)
  ) {
    return 'too-many-attempts';
  }
  if (name === 'NotAuthorizedException') {
    if (/session/i.test(message)) return 'session-expired';
    return /disabled/i.test(message) ? 'unknown' : 'invalid-credentials';
  }
  if (name === 'UserNotFoundException') return 'invalid-credentials';
  if (name === 'TypeError' || /fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT/i.test(message)) {
    return 'network';
  }
  return 'unknown';
};

export type SignUpResult = {
  success: boolean;
  userConfirmed: boolean;
  error?: string;
  code?: CognitoFailureCode;
};

export const signUpWithEmail = async (params: {
  email: string;
  password: string;
  /** Asked for in the terminal. The init wizard does not ask, and omits it. */
  name?: string;
}): Promise<SignUpResult> => {
  try {
    const result = await getCognitoClient().send(
      new SignUpCommand({
        ClientId: COGNITO_CONFIG.clientId,
        Username: params.email,
        Password: params.password,
        UserAttributes: [
          { Name: 'email', Value: params.email },
          // Sent only when a name was asked for. Without one, Console's post-confirmation Lambda
          // reads a name from the address. That needs the Lambda version that does so: an older one
          // fails the sign-up after Cognito has confirmed it, which is why the Console API ships
          // before a CLI that signs up without a name (launch item L18).
          ...(params.name ? [{ Name: 'custom:fullName', Value: params.name }] : [])
        ]
      })
    );

    return {
      success: true,
      userConfirmed: result.UserConfirmed || false
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const code = classifyCognitoFailure(error);

    if (message.includes('already exists')) {
      return { success: false, userConfirmed: false, error: 'An account with this email already exists', code };
    }
    if (message.includes('password') || message.includes('Password')) {
      return {
        success: false,
        userConfirmed: false,
        error: 'Password does not meet requirements (min 8 characters)',
        code
      };
    }

    return { success: false, userConfirmed: false, error: message, code };
  }
};

export const confirmSignUp = async (params: {
  email: string;
  code: string;
}): Promise<{ success: boolean; error?: string; code?: CognitoFailureCode }> => {
  try {
    await getCognitoClient().send(
      new ConfirmSignUpCommand({
        ClientId: COGNITO_CONFIG.clientId,
        Username: params.email,
        ConfirmationCode: params.code
      })
    );

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const code = classifyCognitoFailure(error);

    // The email was confirmed by an earlier attempt whose reply was lost or failed after the
    // confirmation itself. Entering the code again must not be a dead end: the caller signs in next.
    if (message.includes('Current status is CONFIRMED')) {
      return { success: true };
    }
    if (message.includes('Invalid') || message.includes('CodeMismatch')) {
      return { success: false, error: 'Invalid verification code', code };
    }
    if (message.includes('expired')) {
      return { success: false, error: 'Verification code has expired', code };
    }

    return { success: false, error: message, code };
  }
};

export const resendConfirmationCode = async (params: {
  email: string;
}): Promise<{ success: boolean; error?: string; code?: CognitoFailureCode }> => {
  try {
    await getCognitoClient().send(
      new ResendConfirmationCodeCommand({
        ClientId: COGNITO_CONFIG.clientId,
        Username: params.email
      })
    );
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message, code: classifyCognitoFailure(error) };
  }
};

export type PasswordAuthResult = {
  success: boolean;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  error?: string;
  code?: CognitoFailureCode;
  /**
   * Set when Cognito wants another step before it issues tokens.
   *
   * `session` is the handle that step must present. It is short-lived and stands in for the password
   * already checked, so it is held in memory only and never shown.
   */
  challenge?: { name: string; session: string; username: string };
};

type AuthCommandOutput = {
  AuthenticationResult?: { AccessToken?: string; IdToken?: string; RefreshToken?: string };
  ChallengeName?: string;
  ChallengeParameters?: Record<string, string>;
  Session?: string;
};

const toPasswordAuthResult = (result: AuthCommandOutput, username: string): PasswordAuthResult => {
  if (result.AuthenticationResult) {
    return {
      success: true,
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken
    };
  }

  if (result.ChallengeName) {
    return {
      success: false,
      error: `Authentication challenge: ${result.ChallengeName}`,
      challenge: {
        name: result.ChallengeName,
        session: result.Session ?? '',
        // Cognito names the user it is challenging; the answer has to name the same one.
        username: result.ChallengeParameters?.USER_ID_FOR_SRP ?? username
      }
    };
  }

  return { success: false, error: 'Authentication failed' };
};

export const authenticateWithPassword = async (params: {
  email: string;
  password: string;
}): Promise<PasswordAuthResult> => {
  try {
    const result = await getCognitoClient().send(
      new InitiateAuthCommand({
        ClientId: COGNITO_CONFIG.clientId,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: params.email,
          PASSWORD: params.password
        }
      })
    );

    return toPasswordAuthResult(result, params.email);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const code = classifyCognitoFailure(error);

    if (message.includes('Incorrect') || message.includes('NotAuthorized')) {
      return { success: false, error: 'Incorrect email or password', code };
    }
    if (message.includes('not confirmed')) {
      return { success: false, error: 'EMAIL_NOT_CONFIRMED', code };
    }

    return { success: false, error: message, code };
  }
};

/** Answers a `SOFTWARE_TOKEN_MFA` challenge with the code from the user's authenticator app. */
export const answerTotpChallenge = async (params: {
  username: string;
  session: string;
  code: string;
}): Promise<PasswordAuthResult> => {
  try {
    const result = await getCognitoClient().send(
      new RespondToAuthChallengeCommand({
        ClientId: COGNITO_CONFIG.clientId,
        ChallengeName: 'SOFTWARE_TOKEN_MFA',
        Session: params.session,
        ChallengeResponses: {
          USERNAME: params.username,
          SOFTWARE_TOKEN_MFA_CODE: params.code
        }
      })
    );

    return toPasswordAuthResult(result, params.username);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message, code: classifyCognitoFailure(error) };
  }
};

const generatePKCE = () => {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
};

/** Registered with Cognito as an allowed callback, so it cannot change. */
const OAUTH_CALLBACK_PORT = 19835;
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

export const createGoogleAuthorizationUrl = ({
  redirectUri,
  challenge,
  state
}: {
  redirectUri: string;
  challenge: string;
  state: string;
}) => {
  const authUrl = new URL(`https://${COGNITO_CONFIG.domain}/oauth2/authorize`);
  authUrl.searchParams.set('client_id', COGNITO_CONFIG.clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('identity_provider', 'Google');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);
  // A cached Cognito managed-login session can otherwise mint a new token without returning to
  // Google. Besides making `login` genuinely re-authenticate, the fresh federation round trip
  // ensures newly-added or changed Google attribute mappings are applied to the user profile.
  authUrl.searchParams.set('prompt', 'login');
  return authUrl;
};

export type OAuthResult = {
  success: boolean;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  error?: string;
  /** Nobody finished in the browser within the time allowed, as opposed to something going wrong. */
  timedOut?: boolean;
};

const exchangeCodeForTokens = async ({
  code,
  redirectUri,
  verifier
}: {
  code: string;
  redirectUri: string;
  verifier: string;
}): Promise<OAuthResult> => {
  try {
    const tokenResponse = await fetch(`https://${COGNITO_CONFIG.domain}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export type GoogleSignInStart =
  | {
      started: true;
      /** The Cognito address that sends the browser to Google. Whoever started this opens it. */
      authorizationUrl: string;
      /** Settles exactly once — tokens, or why there are none. Never rejects. */
      result: Promise<OAuthResult>;
      /** Stops listening and settles `result` as cancelled. Safe to call at any time, repeatedly. */
      cancel: () => void;
    }
  | { started: false; portInUse: boolean; error: string };

/**
 * Starts listening for Google's answer on the loopback callback, and returns the address to open.
 *
 * Opening the browser is the caller's job: the terminal asks the operating system, and the init
 * wizard's page opens a tab from the user's click, which keeps the wizard tab where it is.
 */
export const startGoogleSignIn = async ({
  returnTo,
  port = OAUTH_CALLBACK_PORT
}: {
  returnTo: OAuthCallbackPage['returnTo'];
  /** Only tests pass this: Cognito accepts the registered port and no other. */
  port?: number;
}): Promise<GoogleSignInStart> => {
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  let settle: (result: OAuthResult) => void = () => {};
  const result = new Promise<OAuthResult>((resolve) => {
    settle = resolve;
  });
  let timeoutId: NodeJS.Timeout | undefined;
  let settled = false;

  const respond = (response: http.ServerResponse, status: number, page: OAuthCallbackPage) => {
    const nonce = crypto.randomBytes(16).toString('base64');
    response.writeHead(status, oauthCallbackHeaders(nonce));
    response.end(renderOAuthCallbackPage(page, nonce));
  };

  const server = http.createServer();

  const finish = (outcome: OAuthResult) => {
    if (settled) return;
    settled = true;
    if (timeoutId) clearTimeout(timeoutId);
    server.close();
    settle(outcome);
  };

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, () => {
        server.off('error', reject);
        resolve();
      });
    });
  } catch (error) {
    const portInUse = (error as NodeJS.ErrnoException).code === 'EADDRINUSE';
    return {
      started: false,
      portInUse,
      error: portInUse
        ? `Port ${port} is already in use. Please close the application using it.`
        : error instanceof Error
          ? error.message
          : 'Unknown error'
    };
  }

  const redirectUri = `http://localhost:${(server.address() as AddressInfo).port}/callback`;

  server.on('request', (request, response) => {
    void (async () => {
      const url = new URL(request.url || '', redirectUri);
      if (url.pathname !== '/callback') {
        response.writeHead(404);
        response.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const receivedState = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        respond(response, 200, { outcome: 'failure', returnTo, reason: error });
        finish({ success: false, error });
        return;
      }
      if (!code || !receivedState) {
        respond(response, 400, { outcome: 'failure', returnTo, reason: 'The sign-in answer was incomplete.' });
        return;
      }
      if (receivedState !== state) {
        respond(response, 400, {
          outcome: 'failure',
          returnTo,
          reason: 'This answer does not belong to the sign-in that is waiting.'
        });
        finish({ success: false, error: 'State mismatch - possible CSRF attack' });
        return;
      }

      // Answered only once the tokens are in hand, so the page never claims a sign-in that then fails.
      const tokens = await exchangeCodeForTokens({ code, redirectUri, verifier });
      respond(
        response,
        200,
        tokens.success
          ? { outcome: 'success', returnTo }
          : { outcome: 'failure', returnTo, reason: 'Stacktape could not complete the sign-in.' }
      );
      finish(tokens);
    })().catch(() => {
      if (!response.headersSent) response.writeHead(500);
      response.end();
    });
  });

  timeoutId = setTimeout(
    () => finish({ success: false, error: 'Authentication timed out', timedOut: true }),
    OAUTH_TIMEOUT_MS
  );
  // Waiting for a person must not be the thing that keeps a finished command alive.
  timeoutId.unref?.();

  return {
    started: true,
    authorizationUrl: createGoogleAuthorizationUrl({ redirectUri, challenge, state }).toString(),
    result,
    cancel: () => finish({ success: false, error: 'Authentication cancelled' })
  };
};

export const authenticateWithGoogle = async (): Promise<OAuthResult> => {
  const attempt = await startGoogleSignIn({ returnTo: 'terminal' });
  if (attempt.started === false) {
    return { success: false, error: attempt.error };
  }

  // Close the local callback server on Ctrl+C. Process exit itself is owned by
  // applicationManager's signal handler (TUI teardown, cleanup hooks) — exiting
  // here would preempt it.
  let interrupted = false;
  const exitHandler = () => {
    interrupted = true;
    attempt.cancel();
  };
  process.on('SIGINT', exitHandler);
  process.on('SIGTERM', exitHandler);

  try {
    try {
      await openBrowser(attempt.authorizationUrl);
    } catch {
      // Browser may not open in some environments
    }

    const outcome = await attempt.result;
    // An interrupted login reports nothing: the process is already on its way out, and an
    // "Authentication cancelled" error printed during teardown would be noise.
    if (interrupted) return await new Promise<OAuthResult>(() => {});
    return outcome;
  } finally {
    // Clean up signal handlers and server
    process.off('SIGINT', exitHandler);
    process.off('SIGTERM', exitHandler);
    attempt.cancel();
  }
};
