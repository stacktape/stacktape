import { useState } from 'react';
import { Alert } from '@stacktape/ui-react/alert';
import { Button, ButtonLink } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import type { SignInRequest, WizardState } from '../session';
import { organizationLabel } from '../sign-in';
import { CopyableCommand } from './CopyableCommand';
import { SignInPanel, startSignInInNewTab } from './SignInPanel';

/**
 * The Stacktape Console, offered under the live address of a deploy that ran without an account.
 *
 * It appears only after the deploy worked, never before or instead of it: the app is live either way, and the Console
 * is what someone running it with a team wants next. One button signs in (or creates an account) and connects the AWS
 * account of this machine, so the stage appears as it is, without a redeploy. "Not now" leaves one quiet line with
 * the command for later.
 */
export function ConsoleOfferCard({
  state,
  stage,
  stageUrl,
  onConnect,
  onDismiss,
  onSignIn,
  onRecheck,
  isRechecking
}: {
  state: WizardState;
  stage: string;
  /** The stage's page in the Console. */
  stageUrl: string;
  /** Accepts the offer. Resolves with the state it led to, which carries the sign-in's first step. */
  onConnect: () => Promise<WizardState | undefined>;
  onDismiss: () => void;
  onSignIn: (request: SignInRequest) => Promise<WizardState>;
  onRecheck: () => void;
  isRechecking: boolean;
}) {
  const offer = state.consoleConnection;
  const [isStarting, setIsStarting] = useState(false);
  const [wasTabBlocked, setWasTabBlocked] = useState(false);
  if (offer === undefined || offer.status === 'linked') return null;

  const identity = state.awsIdentity;
  const accountId = identity?.available === true ? identity.accountId : undefined;
  const organization = state.stacktapeAccount?.organization;
  const signedIn = state.stacktapeAccount?.signedIn === true;

  if (offer.status === 'dismissed') {
    return (
      <p className="m-0 text-[0.9rem] text-[var(--stp-text-subtle)]">
        To add this stage to the Stacktape Console later, run <span className="wizard-code">stacktape connect</span>.
        Nothing is redeployed.
      </p>
    );
  }

  const connect = () => {
    // Signed out, accepting starts the sign-in, which opens the Console in a new tab: opened inside this click.
    if (signedIn || state.signIn === undefined) {
      void onConnect();
      return;
    }
    setIsStarting(true);
    setWasTabBlocked(
      startSignInInNewTab(async () => {
        try {
          return (await onConnect())?.signIn;
        } finally {
          setIsStarting(false);
        }
      })
    );
  };

  const notNow = (
    <button className="wizard-disclosure" onClick={onDismiss} type="button">
      Not now
    </button>
  );

  const heading = (
    <div>
      <h3 className="wizard-row-title">Add {stage} to the Stacktape Console</h3>
      <p className="wizard-row-text">
        Deploy history, costs, alerts and team access for this stage. Free up to $200/month of AWS spend.
      </p>
    </div>
  );

  if (offer.status === 'connected') {
    return (
      <section aria-label="Stacktape Console" className="wizard-console">
        <div>
          <h3 className="wizard-row-title">
            <span aria-hidden className="wizard-check-mark is-passed">
              ✓
            </span>
            Connected to the Stacktape Console
          </h3>
          <p className="wizard-row-text">
            {stage} and the other Stacktape stacks in AWS account{' '}
            {accountId === undefined ? 'on this machine' : <span className="wizard-code">{accountId}</span>} show up
            there as they are
            {organization === undefined ? '' : `, in ${organizationLabel(organization)}`}. Nothing was redeployed.
          </p>
        </div>
        <div>
          <ButtonLink href={stageUrl} rel="noreferrer" target="_blank" variant="primary">
            Open {stage} in the Console
          </ButtonLink>
        </div>
      </section>
    );
  }

  if (offer.status === 'connecting') {
    return (
      <section aria-busy aria-label="Stacktape Console" className="wizard-console">
        {heading}
        <div className="flex items-start gap-3">
          {/* Centred on the first line of text, not on the paragraph. */}
          <span className="flex h-6 flex-none items-center">
            <Spinner />
          </span>
          <div>
            <p className="m-0 font-medium">
              Connecting AWS account{' '}
              {accountId === undefined ? 'on this machine' : <span className="wizard-code">{accountId}</span>}
              {organization === undefined ? '' : ` to ${organizationLabel(organization)}`}…
            </p>
            <p className="m-0 text-[0.9rem] text-[var(--stp-text-muted)]">
              It adds the Stacktape connection to the account and waits for the Console to confirm it, usually a minute
              or two. Your app is not touched.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (offer.status === 'signing-in') {
    return (
      <section aria-label="Stacktape Console" className="wizard-console">
        {heading}
        <SignInPanel
          isFramed={false}
          isRechecking={isRechecking}
          onRecheck={onRecheck}
          onSignIn={onSignIn}
          signIn={state.signIn}
          wasTabBlockedAtStart={wasTabBlocked}
        />
        <div>{notNow}</div>
      </section>
    );
  }

  return (
    <section aria-label="Stacktape Console" className="wizard-console">
      {heading}
      {offer.status === 'failed' && (
        <div className="flex flex-col gap-3">
          <Alert tone="danger" title="The AWS account was not connected">
            {offer.detail}
          </Alert>
          <p className="m-0 text-[0.9rem] text-[var(--stp-text-muted)]">Or run the same in a terminal:</p>
          <CopyableCommand command="stacktape connect" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button isLoading={isStarting} onClick={connect} variant={offer.status === 'failed' ? 'secondary' : 'primary'}>
          {offer.status === 'failed' ? 'Try again' : 'Connect to the Console'}
        </Button>
        {notNow}
      </div>
      {offer.status === 'offered' && (
        <p className="wizard-console-note">
          {signedIn ? 'Connects' : 'Signs you in or creates an account, then connects'} AWS account{' '}
          {accountId === undefined ? 'on this machine' : <span className="wizard-code">{accountId}</span>}. The stack
          stays as it is; nothing is redeployed.
        </p>
      )}
    </section>
  );
}
