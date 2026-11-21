import { useState } from 'react';
import { Alert } from '@stacktape/ui-react/alert';
import { Button, ButtonLink } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { BiCheck, BiLinkExternal } from 'react-icons/bi';
import { TbLayoutDashboard } from 'react-icons/tb';
import type { SignInRequest, WizardState } from '../session';
import { organizationLabel } from '../sign-in';
import { CommandLine } from '@stacktape/ui-react/command-line';
import { InfoTip } from './InfoTip';
import { Row } from './RowList';
import { SignInPanel, startSignInInNewTab } from './SignInPanel';

const icon = <TbLayoutDashboard size={17} />;
const LABEL = 'Stacktape Console';

/**
 * The Stacktape Console, offered under the live address of a deploy that ran without an account, as a next-step row.
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
  isRechecking,
  monthly
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
  /** The stage's fixed monthly price, to say plainly where it sits against the Free plan's limit. */
  monthly?: string | undefined;
}) {
  const offer = state.consoleConnection;
  const [isStarting, setIsStarting] = useState(false);
  const [wasTabBlocked, setWasTabBlocked] = useState(false);
  if (offer === undefined) return null;

  const identity = state.awsIdentity;
  const accountId = identity?.available === true ? identity.accountId : undefined;
  const account = accountId === undefined ? 'on this machine' : <span className="wizard-code">{accountId}</span>;
  const organization = state.stacktapeAccount?.organization;
  const signedIn = state.stacktapeAccount?.signedIn === true;

  if (offer.status === 'linked') {
    return (
      <Row
        action={
          <ButtonLink
            href={stageUrl}
            icon={<BiLinkExternal size={14} />}
            iconPosition="end"
            rel="noreferrer"
            target="_blank"
            variant="secondary"
          >
            Open the Console
          </ButtonLink>
        }
        description={`Logs, metrics, alerts and every deploy of ${stage}, already connected.`}
        icon={icon}
        title={`Watch ${stage} in the Console`}
      />
    );
  }

  if (offer.status === 'dismissed') {
    return (
      <Row
        description={
          <>
            To add this stage to the Stacktape Console later, run <span className="wizard-code">stacktape connect</span>
            . Nothing is redeployed.
          </>
        }
        icon={icon}
        label={LABEL}
        title="Stacktape Console"
      />
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
    <button className="w-link w-small text-[var(--w-muted)]" onClick={onDismiss} type="button">
      Not now
    </button>
  );

  const title = (
    <span className="inline-flex items-center gap-1.5">
      See {stage} in the Stacktape Console
      <InfoTip about="the Stacktape Console">
        {signedIn ? 'Connects' : 'Signs you in or creates an account, then connects'} AWS account{' '}
        {accountId ?? 'on this machine'}. The stack stays as it is; nothing is redeployed.
        {monthly === undefined ? '' : ` This stage is about ${monthly}.`}
      </InfoTip>
    </span>
  );
  const description = 'Logs, costs and alerts, and your team on it. Free while your AWS spend stays under $200/month.';

  if (offer.status === 'connected') {
    return (
      <Row
        action={
          <ButtonLink
            href={stageUrl}
            icon={<BiLinkExternal size={14} />}
            iconPosition="end"
            rel="noreferrer"
            target="_blank"
            variant="secondary"
          >
            Open {stage} in the Console
          </ButtonLink>
        }
        description={
          <>
            {stage} and the other Stacktape stacks in AWS account {account} show up there as they are
            {organization === undefined ? '' : `, in ${organizationLabel(organization)}`}. Nothing was redeployed.
          </>
        }
        icon={icon}
        label={LABEL}
        title={
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="wizard-check-mark">
              <BiCheck size={14} />
            </span>
            Connected to the Stacktape Console
          </span>
        }
      />
    );
  }

  if (offer.status === 'connecting') {
    return (
      <Row description={description} icon={icon} label={LABEL} title={title}>
        <div aria-busy className="flex items-start gap-3">
          <span className="flex h-5 flex-none items-center">
            <Spinner />
          </span>
          <p className="w-quiet m-0">
            <span className="text-[var(--w-text)]">
              Connecting AWS account {account}
              {organization === undefined ? '' : ` to ${organizationLabel(organization)}`}…
            </span>{' '}
            Usually a minute or two. Your app is not touched.
          </p>
        </div>
      </Row>
    );
  }

  if (offer.status === 'signing-in') {
    return (
      <Row action={notNow} description={description} icon={icon} label={LABEL} title={title}>
        <SignInPanel
          isFramed={false}
          isRechecking={isRechecking}
          onRecheck={onRecheck}
          onSignIn={onSignIn}
          signIn={state.signIn}
          wasTabBlockedAtStart={wasTabBlocked}
        />
      </Row>
    );
  }

  return (
    <Row
      action={
        <span className="inline-flex flex-none items-center gap-4">
          {notNow}
          <Button isLoading={isStarting} onClick={connect} variant="secondary">
            {offer.status === 'failed' ? 'Try again' : 'Connect to the Console'}
          </Button>
        </span>
      }
      description={description}
      icon={icon}
      label={LABEL}
      title={title}
    >
      {offer.status === 'failed' && (
        <>
          <Alert tone="danger" title="The AWS account was not connected">
            {offer.detail}
          </Alert>
          <p className="w-quiet">Or run the same in a terminal:</p>
          <CommandLine command="stacktape connect" label="Copy the command" />
        </>
      )}
    </Row>
  );
}
