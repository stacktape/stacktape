import type { StacktapeConfig } from '@stacktape/config';
import { explainFailure } from '@stacktape/console-api/failure-explanations';
import { Button, ButtonLink } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BiBot, BiCheck, BiCodeAlt, BiCopy, BiInfoCircle, BiLinkExternal, BiX } from 'react-icons/bi';
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
import { plainList, plainResourceName, splitMonthly } from './review-model';

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
          // The same picture as Review, without layer switches.
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

/** "Next.js app" → "the Next.js app", "Web service" → "the web service": a resource inside a sentence. */
const inSentence = (resource: { type: string; properties: Record<string, unknown> }): string => {
  const name = plainResourceName(resource);
  return `the ${/^[A-Z][a-z]+ [a-z]/.test(name) && !/^(Postgres|MySQL|MariaDB|Redis|MongoDB|DynamoDB|HTTP)/.test(name) ? `${name.charAt(0).toLowerCase()}${name.slice(1)}` : name}`;
};

/** What the deploy is doing right now, in one line, and one line of why it takes as long as it does. */
const activeOperation = (
  model: DeployModel,
  resources: ConfigResources,
  creating: readonly string[],
  repairing: boolean
): { title: string; detail?: string } => {
  if (repairing) return { title: 'Working out what went wrong' };
  const running = model.phases.find((phase) => phase.status === 'running');
  if (running === undefined) return { title: 'Starting the deploy' };
  if (running.id !== 'DEPLOY') {
    return { title: running.label, ...(running.message === '' ? {} : { detail: running.message }) };
  }
  if (creating.length === 0) return { title: 'Waiting on AWS' };
  const nouns = creating.map((name) => inSentence(resources[name]!));
  // Two of the same kind are told apart by their names.
  const named = new Set(nouns).size === nouns.length ? nouns : creating;
  const database = creating.find((name) => resources[name]?.type === 'relational-database');
  return {
    title: `Creating ${plainList(named)}`,
    ...(database === undefined
      ? {}
      : { detail: 'A new database takes AWS 8–10 minutes. It is usually the longest part.' })
  };
};

