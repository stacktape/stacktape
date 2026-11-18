import type { StacktapeConfig } from '@stacktape/config';
import { explainFailure } from '@stacktape/console-api/failure-explanations';
import { Button, ButtonLink } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BiCheck, BiInfoCircle, BiLinkExternal, BiX } from 'react-icons/bi';
import { ConsoleOfferCard } from '../components/ConsoleOfferCard';
import { CopyableCommand } from '../components/CopyableCommand';
import { FailureExplanationText } from '../components/FailureExplanation';
import { PipelineCard } from '../components/PipelineCard';
import { resourcesOf, type ConfigResources } from '../config-resources';
import { stackCommand } from '../deploy-commands';
import type { DeployModel } from '../deploy-model';
import type { SignInRequest, WizardState } from '../session';
import { splitMonthly } from './review-model';

const Diagram = lazy(() => import('../components/Diagram'));

type Deployment = NonNullable<WizardState['deployment']>;
type Progress = 'pending' | 'creating' | 'ready';

const pascal = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;

/**
 * How far the deploy has got with each resource, from CloudFormation's in-progress lists.
 *
 * CloudFormation reports logical IDs, which Stacktape builds from the resource name in PascalCase. A resource is
 * creating while any of its IDs is in progress, and ready once one was and none is any more, or once CloudFormation
 * is done. Before CloudFormation starts nothing is there yet.
 */
export const resourceProgress = (
  model: DeployModel,
  names: readonly string[],
  status: Deployment['status']
): Record<string, Progress> => {
  const deployPhase = model.phases.find((phase) => phase.id === 'DEPLOY');
  const finished = status === 'succeeded' || (deployPhase !== undefined && deployPhase.status === 'done');
  const current = deployPhase?.cloudformation?.inProgress ?? [];
  const seen = model.seenInProgress;
  const progress: Record<string, Progress> = {};
  for (const name of names) {
    const prefix = pascal(name);
    const owns = (id: string) => id === name || id.startsWith(prefix);
    progress[name] = finished ? 'ready' : current.some(owns) ? 'creating' : seen.some(owns) ? 'ready' : 'pending';
  }
  return progress;
};

function useElapsed(startedAt: string | undefined, endedAt: string | undefined): number | undefined {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === undefined || endedAt !== undefined) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt, endedAt]);
  if (startedAt === undefined) return undefined;
  const start = Date.parse(startedAt);
  const end = endedAt === undefined ? now : Date.parse(endedAt);
  return Number.isNaN(start) || Number.isNaN(end) ? undefined : Math.max(0, Math.round((end - start) / 1000));
}

const duration = (seconds: number | undefined): string =>
  seconds === undefined ? '' : seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;

function RunDiagram({ resources, progress }: { resources: ConfigResources; progress: Record<string, Progress> }) {
  return (
    <section aria-label="Diagram" className="w-card w-diagram">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        }
      >
        <Diagram
          ariaLabel="Diagram of what the deploy is creating"
          config={{ resources } as unknown as StacktapeConfig}
          hint="Faint: not created yet · pulsing: being created"
          initialZoom={1.1}
          layerChoices={[]}
          resourceProgress={progress}
          statuses={Object.fromEntries(
            Object.entries(progress).map(([name, value]) => [
              name,
              [
                value === 'ready'
                  ? { tone: 'ok' as const, text: 'Ready' }
                  : { tone: 'unknown' as const, text: value === 'creating' ? 'Creating…' : 'Waiting' }
              ]
            ])
          )}
          style={{ width: '100%', height: '100%' }}
        />
      </Suspense>
    </section>
  );
}

