/**
 * Signing in to Stacktape from inside the wizard.
 *
 * Deploying is the first thing in the wizard that needs an account, and for most people it is also the first time
 * they meet one. Sending them to a terminal for it loses them, so the page offers "Sign in" and this module drives the
 * steps: the device authorization flow `stacktape login` uses (the Console's `/device` page opens in a new tab, the
 * person signs in there with any method and approves the code), then an organization choice when the account has
 * several.
 *
 * Two kinds of state live here and they never mix. `WizardSignIn` is what the page renders, and is pushed to it like
 * the rest of the wizard state: which step, the code to compare and what went wrong. Everything that authenticates (the
 * device code, the session token while an organization is chosen, the API key) stays in this closure or in the
 * dependencies, and is dropped on success, on cancel and when the session ends.
 *
 * The Stacktape API is reached only through `WizardSignInDependencies`, so the flow runs end to end over the real HTTP
 * server against a loopback stand-in for the API.
 *
 * Results are told apart with `ok === false` rather than `!ok` throughout: the CLI compiles without strict null checks,
 * where only the explicit comparison narrows a union.
 */

export type WizardSignInErrorCode =
  | 'expired'
  | 'denied'
  | 'network'
  | 'failed'
  | 'exchange-failed'
  | 'save-failed'
  | 'not-confirmed'
  | 'unknown';

/** What went wrong at the current step. `code` lets the page offer the matching way out. */
export type WizardSignInError = { code: WizardSignInErrorCode; message: string };

export type WizardSignInOrganization = { id: string; name: string };

/** One step at a time, as the page renders it. Serialised as-is, so nothing here may be a secret. */
export type WizardSignIn =
  | { step: 'signed-out'; error?: WizardSignInError }
  /**
   * Waiting for the person to approve the code in the Console tab. The user code is meant to be shown; it cannot sign
   * anyone in by itself. The addresses are kept so the page can open the tab again, also after a reload.
   */
  | {
      step: 'waiting';
      userCode: string;
      verificationUri: string;
      verificationUriComplete: string;
      /** Milliseconds since the epoch. */
      expiresAt: number;
    }
  | { step: 'needs-organization'; organizations: WizardSignInOrganization[]; error?: WizardSignInError };

export type WizardSignInAction =
  | { kind: 'start' }
  | { kind: 'organization'; organizationId: string }
  | { kind: 'cancel' };

export type SignInFailure = { ok: false; code: WizardSignInErrorCode; detail?: string };

type ApiKeyIssued = { ok: true; apiKey: string };

export type WizardSignInDependencies = {
  /** Asks the Stacktape API for a device code and starts polling for its approval. */
  start: () => Promise<
    | {
        ok: true;
        userCode: string;
        verificationUri: string;
        verificationUriComplete: string;
        expiresAt: number;
        /** Settles once the code is approved, denied or expired. Never settles after `cancel`. */
        completed: Promise<{ ok: true; sessionToken: string } | SignInFailure>;
        cancel: () => void;
      }
    | SignInFailure
  >;
  /** Exchanges the session token for the API key, or reports which organizations the user must pick from. */
  exchange: (sessionToken: string) => Promise<
    | ApiKeyIssued
    | {
        ok: true;
        organizations: WizardSignInOrganization[];
        choose: (organizationId: string) => Promise<ApiKeyIssued | SignInFailure>;
      }
    | SignInFailure
  >;
  /** Stores the key where `stacktape login` stores it, so the deploy child finds it. */
  saveApiKey: (apiKey: string) => Promise<void>;
};

const withDetail = (detail: string | undefined, format: (detail: string) => string, otherwise = ''): string => {
  const trimmed = detail?.trim().slice(0, 200) ?? '';
  return trimmed === '' ? otherwise : format(trimmed.replace(/[.\s]+$/, ''));
};