/**
 * A deploy in progress, or one that has just been repaired and is running again.
 *
 * The workspace grid of Review: the diagram it reviewed fills in on the left as AWS creates each part, with how many
 * parts are ready. The right leads with what is happening now and how long it has taken against the usual, then the
 * phases, then the log: its last lines, live, until it is opened in full.
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
  const hasDatabase = Object.values(resources).some((resource) => resource.type === 'relational-database');
  const identity = state.awsIdentity;
  const phases = model.phases.filter((phase) => phase.id !== 'SUMMARY');
  const cloudformation = phases.find((phase) => phase.id === 'DEPLOY')?.cloudformation;
  const [showLog, setShowLog] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [model.log.length, showLog]);
  const repairing = deployment.status === 'repairing';
  const agent = state.agents?.find((option) => option.id === state.choice?.agentId);
  const operation = activeOperation(model, resources, creating, repairing);

  return (
    <div className="w-workspace w-enter">
      <div className="w-pane">
        <header className="w-run-head">
          <div className="min-w-0">
            <h1 className="w-title">{repairing ? 'Fixing what went wrong' : `Deploying to ${deployment.stage}`}</h1>
            <p className="w-lede">
              {repairing
                ? `The first attempt failed. ${agent === undefined || agent.id === 'none' ? 'The agent' : agent.label} is reading your code again and deploys once more if it finds the cause.`
                : `Into AWS account ${identity?.available === true ? identity.accountId.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : 'on this machine'}, ${deployment.region}.`}
            </p>
          </div>
          <p className="w-run-parts">
            <strong>
              {ready} of {names.length}
            </strong>{' '}
            {names.length === 1 ? 'part' : 'parts'} of your app ready
          </p>
        </header>
        <RunDiagram progress={progress} resources={resources} />
      </div>

      <aside aria-label="Deploy progress" className={`w-card w-run-side${showLog ? ' is-log-open' : ''}`}>
        <div className="w-run-now">
          <p aria-live="polite" className="w-run-op">
            {operation.title}
          </p>
          {operation.detail !== undefined && <p className="w-run-op-detail">{operation.detail}</p>}
          <p className="w-run-time">
            <strong>{elapsed === undefined ? '—' : duration(elapsed)}</strong>
            {repairing ? '' : ` · usually ${hasDatabase ? '10–15' : '3–6'} min in all`}
          </p>
          <p className="w-run-tab">
            <BiInfoCircle aria-hidden size={14} />
            <span>
              Closing this tab does not stop the deploy. Ctrl+C in the terminal running{' '}
              <span className="w-code">stacktape init</span> does.
            </span>
          </p>
        </div>
        <div className="w-run-progress">
          <progress
            aria-label="AWS resources created"
            className="w-run-meter"
            max={100}
            value={Math.max(2, Math.min(100, cloudformation?.percent ?? 0))}
          />
          <p className="w-run-count">
            {cloudformation === undefined || cloudformation.total === 0
              ? 'AWS resources: not started yet'
              : `${cloudformation.completed} of ${cloudformation.total} AWS resources`}
            <InfoTip about="AWS resources">
              Each part of your app is several AWS resources: the service, its log group, its permissions and so on.
              This counts those.
            </InfoTip>
          </p>
        </div>
        <ol className="w-phases">
          {phases.length === 0 && (
            <li className="w-phase is-running">
              <span className="w-phase-icon">
                <Spinner />
              </span>
              <p className="w-phase-label">Starting the deploy</p>
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
                <p className="w-phase-label">{phase.label}</p>
                <span className="w-phase-time">
                  {seconds === undefined || (seconds < 1 && phase.status !== 'running') ? '' : duration(seconds)}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="w-run-log">
          <div className="w-run-log-head">
            <span>{showLog ? 'Deploy log' : 'Latest from the log'}</span>
            <button
              aria-expanded={showLog}
              className="w-link w-small"
              onClick={() => setShowLog(!showLog)}
              type="button"
            >
              {showLog ? 'Show less' : `Show the full log (${model.log.length} lines)`}
            </button>
          </div>
          <pre aria-label="Deploy log" className={`w-log${showLog ? '' : ' is-tail'}`} ref={logRef}>
            {(showLog ? model.log : model.log.slice(-4)).join('\n')}
          </pre>
        </div>
      </aside>
    </div>
  );
}

const isFrontend = (type: string | undefined) => type === 'hosting-bucket' || (type?.endsWith('-web') ?? false);
const isApi = (type: string | undefined) =>
  type === 'web-service' || type === 'http-api-gateway' || type === 'function' || type === 'application-load-balancer';

/** Which deployed address is which, when there are several: the site people open, then the API it calls. */
export const addressLabels = (
  urls: ReadonlyArray<{ resourceName: string; url: string }>,
  resources: ConfigResources
): Array<{ resourceName: string; url: string; label?: string }> => {
  const ordered = urls.toSorted(
    (left, right) =>
      Number(isFrontend(resources[right.resourceName]?.type)) - Number(isFrontend(resources[left.resourceName]?.type))
  );
  if (ordered.length < 2) return ordered;
  const types = ordered.map((entry) => resources[entry.resourceName]?.type);
  const split = types.some(isFrontend) && types.some(isApi);
  return ordered.map((entry, index) => {
    const type = types[index];
    const label =
      split && isFrontend(type)
        ? 'Frontend'
        : split && isApi(type)
          ? 'API'
          : resources[entry.resourceName] === undefined
            ? entry.resourceName
            : plainResourceName(resources[entry.resourceName]!);
    return { resourceName: entry.resourceName, url: entry.url, label };
  });
};

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
  const resources = resourcesOf(state);
  const addresses = addressLabels(deployment.urls ?? [], resources);
  const primary = addresses[0];
  const events = deployment.events as Array<{ ts?: string }>;
  const elapsed = useElapsed(deployment.startedAt ?? events[0]?.ts, events.at(-1)?.ts ?? deployment.startedAt);
  const price = state.composition?.price;
  const monthly = price === undefined ? undefined : splitMonthly(price.monthly);
  const target = {
    configPath: file?.filename ?? 'stacktape.yml',
    projectName: state.projectName,
    stage: deployment.stage,
    region: deployment.region,
    awsAccount: state.awsAccount
  };
  const stageUrl = `${state.consoleUrl ?? 'https://console.stacktape.com'}/projects/${state.projectName}/${deployment.stage}/overview`;
  const hasDatabase = Object.values(resources).some((resource) => resource.type === 'relational-database');
  const repaired = (deployment.repairs ?? [])
    .filter((repair) => repair.applied)
    .flatMap((repair) => repair.changedResources ?? []);
  const [showRemoval, setShowRemoval] = useState(false);
  const [showLog, setShowLog] = useState(false);

  return (
    <div className="w-enter">
      <section aria-label="Live" className="w-card w-live">
        <h1 className="w-title w-live-title">
          <span aria-hidden className="w-live-dot" />
          {primary === undefined ? `${state.projectName} is deployed` : 'Your app is live'}
        </h1>
        {primary === undefined ? (
          <p className="w-live-note">Everything was created. None of it has a public address.</p>
        ) : (
          <ul className={`w-live-addresses${addresses.length > 1 ? ' is-labelled' : ''}`}>
            {addresses.map((entry, index) => (
              <li className={index === 0 ? 'is-primary' : undefined} key={entry.url}>
                {entry.label !== undefined && <span className="w-live-label">{entry.label}</span>}
                <a className="w-live-url" href={entry.url} rel="noreferrer" target="_blank" title={entry.url}>
                  {entry.url.replace(/^https:\/\//, '')}
                </a>
              </li>
            ))}
          </ul>
        )}
        <ul className="w-live-meta">
          {elapsed !== undefined && elapsed > 0 && (
            <li>
              Live in <strong>{duration(elapsed)}</strong>
            </li>
          )}
          {monthly?.amount !== undefined && (
            <li>
              <strong>{monthly.amount}</strong>/month{monthly.usage ? ' + usage' : ''}
              <InfoTip about="the price">
                AWS list prices in {deployment.region}, for what runs all month.
                {monthly.usage ? ' Traffic, requests and storage are billed on top, by use.' : ''}
              </InfoTip>
            </li>
          )}
          <li>
            <strong>{deployment.stage}</strong> in {deployment.region}
          </li>
        </ul>
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
            <CopyAddress url={primary.url} />
          </div>
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
      </ul>

      <h2 className="w-next-title w-next-optional">
        Optional
        <span>Your app works without these.</span>
      </h2>
      <ul className="w-card w-next">
        <ConsoleOfferCard
          isRechecking={busy === 'recheck'}
          monthly={monthly?.amount === undefined ? undefined : `${monthly.amount}/month`}
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
        {state.codingAgentSetup !== undefined && (
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
        <button
          aria-expanded={showRemoval}
          className="w-link w-small text-[var(--w-subtle)]"
          onClick={() => setShowRemoval(!showRemoval)}
          type="button"
        >
          {showRemoval ? 'Hide' : 'Remove this deployment'}
        </button>
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

function CopyAddress({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      className="w-big"
      icon={copied ? <BiCheck size={15} /> : <BiCopy size={14} />}
      onClick={() =>
        void (async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // The address is on screen to select by hand.
          }
        })()
      }
      variant="secondary"
    >
      {copied ? 'Copied' : 'Copy address'}
    </Button>
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

type FailureStory = {
  happened: ReactNode;
  why: ReactNode;
  /** The fix as a heading: what to change, in this project's names. */
  fix: ReactNode;
  /** One or two lines under it: why that is the fix. */
  fixDetail: ReactNode;
  /** Where the code reads the address, when the analysis saw the line. */
  location?: string;
};

/** The line where the service's code reads a variable, when the analysis saw one: "lib/db/drizzle.ts:5". */
const readingLocation = (state: WizardState | undefined, variable: string): string | undefined => {
  for (const service of state?.facts?.services ?? []) {
    const variables = (service as { environmentVariables?: unknown }).environmentVariables;
    if (!Array.isArray(variables)) continue;
    for (const entry of variables as Array<{ name?: unknown; evidence?: Array<{ file?: unknown; line?: unknown }> }>) {
      if (entry.name !== variable) continue;
      const line = (entry.evidence ?? []).find(
        (evidence) =>
          typeof evidence.file === 'string' &&
          typeof evidence.line === 'number' &&
          !/(^|\/)(\.env[^/]*|package\.json|compose\.ya?ml|docker-compose[^/]*)$/.test(evidence.file)
      );
      if (line !== undefined) return `${String(line.file)}:${String(line.line)}`;
    }
  }
  return undefined;
};

/**
 * The failure in this project's own names. A container that dialled localhost for its database is the classic first
 * deploy failure, and the file knows both the service and the database, so the fix can name them.
 */
export const failureStory = (
  message: string,
  resources: ConfigResources,
  configPath = 'stacktape.yml',
  state?: WizardState
): FailureStory | undefined => {
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
  const location = wired === undefined ? undefined : readingLocation(state, wired);
  const stpName = `STP_${database.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}_CONNECTION_STRING`;
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
    ...(location === undefined ? {} : { location }),
    ...(wired !== undefined
      ? {
          fix: (
            <>
              Read the database address from <span className="w-code">{wired}</span>
            </>
          ),
          fixDetail: (
            <>
              <span className="w-code">{configPath}</span> already gives <span className="w-code">{failed}</span> the
              address in <span className="w-code">{wired}</span>. Your code falls back to localhost instead.
            </>
          )
        }
      : {
          fix: (
            <>
              Connect <span className="w-code">{failed}</span> to <span className="w-code">{database}</span>
            </>
          ),
          fixDetail: (
            <>
              In <span className="w-code">{configPath}</span>, add{' '}
              <span className="w-code">connectTo: [{database}]</span> under its properties, and read the address from{' '}
              <span className="w-code">{stpName}</span> in your code.
            </>
          )
        })
  };
};

/** The deploy stopped: what happened and why, the fix for this project as a heading, and the way to try again. */
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
  const configPath = state.configFile?.filename ?? 'stacktape.yml';
  const story = useMemo(
    () => failureStory(message, resources, configPath, state),
    [message, resources, configPath, state]
  );
  const explained = explainFailure(message);
  const [showError, setShowError] = useState(false);
  const target = {
    configPath,
    projectName: state.projectName,
    stage: deployment.stage,
    region: deployment.region,
    awsAccount: state.awsAccount
  };
  const wasUpdate = state.deployTarget?.status === 'updateable';
  const repairs = deployment.repairs ?? [];
  const showErrorButton = (
    <button aria-expanded={showError} className="w-link w-small" onClick={() => setShowError(!showError)} type="button">
      {showError ? 'Hide the error' : 'Show the full error'}
    </button>
  );

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
              ))}{' '}
            {showErrorButton}
            {showError && <pre className="w-log">{[message, '', ...model.log.slice(-60)].join('\n')}</pre>}
          </dd>
        </div>
        {story !== undefined && (
          <div className="w-fail-row">
            <dt>Why</dt>
            <dd>{story.why}</dd>
          </div>
        )}
      </dl>

      <section aria-label="The fix" className="w-card w-fix">
        <p className="w-fix-label">The fix</p>
        <h2 className="w-fix-title">
          {story?.fix ??
            (explained.length > 0 ? (
              <FailureExplanationText explanations={explained} part="action" />
            ) : (
              'Fix the cause in your code or the file'
            ))}
        </h2>
        {story?.location !== undefined && <p className="w-fix-location">{story.location}</p>}
        <div className="w-fix-body">
          <p>
            {story?.fixDetail ??
              (explained.length > 0 ? (
                <>
                  The full error has the details. Change <span className="w-code">{configPath}</span> or your code, then
                  deploy again.
                </>
              ) : (
                <>Read the full error above, change your code or the file, then deploy again.</>
              ))}
          </p>
          <Button onClick={onBackToFile} variant="secondary">
            Open {configPath}
          </Button>
        </div>
        {repairs.length > 0 && (
          <p className="w-quiet">
            {repairs.some((repair) => repair.applied)
              ? 'The agent already changed the file once and tried again. It still failed, so it stopped.'
              : 'The agent read the code again and found nothing in the file to change, so it stopped.'}
          </p>
        )}
      </section>

      <div className="w-actions">
        <Button className="w-big" isLoading={busy === 'deploy'} onClick={onDeployAgain} variant="primary">
          Deploy again
        </Button>
        <span className="w-quiet">Reads your code and {configPath} from disk again.</span>
      </div>
      {deployment.keptPartialProgress === true && (
        <section className="mt-8">
          <h2 className="w-section-title">Or put the stack back</h2>
          <CopyableCommand command={stackCommand('stack recover', target)} />
        </section>
      )}
    </div>
  );
}