/** A deploy in progress, or one that has just been repaired and is running again. */
export function DeployingStep({ state, model }: { state: WizardState; model: DeployModel }) {
  const deployment = state.deployment!;
  const resources = resourcesOf(state);
  const names = Object.keys(resources);
  const progress = resourceProgress(model, names, deployment.status);
  const ready = names.filter((name) => progress[name] === 'ready').length;
  const creating = names.filter((name) => progress[name] === 'creating');
  const elapsed = useElapsed(
    deployment.startedAt ?? (deployment.events[0] as { ts?: string } | undefined)?.ts,
    undefined
  );
  const database = Object.entries(resources).find(([, resource]) => resource.type === 'relational-database')?.[0];
  const [showLog, setShowLog] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (showLog) logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [model.log.length, showLog]);

  return (
    <div className="w-enter">
      <header className="w-hero">
        <p className="w-eyebrow">Deploy</p>
        <h1 className="w-title">
          {deployment.status === 'repairing' ? 'Fixing what went wrong' : `Deploying to ${deployment.stage}`}
        </h1>
        <p className="w-lede">
          {deployment.status === 'repairing'
            ? 'The first attempt failed. The agent is reading your code again; if it finds the cause, it changes the file and deploys once more.'
            : `${ready} of ${names.length} ${names.length === 1 ? 'resource' : 'resources'} ready · ${deployment.region}${elapsed === undefined ? '' : ` · ${duration(elapsed)}`}`}
        </p>
      </header>
      <div className="w-progress">
        <RunDiagram progress={progress} resources={resources} />
        <aside className="w-side">
          <section aria-label="Deploy steps" className="w-card">
            <ol className="w-phases">
              {model.phases.length === 0 && (
                <li className="w-phase is-running">
                  <Spinner />
                  <p className="w-phase-label">Starting the deploy…</p>
                </li>
              )}
              {model.phases
                .filter((phase) => phase.id !== 'SUMMARY')
                .map((phase) => (
                  <li className={`w-phase is-${phase.status}`} key={phase.id}>
                    {phase.status === 'done' ? (
                      <BiCheck className="text-[var(--w-ok)]" size={20} />
                    ) : phase.status === 'failed' ? (
                      <BiX className="text-[var(--w-error)]" size={20} />
                    ) : phase.status === 'running' ? (
                      <Spinner />
                    ) : (
                      <span />
                    )}
                    <div className="min-w-0">
                      <p className="w-phase-label">{phase.label}</p>
                      {phase.status === 'running' && phase.id === 'DEPLOY' && (
                        <>
                          <p className="w-phase-note">
                            {creating.length > 0 ? `Creating ${creating.join(', ')}` : 'Waiting on AWS'}
                          </p>
                          <progress
                            aria-label="Creating AWS resources"
                            className="w-meter"
                            max={100}
                            value={Math.max(3, Math.min(100, phase.cloudformation?.percent ?? 0))}
                          />
                        </>
                      )}
                      {phase.status === 'running' && phase.id !== 'DEPLOY' && phase.message !== '' && (
                        <p className="w-phase-note">{phase.message}</p>
                      )}
                    </div>
                  </li>
                ))}
            </ol>
            <div className="border-t border-[var(--w-line)] px-[18px] py-3">
              <button className="w-textbutton" onClick={() => setShowLog(!showLog)} type="button">
                {showLog ? 'Hide the log' : `Show the log (${model.log.length} lines)`}
              </button>
              {showLog && (
                <pre aria-label="Deploy log" className="w-log" ref={logRef}>
                  {model.log.join('\n')}
                </pre>
              )}
            </div>
          </section>
          {database !== undefined && progress[database] !== 'ready' && (
            <p className="w-note">
              <BiInfoCircle size={15} />
              <span>
                Expect the wait to be the database (<span className="w-code">{database}</span>): AWS usually takes 8–10
                minutes to create one.
              </span>
            </p>
          )}
          <p className="w-note">
            <BiInfoCircle size={15} />
            <span>
              Closing this tab does not stop the deploy; it runs in <span className="w-code">stacktape init</span> in
              your terminal. Stopping that stops it.
            </span>
          </p>
        </aside>
      </div>
    </div>
  );
}

