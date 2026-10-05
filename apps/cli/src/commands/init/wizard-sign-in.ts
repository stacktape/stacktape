/**
 * What the init wizard's sign-in panel talks to when it is not a test.
 *
 * The wizard's own flow (`src/init/server/wizard-sign-in.ts`) decides the steps; this file is the
 * thin layer that carries each one to Cognito and the Stacktape API through the same primitives
 * `stacktape login` uses, and stores the resulting key in the same place.
 *
 * The auth modules are imported on use: they pull in the Cognito SDK, and `stacktape init` should
 * not pay for that unless someone actually signs in.
 */

import { globalStateManager } from '@application-services/global-state-manager';
import type { SignInFailure, WizardSignInDependencies } from 'src/init/server/wizard-sign-in';
import type { CognitoFailureCode } from '../_utils/auth/cognito-client';

const loadCognitoClient = () => import('../_utils/auth/cognito-client');
const loadApiKeyExchange = () => import('../_utils/auth/api-key-exchange');

const withDetail = (code: SignInFailure['code'], detail: string | undefined): SignInFailure => ({
  ok: false,
  code,
  ...(detail === undefined || detail === '' ? {} : { detail })
});

/** A failed Cognito call, as the wizard's flow names it. */
const failureFrom = (result: { error?: string; code?: CognitoFailureCode }): SignInFailure => {
  const code = result.code ?? 'unknown';
  // Kinds the wizard has no sentence of its own for keep Cognito's, which at least says what it was.
  if (code === 'unknown' || code === 'email-not-confirmed') return withDetail('unknown', result.error);
  return { ok: false, code };
};

const messageOf = (error: unknown): string | undefined => (error instanceof Error ? error.message : undefined);

export const createWizardSignInDependencies = (): WizardSignInDependencies => ({
  startGoogle: async () => {
    const { startGoogleSignIn } = await loadCognitoClient();
    const attempt = await startGoogleSignIn({ returnTo: 'wizard' });
    if (attempt.started === false) {
      return attempt.portInUse ? { ok: false, code: 'google-port-in-use' } : withDetail('google-failed', attempt.error);
    }
    return {
      ok: true,
      authorizationUrl: attempt.authorizationUrl,
      cancel: attempt.cancel,
      completed: attempt.result.then((result) => {
        if (result.success && result.idToken) return { ok: true, idToken: result.idToken };
        if (result.timedOut) return { ok: false, code: 'google-timed-out' };
        return withDetail('google-failed', result.error);
      })
    };
  },

  signUp: async ({ email, password }) => {
    const { signUpWithEmail } = await loadCognitoClient();
    const result = await signUpWithEmail({ email, password });
    return result.success ? { ok: true, confirmed: result.userConfirmed } : failureFrom(result);
  },

  confirmSignUp: async (input) => {
    const { confirmSignUp } = await loadCognitoClient();
    const result = await confirmSignUp(input);
    return result.success ? { ok: true } : failureFrom(result);
  },

  resendCode: async (input) => {
    const { resendConfirmationCode } = await loadCognitoClient();
    const result = await resendConfirmationCode(input);
    return result.success ? { ok: true } : failureFrom(result);
  },

  signIn: async (input) => {
    const { authenticateWithPassword } = await loadCognitoClient();
    const result = await authenticateWithPassword(input);
    if (result.success) {
      return result.idToken
        ? { ok: true, next: 'authenticated', idToken: result.idToken }
        : withDetail('unknown', 'No ID token received');
    }
    if (result.code === 'email-not-confirmed') return { ok: true, next: 'confirm-email' };
    if (result.challenge !== undefined) {
      // An authenticator-app code is the one extra step the wizard can ask for.
      return result.challenge.name === 'SOFTWARE_TOKEN_MFA'
        ? {
            ok: true,
            next: 'mfa',
            challenge: { username: result.challenge.username, session: result.challenge.session }
          }
        : withDetail('unsupported-challenge', result.challenge.name);
    }
    return failureFrom(result);
  },

  answerMfa: async (input) => {
    const { answerTotpChallenge } = await loadCognitoClient();
    const result = await answerTotpChallenge(input);
    if (result.success) {
      return result.idToken ? { ok: true, idToken: result.idToken } : withDetail('unknown', 'No ID token received');
    }
    if (result.challenge !== undefined) return withDetail('unsupported-challenge', result.challenge.name);
    // Cognito reports a wrong and a stale authenticator code differently; the person does the same
    // thing about both.
    if (result.code === 'code-mismatch' || result.code === 'code-expired') {
      return { ok: false, code: 'mfa-code-mismatch' };
    }
    return failureFrom(result);
  },

  exchange: async (idToken) => {
    const [{ startApiKeyExchange }, { classifyCognitoFailure }] = await Promise.all([
      loadApiKeyExchange(),
      loadCognitoClient()
    ]);
    const failed = (error: unknown): SignInFailure =>
      classifyCognitoFailure(error) === 'network'
        ? { ok: false, code: 'network' }
        : withDetail('exchange-failed', messageOf(error));

    try {
      const exchange = await startApiKeyExchange(idToken);
      if (exchange.status === 'failed') return withDetail('exchange-failed', exchange.error);
      if (exchange.status === 'ready') return { ok: true, apiKey: exchange.apiKey };
      return {
        ok: true,
        organizations: exchange.options,
        choose: async (organizationId) => {
          try {
            const chosen = await exchange.complete(organizationId);
            return chosen.success && chosen.apiKey
              ? { ok: true, apiKey: chosen.apiKey }
              : withDetail('exchange-failed', chosen.error);
          } catch (error) {
            return failed(error);
          }
        }
      };
    } catch (error) {
      return failed(error);
    }
  },

  saveApiKey: async (apiKey) => {
    // Written by this process, into the file `stacktape login` writes: the key is never handed to
    // a child on a command line, where any process on the machine could read it. Re-read first,
    // because a wizard stays open for a long time and this process's copy of the file is from when
    // it started — saving that copy would undo a default changed in another terminal meanwhile.
    await globalStateManager.reloadPersistedState();
    await globalStateManager.saveApiKey({ apiKey });
  }
});
