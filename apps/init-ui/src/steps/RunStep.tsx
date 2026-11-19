import type { StacktapeConfig } from '@stacktape/config';
import { explainFailure } from '@stacktape/console-api/failure-explanations';
import { Button, ButtonLink } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BiBot, BiCheck, BiCodeAlt, BiCopy, BiInfoCircle, BiLinkExternal, BiTrash, BiX } from 'react-icons/bi';
import { ConsoleOfferCard } from '../components/ConsoleOfferCard';
import { CopyableCommand } from '../components/CopyableCommand';
import { FailureExplanationText } from '../components/FailureExplanation';
import { InfoTip } from '../components/InfoTip';
import { PipelineCard } from '../components/PipelineCard';
import { Row } from '../components/RowList';
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

/** Ticks once a second while something is running. */
function useNow(isRunning: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);
  return now;
}

function useElapsed(startedAt: string | undefined, endedAt: string | undefined): number | undefined {
  const now = useNow(startedAt !== undefined && endedAt === undefined);
  if (startedAt === undefined) return undefined;
  const start = Date.parse(startedAt);
  const end = endedAt === undefined ? now : Date.parse(endedAt);
  return Number.isNaN(start) || Number.isNaN(end) ? undefined : Math.max(0, Math.round((end - start) / 1000));
}

const duration = (seconds: number | undefined): string =>
  seconds === undefined ? '' : seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;

/** "mainDatabase", "app" and "cdn" as a sentence: "mainDatabase, app and cdn". */
const sentence = (names: readonly string[]): string =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

