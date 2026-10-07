/**
 * Signing in to Stacktape from inside the wizard.
 *
 * Deploying is the first thing in the wizard that needs an account, and for most people it is also
 * the first time they meet one. Sending them to a terminal for it loses them, so the page asks and
 * this module drives the steps: Google in a second tab, or email and password, then whichever of a
 * verification code, an authenticator code or an organization choice the account turns out to need.
 *
 * Two kinds of state live here and they never mix. `WizardSignIn` is what the page renders, and is
 * pushed to it like the rest of the wizard state: which step, for which email, and what went wrong.
 * Everything that authenticates — the password kept for the sign-in after a confirmed code, a
 * challenge session, the ID token while an organization is chosen, the API key — stays in this
 * closure and is dropped on success, on cancel and when the session ends.
 *
 * Cognito and the control plane are reached only through `WizardSignInDependencies`, so the flow is
 * exercised end to end over the real HTTP server without contacting either.
 *
 * Results are told apart with `ok === false` rather than `!ok` throughout: the CLI compiles without
 * strict null checks, where only the explicit comparison narrows a union.
 */

export type WizardSignInErrorCode =
  | 'account-exists'
  | 'invalid-credentials'
  | 'password-rejected'
  | 'invalid-email'
  | 'code-mismatch'
  | 'code-expired'
  | 'mfa-code-mismatch'
  | 'session-expired'
  | 'too-many-attempts'
  | 'password-reset-required'
  | 'unsupported-challenge'
  | 'google-failed'
  | 'google-timed-out'
  | 'google-port-in-use'
  | 'exchange-failed'
  | 'save-failed'
  | 'not-confirmed'
  | 'network'
  | 'unknown';

/** What went wrong at the current step. `code` lets the page offer the matching way out. */
export type WizardSignInError = { code: WizardSignInErrorCode; message: string };

export type WizardSignInOrganization = { id: string; name: string };

/** One step at a time, as the page renders it. Serialised as-is, so nothing here may be a secret. */
export type WizardSignIn =
  | { step: 'signed-out'; error?: WizardSignInError }
  /** A Google tab is open. The address is kept so the page can open it again after a reload. */
  | { step: 'google-pending'; authorizationUrl: string }
  | { step: 'needs-code'; email: string; error?: WizardSignInError }
  | { step: 'needs-mfa'; email: string; error?: WizardSignInError }
  | { step: 'needs-organization'; organizations: WizardSignInOrganization[]; error?: WizardSignInError };

export type WizardSignInAction =
  | { kind: 'google' }
  | { kind: 'email'; intent: 'sign-up' | 'sign-in'; email: string; password: string }
  | { kind: 'code'; code: string }
  | { kind: 'resend-code' }
  | { kind: 'mfa'; code: string }
  | { kind: 'organization'; organizationId: string }
  | { kind: 'cancel' };

export type SignInFailure = { ok: false; code: WizardSignInErrorCode; detail?: string };

type Authenticated = { ok: true; idToken: string };
type ApiKeyIssued = { ok: true; apiKey: string };

