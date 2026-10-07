import { describe, expect, test } from 'bun:test';
import { classifyCognitoFailure, createGoogleAuthorizationUrl, startGoogleSignIn } from './cognito-client';

test('Google CLI login requires a fresh federated authentication', () => {
  const url = createGoogleAuthorizationUrl({
    redirectUri: 'http://localhost:19835/callback',
    challenge: 'challenge',
    state: 'state'
  });

  expect(url.searchParams.get('identity_provider')).toBe('Google');
  expect(url.searchParams.get('prompt')).toBe('login');
  expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  expect(url.searchParams.get('state')).toBe('state');
});

describe('classifyCognitoFailure', () => {
  const cognitoError = (name: string, message: string) => Object.assign(new Error(message), { name });

  // Names and messages as Cognito's API returns them.
  const cases: Array<[string, string, ReturnType<typeof classifyCognitoFailure>]> = [
    ['UsernameExistsException', 'An account with the given email already exists.', 'account-exists'],
    ['InvalidPasswordException', 'Password did not conform with policy: Password not long enough', 'password-rejected'],
    [
      'InvalidParameterException',
      "1 validation error detected: Value at 'password' failed to satisfy constraint: Member must have length greater than or equal to 6",
      'password-rejected'
    ],
    ['InvalidParameterException', 'Invalid email address format.', 'invalid-email'],
    ['InvalidParameterException', 'Attributes did not conform to the schema', 'unknown'],
    ['CodeMismatchException', 'Invalid verification code provided, please try again.', 'code-mismatch'],
    ['ExpiredCodeException', 'Invalid code provided, please request a code again.', 'code-expired'],
    ['UserNotConfirmedException', 'User is not confirmed.', 'email-not-confirmed'],
    ['NotAuthorizedException', 'Incorrect username or password.', 'invalid-credentials'],
    ['UserNotFoundException', 'User does not exist.', 'invalid-credentials'],
    ['NotAuthorizedException', 'Password attempts exceeded', 'too-many-attempts'],
    ['NotAuthorizedException', 'Invalid session for the user, session is expired.', 'session-expired'],
    ['NotAuthorizedException', 'User is disabled.', 'unknown'],
    ['LimitExceededException', 'Attempt limit exceeded, please try after some time.', 'too-many-attempts'],
    ['TooManyRequestsException', 'Rate exceeded', 'too-many-attempts'],
    ['PasswordResetRequiredException', 'Password reset required for the user', 'password-reset-required'],
    ['TypeError', 'fetch failed', 'network'],
    ['Error', 'getaddrinfo ENOTFOUND cognito-idp.eu-west-1.amazonaws.com', 'network'],
    ['InternalErrorException', 'Something went wrong', 'unknown']
  ];

  test.each(cases)('%s: %s', (name, message, expected) => {
    expect(classifyCognitoFailure(cognitoError(name, message))).toBe(expected);
  });

  test('something that is not an error is unknown', () => {
    expect(classifyCognitoFailure('boom')).toBe('unknown');
  });
});

describe('the Google callback listener', () => {
  /** An OS-chosen port: the registered one may be in use by a real login on this machine. */
  const start = async () => {
    const attempt = await startGoogleSignIn({ returnTo: 'wizard', port: 0 });
    if (attempt.started === false) throw new Error(attempt.error);
    const redirectUri = new URL(new URL(attempt.authorizationUrl).searchParams.get('redirect_uri')!);
    return { attempt, callback: `http://localhost:${redirectUri.port}/callback` };
  };

  test('escapes the error it was sent, and reports the failure', async () => {
    const { attempt, callback } = await start();
    const injected = '<img src=x onerror=alert(1)>"\'&';

    const response = await fetch(`${callback}?error=${encodeURIComponent(injected)}`);
    const html = await response.text();

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;');
    // Belt and braces: even unescaped markup could not run a script on this origin.
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(await attempt.result).toEqual({ success: false, error: injected });
  });

  test('refuses an answer for a different sign-in without contacting Cognito', async () => {
    const { attempt, callback } = await start();

    const response = await fetch(`${callback}?code=stolen&state=not-the-state`);

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('Sign-in did not finish');
    expect((await attempt.result).success).toBe(false);
  });

  test('keeps waiting after an incomplete answer, and stops when cancelled', async () => {
    const { attempt, callback } = await start();

    expect((await fetch(`${callback}?code=only-a-code`)).status).toBe(400);
    expect((await fetch(callback.replace('/callback', '/anything-else'))).status).toBe(404);

    attempt.cancel();
    expect(await attempt.result).toEqual({ success: false, error: 'Authentication cancelled' });
    // The port is released: nothing is listening for an answer any more.
    await expect(fetch(callback)).rejects.toThrow();
  });

  test('says so when the port is taken, instead of waiting for an answer that cannot arrive', async () => {
    const { attempt, callback } = await start();

    const second = await startGoogleSignIn({ returnTo: 'terminal', port: Number(new URL(callback).port) });

    expect(second).toMatchObject({ started: false, portInUse: true });
    attempt.cancel();
  });
});