function RunDiagram({ resources, progress }: { resources: ConfigResources; progress: Record<string, Progress> }) {
  return (
    <section aria-label="Diagram" className="w-card w-run-diagram">
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
          // The same picture as Review: no layer switches or search box in the way.
          layerChoices={[]}
          searchable={false}
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

/**
 * A deploy in progress, or one that has just been repaired and is running again.
 *
 * The workspace grid of Review: the diagram it reviewed fills in on the left as AWS creates each part; the right says
 * which phase it is in and how long each took, what is slow right now, the log, and what closing the tab does.
 */
export function DeployingStep({ state, model }: { state: WizardState; model: DeployModel }) {
  const deployment = state.deployment!;
  const resources = resourcesOf(state);
  const names = Object.keys(resources);
  const progress = resourceProgress(model, names, deployment.status);
  const ready = names.filter((name) => progress[name] === 'ready').length;
  const creating = names.filter((name) => progress[name] === 'creating');
  const startedAt = deployment.startedAt ?? (deployment.events[0] as { ts?: string } | undefined)?.ts;
  const elapsed = useElapsed(startedAt, undefined);
  const now = useNow(true);
  const database = Object.entries(resources).find(([, resource]) => resource.type === 'relational-database')?.[0];
  const identity = state.awsIdentity;
  const phases = model.phases.filter((phase) => phase.id !== 'SUMMARY');
  const deployPhase = phases.find((phase) => phase.id === 'DEPLOY');
  const percent = deployPhase?.cloudformation?.percent;
  const databaseIsSlow = database !== undefined && deployPhase?.status === 'running' && progress[database] !== 'ready';
  const [showLog, setShowLog] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (showLog) logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [model.log.length, showLog]);
  const repairing = deployment.status === 'repairing';
  const agent = state.agents?.find((option) => option.id === state.choice?.agentId);

  return (
    <div className="w-workspace w-enter">
      <div className="w-pane">
        <header className="w-run-head">
          <h1 className="w-title">{repairing ? 'Fixing what went wrong' : `Deploying to ${deployment.stage}`}</h1>
          <p className="w-lede">
            {repairing
              ? `The first attempt failed. ${agent === undefined || agent.id === 'none' ? 'The agent' : agent.label} is reading your code again and deploys once more if it finds the cause.`
              : `Into AWS account ${identity?.available === true ? identity.accountId.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : 'on this machine'}, ${deployment.region}.`}
          </p>
        </header>
        <RunDiagram progress={progress} resources={resources} />
      </div>

      <aside aria-label="Deploy progress" className="w-card w-run-side">
        <div className="w-run-scroll">
          <div className="w-run-total">
            <strong>
              {ready} of {names.length} {names.length === 1 ? 'resource' : 'resources'} ready
            </strong>
            <span>
              {elapsed === undefined ? '' : duration(elapsed)}
              {repairing ? '' : ` · usually ${database === undefined ? '3–6' : '10–15'} min`}
            </span>
          </div>
          <progress
            aria-label="Creating AWS resources"
            className="w-run-meter"
            max={100}
            value={Math.max(2, Math.min(100, percent ?? 0))}
          />
          <ol className="w-phases">
            {phases.length === 0 && (
              <li className="w-phase is-running">
                <span className="w-phase-icon">
                  <Spinner />
                </span>
                <p className="w-phase-label">Starting the deploy…</p>
                <span />
              </li>
            )}
            {phases.map((phase) => {
              const seconds =
                phase.startedAt === undefined
                  ? undefined
                  : Math.round(
                      ((phase.endedAt ?? (phase.status === 'running' ? now : phase.startedAt)) - phase.startedAt) / 1000
                    );
              return (
                <li className={`w-phase is-${phase.status}`} key={phase.id}>
                  <span className="w-phase-icon">
                    {phase.status === 'done' ? (
                      <BiCheck className="text-[var(--w-ok)]" size={18} />
                    ) : phase.status === 'failed' ? (
                      <BiX className="text-[var(--w-error)]" size={18} />
                    ) : phase.status === 'running' ? (
                      <Spinner />
                    ) : (
                      <span className="w-phase-dot" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="w-phase-label">{phase.label}</p>
                    {phase.status === 'running' && phase.id === 'DEPLOY' && (
                      <p className="w-phase-note">
                        {creating.length > 0 ? `Creating ${sentence(creating)}` : 'Waiting on AWS'}
                      </p>
                    )}
                    {phase.status === 'running' && phase.id !== 'DEPLOY' && phase.message !== '' && (
                      <p className="w-phase-note">{phase.message}</p>
                    )}
                  </div>
                  <span className="w-phase-time">
                    {seconds === undefined || (seconds < 1 && phase.status !== 'running') ? '' : duration(seconds)}
                  </span>
                </li>
              );
            })}
          </ol>
          {databaseIsSlow && (
            <p className="w-slow">
              <BiInfoCircle aria-hidden size={15} />
              <span>
                Creating the database, usually the longest part. AWS takes 8–10 minutes for{' '}
                <span className="w-code">{database}</span>.
              </span>
            </p>
          )}
          <div className="w-run-log">
            <button
              aria-expanded={showLog}
              className="w-link w-small text-[var(--w-muted)]"
              onClick={() => setShowLog(!showLog)}
              type="button"
            >
              {showLog ? 'Hide the log' : `Show the log (${model.log.length} lines)`}
            </button>
            {showLog && (
              <pre aria-label="Deploy log" className="w-log" ref={logRef}>
                {model.log.join('\n')}
              </pre>
            )}
          </div>
        </div>
        <p className="w-run-foot">
          <BiInfoCircle aria-hidden size={14} />
          <span>
            Closing this tab does not stop the deploy. Ctrl+C in the terminal running{' '}
            <span className="w-code">stacktape init</span> does.
          </span>
        </p>
      </aside>
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
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (primary === undefined) return;
    void (async () => {
      try {
        await navigator.clipboard.writeText(primary.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // The address is on screen to select by hand.
      }
    })();
  };

  return (
    <div className="w-enter">
      <section aria-label="Live" className="w-card w-live">
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
            <strong>{deployment.stage}</strong> in {deployment.region}
          </li>
        </ul>
        {primary === undefined && (
          <p className="w-live-note">Everything was created. None of it has a public address.</p>
        )}
        {primary !== undefined && (
          <div className="w-live-actions">
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
            <Button
              className="w-big"
              icon={copied ? <BiCheck size={15} /> : <BiCopy size={14} />}
              onClick={copyAddress}
              variant="secondary"
            >
              {copied ? 'Copied' : 'Copy address'}
            </Button>
          </div>
        )}
        {urls.length > 1 && (
          <ul className="w-live-more">
            {urls.slice(1).map((entry) => (
              <li key={entry.url}>
                {entry.resourceName}:{' '}
                <a className="w-link" href={entry.url} rel="noreferrer" target="_blank">
                  {entry.url.replace(/^https:\/\//, '')}
                </a>
              </li>
            ))}
          </ul>
        )}
        {repaired.length > 0 && (
          <p className="w-live-note">
            The first attempt failed, so we changed {sentence(repaired)} and deployed again. The file in your project is
            the version that is live.
          </p>
        )}
      </section>

      <h2 className="w-next-title">Next steps</h2>
      <ul className="w-card w-next">
        <Row
          description={`Change your code, then run the same deploy. It updates ${deployment.stage} in place.`}
          icon={<BiCodeAlt size={17} />}
          title="Ship a change"
        >
          <CopyableCommand command={stackCommand('deploy', target)} />
        </Row>
        <ConsoleOfferCard
          isRechecking={busy === 'recheck'}
          monthly={amount === undefined ? undefined : `${amount}/month`}
          onConnect={() => onConsoleConnection('connect')}
          onDismiss={() => void onConsoleConnection('dismiss')}
          onRecheck={onRecheck}
          onSignIn={onSignIn}
          stage={deployment.stage}
          stageUrl={stageUrl}
          state={{
            ...state,
            consoleConnection: state.consoleConnection ?? { status: 'linked' }
          }}
        />
        {state.codingAgentSetup === undefined ? (
          <Row
            description={`One command deletes everything this deploy created${hasDatabase ? ', including the database' : ''}.`}
            icon={<BiTrash size={17} />}
            title="Remove it when you are done"
          >
            <CopyableCommand command={stackCommand('delete', target)} />
          </Row>
        ) : (
          <CodingAgentRow
            isBusy={busy === 'coding-agent'}
            onConnect={onConnectCodingAgent}
            setup={state.codingAgentSetup}
          />
        )}
        {state.gitHost !== undefined && (
          <PipelineCard
            isBusy={busy === 'pipeline'}
            onWrite={onPipeline}
            region={deployment.region}
            stage={deployment.stage}
            state={state}
          />
        )}
      </ul>

      <div className="w-live-links">
        {state.codingAgentSetup !== undefined && (
          <button
            aria-expanded={showRemoval}
            className="w-link w-small text-[var(--w-subtle)]"
            onClick={() => setShowRemoval(!showRemoval)}
            type="button"
          >
            {showRemoval ? 'Hide' : 'Remove this deployment'}
          </button>
        )}
        <button
          aria-expanded={showLog}
          className="w-link w-small text-[var(--w-subtle)]"
          onClick={() => setShowLog(!showLog)}
          type="button"
        >
          {showLog ? 'Hide the deploy log' : 'Show the deploy log'}
        </button>
      </div>
      {showRemoval && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="w-quiet">
            Deletes everything this deploy created{hasDatabase ? ', including the database and its data' : ''}. Your
            code and <span className="w-code">{target.configPath}</span> stay.
          </p>
          <CopyableCommand command={stackCommand('delete', target)} />
        </div>
      )}
      {showLog && <pre className="w-log">{model.log.join('\n')}</pre>}
    </div>
  );
}

/** Connecting the coding agent picked on the Start step to Stacktape, as a next-step row. */
function CodingAgentRow({
  setup,
  isBusy,
  onConnect
}: {
  setup: NonNullable<WizardState['codingAgentSetup']>;
  isBusy: boolean;
  onConnect: () => void;
}) {
  const { label, status, detail, command } = setup;
  const title = (
    <span className="inline-flex items-center gap-1.5">
      Deploy from {label}
      <InfoTip about={`connecting ${label}`}>
        Adds the Stacktape tools to {label} for your user, not this repository. {label} asks before it changes
        infrastructure.
      </InfoTip>
    </span>
  );
  if (status === 'connected') {
    return (
      <Row
        description={<>{detail} Then ask it: “Use Stacktape to show what this project deploys.”</>}
        icon={<BiBot size={17} />}
        title={
          <span className="inline-flex items-center gap-2">
            {title}
            <span className="w-saved">
              <BiCheck aria-hidden size={16} /> Connected
            </span>
          </span>
        }
      />
    );
  }
  return (
    <Row
      action={
        <Button isLoading={isBusy || status === 'running'} onClick={onConnect} variant="secondary">
          {status === 'failed' ? 'Try again' : `Connect ${label}`}
        </Button>
      }
      description={`${label} can then deploy this project, read its logs and look up the docs.`}
      icon={<BiBot size={17} />}
      title={title}
    >
      {status === 'failed' && (
        <>
          <p className="w-error-text">{detail}</p>
          <CopyableCommand command={command} />
        </>
      )}
    </Row>
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
        <span className="w-code">{failed}</span> started on AWS, then exited: it could not reach a database at{' '}
        <span className="w-code">localhost:{local[1]}</span>.
      </>
    ),
    why: (
      <>
        On AWS the database is <span className="w-code">{database}</span>. The app still looks for a local one, often
        from a default in code or a <span className="w-code">.env</span> file that is not deployed.
      </>
    ),
    fix:
      wired !== undefined ? (
        <>
          The file already gives <span className="w-code">{failed}</span> the address in{' '}
          <span className="w-code">{wired}</span>. Read it from there in your code instead of falling back to localhost,
          then deploy again.
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
  const wasUpdate = state.deployTarget?.status === 'updateable';
  const repairs = deployment.repairs ?? [];

  return (
    <div className="w-enter">
      <header className="w-hero">
        <h1 className="w-title">The deploy to {deployment.stage} stopped</h1>
        <p className="w-lede">
          {deployment.keptPartialProgress === true
            ? 'What this attempt created is kept for the next one, and billed until you deploy again or remove it.'
            : wasUpdate
              ? 'AWS put the stack back to the version that was running. Your live app is unchanged.'
              : 'AWS rolled it back, so nothing it created is running. Your saved secrets stay.'}
        </p>
      </header>
      <dl className="w-card w-fail">
        <div className="w-fail-row is-cause">
          <dt>What happened</dt>
          <dd>
            {story?.happened ??
              (explained[0] === undefined ? (
                <span className="line-clamp-3 whitespace-pre-wrap">
                  {message.split('\n').slice(0, 3).join(' ') || 'The deploy failed.'}
                </span>
              ) : (
                <FailureExplanationText explanations={explained.slice(0, 1)} part="cause" />
              ))}
          </dd>
        </div>
        {story !== undefined && (
          <div className="w-fail-row">
            <dt>Why</dt>
            <dd>{story.why}</dd>
          </div>
        )}
        <div className="w-fail-row">
          <dt>The fix</dt>
          <dd>
            {story?.fix ??
              (explained.length > 0 ? (
                <FailureExplanationText explanations={explained} part="action" />
              ) : (
                'Read the full error, fix the cause in your code or the file, then deploy again.'
              ))}
            <p className="w-quiet">
              Deploy again reads your code and <span className="w-code">{target.configPath}</span> from disk.
            </p>
            {repairs.length > 0 && (
              <p className="w-quiet">
                {repairs.some((repair) => repair.applied)
                  ? 'The agent already changed the file once and tried again. It still failed, so it stopped.'
                  : 'The agent read the code again and found nothing in the file to change, so it stopped.'}
              </p>
            )}
          </dd>
        </div>
      </dl>
      <div className="w-actions">
        <Button className="w-big" isLoading={busy === 'deploy'} onClick={onDeployAgain} variant="primary">
          Deploy again
        </Button>
        <Button className="w-big" onClick={onBackToFile} variant="secondary">
          Open {target.configPath}
        </Button>
        <button
          aria-expanded={showError}
          className="w-link w-small text-[var(--w-muted)]"
          onClick={() => setShowError(!showError)}
          type="button"
        >
          {showError ? 'Hide the error' : 'Show the full error'}
        </button>
      </div>
      {showError && <pre className="w-log">{[message, '', ...model.log.slice(-60)].join('\n')}</pre>}
      {deployment.keptPartialProgress === true && (
        <section className="mt-8">
          <h2 className="w-section-title">Or put the stack back</h2>
          <CopyableCommand command={stackCommand('stack recover', target)} />
        </section>
      )}
    </div>
  );
}
