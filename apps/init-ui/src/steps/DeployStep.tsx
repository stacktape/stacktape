import { useMemo, useState } from 'react';
import { Alert } from '@stacktape/ui-react/alert';
import { Button } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { buildDeployModel, type DeployEvent } from '../deploy-model';
import { CopyableCommand } from '../components/CopyableCommand';
import { DeployProgress } from '../components/DeployProgress';
import { PipelineCard } from '../components/PipelineCard';
import { RegionPicker } from '../components/RegionPicker';
import { stackCommand } from '../deploy-commands';
import type { WizardState } from '../session';

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
  onVerify,
  onDismissVerification,
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
  /** Consents to trying the composed services on this machine. The click is the consent. */
  onVerify: () => void;
  /** Sets a failed try-out aside: results stay visible, the deploy button comes back. */
  onDismissVerification: () => void;
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
  const signInBlocks = state.stacktapeAccount?.signedIn !== true;
  const [stage, setStage] = useState('dev');
  const [region, setRegion] = useState(
    identity !== undefined && identity.available && identity.region !== undefined ? identity.region : 'eu-west-1'
  );

  const model = useMemo(
    () =>
      deployment === undefined
        ? undefined
        : buildDeployModel(deployment.events as DeployEvent[], deployment.lines, deployment.status !== 'running'),
    [deployment]
  );

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
          model={model}
          outcome={deployment.outcome}
          status={deployment.status}
          urls={deployment.status === 'succeeded' ? (deployment.urls ?? []) : []}
          {...(deployment.repairs === undefined ? {} : { repairs: deployment.repairs })}
          {...(deployment.keptPartialProgress === undefined
            ? {}
            : { keptPartialProgress: deployment.keptPartialProgress })}
        />

        {deployment.status === 'failed' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <Button
                disabled={retryTarget?.status === 'blocked'}
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
                {retryTarget?.status === 'absent'
                  ? 'Create after retry'
                  : retryTarget?.status === 'updateable'
                    ? 'Update after retry'
                    : 'Check target before retry'}
              </Button>
              <span className="text-[0.9rem] text-[var(--stp-text-subtle)]">
                Same stage, same region. Fix whatever it reported first if it will just happen again.
              </span>
            </div>
            {retryTarget?.status === 'updateable' && (
              <Alert tone="warning" title="The retry is now an update">
                Stack <span className="wizard-code">{retryTarget.stackName}</span> exists with status{' '}
                <span className="wizard-code">{retryTarget.stackStatus}</span>. The retry confirmation is bound to its
                exact StackId.
              </Alert>
            )}
            {retryTarget?.status === 'blocked' && (
              <Alert tone="warning" title="This target is not safe to retry">
                Stacktape will not modify the stack in its current state. Clean it up or recover it outside this wizard.
              </Alert>
            )}
            {retryTarget?.status === 'unverified' && (
              <Alert tone="warning" title="The retry target could not be verified">
                {retryTarget.detail} Check again after fixing the account selection or credentials.
              </Alert>
            )}
            {deployment.keptPartialProgress === true && (
              <section>
                <h3 className="wizard-section-heading">Or clean up instead</h3>
                <p className="wizard-lede mb-3">
                  Removes everything this deploy created, so nothing sits in your account billing while you investigate.
                </p>
                <CopyableCommand command={deleteCommand} />
              </section>
            )}
          </div>
        )}

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
                  </a>{' '}
                  — logs, metrics and every deploy, in one place.
                </li>
                <li>
                  <strong>Ship a change.</strong> Edit your code and run the same deploy again — it updates in place:
                  <div className="mt-2">
                    <CopyableCommand command={redeployCommand} />
                  </div>
                </li>
                <li>
                  <strong>Done experimenting?</strong> One command removes everything this created:
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

  const resources = Object.entries(state.composition?.resources ?? {});
  const publicNames = resources.filter(([, resource]) => PUBLIC_TYPES.has(resource.type)).map(([name]) => name);
  const hasDatabase = resources.some(([, resource]) => resource.type === 'relational-database');
  const gaps = state.composition?.gaps ?? [];
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
      <section>
        <h3 className="wizard-section-heading">Written</h3>
        <p className="m-0 text-[var(--stp-text-muted)]">
          <span className="wizard-code text-[var(--stp-text-primary)]">{file.path}</span>
        </p>
        {file.existingPath !== undefined && (
          <p className="mt-2 mb-0 text-[0.9rem] text-[var(--stp-text-subtle)]">
            Your existing <span className="wizard-code">{file.existingPath}</span> was not touched. The deploy below
            uses <span className="wizard-code">{file.filename}</span>.
          </p>
        )}
      </section>

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
                <dt>Ambient account (advisory)</dt>
                <dd className="wizard-code">{identity.accountId}</dd>
              </div>
              <div>
                <dt>Signed in as</dt>
                <dd className="wizard-code">{identity.arn}</dd>
              </div>
            </dl>
            <p className="mt-3 mb-0 text-[0.88rem] text-[var(--stp-text-subtle)]">
              Deploy can use a Stacktape-connected account or persisted profile instead. The exact account is shown and
              confirmed by the target check below.
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
                  No ambient AWS credentials were found. Stacktape may still use an AWS account connected to your
                  signed-in organization; the target check below is authoritative and runs before any AWS change.
                </>
              ) : (
                <>{identity.detail} Check the profile you are signed in with — the wizard keeps everything so far.</>
              )}
            </p>
            <Button isLoading={isBusy === 'recheck'} onClick={onRecheck} variant="secondary">
              I’ve set it up — check again
            </Button>
          </Alert>
        )}
        {state.stacktapeAccount === undefined && (
          <div className="mt-4 flex items-center gap-3 text-[var(--stp-text-muted)]">
            <Spinner />
            <span>Checking the Stacktape sign-in on this machine…</span>
          </div>
        )}
        {state.stacktapeAccount?.signedIn === false && (
          <Alert className="mt-4" tone="warning" title="One more sign-in before deploying">
            <p className="m-0 mb-3">
              Deploying goes through Stacktape, and this machine is not signed in to it. Run{' '}
              <span className="wizard-code">stacktape login</span> in a terminal — the file you just saved is unaffected
              either way.
            </p>
            <Button isLoading={isBusy === 'recheck'} onClick={onRecheck} variant="secondary">
              I’ve signed in — check again
            </Button>
          </Alert>
        )}
        <div className="mt-5 flex flex-wrap items-end gap-5">
          <RegionPicker onChange={setRegion} value={region} />
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.85rem] font-medium">Stage</span>
            <input
              className="wizard-input"
              maxLength={12}
              onChange={(changed) => setStage(changed.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              value={stage}
            />
            <span className="text-[0.78rem] text-[var(--stp-text-subtle)]">
              One environment. <span className="wizard-code">dev</span> is a throwaway you can delete.
            </span>
          </label>
        </div>
      </section>

      <section>
        <h3 className="wizard-section-heading">Try it here first</h3>
        {verification === undefined && (
          <>
            <p className="wizard-lede mb-3">
              Before the real deploy, Stacktape can build and start supported services on this machine. The build may
              download dependencies and run their install hooks; the started app then runs cut off from the network,
              with throwaway values instead of your settings. Each result says whether that service was actually
              checked. This runs your project's own code, which is why it only happens when you ask. Optional either
              way; it needs Docker running.
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
            <span>It didn't start — working out what we got wrong, then trying again here.</span>
          </div>
        )}
        {verification?.status === 'unavailable' && (
          <Alert tone="info" title="The local try-out did not run">
            <p className="m-0 mb-3">
              Docker was not available on this machine, so there is no local startup evidence. Deploy is still available
              because this check is optional; AWS would be the app's first full run.
            </p>
            <Button isLoading={isBusy === 'verify'} onClick={onVerify} variant="secondary">
              Try again
            </Button>
          </Alert>
        )}
        {(verification?.status === 'completed' || verification?.status === 'dismissed') && (
          <div className="flex flex-col gap-3">
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[0.95rem]">
              {(verification.services ?? []).map((entry) => (
                <li key={entry.serviceName}>
                  <span className="font-medium">
                    {entry.status === 'passed' && '✓ Passed — '}
                    {entry.status === 'failed' && '✗ Failed — '}
                    {entry.status === 'inconclusive' && '? Inconclusive — '}
                    {entry.status === 'skipped' && '— Not checked — '}
                    {entry.serviceName}
                  </span>{' '}
                  <span className="text-[var(--stp-text-muted)]">{entry.reason}</span>
                  {entry.status === 'failed' && entry.observations.logTail.length > 0 && (
                    <pre className="wizard-code mt-2 mb-0 max-h-40 overflow-auto whitespace-pre-wrap text-[0.8rem]">
                      {entry.observations.logTail.slice(-8).join('\n')}
                    </pre>
                  )}
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
                  The same failure is likely on AWS, so deploy is paused. Fix what it reported — a decision above, a
                  setting, the code — and try again. Or, if this machine is the problem rather than the app, set the
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
              <p className="m-0 text-[0.9rem] text-[var(--stp-text-subtle)]">Set aside — deploying is enabled again.</p>
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className="wizard-section-heading">Deploy</h3>
        <p className="wizard-lede mb-2">
          Creates or updates one stack containing{' '}
          {resources.length === 1 ? 'one resource' : `${resources.length} resources`}
          {monthly === undefined ? '' : `, about ${monthly} at the size you picked`}.
          {publicNames.length > 0 && (
            <>
              {' '}
              {listNames(publicNames)} {publicNames.length === 1 ? 'gets' : 'get'} a public HTTPS address.
            </>
          )}
          {publicNames.length === 0 && resources.length > 0 && (
            <> This review did not identify a public HTTPS address.</>
          )}
        </p>
        <p className="wizard-lede mb-4">
          Under the hood it is one CloudFormation stack of plain AWS infrastructure — it belongs to you, it stays if you
          stop using Stacktape, and after an attempt this page gives you a fully targeted command to remove it.
          CloudFormation normally rolls back a failed first create. If a retry of an existing stack keeps completed
          resources, the page says so because they can bill. Closing this page or interrupting the CLI does not undo
          work AWS has already accepted.
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
          <Alert className="mb-4" tone="warning" title="This will update an existing stack">
            <span className="wizard-code">{checkedTarget.stackName}</span> already exists in account{' '}
            <span className="wizard-code">{checkedTarget.accountId}</span>, region{' '}
            <span className="wizard-code">{checkedTarget.region}</span>, with status{' '}
            <span className="wizard-code">{checkedTarget.stackStatus}</span>. The confirmation below is bound to its
            exact StackId; if it is replaced or changes state, deploy stops before modifying AWS.
          </Alert>
        )}
        {checkedTarget?.status === 'blocked' && (
          <Alert className="mb-4" tone="warning" title="Stacktape will not modify this target">
            The name <span className="wizard-code">{checkedTarget.stackName}</span> is already occupied by a stack that
            is foreign, mismatched, incomplete, or not in a safe update state. Choose another stage or handle that stack
            outside this wizard.
          </Alert>
        )}
        {checkedTarget?.status === 'unverified' && (
          <Alert className="mb-4" tone="warning" title="The target could not be verified">
            {checkedTarget.detail} Nothing was created or updated. Fix the account selection or credentials, then check
            again.
          </Alert>
        )}
        {gaps.length > 0 && (
          <Alert className="mb-4" tone="warning" title="Check these before deploying">
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {gaps.map((gap) => (
                <li key={`${gap.subject}-${gap.message}`}>{gap.message}</li>
              ))}
            </ul>
          </Alert>
        )}
        <div className="flex items-center gap-4">
          <Button
            disabled={stage === '' || verificationBlocks || compositionBlocks || signInBlocks || targetBlocked}
            isLoading={isBusy === 'deploy'}
            onClick={() => onDeploy(stage, region, targetExpectation)}
            variant="primary"
          >
            {checkedTarget?.status === 'absent'
              ? 'Create new stack'
              : checkedTarget?.status === 'updateable'
                ? 'Update existing stack'
                : 'Check exact AWS target'}
          </Button>
          <span className="text-[0.9rem] text-[var(--stp-text-subtle)]">
            {verificationBlocks
              ? verification?.status === 'running'
                ? 'Waiting for the local try-out to finish.'
                : 'The local try-out found a problem — fix it above, or set the result aside.'
              : compositionBlocks
                ? 'Resolve every gap above before deploying.'
                : signInBlocks
                  ? 'Sign in to Stacktape above before deploying.'
                  : targetBlocked
                    ? 'No AWS change is allowed for this observed target.'
                    : checkedTarget === undefined
                      ? 'Read-only check first; creation or update needs a separate confirmation.'
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