export type WizardSignInDependencies = {
  /** Starts listening for Google's answer and returns the address the page opens in a new tab. */
  startGoogle: () => Promise<
    | { ok: true; authorizationUrl: string; completed: Promise<Authenticated | SignInFailure>; cancel: () => void }
    | SignInFailure
  >;
  signUp: (input: { email: string; password: string }) => Promise<{ ok: true; confirmed: boolean } | SignInFailure>;
  confirmSignUp: (input: { email: string; code: string }) => Promise<{ ok: true } | SignInFailure>;
  resendCode: (input: { email: string }) => Promise<{ ok: true } | SignInFailure>;
  signIn: (input: {
    email: string;
    password: string;
  }) => Promise<
    | ({ next: 'authenticated' } & Authenticated)
    | { ok: true; next: 'confirm-email' }
    | { ok: true; next: 'mfa'; challenge: { username: string; session: string } }
    | SignInFailure
  >;
  answerMfa: (input: { username: string; session: string; code: string }) => Promise<Authenticated | SignInFailure>;
  /** Exchanges the ID token for the API key, or reports which organizations the user must pick from. */
  exchange: (idToken: string) => Promise<
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

/** What a user without the supported sign-in step can still do, said once. */
const API_KEY_ROUTE =
  'Create an API key in the Stacktape Console, run stacktape login in a terminal, choose "Enter API key manually", then use "Check again" here.';

const withDetail = (detail: string | undefined, format: (detail: string) => string, otherwise = ''): string => {
  const trimmed = detail?.trim().slice(0, 200) ?? '';
  return trimmed === '' ? otherwise : format(trimmed.replace(/[.\s]+$/, ''));
};

/**
 * Every sentence the sign-in panel shows for a failure: what happened, then what to do next.
 *
 * Written here rather than passed through from Cognito, whose messages describe its API ("Incorrect
 * username or password") rather than the screen the person is looking at.
 */
export const signInErrorMessage = ({ code, detail }: { code: WizardSignInErrorCode; detail?: string }): string => {
  switch (code) {
    case 'account-exists':
      return 'An account with this email already exists. Sign in with it instead.';
    case 'invalid-credentials':
      return 'That email and password do not match a Stacktape account. Check both and try again. If you signed up with Google, use Continue with Google.';
    case 'password-rejected':
      return 'That password was not accepted. Use at least 8 characters.';
    case 'invalid-email':
      return 'That email address was not accepted. Check it for typos and try again.';
    case 'code-mismatch':
      return 'That code is not correct. Check the email and enter it again, or send a new code.';
    case 'code-expired':
      return 'That code has expired. Send a new code and enter that one.';
    case 'mfa-code-mismatch':
      return 'That code was not accepted. Enter the current 6-digit code from your authenticator app.';
    case 'session-expired':
      return 'That sign-in took too long and expired. Enter your email and password again.';
    case 'too-many-attempts':
      return 'Too many attempts in a short time. Wait a few minutes, then try again.';
    case 'password-reset-required':
      return 'This account has to reset its password before it can sign in. Reset it at console.stacktape.com, then sign in here.';
    case 'unsupported-challenge':
      if (detail === 'NEW_PASSWORD_REQUIRED') {
        return 'This account has to set a new password before it can sign in. Set it at console.stacktape.com, then sign in here.';
      }
      if (detail === 'SMS_MFA') {
        return `This account confirms sign-ins with a text-message code, and this wizard supports authenticator-app codes only. ${API_KEY_ROUTE}`;
      }
      return `This account needs a sign-in step this wizard does not support${withDetail(detail, (name) => ` (${name})`)}. ${API_KEY_ROUTE}`;
    case 'google-failed':
      return `Google sign-in did not finish${withDetail(detail, (reason) => ` (${reason})`)}. Nothing was changed. Try again.`;
    case 'google-timed-out':
      return 'Google sign-in was not completed within 5 minutes, so it was cancelled. Try again.';
    case 'google-port-in-use':
      return 'Google sign-in needs port 19835 on this machine to receive the result, and another program is using it. Close that program (often another stacktape login) and try again.';
    case 'exchange-failed':
      return `You are authenticated, but Stacktape could not issue credentials for this machine${withDetail(detail, (reason) => `: ${reason}`)}. Try again.`;
    case 'save-failed':
      return `You are authenticated, but the credentials could not be saved on this machine${withDetail(detail, (reason) => `: ${reason}`)}. Check that your home directory is writable, then try again.`;
    case 'not-confirmed':
      return `Sign-in finished, but the account check on this machine still fails${withDetail(detail, (reason) => `: ${reason}`)}. Use "Check again" below, or sign in again.`;
    case 'network':
      return 'Could not reach the Stacktape sign-in service. Check your internet connection and try again.';
    case 'unknown':
      return `Sign-in did not work${withDetail(detail, (reason) => `: ${reason}`)}. Try again.`;
  }
};

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 256;
const MAX_ORGANIZATION_ID_LENGTH = 200;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Six digits, with the spaces some mail clients and authenticator apps put in the middle removed. */
const readCode = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const digits = value.replace(/\s+/g, '');
  return /^\d{6}$/.test(digits) ? digits : undefined;
};

/**
 * Reads one sign-in request at the HTTP boundary: the route names the action, the body carries its
 * fields. Returns undefined for anything that is not exactly one of the supported shapes.
 */
