import { useEffect, useMemo, useRef, useState } from 'react';
import { explainFailure } from '@stacktape/console-api/failure-explanations';
import { Alert } from '@stacktape/ui-react/alert';
import { Button } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { TextField } from '@stacktape/ui-react/text-field';
import { buildDeployModel, type DeployEvent } from '../deploy-model';
import { CopyableCommand } from '../components/CopyableCommand';
import { DeployProgress } from '../components/DeployProgress';
import { FailureExplanationText } from '../components/FailureExplanation';
import { PipelineCard } from '../components/PipelineCard';
import { RegionPicker } from '../components/RegionPicker';
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
  isBusy: 'deploy' | 'pipeline' | 'recheck' | 'verify' | undefined;
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
      region: deployment.region
    };
    const redeployCommand = stackCommand('deploy', target);
    const deleteCommand = stackCommand('delete', target);
    const retryTarget =
      state.deployTarget?.stage === deployment.stage && state.deployTarget.region === deployment.region
        ? state.deployTarget
        : undefined;
    return (
      <div className="flex flex-col gap-8">
        <DeployProgress
          commandLine={deployment.commandLine}
          isUpdate={retryTarget?.status === 'updateable'}
          model={model}
          outcome={deployment.outcome}
          status={deployment.status}
          urls={deployment.status === 'succeeded' ? (deployment.urls ?? []) : []}
          {...(deployment.repairs === undefined ? {} : { repairs: deployment.repairs })}
          {...(deployment.keptPartialProgress === undefined
            ? {}
            : { keptPartialProgress: deployment.keptPartialProgress })}
          actions={
            deployment.status === 'failed' && (
              <div className="flex flex-col gap-5">
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
                  </span>
                </div>
                {retryTarget?.status === 'updateable' && (
                  <Alert tone="info" title="Deploying again updates the existing stack">
                    <span className="wizard-code">{retryTarget.stackName}</span> exists, and{' '}
                    {stackStatusWords(retryTarget.stackStatus)}.
                  </Alert>
                )}
                {retryTarget?.status === 'blocked' && (
                  <BlockedTargetAlert deleteCommand={stackCommand('delete', target)} target={retryTarget} />
                )}
                {retryTarget?.status === 'unverified' && (
                  <Alert tone="warning" title="The target could not be checked">
                    {retryTarget.detail} Fix the AWS credentials or the connected account, then check again.
                  </Alert>
                )}
                {deployment.keptPartialProgress === true && (
                  <section>
                    <h3 className="wizard-section-heading">Or clean up instead</h3>
                    <p className="wizard-lede mb-3">
                      Removes everything this deploy created, so nothing sits in your account billing while you
                      investigate.
                    </p>
                    <CopyableCommand command={deleteCommand} />
                  </section>
                )}
              </div>
            )
          }
        />

        {deployment.status === 'succeeded' && (
          <>
            <section>
              <h3 className="wizard-section-heading">Where to go from here</h3>
              <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[0.95rem]">
                <li>
                  <strong>Watch it run.</strong>{' '}
                  <a
                    className="wizard-link"
                    href={`https://console.stacktape.com/projects/${state.projectName}/${deployment.stage}/overview`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open this project in the Stacktape Console
                  </a>
                  : logs, metrics and every deploy in one place.
                </li>
                <li>
                  <strong>Ship a change.</strong> Edit your code and run the same deploy again. It updates the stack in
                  place:
                  <div className="mt-2">
                    <CopyableCommand command={redeployCommand} />
                  </div>
                </li>
                <li>
                  <strong>Done experimenting?</strong> One command removes everything this created
                  {hasDatabase ? ', including the database and its data' : ''}:
                  <div className="mt-2">
                    <CopyableCommand command={deleteCommand} />
                  </div>
                </li>
              </ul>
            </section>
            <PipelineCard
              isBusy={isBusy === 'pipeline'}
              onWrite={onPipeline}
              region={deployment.region}
              stage={deployment.stage}
              state={state}
            />
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

  return (
    <div className="flex flex-col gap-8">
      {file.existingPath !== undefined && (
        <p className="m-0 text-[0.9rem] text-[var(--stp-text-subtle)]">
          Your existing <span className="wizard-code">{file.existingPath}</span> was not touched. The deploy below uses{' '}
          <span className="wizard-code">{file.filename}</span>.
        </p>
      )}

      <section>
        <h3 className="wizard-section-heading">AWS access</h3>
        {identity === undefined ? (
          <div className="flex items-center gap-3 text-[var(--stp-text-muted)]">
            <Spinner />
            <span>Checking the AWS credentials on this machine…</span>
          </div>
        ) : identity.available ? (
          <>
            <dl className="wizard-facts">
              <div>
                <dt>AWS account on this machine</dt>
                <dd className="wizard-code">{identity.accountId}</dd>
              </div>
              <div>
                <dt>Signed in as</dt>
                <dd className="wizard-code">{identity.arn}</dd>
              </div>
            </dl>
            <p className="mt-3 mb-0 text-[0.88rem] text-[var(--stp-text-subtle)]">
              If your Stacktape organization has an AWS account connected, the deploy may use that one instead. The
              target check below shows the exact account before anything is created.
            </p>
          </>
        ) : (
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
                  , or set up credentials on this machine with <span className="wizard-code">aws configure</span>. Then
                  check again; nothing on this page is lost.
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
        <div className="mt-5 flex flex-wrap items-start gap-5">
          <RegionPicker onChange={setRegion} value={region} />
          <TextField
            label="Stage"
            maxLength={12}
            name="stage"
            onChange={(changed) => setStage(changed.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            reserveMessageSpace={false}
            rootClassName="w-[260px]"
            value={stage}
          />
        </div>
        <p className="mt-2 mb-0 text-[0.82rem] text-[var(--stp-text-subtle)]">
          Pick the region closest to your users. A stage is one environment of the app, such as dev or production.
        </p>
      </section>

      <section>
        {account === undefined && (
          <>
            <h3 className="wizard-section-heading">Stacktape account</h3>
            <div className="flex items-center gap-3 text-[var(--stp-text-muted)]">
              <Spinner />
              <span>Checking the Stacktape sign-in on this machine…</span>
            </div>
          </>
        )}
        {account?.signedIn === true && (
          <>
            <h3 className="wizard-section-heading">Stacktape account</h3>
            <output className="block text-[var(--stp-text-muted)]">
              <span className="text-[var(--stp-color-brand)]">✓</span>{' '}
              {account.email === undefined ? (
                'Signed in to Stacktape on this machine'
              ) : (
                <>
                  Signed in as{' '}
                  <span className="text-[var(--stp-text-primary)] [overflow-wrap:anywhere]">{account.email}</span>
                </>
              )}
              {account.organization !== undefined && <> · {organizationLabel(account.organization)}</>}
            </output>
          </>
        )}
        {account?.signedIn === false && (
          <>
            <h3 className="wizard-section-heading">Sign in or create an account to deploy</h3>
            <p className="wizard-lede mb-4">
              Deploying goes through Stacktape, so it needs an account. A free one is enough. The file you saved stays
              as it is either way.
            </p>
            <SignInPanel
              isRechecking={isBusy === 'recheck'}
              onRecheck={onRecheck}
              onSignIn={onSignIn}
              signIn={state.signIn}
            />
          </>
        )}
      </section>

      <section>
        <h3 className="wizard-section-heading">Try it here first</h3>
        {verification === undefined && (
          <>
            <p className="wizard-lede mb-3">
              Optional. Stacktape builds your services in Docker on this machine and starts them without network access
              and with placeholder settings, to catch an app that will not start before it reaches AWS. This runs your
              project's code, including dependency install scripts, so it only happens when you ask.
            </p>
            <Button isLoading={isBusy === 'verify'} onClick={onVerify} variant="secondary">
              Build and start it here
            </Button>
          </>
        )}
        {verification?.status === 'running' && (
          <div className="flex items-center gap-3 text-[var(--stp-text-muted)]">
            <Spinner />
            <span>Building and starting your app… a first build can take a few minutes.</span>
          </div>
        )}
        {verification?.status === 'repairing' && (
          <div className="flex items-center gap-3 text-[var(--stp-text-muted)]">
            <Spinner />
            <span>It did not start. Working out what we got wrong, then trying again here.</span>
          </div>
        )}
        {verification?.status === 'unavailable' && (
          <Alert tone="info" title="The local try-out did not run">
            <p className="m-0 mb-3">
              It needs Docker, and Docker is not running on this machine. Start Docker (or install Docker Desktop) and
              try again, or skip it: the try-out is optional, and AWS will be the app's first full run.
            </p>
            <Button isLoading={isBusy === 'verify'} onClick={onVerify} variant="secondary">
              Try again
            </Button>
          </Alert>
        )}
        {verification?.status === 'completed' && (verification.services ?? []).length === 0 && (
          <p className="m-0 text-[var(--stp-text-muted)]">
            Nothing in this app runs as a container, so there is nothing to start on this machine. AWS will be its first
            full run.
          </p>
        )}
        {(verification?.status === 'completed' || verification?.status === 'dismissed') &&
          (verification.services ?? []).length > 0 && (
            <div className="flex flex-col gap-3">
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[0.95rem]">
                {(verification.services ?? []).map((entry) => (
                  <li key={entry.serviceName}>
                    <span className="font-medium">
                      {entry.serviceName}
                      {entry.status === 'passed' && ': passed'}
                      {entry.status === 'failed' && ': failed'}
                      {entry.status === 'inconclusive' && ': inconclusive'}
                      {entry.status === 'skipped' && ': not checked'}
                    </span>
                    <span className="block text-[var(--stp-text-muted)]">{entry.reason}</span>
                    {entry.status === 'failed' && entry.observations.missingEnvironmentVariables.length > 0 && (
                      <span className="block text-[var(--stp-text-muted)]">
                        It read {listNames(entry.observations.missingEnvironmentVariables)}, and nothing sets{' '}
                        {entry.observations.missingEnvironmentVariables.length === 1 ? 'it' : 'them'}. Add{' '}
                        {entry.observations.missingEnvironmentVariables.length === 1 ? 'it' : 'them'} under{' '}
                        <span className="wizard-code">environment</span> in{' '}
                        <span className="wizard-code">{file.filename}</span>, or as a secret.
                      </span>
                    )}
                    {entry.status === 'failed' && entry.observations.logTail.length > 0 && (
                      <pre className="wizard-output mt-2 max-h-40 overflow-auto">
                        {entry.observations.logTail.slice(-8).join('\n')}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
              {verification.status === 'completed' && hasUnverifiedServices && !verificationBlocks && (
                <Alert tone="info" title="Some services were not proven locally">
                  Deploy is still available because the local try-out is optional. AWS will be the first complete build
                  or startup check for the services marked above.
                </Alert>
              )}
              {verification.status === 'completed' && verificationBlocks && (
                <Alert tone="warning" title="The local try-out found a startup failure">
                  <p className="m-0 mb-3">
                    The same failure is likely on AWS, so deploy is paused. Fix what it reported (a decision above, a
                    setting or the code) and try again. Or, if this machine is the problem rather than the app, set the
                    result aside and deploy anyway.
                  </p>
                  <div className="flex items-center gap-3">
                    <Button isLoading={isBusy === 'verify'} onClick={onVerify} variant="secondary">
                      Try again
                    </Button>
                    <Button onClick={onDismissVerification} variant="plain">
                      Set aside and deploy anyway
                    </Button>
                  </div>
                </Alert>
              )}
              {verification.status === 'dismissed' && (
                <p className="m-0 text-[0.9rem] text-[var(--stp-text-subtle)]">
                  Set aside. Deploying is enabled again.
                </p>
              )}
            </div>
          )}
      </section>

      <section>
        <h3 className="wizard-section-heading">Deploy</h3>
        <p className="wizard-lede mb-2">
          Creates or updates one stack containing{' '}
          {resources.length === 1 ? 'one resource' : `${resources.length} resources`}
          {monthly === undefined || priceRegion !== region
            ? ''
            : `, about ${monthly} in ${region} at the sizes you picked`}
          .
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
          )}
        </p>
        <p className="wizard-lede mb-4">
          It is one CloudFormation stack of plain AWS resources in your own account; it keeps working if you stop using
          Stacktape. A failed first deploy is rolled back and leaves nothing behind in your account.
        </p>
        {checkedTarget === undefined && (
          <Alert className="mb-4" tone="info" title="No AWS change happens on the first click">
            Stacktape first checks the exact stack name, region, and account using the same connected account or profile
            the deploy command will use. You then confirm a new stack or a specific existing stack.
          </Alert>
        )}
        {checkedTarget?.status === 'absent' && (
          <Alert className="mb-4" tone="info" title="This will create a new stack">
            <span className="wizard-code">{checkedTarget.stackName}</span> does not exist in account{' '}
            <span className="wizard-code">{checkedTarget.accountId}</span>, region{' '}
            <span className="wizard-code">{checkedTarget.region}</span>.
          </Alert>
        )}
        {checkedTarget?.status === 'updateable' && (
          <Alert className="mb-4" tone="warning" title="This will update a stack that already exists">
            <span className="wizard-code">{checkedTarget.stackName}</span> is in account{' '}
            <span className="wizard-code">{checkedTarget.accountId}</span>, region{' '}
            <span className="wizard-code">{checkedTarget.region}</span>, and{' '}
            {stackStatusWords(checkedTarget.stackStatus)}. Deploying makes it match the file you saved: anything in it
            that the file does not define is removed. If the stack changes before you confirm, nothing is deployed.
          </Alert>
        )}
        {checkedTarget?.status === 'blocked' && (
          <BlockedTargetAlert
            className="mb-4"
            deleteCommand={stackCommand('delete', {
              configPath: file.filename,
              projectName: state.projectName,
              stage,
              region
            })}
            target={checkedTarget}
          />
        )}
        {checkedTarget?.status === 'unverified' && (
          <Alert className="mb-4" tone="warning" title="The target could not be checked">
            {checkedTarget.detail} Nothing was created or updated. Fix the AWS credentials or the connected account,
            then check again.
          </Alert>
        )}
        {secrets.length > 0 && (
          <div className="mb-4 flex flex-col gap-3">
            <p className="m-0 text-[0.95rem]">
              Create {secrets.length === 1 ? 'this secret' : `these ${secrets.length} secrets`} in{' '}
              <span className="wizard-code">{region}</span> first. Each command asks for the value; the deploy stops if
              one is missing.
            </p>
            <CopyableCommand command={secrets.map((name) => secretCommand(name, region)).join('\n')} />
          </div>
        )}
        {(gaps.length > 0 || unsetNames.length > 0) && (
          <Alert className="mb-4" tone="warning" title="Check these before deploying">
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {unsetNames.length > 0 && (
                <li>
                  Nothing sets {listNames(unsetNames)} yet. Add the ones your app needs under{' '}
                  <span className="wizard-code">environment</span> in{' '}
                  <span className="wizard-code">{file.filename}</span>; the deploy uses the file as it is on disk.
                </li>
              )}
              {gaps.map((gap) => (
                <li key={`${gap.subject}-${gap.message}`}>{gap.message}</li>
              ))}
            </ul>
          </Alert>
        )}
        <div className="flex items-center gap-4">
          <Button
            disabled={stage === '' || verificationBlocks || compositionBlocks || signInBlocks}
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
          <span className="text-[0.9rem] text-[var(--stp-text-subtle)]">
            {verificationBlocks
              ? verification?.status === 'running'
                ? 'Waiting for the local try-out to finish.'
                : 'The local try-out found a problem. Fix it above, or set the result aside.'
              : compositionBlocks
                ? 'Resolve every gap above before deploying.'
                : signInBlocks
                  ? 'Sign in to Stacktape above before deploying.'
                  : targetBlocked
                    ? 'Read-only. Nothing is deployed to this stack until the check passes.'
                    : checkedTarget === undefined
                      ? 'Read-only check first; creation or update needs a separate confirmation.'
                      : checkedTarget.status === 'updateable'
                        ? 'Updates usually take a few minutes.'
                        : hasDatabase
                          ? 'First deploys with a new database take 10–15 minutes.'
                          : hasUnverifiedServices
                            ? 'Some services were not checked locally; AWS will be their first full run.'
                            : 'Usually a few minutes.'}
          </span>
        </div>
      </section>

      {!compositionBlocks && (
        <>
          <PipelineCard
            isBusy={isBusy === 'pipeline'}
            onWrite={onPipeline}
            region={region}
            stage={stage || 'dev'}
            state={state}
          />

          <section>
            <h3 className="wizard-section-heading">Or run it yourself</h3>
            <p className="wizard-lede mb-3">
              This command creates the stack when absent and updates it when present. Review the account and target in
              your terminal before confirming.
            </p>
            <CopyableCommand
              command={stackCommand('deploy', {
                configPath: file.filename,
                projectName: state.projectName,
                stage: stage || 'dev',
                region
              })}
            />
          </section>
        </>
      )}
    </div>
  );
}

/** Why the stack cannot be deployed to, and the way out: the delete command where deleting is the fix. */
function BlockedTargetAlert({
  target,
  deleteCommand,
  className
}: {
  target: Extract<NonNullable<WizardState['deployTarget']>, { status: 'blocked' }>;
  deleteCommand: string;
  className?: string;
}) {
  const copy = blockedTargetCopy(target);
  return (
    <div className={`flex flex-col gap-3 ${className ?? ''}`}>
      <Alert tone="warning" title={copy.title}>
        {copy.body}
      </Alert>
      {copy.canDelete && <CopyableCommand command={deleteCommand} />}
    </div>
  );
}
