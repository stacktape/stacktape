import { useEffect, useMemo, useRef, useState } from 'react';
import { explainFailure } from '@stacktape/console-api/failure-explanations';
import { Alert } from '@stacktape/ui-react/alert';
import { Button, ButtonLink } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { TextField } from '@stacktape/ui-react/text-field';
import { Tooltip } from '@stacktape/ui-react/tooltip';
import { buildDeployModel, type DeployEvent } from '../deploy-model';
import { CopyableCommand } from '../components/CopyableCommand';
import { DeployProgress } from '../components/DeployProgress';
import { AgentSetupCard } from '../components/AgentSetupCard';
import { FailureExplanationText } from '../components/FailureExplanation';
import { GapList } from '../components/GapList';
import { PipelineCard } from '../components/PipelineCard';
import { RegionPicker } from '../components/RegionPicker';
import { Row, RowList } from '../components/RowList';
import { SignInPanel } from '../components/SignInPanel';
import { stackCommand } from '../deploy-commands';
import type { SignInRequest, WizardState } from '../session';
import { gapsToList } from '../gaps';
import { requiredSecrets, secretCommand } from '../required-secrets';
import { organizationLabel } from '../sign-in';
import { blockedTargetCopy, stackStatusWords } from '../target-copy';

/**
 * The last step: put it on AWS.
 *
 * Three things have to be true before the button appears, and each is shown rather than assumed:
 * the configuration is on disk, this machine has AWS credentials, and the user knows which account
 * those credentials belong to. The third is the one tools usually skip, and it is the one that
 * turns "it deployed" into "it deployed *where*".
 *
 * And after it works, the page does not stop. "It's live" is where the daily product begins — the
 * next deploy, the logs, the pipeline — so the end of the wizard hands those over instead of ending.
 */

/** Resource types that end up reachable from the internet. Everything else stays private. */
const PUBLIC_TYPES = new Set([
  'web-service',
  'nextjs-web',
  'nuxt-web',
  'sveltekit-web',
  'astro-web',
  'remix-web',
  'solid-start-web',
  'hosting-bucket',
  'http-api-gateway',
  'application-load-balancer'
]);

const listNames = (names: string[]): string =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

