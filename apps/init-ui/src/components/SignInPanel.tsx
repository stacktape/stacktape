import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Alert } from '@stacktape/ui-react/alert';
import { Button } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { TextField } from '@stacktape/ui-react/text-field';
import { SessionError, type SignInRequest, type WizardSignIn, type WizardState } from '../session';
import {
  checkCredentials,
  digitsOfCode,
  MIN_PASSWORD_LENGTH,
  organizationLabel,
  passwordResetUrl,
  type CredentialProblems,
  type SignInIntent
} from '../sign-in';

/**
 * Signing in to Stacktape, on the page that needs it.
 *
 * Deploying is the first moment the wizard needs an account, and for most people it is the first
 * time they meet one. So the whole of it happens here: Google in a second tab that closes itself, or
 * an email and password, then whichever one extra step the account needs. The CLI holds where the
 * attempt has got to, so a reload lands on the same step; this component only renders that step and
 * keeps what is being typed.
 */

/** Google's own mark, as its sign-in branding asks. Drawn inline: the bundle loads nothing remote. */
function GoogleMark() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.7H.96v2.33A9 9 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path d="M3.96 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3-2.33Z" fill="#FBBC05" />
      <path
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

/** A quiet inline control that reads as a link and behaves as the button it is. */
function QuietAction({
  children,
  onClick,
  disabled = false
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="wizard-disclosure" disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  );
}

const CLI_UNREACHABLE = 'Could not reach the Stacktape CLI. Check that it is still running in your terminal.';