/** The deploy worked: the running app first, then what to do with it. */
export function LiveStep({
  state,
  model,
  busy,
  onPipeline,
  onConnectCodingAgent,
  onRecheck,
  onSignIn,
  onConsoleConnection
}: {
  state: WizardState;
  model: DeployModel;
  busy: string | undefined;
  onPipeline: (stage: string, region: string) => void;
  onConnectCodingAgent: () => void;
  onRecheck: () => void;
  onSignIn: (request: SignInRequest) => Promise<WizardState>;
  onConsoleConnection: (action: 'connect' | 'dismiss') => Promise<WizardState | undefined>;
}) {
  const deployment = state.deployment!;
  const file = state.configFile;
  const urls = deployment.urls ?? [];
  const primary = urls[0];
  const events = deployment.events as Array<{ ts?: string }>;
  const elapsed = useElapsed(deployment.startedAt ?? events[0]?.ts, events.at(-1)?.ts ?? deployment.startedAt);
  const price = state.composition?.price;
  const amount = price === undefined ? undefined : splitMonthly(price.monthly).amount;
  const target = {
    configPath: file?.filename ?? 'stacktape.yml',
    projectName: state.projectName,
    stage: deployment.stage,
    region: deployment.region,
    awsAccount: state.awsAccount
  };
  const stageUrl = `${state.consoleUrl ?? 'https://console.stacktape.com'}/projects/${state.projectName}/${deployment.stage}/overview`;
  const hasDatabase = Object.values(resourcesOf(state)).some((resource) => resource.type === 'relational-database');
  const repaired = (deployment.repairs ?? [])
    .filter((repair) => repair.applied)
    .flatMap((repair) => repair.changedResources ?? []);
  const [showRemoval, setShowRemoval] = useState(false);
  const [showLog, setShowLog] = useState(false);

  return (
    <div className="w-enter">
      <section aria-label="Live" className="w-card w-live">
        <div className="min-w-0">
          <p className="w-live-badge">
            <span aria-hidden className="w-live-dot" /> Live on AWS
          </p>
          {primary === undefined ? (
            <h1 className="w-title">{state.projectName} is deployed</h1>
          ) : (
            <>
              <h1 className="sr-only">{state.projectName} is live</h1>
              <a className="w-live-url" href={primary.url} rel="noreferrer" target="_blank" title={primary.url}>
                {primary.url.replace(/^https:\/\//, '')}
              </a>
            </>
          )}
          <ul className="w-live-meta">
            {elapsed !== undefined && elapsed > 0 && (
              <li>
                Live in <strong>{duration(elapsed)}</strong>
              </li>
            )}
            {amount !== undefined && (
              <li>
                About <strong>{amount}/month</strong>
              </li>
            )}
            <li>
              <strong>{deployment.stage}</strong> · {deployment.region}
            </li>
          </ul>
          {primary === undefined && <p className="w-lede">Everything was created. None of it has a public address.</p>}
          {urls.length > 1 && (
            <ul className="w-detail-list mt-3">
              {urls.slice(1).map((entry) => (
                <li key={entry.url}>
                  <span>{entry.resourceName}:</span>
                  <a className="w-link" href={entry.url} rel="noreferrer" target="_blank">
                    {entry.url.replace(/^https:\/\//, '')}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {repaired.length > 0 && (
            <p className="w-lede text-[13px]">
              The first attempt failed; we changed {repaired.join(', ')} and tried again. The file in your project is
              the version that is live.
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-4">
          <svg aria-hidden className="w-check-draw" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="29" />
            <path d="M20 33 L28 41 L44 24" />
          </svg>
          {primary !== undefined && (
            <ButtonLink
              className="w-big"
              href={primary.url}
              icon={<BiLinkExternal size={15} />}
              iconPosition="end"
              rel="noreferrer"
              target="_blank"
              variant="primary"
            >
              Open app
            </ButtonLink>
          )}
        </div>
      </section>

      <div className="w-next">
        <section className="w-card w-next-card">
          <h3>Ship a change</h3>
          <p>Edit your code, then run the same deploy. It updates this stage in place.</p>
          <div className="w-next-action">
            <CopyableCommand command={stackCommand('deploy', target)} />
          </div>
        </section>
        <section className="w-card w-next-card">
          {state.consoleConnection === undefined || state.consoleConnection.status === 'linked' ? (
            <>
              <h3>Watch it in the Console</h3>
              <p>Logs, metrics, alerts and every deploy of {deployment.stage}, already connected.</p>
              <div className="w-next-action">
                <ButtonLink href={stageUrl} rel="noreferrer" target="_blank" variant="secondary">
                  Open the Console
                </ButtonLink>
              </div>
            </>
          ) : (
            <ConsoleOfferCard
              isRechecking={busy === 'recheck'}
              onConnect={() => onConsoleConnection('connect')}
              onDismiss={() => void onConsoleConnection('dismiss')}
              onRecheck={onRecheck}
              onSignIn={onSignIn}
              monthly={amount === undefined ? undefined : `${amount}/month`}
              stage={deployment.stage}
              stageUrl={stageUrl}
              state={state}
            />
          )}
        </section>
        <section className="w-card w-next-card">
          {state.codingAgentSetup === undefined ? (
            <>
              <h3>Remove it when done</h3>
              <p>One command deletes everything this deploy created{hasDatabase ? ', including the database' : ''}.</p>
              <div className="w-next-action">
                <CopyableCommand command={stackCommand('delete', target)} />
              </div>
            </>
          ) : (
            <CodingAgentCard
              isBusy={busy === 'coding-agent'}
              onConnect={onConnectCodingAgent}
              setup={state.codingAgentSetup}
            />
          )}
        </section>
      </div>

      {state.gitHost !== undefined && (
        <section className="w-card mt-4 p-[18px]">
          <ul className="wizard-rows">
            <PipelineCard
              isBusy={busy === 'pipeline'}
              onWrite={onPipeline}
              region={deployment.region}
              stage={deployment.stage}
              state={state}
            />
          </ul>
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
        {state.codingAgentSetup !== undefined && (
          <button className="w-textbutton" onClick={() => setShowRemoval(!showRemoval)} type="button">
            {showRemoval ? 'Hide' : 'Done experimenting? Remove this deployment'}
          </button>
        )}
        <button className="w-textbutton" onClick={() => setShowLog(!showLog)} type="button">
          {showLog ? 'Hide the deploy log' : 'Show the deploy log'}
        </button>
      </div>
      {showRemoval && (
        <div className="mt-3 flex max-w-[720px] flex-col gap-2">
          <p className="w-muted m-0 text-[13px]">
            Removes everything this deploy created{hasDatabase ? ', including the database and its data' : ''}. Your
            code and <span className="w-code">{target.configPath}</span> stay.
          </p>
          <CopyableCommand command={stackCommand('delete', target)} />
        </div>
      )}
      {showLog && <pre className="w-log">{model.log.join('\n')}</pre>}
    </div>
  );
}

/** Connecting the coding agent picked on the Start step to Stacktape, as a next-step card. */
function CodingAgentCard({
  setup,
  isBusy,
  onConnect
}: {
  setup: NonNullable<WizardState['codingAgentSetup']>;
  isBusy: boolean;
  onConnect: () => void;
}) {
  const { label, status, detail, command } = setup;
  return (
    <>
      <h3>Deploy from {label}</h3>
      {status === 'connected' ? (
        <>
          <p>
            <span className="w-saved">✓ Connected.</span> {detail} Then ask it: “Use Stacktape to show what this project
            deploys.”
          </p>
        </>
      ) : (
        <>
          <p>
            {label} can then deploy this project, read its logs and look up Stacktape docs. It asks before changing
            infrastructure. Set up for your user, not this repository.
          </p>
          {status === 'failed' && (
            <>
              <p className="text-[var(--w-error)]">{detail}</p>
              <CopyableCommand command={command} />
            </>
          )}
          <div className="w-next-action">
            <Button isLoading={isBusy || status === 'running'} onClick={onConnect} variant="secondary">
              {status === 'failed' ? 'Try again' : `Connect ${label}`}
            </Button>
          </div>
        </>
      )}
    </>
  );
}

type FailureStory = { happened: ReactNode; why: ReactNode; fix: ReactNode };

/**
 * The failure in this project's own names. A container that dialled localhost for its database is the classic first
 * deploy failure, and the file knows both the service and the database, so the fix can name them.
 */
export const failureStory = (message: string, resources: ConfigResources): FailureStory | undefined => {
  const local = /ECONNREFUSED (?:127\.0\.0\.1|localhost|::1):(\d+)/.exec(message);
  const database = Object.entries(resources).find(([, resource]) => resource.type === 'relational-database')?.[0];
  if (local === null || database === undefined) return undefined;
  const failed =
    /^\s*\d+\.\s+(\S+)/m.exec(message)?.[1] ??
    Object.keys(resources).find((name) => message.includes(name) && name !== database) ??
    'the app';
  // `environment` is a list of { name, value } in a Stacktape config; an object of name to value is accepted too.
  const environment = resources[failed]?.properties.environment;
  const variables: Array<[string, unknown]> = Array.isArray(environment)
    ? environment.flatMap((entry: { name?: unknown; value?: unknown }) =>
        typeof entry.name === 'string' ? [[entry.name, entry.value] as [string, unknown]] : []
      )
    : Object.entries((environment ?? {}) as Record<string, unknown>);
  const wired = variables.find(([, value]) => typeof value === 'string' && value.includes(database))?.[0];
  return {
    happened: (
      <>
        <span className="w-code">{failed}</span> started on AWS and exited: it could not reach a database at{' '}
        <span className="w-code">localhost:{local[1]}</span>.
      </>
    ),
    why: (
      <>
        On AWS the database is <span className="w-code">{database}</span>, at its own address. The app still uses a
        local one, usually a default in code or a <span className="w-code">.env</span> file that is not deployed.
      </>
    ),
    fix:
      wired !== undefined ? (
        <>
          The file already gives <span className="w-code">{failed}</span> the database address as{' '}
          <span className="w-code">{wired}</span>. Make your code read the address from{' '}
          <span className="w-code">{wired}</span> instead of falling back to localhost, then deploy again.
        </>
      ) : (
        <>
          Give <span className="w-code">{failed}</span> the address: in the file, add{' '}
          <span className="w-code">connectTo: [{database}]</span> under its properties, and read it in your code from{' '}
          <span className="w-code">
            STP_{database.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}_CONNECTION_STRING
          </span>
          .
        </>
      )
  };
};

/** The deploy stopped: what happened, why, the fix for this project, what AWS kept, and the way to try again. */
export function DeployFailedStep({
  state,
  model,
  busy,
  onDeployAgain,
  onBackToFile
}: {
  state: WizardState;
  model: DeployModel;
  busy: string | undefined;
  onDeployAgain: () => void;
  onBackToFile: () => void;
}) {
  const deployment = state.deployment!;
  const outcome = deployment.outcome;
  const message = outcome?.message ?? '';
  const resources = resourcesOf(state);
  const story = useMemo(() => failureStory(message, resources), [message, resources]);
  const explained = explainFailure(message);
  const [showError, setShowError] = useState(false);
  const target = {
    configPath: state.configFile?.filename ?? 'stacktape.yml',
    projectName: state.projectName,
    stage: deployment.stage,
    region: deployment.region,
    awsAccount: state.awsAccount
  };
  const rolledBack = model.log.some((line) => /rolled back|rollback/i.test(line));
  const wasUpdate = state.deployTarget?.status === 'updateable';
  const repairs = deployment.repairs ?? [];

  return (
    <div className="w-enter mx-auto max-w-[880px]">
      <header className="w-hero">
        <p className="w-eyebrow text-[var(--w-error)]">Deploy</p>
        <h1 className="w-title">The deploy to {deployment.stage} stopped</h1>
        <p className="w-lede">
          {deployment.keptPartialProgress === true
            ? 'What this attempt created was kept for the next one. It is billed until you deploy again or remove it.'
            : wasUpdate
              ? 'AWS put the stack back to the version that was running before. Your live app is unchanged.'
              : rolledBack || !wasUpdate
                ? 'AWS rolled this deploy back: nothing it created is still running. Secrets you saved stay in your account.'
                : ''}
        </p>
      </header>
      <section className="w-card w-failure">
        <dl className="w-failure-grid">
          <dt>What happened</dt>
          <dd>
            {story?.happened ??
              (explained[0] === undefined ? (
                <span className="whitespace-pre-wrap">
                  {message.split('\n').slice(0, 3).join(' ') || 'The deploy failed.'}
                </span>
              ) : (
                <FailureExplanationText explanations={explained.slice(0, 1)} part="cause" />
              ))}
          </dd>
          {story !== undefined && (
            <>
              <dt>Why</dt>
              <dd>{story.why}</dd>
            </>
          )}
          <dt>The fix</dt>
          <dd>
            {story?.fix ??
              (explained.length > 0 ? (
                <FailureExplanationText explanations={explained} part="action" />
              ) : (
                'Read the error below, fix the cause in your code or the file, then deploy again.'
              ))}
            {repairs.length > 0 && (
              <span className="mt-2 block text-[13px] text-[var(--w-muted)]">
                {repairs.some((repair) => repair.applied)
                  ? 'The agent already changed the file once and tried again; it still failed, so it stopped.'
                  : 'The agent read the code again and found nothing in the file to change, so it stopped.'}
              </span>
            )}
          </dd>
        </dl>
        <div className="w-actions">
          <Button isLoading={busy === 'deploy'} onClick={onDeployAgain} variant="primary">
            Deploy again
          </Button>
          <button className="w-textbutton" onClick={onBackToFile} type="button">
            Open {target.configPath}
          </button>
          <button className="w-textbutton" onClick={() => setShowError(!showError)} type="button">
            {showError ? 'Hide the error' : 'Show the full error'}
          </button>
        </div>
        <p className="w-small w-subtle mt-3 mb-0">
          The deploy reads your code and <span className="w-code">{target.configPath}</span> from disk, so fix them
          first.
        </p>
        {showError && <pre className="w-log">{[message, '', ...model.log.slice(-60)].join('\n')}</pre>}
      </section>
      {deployment.keptPartialProgress === true && (
        <section className="mt-5">
          <h2 className="w-section-title">Or put the stack back</h2>
          <CopyableCommand command={stackCommand('stack recover', target)} />
        </section>
      )}
    </div>
  );
}
