import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert } from '@stacktape/ui-react/alert';
import { Button } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { SessionError, type SignInRequest, type WizardSignIn, type WizardState } from '../session';
import { isOpenableSignInAddress, organizationLabel } from '../sign-in';

/**
 * Signing in to Stacktape, on the page that needs it.
 *
 * Deploying is the first moment the wizard needs an account, and for most people it is the first time they meet one.
 * "Sign in" opens the Console's device page in a new tab, where the person signs in with any method (or creates an
 * account) and approves the code shown here. The CLI holds where the attempt has got to, so a reload lands on the same
 * step; this component only renders that step.
 */

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

/** Opens the Console tab without giving it a handle back to this page. */
const openConsoleTab = (address: string) => {
  if (isOpenableSignInAddress(address)) window.open(address, '_blank', 'noopener');
};

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
  /** Which control has a request in flight, so only that one shows it and the rest wait. */
  const [busy, setBusy] = useState<string | undefined>();
  /** A request that never produced a step: the CLI is gone, or refused it outright. */
  const [requestFailure, setRequestFailure] = useState<string | undefined>();
  const [wasTabBlocked, setWasTabBlocked] = useState(false);

  const startButton = useRef<HTMLButtonElement>(null);
  const firstOrganization = useRef<HTMLButtonElement>(null);
  const reopenButton = useRef<HTMLButtonElement>(null);

  const step = signIn?.step;
  const previousStep = useRef(step);

  // Focus follows the step, so a keyboard user lands on the thing the new step asks for. Not on the first render: the
  // panel appearing must not pull the page away from what is being read.
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    if (step === 'needs-organization') firstOrganization.current?.focus();
    else if (step === 'waiting') reopenButton.current?.focus();
    else if (step === 'signed-out') startButton.current?.focus();
  }, [step]);

  const apiKeyRoute = (
    <p className="wizard-signin-footnote">
      To use an API key instead, run <span className="wizard-code whitespace-nowrap">stacktape login</span> in a
      terminal and choose “Enter API key manually”. Signed in there?{' '}
      <QuietAction disabled={isRechecking} onClick={onRecheck}>
        {isRechecking ? 'Checking…' : 'Check again'}
      </QuietAction>
    </p>
  );

  if (signIn === undefined) {
    return (
      <div className="wizard-panel wizard-signin">
        <p className="m-0 text-[var(--stp-text-muted)]">
          Run <span className="wizard-code text-[var(--stp-text-primary)]">stacktape login</span> in a terminal, then
          come back here.
        </p>
        <div>
          <Button isLoading={isRechecking} onClick={onRecheck} variant="secondary">
            Check again
          </Button>
        </div>
      </div>
    );
  }

  const send = async (label: string, request: SignInRequest): Promise<WizardSignIn | undefined> => {
    setBusy(label);
    setRequestFailure(undefined);
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
  const error = 'error' in signIn ? signIn.error : undefined;

  const start = () => {
    // Opened inside the click, because a browser only allows a new tab from the gesture itself. It is pointed at the
    // Console once the CLI has a code and the address to approve it at.
    const tab = window.open('', '_blank');
    setWasTabBlocked(tab === null);
    void (async () => {
      const next = await send('start', { route: 'start' });
      if (tab === null) return;
      if (next?.step === 'waiting' && isOpenableSignInAddress(next.verificationUriComplete)) {
        tab.opener = null;
        tab.location.href = next.verificationUriComplete;
      } else {
        tab.close();
      }
    })();
  };

  const cancel = () => void send('cancel', { route: 'cancel' });

  const problem = (
    <>
      {error !== undefined && <Alert tone="danger">{error.message}</Alert>}
      {requestFailure !== undefined && <Alert tone="danger">{requestFailure}</Alert>}
    </>
  );

  if (signIn.step === 'waiting') {
    const expiresAt = new Date(signIn.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <div className="wizard-panel wizard-signin">
        <div className="flex items-center gap-3">
          <Spinner />
          <strong className="font-semibold">Waiting for approval in the Stacktape Console</strong>
        </div>
        <p className="m-0 text-[0.92rem] text-[var(--stp-text-muted)]">
          {wasTabBlocked
            ? 'Your browser blocked the new tab. Open it with the button below, sign in, and approve this code if the Console shows the same one:'
            : 'Sign in to the Console in the new tab, then approve this code if the Console shows the same one:'}
        </p>
        <output aria-label="Sign-in code" className="wizard-code wizard-signin-code">
          {signIn.userCode}
        </output>
        <p className="m-0 text-[0.85rem] text-[var(--stp-text-muted)]">
          The code expires at {expiresAt}. This page continues by itself once you approve.
        </p>
        {problem}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              setWasTabBlocked(false);
              openConsoleTab(signIn.verificationUriComplete);
            }}
            ref={reopenButton}
            variant="secondary"
          >
            Open the Console tab again
          </Button>
          <Button isLoading={busy === 'cancel'} onClick={cancel} variant="plain">
            Cancel
          </Button>
        </div>
        <p className="wizard-signin-footnote">
          On another device, open <span className="wizard-code [overflow-wrap:anywhere]">{signIn.verificationUri}</span>{' '}
          and enter the code. Never approve a code that someone else sent you.
        </p>
      </div>
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
                  {busy === `organization-${organization.id}` ? ' (signing in…)' : ''}
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

  return (
    <div className="wizard-panel wizard-signin">
      <p className="m-0 text-[0.92rem] text-[var(--stp-text-muted)]">
        Opens the Stacktape Console in a new tab. Sign in there with any method, or create an account, then approve this
        machine.
      </p>
      {problem}
      <Button
        className="w-full"
        disabled={isBusy && busy !== 'start'}
        isLoading={busy === 'start'}
        onClick={start}
        ref={startButton}
        variant="primary"
      >
        Sign in
      </Button>
      {apiKeyRoute}
    </div>
  );
}