export function SignInPanel({
  signIn,
  onSignIn,
  onRecheck,
  isRechecking
}: {
  /** The step to render. Absent when this CLI cannot sign in from the page, which leaves the terminal. */
  signIn: WizardSignIn | undefined;
  onSignIn: (request: SignInRequest) => Promise<WizardState>;
  /** Asks the CLI to look again, for someone who signed in with `stacktape login` meanwhile. */
  onRecheck: () => void;
  isRechecking: boolean;
}) {
  const [intent, setIntent] = useState<SignInIntent>('sign-up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const [code, setCode] = useState('');
  const [problems, setProblems] = useState<CredentialProblems>({});
  /** Which control has a request in flight, so only that one shows it and the rest wait. */
  const [busy, setBusy] = useState<string | undefined>();
  /** A request that never produced a step: the CLI is gone, or refused it outright. */
  const [requestFailure, setRequestFailure] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  /** The step's error stays in the CLI's state until the next request; this hides it once acted on. */
  const [isErrorDismissed, setIsErrorDismissed] = useState(false);
  const [wasTabBlocked, setWasTabBlocked] = useState(false);

  const emailField = useRef<HTMLInputElement>(null);
  const passwordField = useRef<HTMLInputElement>(null);
  const codeField = useRef<HTMLInputElement>(null);
  const firstOrganization = useRef<HTMLButtonElement>(null);
  const reopenButton = useRef<HTMLButtonElement>(null);

  const step = signIn?.step;
  const previousStep = useRef(step);

  // Focus follows the step, so a keyboard user lands on the thing the new step asks for. Not on the
  // first render: the panel appearing must not pull the page away from what is being read.
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    setCode('');
    setNotice(undefined);
    // What was typed has been handed to the CLI; the page has no reason to keep holding it.
    if (step !== 'signed-out') setPassword('');
    if (step === 'needs-code' || step === 'needs-mfa') codeField.current?.focus();
    else if (step === 'needs-organization') firstOrganization.current?.focus();
    else if (step === 'google-pending') reopenButton.current?.focus();
    else if (step === 'signed-out') emailField.current?.focus();
  }, [step]);

  if (signIn === undefined) {
    return (
      <div className="wizard-panel wizard-signin">
        <p className="m-0 text-[var(--stp-text-muted)]">
          Run <span className="wizard-code text-[var(--stp-text-primary)]">stacktape login</span> in a terminal, then
          come back here.
        </p>
        <Button className="w-full" isLoading={isRechecking} onClick={onRecheck} variant="secondary">
          I’ve signed in — check again
        </Button>
      </div>
    );
  }

  const send = async (label: string, request: SignInRequest): Promise<WizardSignIn | undefined> => {
    setBusy(label);
    setRequestFailure(undefined);
    setNotice(undefined);
    setIsErrorDismissed(false);
    try {
      return (await onSignIn(request)).signIn;
    } catch (error) {
      setRequestFailure(error instanceof SessionError ? error.message : CLI_UNREACHABLE);
      return undefined;
    } finally {
      setBusy(undefined);
    }
  };

  const isBusy = busy !== undefined;
  /** The rule a new password must meet, stated before it is typed; an existing one has no rule to state. */
  const passwordMessage =
    problems.password ?? (intent === 'sign-up' ? `At least ${MIN_PASSWORD_LENGTH} characters` : undefined);
  const error = 'error' in signIn && !isErrorDismissed ? signIn.error : undefined;

  const startGoogle = () => {
    // Opened inside the click, because a browser only allows a new tab from the gesture itself. It
    // is pointed at Google once the CLI is listening for the answer and has an address to give.
    const tab = window.open('', '_blank');
    setWasTabBlocked(tab === null);
    void (async () => {
      const next = await send('google', { route: 'google' });
      if (tab === null) return;
      if (next?.step === 'google-pending' && /^https?:\/\//.test(next.authorizationUrl)) {
        tab.location.href = next.authorizationUrl;
      } else {
        tab.close();
      }
    })();
  };

  const switchIntent = (next: SignInIntent) => {
    setIntent(next);
    setProblems({});
    setRequestFailure(undefined);
    setIsErrorDismissed(true);
    (email.trim() === '' ? emailField : passwordField).current?.focus();
  };

  const submitCredentials = (submitted: FormEvent) => {
    submitted.preventDefault();
    const found = checkCredentials({ intent, email, password });
    setProblems(found);
    if (found.email !== undefined) {
      emailField.current?.focus();
      return;
    }
    if (found.password !== undefined) {
      passwordField.current?.focus();
      return;
    }
    void (async () => {
      const next = await send('email', { route: 'email', intent, email: email.trim(), password });
      if (next?.step !== 'signed-out' || next.error === undefined) return;
      // Still on the form: put the cursor where the fix goes.
      const isAboutEmail = next.error.code === 'invalid-email' || next.error.code === 'account-exists';
      (isAboutEmail ? emailField : passwordField).current?.focus();
    })();
  };

  const submitCode = (route: 'code' | 'mfa') => (submitted: FormEvent) => {
    submitted.preventDefault();
    if (code.length !== 6) {
      codeField.current?.focus();
      return;
    }
    void (async () => {
      const next = await send(route, { route, code });
      if (next !== undefined && 'error' in next && next.error !== undefined) {
        setCode('');
        codeField.current?.focus();
      }
    })();
  };

  const resendCode = () => {
    void (async () => {
      const next = await send('resend', { route: 'code/resend' });
      if (next?.step === 'needs-code' && next.error === undefined) {
        setNotice('Sent. It can take a minute to arrive. Check your spam folder too.');
      }
    })();
  };

  const cancel = () => void send('cancel', { route: 'cancel' });

  const problem = (
    <>
      {error !== undefined && (
        <Alert
          tone="danger"
          {...(error.code === 'account-exists' && intent === 'sign-up'
            ? {
                actions: (
                  <Button onClick={() => switchIntent('sign-in')} variant="secondary">
                    Sign in with this email
                  </Button>
                )
              }
            : {})}
        >
          {error.message}
        </Alert>
      )}
      {requestFailure !== undefined && <Alert tone="danger">{requestFailure}</Alert>}
    </>
  );

  const codeInput = (label: string) => (
    <TextField
      autoComplete="one-time-code"
      disabled={isBusy}
      inputMode="numeric"
      label={label}
      name="code"
      onChange={(changed) => setCode(digitsOfCode(changed.target.value))}
      pattern="[0-9]*"
      placeholder="6 digits"
      ref={codeField}
      reserveMessageSpace={false}
      value={code}
    />
  );

  if (signIn.step === 'google-pending') {
    return (
      <div className="wizard-panel wizard-signin">
        <div className="flex items-center gap-3">
          <Spinner />
          <strong className="font-semibold">Waiting for Google in the other tab</strong>
        </div>
        <p className="m-0 text-[0.92rem] text-[var(--stp-text-muted)]">
          {wasTabBlocked
            ? 'Your browser blocked the new tab. Open it with the button below, and sign in there.'
            : 'Choose your account there. That tab closes when you are done, and this page continues by itself.'}
        </p>
        {problem}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              setWasTabBlocked(false);
              window.open(signIn.authorizationUrl, '_blank');
            }}
            ref={reopenButton}
            variant="secondary"
          >
            Open the Google tab again
          </Button>
          <Button isLoading={busy === 'cancel'} onClick={cancel} variant="plain">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (signIn.step === 'needs-code') {
    return (
      <form className="wizard-panel wizard-signin" noValidate onSubmit={submitCode('code')}>
        <div>
          <strong className="font-semibold">Check your email</strong>
          <p className="m-0 mt-1 text-[0.92rem] text-[var(--stp-text-muted)]">
            Enter the 6-digit code we sent to{' '}
            <span className="text-[var(--stp-text-primary)] [overflow-wrap:anywhere]">{signIn.email}</span>.
          </p>
        </div>
        {codeInput('Verification code')}
        {problem}
        <Button
          className="w-full"
          disabled={isBusy && busy !== 'code'}
          isLoading={busy === 'code'}
          type="submit"
          variant="primary"
        >
          Confirm email
        </Button>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <QuietAction disabled={isBusy} onClick={resendCode}>
            {busy === 'resend' ? 'Sending…' : 'Send a new code'}
          </QuietAction>
          <QuietAction disabled={isBusy} onClick={cancel}>
            Use a different email
          </QuietAction>
        </div>
        {notice !== undefined && (
          <output className="block text-[0.85rem] text-[var(--stp-status-success)]">{notice}</output>
        )}
      </form>
    );
  }

  if (signIn.step === 'needs-mfa') {
    return (
      <form className="wizard-panel wizard-signin" noValidate onSubmit={submitCode('mfa')}>
        <div>
          <strong className="font-semibold">Two-step sign-in</strong>
          <p className="m-0 mt-1 text-[0.92rem] text-[var(--stp-text-muted)]">
            <span className="text-[var(--stp-text-primary)] [overflow-wrap:anywhere]">{signIn.email}</span> is protected
            by an authenticator app. Enter the 6-digit code it shows now.
          </p>
        </div>
        {codeInput('Authenticator code')}
        {problem}
        <Button
          className="w-full"
          disabled={isBusy && busy !== 'mfa'}
          isLoading={busy === 'mfa'}
          type="submit"
          variant="primary"
        >
          Sign in
        </Button>
        <div>
          <QuietAction disabled={isBusy} onClick={cancel}>
            Use a different account
          </QuietAction>
        </div>
      </form>
    );
  }

  if (signIn.step === 'needs-organization') {
    return (
      <div className="wizard-panel wizard-signin">
        <div>
          <strong className="font-semibold">Choose an organization</strong>
          <p className="m-0 mt-1 text-[0.92rem] text-[var(--stp-text-muted)]">
            Your account belongs to several. This machine deploys as the one you pick, into the AWS accounts connected
            to it. Run <span className="wizard-code">stacktape login</span> later to switch.
          </p>
        </div>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {signIn.organizations.map((organization, index) => (
            <li className="flex flex-col" key={organization.id}>
              <button
                className="wizard-decision-option"
                disabled={isBusy}
                onClick={() =>
                  void send(`organization-${organization.id}`, {
                    route: 'organization',
                    organizationId: organization.id
                  })
                }
                type="button"
                {...(index === 0 ? { ref: firstOrganization } : {})}
              >
                <span className="wizard-decision-option-label">
                  {organizationLabel(organization.name)}
                  {busy === `organization-${organization.id}` ? ' — signing in…' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {problem}
        <div>
          <QuietAction disabled={isBusy} onClick={cancel}>
            Use a different account
          </QuietAction>
        </div>
      </div>
    );
  }

  // A failed Google attempt is reported beside the Google button, not in the middle of the email form.
  const isAboutGoogle = error?.code.startsWith('google-') === true;

  return (
    <div className="wizard-panel wizard-signin">
      {isAboutGoogle && problem}
      <Button
        className="w-full"
        disabled={isBusy && busy !== 'google'}
        icon={<GoogleMark />}
        isLoading={busy === 'google'}
        onClick={startGoogle}
        variant="secondary"
      >
        Continue with Google
      </Button>

      <div className="wizard-divider">or use email</div>

      <form className="flex flex-col" noValidate onSubmit={submitCredentials}>
        <TextField
          autoCapitalize="none"
          autoComplete="email"
          disabled={isBusy}
          inputMode="email"
          label="Email"
          message={problems.email}
          messageTone="error"
          name="email"
          onChange={(changed) => {
            setEmail(changed.target.value);
            setIsErrorDismissed(true);
          }}
          placeholder="you@company.com"
          ref={emailField}
          spellCheck={false}
          type="email"
          value={email}
        />
        <TextField
          autoComplete={intent === 'sign-up' ? 'new-password' : 'current-password'}
          disabled={isBusy}
          label="Password"
          message={passwordMessage}
          messageTone={problems.password === undefined ? 'neutral' : 'error'}
          name="password"
          onChange={(changed) => {
            setPassword(changed.target.value);
            setIsErrorDismissed(true);
          }}
          ref={passwordField}
          reserveMessageSpace={false}
          trailing={
            <button
              aria-label={isPasswordShown ? 'Hide password' : 'Show password'}
              className="wizard-disclosure"
              onClick={() => setIsPasswordShown(!isPasswordShown)}
              type="button"
            >
              {isPasswordShown ? 'Hide' : 'Show'}
            </button>
          }
          type={isPasswordShown ? 'text' : 'password'}
          value={password}
        />
        <div className={`flex flex-col gap-4 ${passwordMessage === undefined ? 'mt-4' : 'mt-2'}`}>
          {!isAboutGoogle && problem}
          <Button
            className="w-full"
            disabled={isBusy && busy !== 'email'}
            isLoading={busy === 'email'}
            type="submit"
            variant="primary"
          >
            {intent === 'sign-up' ? 'Create account' : 'Sign in'}
          </Button>
        </div>
      </form>

      {intent === 'sign-up' ? (
        <p className="m-0 text-[0.82rem] text-[var(--stp-text-subtle)]">
          By creating an account you agree to the{' '}
          <a className="wizard-link" href="https://stacktape.com/terms-of-use/" rel="noreferrer" target="_blank">
            Terms of use
          </a>{' '}
          and{' '}
          <a className="wizard-link" href="https://stacktape.com/privacy-policy/" rel="noreferrer" target="_blank">
            Privacy policy
          </a>
          .
        </p>
      ) : (
        <p className="m-0 text-[0.82rem] text-[var(--stp-text-subtle)]">
          Forgot your password?{' '}
          <a className="wizard-link" href={passwordResetUrl(email)} rel="noreferrer" target="_blank">
            Reset it in the Stacktape Console
          </a>
          , then sign in here.
        </p>
      )}

      <p className="m-0 text-[0.85rem] text-[var(--stp-text-muted)]">
        {intent === 'sign-up' ? 'Already have an account? ' : 'New to Stacktape? '}
        <QuietAction disabled={isBusy} onClick={() => switchIntent(intent === 'sign-up' ? 'sign-in' : 'sign-up')}>
          {intent === 'sign-up' ? 'Sign in' : 'Create an account'}
        </QuietAction>
      </p>

      <p className="wizard-signin-footnote">
        Used <span className="wizard-code whitespace-nowrap">stacktape login</span> in a terminal?{' '}
        <QuietAction disabled={isRechecking} onClick={onRecheck}>
          {isRechecking ? 'Checking…' : 'Check again'}
        </QuietAction>
      </p>
    </div>
  );
}