export function DeployStep({
  state,
  onDeploy,
  onPipeline,
  onConnectCodingAgent,
  onRecheck,
  onSignIn,
  onVerify,
  onDismissVerification,
  onRegionChange,
  isBusy
}: {
  state: WizardState;
  onDeploy: (
    stage: string,
    region: string,
    expected: { kind: 'check' | 'create' } | { kind: 'update'; stackId: string }
  ) => void;
  onPipeline: (stage: string, region: string) => void;
  onConnectCodingAgent: () => void;
  /** Re-checks AWS credentials and the Stacktape sign-in, for after a terminal detour. */
  onRecheck: () => void;
  /** Takes one step of signing in to Stacktape from this page. Resolves with the state it led to. */
  onSignIn: (request: SignInRequest) => Promise<WizardState>;
  /** Consents to trying the composed services on this machine. The click is the consent. */
  onVerify: () => void;
  /** Sets a failed try-out aside: results stay visible, the deploy button comes back. */
  onDismissVerification: () => void;
  /** The price follows the region picked here. */
  onRegionChange: (region: string) => void;
  /** Which action is in flight, so only the button that was pressed shows a spinner. */
  isBusy: 'deploy' | 'pipeline' | 'recheck' | 'verify' | 'coding-agent' | undefined;
}) {
  const file = state.configFile;
  const identity = state.awsIdentity;
  const deployment = state.deployment;
  const verification = state.verification;
  /**
   * Mirrors the session's own gate — the server enforces it regardless; mirroring it here is what
   * makes the button honest rather than a click that silently does nothing.
   */
  const verificationBlocks =
    verification?.status === 'running' ||
    verification?.status === 'repairing' ||
    (verification?.status === 'completed' && (verification.services ?? []).some((entry) => entry.status === 'failed'));
  const hasUnverifiedServices = (verification?.services ?? []).some(
    (entry) => entry.status === 'inconclusive' || entry.status === 'skipped'
  );
  const compositionBlocks = state.composition?.deployable !== true;
  const account = state.stacktapeAccount;
  const signInBlocks = account?.signedIn !== true;
  const [stage, setStage] = useState('dev');
  const [showRemoval, setShowRemoval] = useState(false);
  const [region, setRegion] = useState(
    identity !== undefined && identity.available && identity.region !== undefined ? identity.region : 'eu-west-1'
  );
  const priceRegion = state.composition?.price?.region;
  /** The last region a price was asked for, so a slow or failed answer is not asked for again on every render. */
  const requestedPriceRegion = useRef<string | undefined>(undefined);
  // The price was quoted before a region was picked; the region on screen is the one to quote.
  useEffect(() => {
    if (file === undefined || priceRegion === region || requestedPriceRegion.current === region) return;
    requestedPriceRegion.current = region;
    onRegionChange(region);
  }, [file, priceRegion, region, onRegionChange]);

  const model = useMemo(
    () =>
      deployment === undefined
        ? undefined
        : buildDeployModel(
            deployment.events as DeployEvent[],
            deployment.lines,
            deployment.status === 'running' ? undefined : deployment.status === 'succeeded' ? 'succeeded' : 'failed'
          ),
    [deployment]
  );

  const resources = Object.entries(state.composition?.resources ?? {});
  const hasDatabase = resources.some(([, resource]) => resource.type === 'relational-database');

  if (file === undefined) {
    return (
      <p className="m-0 text-[var(--stp-text-muted)]">
        Write the configuration on the previous step, and this is where it goes to AWS.
      </p>
    );
  }

  if (deployment !== undefined && model !== undefined) {
    const target = {
      configPath: file.filename,
      projectName: state.projectName,
      stage: deployment.stage,
      region: deployment.region,
      awsAccount: state.awsAccount
    };
    const redeployCommand = stackCommand('deploy', target);
    // The stream's own timestamps, so the duration is the deploy's and not the page's.
    const events = deployment.events as DeployEvent[];
    const startedAt = events[0]?.ts;
    const endedAt = events.at(-1)?.ts;
    const deleteCommand = stackCommand('delete', target);
    const retryTarget =
      state.deployTarget?.stage === deployment.stage && state.deployTarget.region === deployment.region
        ? state.deployTarget
        : undefined;
    return (
      <div className="flex flex-col gap-8">
        <DeployProgress
          commandLine={deployment.commandLine}
          model={model}
          outcome={deployment.outcome}
          status={deployment.status}
          urls={deployment.status === 'succeeded' ? (deployment.urls ?? []) : []}
          where={`${deployment.stage}, ${deployment.region}`}
          {...(startedAt === undefined
            ? {}
            : {
                startedAt,
                ...(deployment.status === 'running' || deployment.status === 'repairing'
                  ? {}
                  : { endedAt: endedAt ?? startedAt })
              })}
          {...(deployment.repairs === undefined ? {} : { repairs: deployment.repairs })}
          {...(deployment.keptPartialProgress === undefined
            ? {}
            : { keptPartialProgress: deployment.keptPartialProgress })}
          actions={
            deployment.status === 'failed' && (
              <div className="flex flex-col gap-5">
                {/* What the button will do to the stack, read before pressing it. */}
                {retryTarget?.status === 'blocked' && <BlockedTargetAlert command={target} target={retryTarget} />}
                {retryTarget?.status === 'unverified' && (
                  <Alert tone="warning" title="The target could not be checked">
                    {retryTarget.detail} Fix the AWS credentials or the connected account, then check again.
                  </Alert>
                )}
                <div className="flex items-center gap-4">
                  <Button
                    isLoading={isBusy === 'deploy'}
                    onClick={() =>
                      onDeploy(
                        deployment.stage,
                        deployment.region,
                        retryTarget?.status === 'absent'
                          ? { kind: 'create' }
                          : retryTarget?.status === 'updateable'
                            ? { kind: 'update', stackId: retryTarget.stackId }
                            : { kind: 'check' }
                      )
                    }
                    variant="primary"
                  >
                    {retryTarget?.status === 'absent' || retryTarget?.status === 'updateable'
                      ? 'Deploy again'
                      : 'Check the target again'}
                  </Button>
                  <span className="text-[0.9rem] text-[var(--stp-text-subtle)]">
                    Fix the cause first: the deploy reads your code and{' '}
                    <span className="wizard-code">{file.filename}</span> from disk.
                    {retryTarget?.status === 'updateable' && (
                      <>
                        {' '}
                        It updates <span className="wizard-code">{retryTarget.stackName}</span>, which exists and{' '}
                        {stackStatusWords(retryTarget.stackStatus)}.
                      </>
                    )}
                  </span>
                </div>
                {deployment.keptPartialProgress === true && (
                  <section>
                    <h3 className="wizard-section-heading">Or put it back</h3>
                    <p className="wizard-lede mb-3">
                      Rolls the stack back to the version that worked before this deploy.
                    </p>
                    <CopyableCommand command={stackCommand('cf:rollback', target)} />
                  </section>
                )}
              </div>
            )
          }
        />

        {deployment.status === 'succeeded' && (
          <>
            <RowList label="Next">
              <Row
                action={
                  <ButtonLink
                    href={`https://console.stacktape.com/projects/${state.projectName}/${deployment.stage}/overview`}
                    rel="noreferrer"
                    target="_blank"
                    variant="secondary"
                  >
                    Open the Console
                  </ButtonLink>
                }
                description="Logs, metrics, alerts and every deploy of this stage, in the Stacktape Console."
                title="Watch it run"
              />
              <Row
                description="Edit your code, then run the same deploy. It updates the stack in place."
                title="Ship a change"
              >
                <CopyableCommand command={redeployCommand} />
              </Row>
              <PipelineCard
                isBusy={isBusy === 'pipeline'}
                onWrite={onPipeline}
                region={deployment.region}
                stage={deployment.stage}
                state={state}
              />
              {state.codingAgentSetup !== undefined && (
                <AgentSetupCard
                  isBusy={isBusy === 'coding-agent'}
                  onConnect={onConnectCodingAgent}
                  setup={state.codingAgentSetup}
                />
              )}
            </RowList>
            <section>
              <button
                aria-expanded={showRemoval}
                className="wizard-disclosure"
                onClick={() => setShowRemoval(!showRemoval)}
                type="button"
              >
                {showRemoval ? 'Hide' : 'Done experimenting? Remove'} this deployment
              </button>
              {showRemoval && (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="m-0 text-[0.9rem] text-[var(--stp-text-muted)]">
                    This command removes everything this deploy created
                    {hasDatabase ? ', including the database and its data' : ''}. Your code and{' '}
                    <span className="wizard-code">{file.filename}</span> stay.
                  </p>
                  <CopyableCommand command={deleteCommand} />
                </div>
              )}
            </section>
          </>
        )}
      </div>
    );
  }

  const publicNames = resources.filter(([, resource]) => PUBLIC_TYPES.has(resource.type)).map(([name]) => name);
  const gaps = gapsToList(state.composition?.gaps ?? [], state.facts?.existingDeployments ?? []);
  const secrets = requiredSecrets(state.composition?.resources ?? {});
  const unsetNames = [...new Set((state.composition?.unsetSettings ?? []).map((setting) => setting.variableName))];
  const monthly = state.composition?.price?.monthly;
  const checkedTarget =
    state.deployTarget?.stage === stage && state.deployTarget.region === region ? state.deployTarget : undefined;
  const targetBlocked = checkedTarget?.status === 'blocked' || checkedTarget?.status === 'unverified';
  const targetExpectation =
    checkedTarget?.status === 'absent'
      ? ({ kind: 'create' } as const)
      : checkedTarget?.status === 'updateable'
        ? ({ kind: 'update', stackId: checkedTarget.stackId } as const)
        : ({ kind: 'check' } as const);

  /** Why the button cannot be pressed, or what pressing it does. One sentence, beside it and on hover. */
  const actionHint = verificationBlocks
    ? verification?.status === 'running'
      ? 'Waiting for the local try-out to finish.'
      : 'The local try-out found a problem. Fix it below, or set the result aside.'
    : compositionBlocks
      ? 'Resolve every gap above before deploying.'
      : signInBlocks
        ? 'Sign in to Stacktape above before deploying.'
        : stage === ''
          ? 'Name a stage above before deploying.'
          : targetBlocked
            ? 'Read-only. Nothing is deployed to this stack until the check passes.'
            : checkedTarget === undefined
              ? 'Read-only: nothing is created until you confirm the next step.'
              : checkedTarget.status === 'updateable'
                ? 'Updates usually take a few minutes.'
                : hasDatabase
                  ? 'First deploys with a new database take 10–15 minutes.'
                  : hasUnverifiedServices
                    ? 'Some services were not checked locally; AWS will be their first full run.'
                    : 'Usually a few minutes.';
  const actionDisabled = stage === '' || verificationBlocks || compositionBlocks || signInBlocks;
  const actionButton = (
    <Button
      aria-describedby="deploy-action-hint"
      disabled={actionDisabled}
      isLoading={isBusy === 'deploy'}
      onClick={() => onDeploy(stage, region, targetExpectation)}
      variant="primary"
    >
      {checkedTarget?.status === 'absent'
        ? 'Create new stack'
        : checkedTarget?.status === 'updateable'
          ? 'Update existing stack'
          : targetBlocked
            ? 'Check again'
            : 'Check exact AWS target'}
    </Button>
  );

  const tryOut = (
    <Row
      description={
        verification === undefined
          ? 'Builds your services in Docker on this machine and starts them without network access and with placeholder settings, to catch an app that will not start before it reaches AWS. It runs your project’s code, including install scripts.'
          : verification.status === 'unavailable'
            ? 'It did not run: it needs Docker, and Docker is not running on this machine. Start Docker (or install Docker Desktop) and try again, or skip it. AWS will be the app’s first full run.'
            : undefined
      }
      title="Try it on this machine first"
      {...(verification === undefined || verification.status === 'unavailable'
        ? {
            action: (
              <Button isLoading={isBusy === 'verify'} onClick={onVerify} variant="secondary">
                {verification === undefined ? 'Build and start it here' : 'Try again'}
              </Button>
            )
          }
        : {})}
    >
      {verification === undefined || verification.status === 'unavailable' ? undefined : (
        <VerificationResult
          file={file.filename}
          hasUnverifiedServices={hasUnverifiedServices}
          isBusy={isBusy}
          onDismiss={onDismissVerification}
          onVerify={onVerify}
          verification={verification}
          verificationBlocks={verificationBlocks}
        />
      )}
    </Row>
  );

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="Where it deploys">
        <h3 className="wizard-section-heading">Where it deploys</h3>
        <div className="wizard-target">
          <dl className="wizard-facts">
            <div>
              <dt>AWS account on this machine</dt>
              <dd className={identity?.available === true ? 'wizard-code' : undefined}>
                {identity === undefined ? (
                  <span className="text-[var(--stp-text-muted)]">Checking…</span>
                ) : identity.available ? (
                  identity.accountId
                ) : (
                  <span className="text-[var(--stp-text-muted)]">
                    {identity.reason === 'no-credentials' ? 'None found' : 'Not accepted by AWS'}
                  </span>
                )}
              </dd>
            </div>
            {identity?.available === true && (
              <div className="min-w-0">
                <dt>AWS identity</dt>
                <dd className="wizard-code [overflow-wrap:anywhere]" title={identity.arn}>
                  {identity.arn.split(':').at(-1)}
                </dd>
              </div>
            )}
            <div className="min-w-0">
              <dt>Stacktape account</dt>
              <dd>
                {account === undefined ? (
                  <span className="text-[var(--stp-text-muted)]">Checking…</span>
                ) : account.signedIn ? (
                  <span className="[overflow-wrap:anywhere]">
                    {account.email ?? 'Signed in'}
                    {account.organization !== undefined && (
                      <span className="text-[var(--stp-text-muted)]"> · {organizationLabel(account.organization)}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-[var(--stp-text-muted)]">Not signed in</span>
                )}
              </dd>
            </div>
          </dl>
          {identity !== undefined && !identity.available && (
            <Alert
              tone={identity.reason === 'no-credentials' ? 'info' : 'warning'}
              title={
                identity.reason === 'no-credentials'
                  ? 'This machine has no AWS credentials yet'
                  : 'AWS did not accept the credentials on this machine'
              }
            >
              <p className="m-0 mb-3">
                {identity.reason === 'no-credentials' ? (
                  <>
                    Deploying needs access to an AWS account. Either connect one in the{' '}
                    <a
                      className="wizard-link"
                      href="https://console.stacktape.com/aws-accounts"
                      rel="noreferrer"
                      target="_blank"
                    >
                      Stacktape Console
                    </a>
                    , or set up credentials on this machine with <span className="wizard-code">aws configure</span>.
                    Then check again; nothing on this page is lost.
                  </>
                ) : explainFailure(identity.detail).length > 0 ? (
                  <>
                    <FailureExplanationText explanations={explainFailure(identity.detail)} />
                    <span className="block text-[0.9rem] text-[var(--stp-text-muted)]">
                      AWS said: {identity.detail} Check again when that is done; nothing on this page is lost.
                    </span>
                  </>
                ) : (
                  <>
                    {identity.detail} Check the AWS profile on this machine, then check again. Nothing on this page is
                    lost.
                  </>
                )}
              </p>
              <Button isLoading={isBusy === 'recheck'} onClick={onRecheck} variant="secondary">
                Check again
              </Button>
            </Alert>
          )}
          <div className="wizard-target-fields">
            <RegionPicker onChange={setRegion} value={region} />
            <TextField
              label="Stage"
              maxLength={12}
              name="stage"
              onChange={(changed) => setStage(changed.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              reserveMessageSpace={false}
              rootClassName="w-[200px]"
              value={stage}
            />
          </div>
          <p className="wizard-target-note">
            Pick the region closest to your users. A stage is one environment of the app, such as dev or production.
          </p>
        </div>
      </section>

      {file.existingPath !== undefined && (
        <p className="m-0 text-[0.9rem] text-[var(--stp-text-subtle)]">
          Your existing <span className="wizard-code">{file.existingPath}</span> was not touched. The deploy uses{' '}
          <span className="wizard-code">{file.filename}</span>.
        </p>
      )}

      {account?.signedIn === false && (
        <section>
          <h3 className="wizard-section-heading">Sign in or create an account to deploy</h3>
          <p className="wizard-lede mb-4">
            Deploying goes through Stacktape, so it needs an account. A free one is enough. The file you saved stays as
            it is either way.
          </p>
          <SignInPanel
            isRechecking={isBusy === 'recheck'}
            onRecheck={onRecheck}
            onSignIn={onSignIn}
            signIn={state.signIn}
          />
        </section>
      )}

      {(secrets.length > 0 || gaps.length > 0 || unsetNames.length > 0) && (
        <RowList label="Before you deploy">
          {secrets.length > 0 && (
            <Row
              description={
                <>
                  Create {secrets.length === 1 ? 'this secret' : `these ${secrets.length} secrets`} in{' '}
                  <span className="wizard-code">{region}</span>. Each command asks for the value; the deploy stops if
                  one is missing.
                </>
              }
              title={secrets.length === 1 ? 'One secret only you have' : `${secrets.length} secrets only you have`}
            >
              <CopyableCommand
                command={secrets.map((name) => secretCommand(name, region, state.awsAccount)).join('\n')}
              />
            </Row>
          )}
          {(gaps.length > 0 || unsetNames.length > 0) && (
            <Row title="Check these first">
              <GapList gaps={gaps}>
                {unsetNames.length > 0 && (
                  <li>
                    Nothing sets {listNames(unsetNames)} yet. Add the ones your app needs under{' '}
                    <span className="wizard-code">environment</span> in{' '}
                    <span className="wizard-code">{file.filename}</span>; the deploy uses the file as it is on disk.
                  </li>
                )}
              </GapList>
            </Row>
          )}
        </RowList>
      )}

      {/* The plan and the one action that carries it out, on one surface: what is created, where, for how
          much, then the button. The read-only check comes first and names the exact account and stack. */}
      <section aria-label="What the deploy does">
        <h3 className="wizard-section-heading">What the deploy does</h3>
        <div className="wizard-target">
          <p className="m-0 max-w-[var(--wizard-measure)] text-[var(--stp-text-muted)]">
            {checkedTarget?.status === 'updateable'
              ? 'Updates the stack (the group of AWS resources in your file) that already exists in your own account'
              : 'Creates one stack (the group of AWS resources in your file) in your own account'}
            : {resources.length === 1 ? 'one resource' : `${resources.length} resources`}
            {monthly === undefined || priceRegion !== region ? '' : `, about ${monthly} in ${region}`}.
            {publicNames.length > 0 && (
              <>
                {' '}
                {publicNames.map((name, index) => (
                  <span key={name}>
                    {index === 0 ? '' : index === publicNames.length - 1 ? ' and ' : ', '}
                    <span className="wizard-code">{name}</span>
                  </span>
                ))}{' '}
                {publicNames.length === 1 ? 'gets' : 'get'} a public HTTPS address.
              </>
            )}
            {publicNames.length === 0 && resources.length > 0 && (
              <> This review did not identify a public HTTPS address.</>
            )}{' '}
            The stack keeps working if you stop using Stacktape.
          </p>
          {checkedTarget?.status === 'absent' && (
            <Alert tone="info" title="This will create a new stack">
              <span className="wizard-code">{checkedTarget.stackName}</span> does not exist in account{' '}
              <span className="wizard-code">{checkedTarget.accountId}</span>, region{' '}
              <span className="wizard-code">{checkedTarget.region}</span>.
            </Alert>
          )}
          {checkedTarget?.status === 'updateable' && (
            <Alert tone="warning" title="This will update a stack that already exists">
              <span className="wizard-code">{checkedTarget.stackName}</span> is in account{' '}
              <span className="wizard-code">{checkedTarget.accountId}</span>, region{' '}
              <span className="wizard-code">{checkedTarget.region}</span>, and{' '}
              {stackStatusWords(checkedTarget.stackStatus)}. Deploying makes it match the file you saved: anything in it
              that the file does not define is removed. If the stack changes before you confirm, nothing is deployed.
            </Alert>
          )}
          {checkedTarget?.status === 'blocked' && (
            <BlockedTargetAlert
              command={{
                configPath: file.filename,
                projectName: state.projectName,
                stage,
                region,
                awsAccount: state.awsAccount
              }}
              target={checkedTarget}
            />
          )}
          {checkedTarget?.status === 'unverified' && (
            <Alert tone="warning" title="The target could not be checked">
              {checkedTarget.detail} Nothing was created or updated. Fix the AWS credentials or the connected account,
              then check again.
            </Alert>
          )}
          <div className="flex items-center gap-4">
            {actionDisabled && isBusy !== 'deploy' ? (
              // A disabled button gets no pointer events, so the explanation hangs on a wrapper (as the shared
              // Select does). Keyboard and screen-reader users get the same sentence through aria-describedby.
              <Tooltip content={actionHint}>
                <span className="wizard-disabled-reason">{actionButton}</span>
              </Tooltip>
            ) : (
              actionButton
            )}
            <span className="text-[0.9rem] text-[var(--stp-text-subtle)]" id="deploy-action-hint">
              {actionHint}
            </span>
          </div>
        </div>
      </section>

      {/* Neither is needed for the button above; both are here for the people who want them. */}
      <RowList label="Optional">
        {tryOut}
        {!compositionBlocks && (
          <Row
            description="The same deploy from a terminal. It creates the stack when absent and updates it when present, and shows the account and target before you confirm."
            title="Run it from your terminal instead"
          >
            <CopyableCommand
              command={stackCommand('deploy', {
                configPath: file.filename,
                projectName: state.projectName,
                stage: stage || 'dev',
                region,
                awsAccount: state.awsAccount
              })}
            />
          </Row>
        )}
      </RowList>
    </div>
  );
}

/** What the local try-out found, and the way past a failure. */
function VerificationResult({
  verification,
  verificationBlocks,
  hasUnverifiedServices,
  file,
  isBusy,
  onVerify,
  onDismiss
}: {
  verification: NonNullable<WizardState['verification']>;
  verificationBlocks: boolean;
  hasUnverifiedServices: boolean;
  file: string;
  isBusy: string | undefined;
  onVerify: () => void;
  onDismiss: () => void;
}) {
  const services = verification.services ?? [];
  if (verification.status === 'running' || verification.status === 'repairing') {
    return (
      <div className="flex items-center gap-3 text-[var(--stp-text-muted)]">
        <Spinner />
        <span>
          {verification.status === 'running'
            ? 'Building and starting your app… a first build can take a few minutes.'
            : 'It did not start. Working out what we got wrong, then trying again here.'}
        </span>
      </div>
    );
  }
  if (verification.status === 'completed' && services.length === 0) {
    return (
      <p className="m-0 text-[var(--stp-text-muted)]">
        The try-out only starts services that run as containers, and this configuration has none, so there was nothing
        to start here. AWS will be its first full run.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[0.95rem]">
        {services.map((entry) => (
          <li className="wizard-check" key={entry.serviceName}>
            <span className="wizard-check-head">
              <span aria-hidden className={`wizard-check-mark is-${entry.status}`}>
                {entry.status === 'passed' ? '✓' : entry.status === 'failed' ? '✕' : '–'}
              </span>
              <span className="font-medium">
                {entry.serviceName}
                <span className="sr-only">
                  {entry.status === 'passed' && ': passed'}
                  {entry.status === 'failed' && ': failed'}
                  {entry.status === 'inconclusive' && ': inconclusive'}
                  {entry.status === 'skipped' && ': not checked'}
                </span>
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-[var(--stp-text-muted)]">{entry.reason}</span>
              {entry.status === 'failed' && entry.observations.missingEnvironmentVariables.length > 0 && (
                <span className="block text-[var(--stp-text-muted)]">
                  It read {listNames(entry.observations.missingEnvironmentVariables)}, and nothing sets{' '}
                  {entry.observations.missingEnvironmentVariables.length === 1 ? 'it' : 'them'}. Add{' '}
                  {entry.observations.missingEnvironmentVariables.length === 1 ? 'it' : 'them'} under{' '}
                  <span className="wizard-code">environment</span> in <span className="wizard-code">{file}</span>, or as
                  a secret.
                </span>
              )}
              {entry.status === 'failed' && entry.observations.logTail.length > 0 && (
                <pre className="wizard-output mt-2 max-h-40 overflow-auto">
                  {entry.observations.logTail.slice(-8).join('\n')}
                </pre>
              )}
            </div>
          </li>
        ))}
      </ul>
      {verification.status === 'completed' && hasUnverifiedServices && !verificationBlocks && (
        <Alert tone="info" title="Some services were not proven locally">
          Deploy is still available because the local try-out is optional. AWS will be the first complete build or
          startup check for the services marked above.
        </Alert>
      )}
      {verification.status === 'completed' && verificationBlocks && (
        <Alert tone="warning" title="The local try-out found a startup failure">
          <p className="m-0 mb-3">
            The same failure is likely on AWS, so deploy is paused. Fix what it reported (a choice in the review, a
            setting or the code) and try again. Or, if this machine is the problem rather than the app, set the result
            aside and deploy anyway.
          </p>
          <div className="flex items-center gap-3">
            <Button isLoading={isBusy === 'verify'} onClick={onVerify} variant="secondary">
              Try again
            </Button>
            <Button onClick={onDismiss} variant="secondary">
              Set aside and deploy anyway
            </Button>
          </div>
        </Alert>
      )}
      {verification.status === 'dismissed' && (
        <p className="m-0 text-[0.9rem] text-[var(--stp-text-subtle)]">Set aside. Deploying is enabled again.</p>
      )}
    </div>
  );
}

/** Why the stack cannot be deployed to, and the way out: the command that is the fix, where there is one. */
function BlockedTargetAlert({
  target,
  command,
  className
}: {
  target: Extract<NonNullable<WizardState['deployTarget']>, { status: 'blocked' }>;
  command: Parameters<typeof stackCommand>[1];
  className?: string;
}) {
  const copy = blockedTargetCopy(target);
  return (
    <div className={`flex flex-col gap-3 ${className ?? ''}`}>
      <Alert tone="warning" title={copy.title}>
        {copy.body}
      </Alert>
      {copy.fix !== undefined && (
        <CopyableCommand command={stackCommand(copy.fix === 'delete' ? 'delete' : 'cf:rollback', command)} />
      )}
    </div>
  );
}