/** Every sentence the sign-in panel shows for a failure: what happened, then what to do next. */
export const signInErrorMessage = ({ code, detail }: { code: WizardSignInErrorCode; detail?: string }): string => {
  switch (code) {
    case 'expired':
      return 'The sign-in code expired before it was approved. Sign in again to get a new code.';
    case 'denied':
      return 'The sign-in was denied in the Stacktape Console, so nothing changed. Sign in again if that was a mistake.';
    case 'network':
      return 'Could not reach Stacktape. Check your internet connection and try again.';
    case 'failed':
      return `The sign-in did not finish${withDetail(detail, (reason) => ` (${reason})`)}. Try again.`;
    case 'exchange-failed':
      return `You are signed in, but Stacktape could not issue credentials for this machine${withDetail(detail, (reason) => `: ${reason}`)}. Try again.`;
    case 'save-failed':
      return `You are signed in, but the credentials could not be saved on this machine${withDetail(detail, (reason) => `: ${reason}`)}. Check that your home directory is writable, then try again.`;
    case 'not-confirmed':
      return `Sign-in finished, but the account check on this machine still fails${withDetail(detail, (reason) => `: ${reason}`)}. Use "Check again" below, or sign in again.`;
    case 'unknown':
      return `Sign-in did not work${withDetail(detail, (reason) => `: ${reason}`)}. Try again.`;
  }
};

const MAX_ORGANIZATION_ID_LENGTH = 200;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Reads one sign-in request at the HTTP boundary: the route names the action, the body carries its fields. Returns
 * undefined for anything that is not exactly one of the supported shapes.
 */
export const parseSignInAction = (route: string, body: unknown): WizardSignInAction | undefined => {
  const fields = isRecord(body) ? body : {};

  switch (route) {
    case 'start':
      return { kind: 'start' };
    case 'cancel':
      return { kind: 'cancel' };
    case 'organization': {
      const { organizationId } = fields;
      if (typeof organizationId !== 'string') return undefined;
      if (organizationId.length === 0 || organizationId.length > MAX_ORGANIZATION_ID_LENGTH) return undefined;
      return { kind: 'organization', organizationId };
    }
    default:
      return undefined;
  }
};

/** Held in memory between two requests of one attempt. Never serialised. */
type Pending =
  | { kind: 'waiting'; cancel: () => void }
  | {
      kind: 'organization';
      organizations: WizardSignInOrganization[];
      choose: (organizationId: string) => Promise<ApiKeyIssued | SignInFailure>;
    };

export type WizardSignInFlow = {
  /** The step the page should render now. */
  state: () => WizardSignIn;
  /**
   * Applies one action and resolves when the step it leads to is known.
   *
   * Throws only for a request the page could not have produced, such as an organization that was not offered.
   * Everything a user can cause is reported in the state instead.
   */
  handle: (action: WizardSignInAction) => Promise<void>;
  /** Abandons the attempt in progress and forgets everything held for it. */
  reset: () => void;
};

