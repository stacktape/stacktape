import { tuiManager } from '@application-services/tui-manager';
import { publicApiClient } from '@shared/trpc/public';
import {
  signUpWithEmail,
  confirmSignUp,
  authenticateWithPassword,
  authenticateWithGoogle,
  resendConfirmationCode
} from './cognito-client';
import { globalStateManager } from '@application-services/global-state-manager';

export type AuthResult = {
  success: boolean;
  apiKey?: string;
  error?: string;
};

export const runAuthFlow = async (): Promise<AuthResult> => {
  if (globalStateManager.command !== 'login') {
    tuiManager.info(tuiManager.makeBold('Authentication required'));
  }

  const authMethod = await tuiManager.promptSelect({
    message: 'How would you like to authenticate?',
    options: [
      { label: 'Continue with Google (Recommended)', value: 'google', description: 'Quick sign-in with Google' },
      { label: 'Sign up with email', value: 'signup', description: 'Create a new account' },
      { label: 'Log in with email', value: 'login', description: 'Use existing account' },
      { label: 'Enter API key manually', value: 'apikey', description: 'Paste an existing API key' }
    ]
  });

  if (authMethod === 'google') {
    return runGoogleAuth();
  }

  if (authMethod === 'signup') {
    return runEmailSignUp();
  }

  if (authMethod === 'login') {
    return runEmailLogin();
  }

  // Manual API key entry (fallback)
  const apiKey = await tuiManager.promptText({
    isPassword: true,
    message: 'Enter your API key'
  });

  return { success: true, apiKey };
};

/**
 * Google OAuth flow
 */
const runGoogleAuth = async (): Promise<AuthResult> => {
  tuiManager.info('Opening browser for Google authentication...');

  const result = await authenticateWithGoogle();

  if (!result.success || !result.idToken) {
    return { success: false, error: result.error || 'Google authentication failed' };
  }

  return getApiKeyFromByExchangingIdToken(result.idToken);
};

/**
 * Email sign-up flow
 */
const runEmailSignUp = async (): Promise<AuthResult> => {
  const name = await tuiManager.promptText({ message: 'Your name' });
  const email = await tuiManager.promptText({ message: 'Email address' });
  const password = await tuiManager.promptText({
    message: 'Password (min 8 chars, include a number)',
    isPassword: true
  });

  const signUpResult = await signUpWithEmail({ email, password, name });

  if (!signUpResult.success) {
    // If account exists, offer to log in instead
    if (signUpResult.error?.includes('already exists')) {
      tuiManager.warn('An account with this email already exists.');
      const shouldLogin = await tuiManager.promptConfirm({ message: 'Would you like to log in instead?' });
      if (shouldLogin) {
        return runEmailLoginWithEmail(email);
      }
      return { success: false, error: 'Sign-up cancelled' };
    }
    return { success: false, error: signUpResult.error };
  }

  // Email confirmation required
  if (!signUpResult.userConfirmed) {
    tuiManager.info(`Verification code sent to ${email}`);
    return runEmailConfirmation(email, password);
  }

  // User confirmed, log in to get tokens
  return authenticateAndGetApiKey(email, password);
};

/**
 * Email confirmation flow
 */
const runEmailConfirmation = async (email: string, password: string): Promise<AuthResult> => {
  while (true) {
    const code = await tuiManager.promptText({ message: 'Enter verification code from email' });

    const confirmResult = await confirmSignUp({ email, code });

    if (confirmResult.success) {
      tuiManager.success('Email verified successfully');
      return authenticateAndGetApiKey(email, password);
    }

    tuiManager.warn(confirmResult.error || 'Invalid code');

    const action = await tuiManager.promptSelect({
      message: 'What would you like to do?',
      options: [
        { label: 'Try again', value: 'retry' },
        { label: 'Resend code', value: 'resend' },
        { label: 'Cancel', value: 'cancel' }
      ]
    });

    if (action === 'cancel') {
      return { success: false, error: 'Verification cancelled' };
    }

    if (action === 'resend') {
      await resendConfirmationCode({ email });
      tuiManager.info('New verification code sent');
    }
  }
};

/**
 * Email login flow
 */
const runEmailLogin = async (): Promise<AuthResult> => {
  const email = await tuiManager.promptText({ message: 'Email address' });
  return runEmailLoginWithEmail(email);
};

const runEmailLoginWithEmail = async (email: string): Promise<AuthResult> => {
  const password = await tuiManager.promptText({ message: 'Password', isPassword: true });
  return authenticateAndGetApiKey(email, password);
};

const getApiKeyFromByExchangingIdToken = async (idToken: string): Promise<AuthResult> => {
  const exchangeResult = await publicApiClient.exchangeTokenForApiKey({ idToken });

  if (!exchangeResult.success || !exchangeResult.apiKeys[0]) {
    tuiManager.outro('Authentication failed. No API key found.');
    return { success: false, error: exchangeResult.error || 'Failed to get API key' };
  }

  if (exchangeResult.apiKeys.length > 1) {
    const apiKey = await tuiManager.promptSelect({
      message: 'Select the organization you want to use.',
      options: exchangeResult.apiKeys.map((apiKey) => ({ label: apiKey.organizationName, value: apiKey.id }))
    });
    return { success: true, apiKey };
  }

  return { success: true, apiKey: exchangeResult.apiKeys[0].id };
};

const authenticateAndGetApiKey = async (email: string, password: string): Promise<AuthResult> => {
  const authResult = await authenticateWithPassword({ email, password });

  if (!authResult.success) {
    // Handle email not confirmed
    if (authResult.error === 'EMAIL_NOT_CONFIRMED') {
      tuiManager.warn('Email not verified. Sending new verification code...');
      await resendConfirmationCode({ email });
      return runEmailConfirmation(email, password);
    }
    return { success: false, error: authResult.error };
  }

  if (!authResult.idToken) {
    return { success: false, error: 'No ID token received' };
  }

  return getApiKeyFromByExchangingIdToken(authResult.idToken);
};
