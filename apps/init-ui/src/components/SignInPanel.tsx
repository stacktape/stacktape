import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert } from '@stacktape/ui-react/alert';
import { Button } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { SessionError, type SignInRequest, type WizardSignIn, type WizardState } from '../session';
import { isOpenableSignInAddress, organizationLabel } from '../sign-in';

/**
 * Signing in to Stacktape, on the page that needs it.
 *
 * Nothing in the wizard needs an account; this appears only when the person accepts the Console after a deploy, and
 * for most people it is the first time they meet one. "Sign in" opens the Console's device page in a new tab, where
 * the person signs in with any method (or creates an account) and approves the code shown here. The CLI holds where
 * the attempt has got to, so a reload lands on the same step; this component only renders that step.
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

/**
 * Starts a sign-in from a click and points a new tab at the Console's device page once the CLI has a code.
 *
 * The tab is opened inside the click, because a browser only allows a new tab from the gesture itself; it is closed
 * again when the request does not lead to a code. Returns whether the browser blocked the tab.
 */
export const startSignInInNewTab = (request: () => Promise<WizardSignIn | undefined>): boolean => {
  const tab = window.open('', '_blank');
  void (async () => {
    const next = await request();
    if (tab === null) return;
    if (next?.step === 'waiting' && isOpenableSignInAddress(next.verificationUriComplete)) {
      tab.opener = null;
      tab.location.href = next.verificationUriComplete;
    } else {
      tab.close();
    }
  })();
  return tab === null;
};

export function SignInPanel({
  signIn,
  onSignIn,
  onRecheck,
  isRechecking,
  isFramed = true,
  wasTabBlockedAtStart = false
}: {
  /** The step to render. Absent when this CLI cannot sign in from the page, which leaves the terminal. */
  signIn: WizardSignIn | undefined;
  onSignIn: (request: SignInRequest) => Promise<WizardState>;
  /** Asks the CLI to look again, for someone who signed in with `stacktape login` meanwhile. */
  onRecheck: () => void;
  isRechecking: boolean;
  /** Draws its own panel. Off inside a card that already is one. */
  isFramed?: boolean;
  /** The sign-in was started outside this panel, and the browser blocked the tab it tried to open. */
  wasTabBlockedAtStart?: boolean;
}) {
  /** Which control has a request in flight, so only that one shows it and the rest wait. */
  const [busy, setBusy] = useState<string | undefined>();
  /** A request that never produced a step: the CLI is gone, or refused it outright. */
  const [requestFailure, setRequestFailure] = useState<string | undefined>();
  const [wasTabBlocked, setWasTabBlocked] = useState(wasTabBlockedAtStart);
  const frame = isFramed ? 'w-card wizard-signin p-5' : 'wizard-signin';

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
      Prefer an API key? Run <span className="wizard-code whitespace-nowrap">stacktape login</span> in a terminal, then{' '}
      <QuietAction disabled={isRechecking} onClick={onRecheck}>
        {isRechecking ? 'checking…' : 'check again'}
      </QuietAction>
      .
    </p>
  );

  if (signIn === undefined) {
    return (
      <div className={frame}>
        <p className="w-quiet">
          Run <span className="wizard-code">stacktape login</span> in a terminal, then come back here.
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

  const start = () => setWasTabBlocked(startSignInInNewTab(() => send('start', { route: 'start' })));

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
      <div className={frame}>
        <div className="flex items-center gap-3">
          <Spinner />
          <strong className="font-semibold">Waiting for approval in the Console tab</strong>
        </div>
        <p className="w-quiet">
          {wasTabBlocked
            ? 'Your browser blocked the new tab. Open it below, sign in, and approve this code if it shows the same one.'
            : 'Sign in there, then approve this code if the Console shows the same one.'}
        </p>
        <output aria-label="Sign-in code" className="wizard-signin-code">
          {signIn.userCode}
        </output>
        <p className="w-quiet">Expires at {expiresAt}. This page continues by itself once you approve.</p>
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
          and enter the code. Never approve a code someone else sent you.
        </p>
      </div>
    );
  }

  if (signIn.step === 'needs-organization') {
    return (
      <div className={frame}>
        <div>
          <strong className="font-semibold">Choose an organization</strong>
          <p className="w-quiet mt-1">
            The AWS account on this machine is connected to the one you pick. Switch later with{' '}
            <span className="wizard-code">stacktape login</span>.
          </p>
        </div>
        <ul className="wizard-organizations">
          {signIn.organizations.map((organization, index) => (
            <li className="flex flex-col" key={organization.id}>
              <Button
                className="w-full justify-start"
                disabled={isBusy && busy !== `organization-${organization.id}`}
                isLoading={busy === `organization-${organization.id}`}
                onClick={() =>
                  void send(`organization-${organization.id}`, {
                    route: 'organization',
                    organizationId: organization.id
                  })
                }
                variant="secondary"
                {...(index === 0 ? { ref: firstOrganization } : {})}
              >
                {organizationLabel(organization.name)}
              </Button>
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
    <div className={frame}>
      <p className="w-quiet">
        Opens the Console in a new tab. Sign in or create an account there, then approve this machine.
      </p>
      {problem}
      <Button
        className="self-start"
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
