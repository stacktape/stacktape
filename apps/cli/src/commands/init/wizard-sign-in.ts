/**
 * What the init wizard's sign-in panel talks to when it is not a test.
 *
 * The wizard's own flow (`src/init/server/wizard-sign-in.ts`) decides the steps; this file carries each one to the
 * Stacktape API through the same device-code sign-in and key exchange `stacktape login` uses, and stores the resulting
 * key in the same place.
 */

import { globalStateManager } from '@application-services/global-state-manager';
import type { SignInFailure, WizardSignInDependencies } from 'src/init/server/wizard-sign-in';
import { startApiKeyExchange } from '../_utils/auth/api-key-exchange';
import { isNetworkFailure, startDeviceSignIn, type DeviceSignInFailure } from '../_utils/auth/device-authorization';

const withDetail = (code: SignInFailure['code'], detail: string | undefined): SignInFailure => ({
  ok: false,
  code,
  ...(detail === undefined || detail === '' ? {} : { detail })
});

const failureFrom = ({ reason, detail }: DeviceSignInFailure): SignInFailure => withDetail(reason, detail);

const messageOf = (error: unknown): string | undefined => (error instanceof Error ? error.message : undefined);

const saveLikeLogin = async (apiKey: string) => {
  // Written by this process, where `stacktape login` stores it (the credential store, or the state file without
  // one): the key is never handed to a child on a command line, where any process on the machine could read it.
  // Re-read the state file first, because a wizard stays open for a long time and this process's copy is from when
  // it started — saving that copy would undo a default changed in another terminal meanwhile.
  await globalStateManager.reloadPersistedState();
  await globalStateManager.saveApiKey({ apiKey });
};

export const createWizardSignInDependencies = ({
  endpoint,
  saveApiKey = saveLikeLogin
}: {
  /** The Stacktape API to sign in with. Defaults to the one every other command uses. */
  endpoint?: string;
  saveApiKey?: (apiKey: string) => Promise<void>;
} = {}): WizardSignInDependencies => ({
  start: async () => {
    const started = await startDeviceSignIn(endpoint === undefined ? {} : { endpoint });
    if (started.ok === false) return failureFrom(started);
    return {
      ok: true,
      userCode: started.userCode,
      verificationUri: started.verificationUri,
      verificationUriComplete: started.verificationUriComplete,
      expiresAt: started.expiresAt,
      cancel: started.cancel,
      completed: started.completed.then((outcome) =>
        outcome.ok === false ? failureFrom(outcome) : { ok: true, sessionToken: outcome.sessionToken }
      )
    };
  },

  exchange: async (sessionToken) => {
    const failed = (error: unknown): SignInFailure =>
      isNetworkFailure(error) ? { ok: false, code: 'network' } : withDetail('exchange-failed', messageOf(error));

    try {
      const exchange = await startApiKeyExchange(sessionToken, endpoint === undefined ? {} : { endpoint });
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

  saveApiKey
});