export const parseSignInAction = (route: string, body: unknown): WizardSignInAction | undefined => {
  const fields = isRecord(body) ? body : {};

  switch (route) {
    case 'google':
      return { kind: 'google' };
    case 'cancel':
      return { kind: 'cancel' };
    case 'code/resend':
      return { kind: 'resend-code' };
    case 'email': {
      const { intent, email, password } = fields;
      if (intent !== 'sign-up' && intent !== 'sign-in') return undefined;
      if (typeof email !== 'string' || typeof password !== 'string') return undefined;
      const address = email.trim();
      if (address.length > MAX_EMAIL_LENGTH || !/^[^\s@]+@[^\s@]+$/.test(address)) return undefined;
      // Not trimmed: a password is exactly what was typed.
      if (password.length === 0 || password.length > MAX_PASSWORD_LENGTH) return undefined;
      return { kind: 'email', intent, email: address, password };
    }
    case 'code':
    case 'mfa': {
      const code = readCode(fields.code);
      return code === undefined ? undefined : { kind: route, code };
    }
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
  | { kind: 'google'; cancel: () => void }
  | { kind: 'code'; email: string; password: string }
  | { kind: 'mfa'; email: string; username: string; session: string }
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
   * Throws only for a request the page could not have produced, such as an organization that was
   * not offered. Everything a user can cause is reported in the state instead.
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
  /** Called when the step changes with no request in flight to report it: Google answering. */
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
    if (pending?.kind === 'google') pending.cancel();
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

  const finish = async (idToken: string, isCurrent: () => boolean): Promise<void> => {
    const exchanged = await attempt(() => dependencies.exchange(idToken));
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

  const authenticate = async (email: string, password: string, isCurrent: () => boolean): Promise<void> => {
    const result = await attempt(() => dependencies.signIn({ email, password }));
    if (!isCurrent()) return;
    if (result.ok === false) {
      signedOutWith(result);
      return;
    }
    if (result.next === 'confirm-email') {
      // The account exists but its email was never confirmed. A fresh code is sent, because the one
      // from the original sign-up has usually expired by the time someone comes back to it.
      const resent = await attempt(() => dependencies.resendCode({ email }));
      if (!isCurrent()) return;
      pending = { kind: 'code', email, password };
      current = { step: 'needs-code', email, ...(resent.ok === false ? { error: describe(resent) } : {}) };
      return;
    }
    if (result.next === 'mfa') {
      pending = { kind: 'mfa', email, username: result.challenge.username, session: result.challenge.session };
      current = { step: 'needs-mfa', email };
      return;
    }
    await finish(result.idToken, isCurrent);
  };

  const perform = async (
    action: Exclude<WizardSignInAction, { kind: 'cancel' }>,
    isCurrent: () => boolean
  ): Promise<void> => {
    switch (action.kind) {
      case 'google': {
        dropPending();
        const started = await attempt(() => dependencies.startGoogle());
        if (!isCurrent()) {
          if (started.ok !== false) started.cancel();
          return;
        }
        if (started.ok === false) {
          signedOutWith(started);
          return;
        }
        pending = { kind: 'google', cancel: started.cancel };
        current = { step: 'google-pending', authorizationUrl: started.authorizationUrl };
        // Not awaited: the answer comes when the person finishes in the other tab, minutes later.
        void started.completed
          .then(
            async (outcome) => {
              if (!isCurrent()) return;
              if (outcome.ok === false) {
                signedOutWith(outcome);
                return;
              }
              await finish(outcome.idToken, isCurrent);
            },
            () => {
              if (isCurrent()) signedOutWith({ ok: false, code: 'google-failed' });
            }
          )
          .then(onChange);
        return;
      }
      case 'email': {
        dropPending();
        if (action.intent === 'sign-in') {
          await authenticate(action.email, action.password, isCurrent);
          return;
        }
        const signedUp = await attempt(() => dependencies.signUp({ email: action.email, password: action.password }));
        if (!isCurrent()) return;
        if (signedUp.ok === false) {
          signedOutWith(signedUp);
          return;
        }
        if (signedUp.confirmed) {
          await authenticate(action.email, action.password, isCurrent);
          return;
        }
        pending = { kind: 'code', email: action.email, password: action.password };
        current = { step: 'needs-code', email: action.email };
        return;
      }
      case 'code': {
        if (pending?.kind !== 'code') return;
        const { email, password } = pending;
        const confirmed = await attempt(() => dependencies.confirmSignUp({ email, code: action.code }));
        if (!isCurrent()) return;
        if (confirmed.ok === false) {
          current = { step: 'needs-code', email, error: describe(confirmed) };
          return;
        }
        await authenticate(email, password, isCurrent);
        return;
      }
      case 'resend-code': {
        if (pending?.kind !== 'code') return;
        const { email } = pending;
        const resent = await attempt(() => dependencies.resendCode({ email }));
        if (!isCurrent()) return;
        current = { step: 'needs-code', email, ...(resent.ok === false ? { error: describe(resent) } : {}) };
        return;
      }
      case 'mfa': {
        if (pending?.kind !== 'mfa') return;
        const { email, username, session } = pending;
        const answered = await attempt(() => dependencies.answerMfa({ username, session, code: action.code }));
        if (!isCurrent()) return;
        if (answered.ok === false) {
          // A wrong code can be retried against the same challenge. Anything else ended it.
          if (answered.code === 'mfa-code-mismatch') current = { step: 'needs-mfa', email, error: describe(answered) };
          else signedOutWith(answered);
          return;
        }
        await finish(answered.idToken, isCurrent);
        return;
      }
      case 'organization': {
        if (pending?.kind !== 'organization') return;
        const { organizations, choose } = pending;
        const chosen = await attempt(() => choose(action.organizationId));
        if (!isCurrent()) return;
        if (chosen.ok === false) {
          current = { step: 'needs-organization', organizations, error: describe(chosen) };
          return;
        }
        await persist(chosen.apiKey, isCurrent);
      }
    }
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
      // The id is looked up in the list this flow published; an unknown one is a rejected request.
      if (
        action.kind === 'organization' &&
        pending?.kind === 'organization' &&
        !pending.organizations.some((organization) => organization.id === action.organizationId)
      ) {
        throw new Error('That is not one of the organizations offered.');
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