export const createWizardSignIn = ({
  dependencies,
  onChange,
  confirmAccount
}: {
  dependencies: WizardSignInDependencies;
  /** Called when the step changes with no request in flight to report it: the approval arriving. */
  onChange: () => void;
  /** Re-runs the session's account check once the key is saved, and reports what it found. */
  confirmAccount: () => Promise<{ signedIn: boolean; detail: string }>;
}): WizardSignInFlow => {
  let current: WizardSignIn = { step: 'signed-out' };
  let pending: Pending | undefined;
  /** Incremented by every action and every reset, so work that was overtaken can tell and stop. */
  let generation = 0;
  let workingOn: number | undefined;

  const describe = (failure: SignInFailure): WizardSignInError => ({
    code: failure.code,
    message: signInErrorMessage(failure)
  });

  const dropPending = () => {
    if (pending?.kind === 'waiting') pending.cancel();
    pending = undefined;
  };

  const signedOutWith = (failure: SignInFailure) => {
    dropPending();
    current = { step: 'signed-out', error: describe(failure) };
  };

  /** A dependency that throws is a failure like any other, not a reason to drop the request. */
  const attempt = async <Result extends { ok: true }>(
    call: () => Promise<Result | SignInFailure>
  ): Promise<Result | SignInFailure> => {
    try {
      return await call();
    } catch (error) {
      return { ok: false, code: 'unknown', ...(error instanceof Error ? { detail: error.message } : {}) };
    }
  };

  const persist = async (apiKey: string, isCurrent: () => boolean): Promise<void> => {
    try {
      await dependencies.saveApiKey(apiKey);
    } catch (error) {
      signedOutWith({ ok: false, code: 'save-failed', ...(error instanceof Error ? { detail: error.message } : {}) });
      return;
    }
    dropPending();
    current = { step: 'signed-out' };
    const account = await confirmAccount();
    if (!account.signedIn && isCurrent()) {
      current = { step: 'signed-out', error: describe({ ok: false, code: 'not-confirmed', detail: account.detail }) };
    }
  };

  const finish = async (sessionToken: string, isCurrent: () => boolean): Promise<void> => {
    const exchanged = await attempt(() => dependencies.exchange(sessionToken));
    if (!isCurrent()) return;
    if (exchanged.ok === false) {
      signedOutWith(exchanged);
      return;
    }
    if ('organizations' in exchanged) {
      dropPending();
      pending = { kind: 'organization', organizations: exchanged.organizations, choose: exchanged.choose };
      current = { step: 'needs-organization', organizations: exchanged.organizations };
      return;
    }
    await persist(exchanged.apiKey, isCurrent);
  };

  const perform = async (
    action: Exclude<WizardSignInAction, { kind: 'cancel' }>,
    isCurrent: () => boolean
  ): Promise<void> => {
    if (action.kind === 'start') {
      dropPending();
      const started = await attempt(() => dependencies.start());
      if (!isCurrent()) {
        if (started.ok !== false) started.cancel();
        return;
      }
      if (started.ok === false) {
        signedOutWith(started);
        return;
      }
      pending = { kind: 'waiting', cancel: started.cancel };
      current = {
        step: 'waiting',
        userCode: started.userCode,
        verificationUri: started.verificationUri,
        verificationUriComplete: started.verificationUriComplete,
        expiresAt: started.expiresAt
      };
      // Not awaited: the approval comes when the person finishes in the other tab, minutes later.
      void started.completed
        .then(
          async (outcome) => {
            if (!isCurrent()) return;
            if (outcome.ok === false) {
              signedOutWith(outcome);
              return;
            }
            await finish(outcome.sessionToken, isCurrent);
          },
          () => {
            if (isCurrent()) signedOutWith({ ok: false, code: 'failed' });
          }
        )
        .then(onChange);
      return;
    }

    if (pending?.kind !== 'organization') return;
    const { organizations, choose } = pending;
    // Checked again after the choice: a cancel or a new start while it ran makes its result irrelevant.
    const chosen = await attempt(() => choose(action.organizationId));
    if (!isCurrent()) return;
    if (chosen.ok === false) {
      current = { step: 'needs-organization', organizations, error: describe(chosen) };
      return;
    }
    await persist(chosen.apiKey, isCurrent);
  };

  const reset = () => {
    generation += 1;
    workingOn = undefined;
    dropPending();
    current = { step: 'signed-out' };
  };

  return {
    state: () => current,
    reset,
    handle: async (action) => {
      if (action.kind === 'cancel') {
        reset();
        return;
      }
      if (action.kind === 'organization') {
        // A choice from a stale tab must not overtake the approval this flow is waiting for.
        if (pending?.kind !== 'organization') return;
        // The id is looked up in the list this flow published; an unknown one is a rejected request.
        if (!pending.organizations.some((organization) => organization.id === action.organizationId)) {
          throw new Error('That is not one of the organizations offered.');
        }
      }
      // A double click, or a second tab, must not run the same step twice.
      if (workingOn !== undefined) return;

      const mine = (generation += 1);
      workingOn = mine;
      try {
        await perform(action, () => generation === mine);
      } finally {
        if (workingOn === mine) workingOn = undefined;
      }
    }
  };
};
