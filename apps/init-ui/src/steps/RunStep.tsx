import type { StacktapeConfig } from '@stacktape/config';
import { explainFailure } from '@stacktape/console-api/failure-explanations';
import { Button, ButtonLink } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { Fragment, lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import { BiBot, BiCheck, BiChevronRight, BiCodeAlt, BiCopy, BiInfoCircle, BiLinkExternal } from 'react-icons/bi';
import { ConsoleOfferCard } from '../components/ConsoleOfferCard';
import { Expand } from '../components/Expand';
import { CommandLine } from '@stacktape/ui-react/command-line';
import { FailureExplanationText } from '../components/FailureExplanation';
import { InfoTip } from '../components/InfoTip';
import { PipelineCard } from '../components/PipelineCard';
import { Row } from '../components/RowList';
import { groupedAccount, TargetFacts } from '../components/TargetFacts';
import { resourcesOf, type ConfigResources } from '../config-resources';
import { stackCommand } from '../deploy-commands';
import { clock, groupResources, spokenDuration, type DeployModel } from '../deploy-model';
import { partName } from '../part-names';
import type { SignInRequest, WizardState } from '../session';
import { plainList, splitMonthly } from './review-model';
import { DeployActivity } from './run/DeployActivity';
import { outputTail } from './run/DeploySteps';
import { useNow } from './run/use-now';
import './run/run.css';

const Diagram = lazy(() => import('../components/Diagram'));

type Deployment = NonNullable<WizardState['deployment']>;
type Progress = 'pending' | 'creating' | 'ready';

/**
 * The AWS resource that makes a part of the app work. A part is ready once it exists, not once its first small
 * resources do: a database's subnet group is done minutes before the database is.
 */
const MAIN_TYPES: Readonly<Record<string, readonly string[]>> = {
  'relational-database': ['AWS::RDS::DBInstance', 'AWS::RDS::DBCluster'],
  'nextjs-web': ['AWS::CloudFront::Distribution'],
  'hosting-bucket': ['AWS::CloudFront::Distribution'],
  'web-service': ['AWS::ECS::Service'],
  'worker-service': ['AWS::ECS::Service'],
  'private-service': ['AWS::ECS::Service'],
  'multi-container-workload': ['AWS::ECS::Service'],
  function: ['AWS::Lambda::Function'],
  bastion: ['AWS::AutoScaling::AutoScalingGroup'],
  bucket: ['AWS::S3::Bucket'],
  'efs-filesystem': ['AWS::EFS::FileSystem']
};

/**
 * How far the deploy has got with each part of the app, from the AWS resources CloudFormation reported. A part is
 * creating once any of its resources started, and ready once its main resource is done and nothing of it is still in
 * progress, or once CloudFormation is done. Before CloudFormation starts nothing is there yet.
 */
export const resourceProgress = (
  model: DeployModel,
  resources: ConfigResources,
  status: Deployment['status']
): Record<string, Progress> => {
  const deployPhase = model.phases.find((phase) => phase.id === 'DEPLOY');
  const finished = status === 'succeeded' || (deployPhase !== undefined && deployPhase.status === 'done');
  const names = Object.keys(resources);
  const groups = groupResources(model.resources, names);
  const progress: Record<string, Progress> = {};
  for (const name of names) {
    const group = groups.find((candidate) => candidate.name === name);
    const main = MAIN_TYPES[resources[name]!.type];
    const mainDone =
      main === undefined ||
      group?.resources.some((resource) => resource.status === 'complete' && main.includes(resource.type ?? '')) ===
        true;
    progress[name] = finished
      ? 'ready'
      : group === undefined
        ? 'pending'
        : group.running === 0 && mainDone
          ? 'ready'
          : 'creating';
  }
  return progress;
};

function useElapsed(startedAt: string | undefined, endedAt: string | undefined): number | undefined {
  const now = useNow(startedAt !== undefined && endedAt === undefined);
  if (startedAt === undefined) return undefined;
  const start = Date.parse(startedAt);
  const end = endedAt === undefined ? now : Date.parse(endedAt);
  return Number.isNaN(start) || Number.isNaN(end) ? undefined : Math.max(0, end - start);
}

/** "mainDatabase", "app" and "cdn" as a sentence: "mainDatabase, app and cdn". */
const sentence = (names: readonly string[]): string =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

function RunDiagram({
  resources,
  progress,
  caption,
  services
}: {
  resources: ConfigResources;
  progress: Record<string, Progress>;
  caption: ReactNode;
  services: ReadonlyArray<{ name: string; framework?: string; language?: string }>;
}) {
  // The same names Review used ("Postgres database"), so the picture does not change its words between steps.
  // One object per set of names: a new object would lay the picture out again on every progress event.
  const titleKey = JSON.stringify(
    Object.entries(resources).map(([name, resource]) => {
      const part = partName(name, resource, services);
      return [name, `${part.charAt(0).toUpperCase()}${part.slice(1)}`];
    })
  );
  const titles = useMemo(
    () => Object.fromEntries(JSON.parse(titleKey) as Array<[string, string]>) as Record<string, string>,
    [titleKey]
  );
  return (
    <section aria-label="Diagram" className="w-card w-run-diagram">
      <p className="w-run-parts">{caption}</p>
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
          bastionTunnels
          resourceProgress={progress}
          resourceTitles={titles}
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

/** How much of the deploy each phase is, roughly, for the one bar: AWS creating the resources is most of it. */
const PHASE_WEIGHTS: Readonly<Record<string, number>> = {
  INITIALIZE: 0.03,
  BUILD_AND_PACKAGE: 0.12,
  UPLOAD: 0.05,
  DEPLOY: 0.78,
  POST_DEPLOY: 0.02
};

const overallProgress = (model: DeployModel): number => {
  let total = 0;
  for (const phase of model.phases) {
    const weight = PHASE_WEIGHTS[phase.id] ?? 0;
    if (phase.status === 'done') total += weight;
    else if (phase.status === 'running') {
      total += weight * (phase.id === 'DEPLOY' ? (model.cloudformation?.percent ?? 0) / 100 : 0.5);
    }
  }
  return Math.round(Math.min(1, total) * 100);
};

/** What the deploy is doing right now, in one line, and one line of why it takes as long as it does. */
const activeOperation = (
  model: DeployModel,
  resources: ConfigResources,
  creating: readonly string[],
  repairing: boolean,
  services: ReadonlyArray<{ name: string; framework?: string; language?: string }>
): { title: string; detail?: string } => {
  if (repairing) return { title: 'Working out what went wrong' };
  const running = model.phases.find((phase) => phase.status === 'running');
  if (running === undefined) return { title: 'Starting the deploy' };
  if (running.id !== 'DEPLOY') {
    const step = running.steps.findLast((candidate) => candidate.status === 'running');
    const verb = running.id === 'BUILD_AND_PACKAGE' ? 'Building' : running.id === 'UPLOAD' ? 'Uploading' : undefined;
    const title = step?.instance !== undefined && verb !== undefined ? `${verb} ${step.instance}` : running.label;
    // A build says best what it is doing: its last line of output, when it printed one.
    const latest = step?.instance === undefined ? undefined : outputTail(model, step.instance, 1)[0]?.trim();
    const detail = latest ?? (running.message === title ? '' : running.message);
    return { title, ...(detail === '' ? {} : { detail }) };
  }
  if (creating.length === 0) return { title: 'Waiting on AWS' };
  const nouns = creating.map((name) => `the ${partName(name, resources[name]!, services)}`);
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
 * The diagram Review showed fills in on the left as AWS creates each part. The right leads with what is happening now
 * and the time against the usual, then every step of the deploy (each phase, what it did, each AWS resource by part of
 * the app), with the log one tab away. On a phone the progress comes first and the diagram after it.
 */
export function DeployingStep({ state, model }: { state: WizardState; model: DeployModel }) {
  const deployment = state.deployment!;
  const resources = resourcesOf(state);
  const services = state.facts?.services ?? [];
  const names = Object.keys(resources);
  const progress = resourceProgress(model, resources, deployment.status);
  const ready = names.filter((name) => progress[name] === 'ready').length;
  const creating = names.filter((name) => progress[name] === 'creating');
  const startedAt = deployment.startedAt ?? (deployment.events[0] as { ts?: string } | undefined)?.ts;
  const elapsed = useElapsed(startedAt, undefined);
  const hasDatabase = Object.values(resources).some((resource) => resource.type === 'relational-database');
  const identity = state.awsIdentity;
  const repairing = deployment.status === 'repairing';
  const agent = state.agents?.find((option) => option.id === state.choice?.agentId);
  const operation = activeOperation(model, resources, creating, repairing, services);
  const cloudformation = model.cloudformation;
  const context = { resources, services };

  const now = (
    <div className="w-run-now">
      <p aria-live="polite" className="w-run-op">
        {operation.title}
      </p>
      {operation.detail !== undefined && <p className="w-run-op-detail">{operation.detail}</p>}
      <p className="w-run-time">
        <strong>{elapsed === undefined ? '—' : clock(elapsed)}</strong> elapsed
        {repairing ? '' : ` · usually ${hasDatabase ? '10–15' : '3–6'} min`}
      </p>
      <div className="w-run-progress">
        <progress
          aria-label="Deploy progress"
          className="w-run-meter"
          max={100}
          value={Math.max(2, overallProgress(model))}
        />
        <p className="w-run-count">
          {cloudformation === undefined || cloudformation.total === 0
            ? 'AWS resources: not started yet'
            : `${cloudformation.completed} of ${cloudformation.total} AWS resources`}
          <InfoTip about="AWS resources">
            Each part of your app is several AWS resources: the service, its log group, its permissions and so on. This
            counts those. The steps below list each one.
          </InfoTip>
        </p>
      </div>
    </div>
  );
  const tabNote = (
    <p className="w-run-tab">
      <BiInfoCircle aria-hidden size={14} />
      <span>
        Closing this tab does not stop the deploy. Ctrl+C in the terminal running{' '}
        <span className="w-code">stacktape init</span> does.
      </span>
    </p>
  );
  const header = (
    <header className="w-run-head">
      <h1 className="w-title">{repairing ? 'Fixing what went wrong' : `Deploying to ${deployment.stage}`}</h1>
      {repairing ? (
        <p className="w-lede">
          The first attempt failed. {agent === undefined || agent.id === 'none' ? 'The agent' : agent.label} is reading
          your code again and deploys once more if it finds the cause.
        </p>
      ) : (
        <TargetFacts
          className="w-lede"
          facts={[
            identity?.available === true && { label: 'AWS account', value: groupedAccount(identity.accountId) },
            { label: 'Region', value: deployment.region },
            { label: 'Stage', value: deployment.stage }
          ]}
        />
      )}
    </header>
  );
  const diagram = (
    <RunDiagram
      caption={
        <>
          <strong>
            {ready} of {names.length}
          </strong>{' '}
          {names.length === 1 ? 'part' : 'parts'} of your app ready
        </>
      }
      progress={progress}
      resources={resources}
      services={services}
    />
  );

  return (
    <div className="w-workspace w-run r-run w-enter" data-deploy-phase={model.current?.id}>
      <div className="w-pane">
        {header}
        {diagram}
      </div>
      <aside aria-label="Deploy progress" className="w-card w-run-side r-side">
        {now}
        <DeployActivity context={context} live model={model} />
        {tabNote}
      </aside>
    </div>
  );
}

const isFrontend = (type: string | undefined) => type === 'hosting-bucket' || (type?.endsWith('-web') ?? false);
const isApi = (type: string | undefined) =>
  type === 'web-service' || type === 'http-api-gateway' || type === 'function' || type === 'application-load-balancer';

export type Address = { resourceName: string; url: string; label: string; action: string };

/** A label inside a sentence: "the site", "the API", "the adminPanel". */
const spoken = (label: string) => (label === 'App' || label === 'Site' ? label.toLowerCase() : label);

/**
 * Which deployed address is which, and the words for opening it: one address is the app; of several, the site people
 * open comes first, then the API it calls. Two of the same kind go by their names in the file.
 */
export const addressLabels = (
  urls: ReadonlyArray<{ resourceName: string; url: string }>,
  resources: ConfigResources
): Address[] => {
  const ordered = urls.toSorted(
    (left, right) =>
      Number(isFrontend(resources[right.resourceName]?.type)) - Number(isFrontend(resources[left.resourceName]?.type))
  );
  const kinds = ordered.map((entry) => {
    const type = resources[entry.resourceName]?.type;
    return ordered.length === 1 ? 'App' : isFrontend(type) ? 'Site' : isApi(type) ? 'API' : entry.resourceName;
  });
  return ordered.map((entry, index) => {
    const kind = kinds[index]!;
    const label = kinds.filter((other) => other === kind).length > 1 ? entry.resourceName : kind;
    return {
      resourceName: entry.resourceName,
      url: entry.url,
      label,
      action: `Open ${spoken(label)}`
    };
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
  const [showDetails, setShowDetails] = useState(false);
  const identity = state.awsIdentity;
  const created = model.resources.filter((resource) => resource.status === 'complete' && resource.action !== 'DELETE');

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
          // One row per address, the same for one or several: what it is, the address, Open and Copy.
          <ul aria-label="Addresses" className="w-live-addresses">
            {addresses.map((entry, index) => (
              <li className={index === 0 ? 'is-primary' : undefined} key={entry.url}>
                <span className="w-live-where">
                  <span className="w-live-label">{entry.label}</span>
                  <a className="w-live-url" href={entry.url} rel="noreferrer" target="_blank" title={entry.url}>
                    <UrlText url={entry.url} />
                  </a>
                </span>
                <span className="w-live-row-actions">
                  <ButtonLink
                    className={index === 0 ? 'w-big' : undefined}
                    href={entry.url}
                    icon={<BiLinkExternal size={index === 0 ? 15 : 14} />}
                    iconPosition="end"
                    rel="noreferrer"
                    target="_blank"
                    variant={index === 0 ? 'primary' : 'secondary'}
                  >
                    {entry.action}
                  </ButtonLink>
                  <CopyAddress isBig={index === 0} label={entry.label} url={entry.url} />
                </span>
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
        <TargetFacts
          className="w-live-meta"
          facts={[
            identity?.available === true && { label: 'AWS account', value: groupedAccount(identity.accountId) },
            { label: 'Region', value: deployment.region },
            { label: 'Stage', value: deployment.stage },
            monthly?.amount !== undefined && {
              label: 'Estimated',
              value: `${monthly.amount}/month${monthly.usage ? ' + usage' : ''}`,
              help: (
                <InfoTip about="the price">
                  AWS list prices in {deployment.region}, for what runs all month.
                  {monthly.usage ? ' Traffic, requests and storage are billed on top, by use.' : ''}
                </InfoTip>
              )
            },
            elapsed !== undefined && elapsed > 0 && { label: 'Deployed in', value: spokenDuration(elapsed) }
          ]}
        />
        <div className="r-live-details">
          <button
            aria-controls="deploy-details"
            aria-expanded={showDetails}
            className="w-disclosure"
            onClick={() => setShowDetails(!showDetails)}
            type="button"
          >
            <BiChevronRight aria-hidden className="w-chevron" size={16} />
            Deploy details
            <span className="r-live-details-summary">
              {created.length > 0 ? `${created.length} AWS resources created` : 'Steps and log'}
            </span>
          </button>
          <Expand id="deploy-details" isOpen={showDetails}>
            <DeployActivity
              className="is-inline"
              context={{ resources, services: state.facts?.services ?? [] }}
              initiallyOpen={['DEPLOY']}
              live={false}
              model={model}
            />
          </Expand>
        </div>
      </section>

      <h2 className="w-next-title">Next steps</h2>
      <ul className="w-card w-next">
        <Row
          description={`Change your code, then run the same deploy. It updates ${deployment.stage} in place.`}
          icon={<BiCodeAlt size={17} />}
          title="Ship a change"
        >
          <CommandLine command={stackCommand('deploy', target)} fill label="Copy the deploy command" />
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
            stage={deployment.stage}
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

      <section aria-label="Manage this deployment" className="w-manage">
        <div className="w-manage-head">
          <div>
            <h2 className="w-manage-title">Remove this deployment</h2>
            <p className="w-quiet">
              Deletes everything this deploy created{hasDatabase ? ', including the database and its data' : ''}. Your
              code and <span className="w-code">{target.configPath}</span> stay.
            </p>
          </div>
          <button
            aria-controls="delete-command"
            aria-expanded={showRemoval}
            className="w-disclosure"
            onClick={() => setShowRemoval(!showRemoval)}
            type="button"
          >
            <BiChevronRight aria-hidden className="w-chevron" size={16} />
            Delete command
          </button>
        </div>
        <Expand id="delete-command" isOpen={showRemoval}>
          <CommandLine command={stackCommand('delete', target)} fill label="Copy the delete command" />
        </Expand>
      </section>
    </div>
  );
}

/**
 * An address without its scheme, wrapping after a dot or a slash: a long one reads "acme-portal-dev-7f3a9c." over
 * "stacktape-app.com", not broken inside a name.
 */
function UrlText({ url }: { url: string }) {
  const parts = url.replace(/^https:\/\//, '').split(/(?<=[./])/);
  return (
    <>
      {parts.map((part, index) => (
        // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed string.
        <Fragment key={index}>
          {index > 0 && <wbr />}
          <span className="w-url-part">{part}</span>
        </Fragment>
      ))}
    </>
  );
}

function CopyAddress({ url, label, isBig = false }: { url: string; label: string; isBig?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      aria-label={`Copy the ${spoken(label)} address`}
      className={isBig ? 'w-big' : undefined}
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
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

/** What a person can ask once Stacktape is in their coding agent: each is a tool the Stacktape MCP server has. */
const AGENT_PROMPTS = (stage: string) => [
  `Deploy my latest changes to ${stage}`,
  `Show me the errors in the ${stage} logs from the last hour`,
  'Run this app on my machine'
];

/** One example request, copied on a click so it can be pasted into the agent. */
function PromptChip({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <li>
      <button
        className={`r-prompt${copied ? ' is-copied' : ''}`}
        onClick={() =>
          void (async () => {
            try {
              await navigator.clipboard.writeText(prompt);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              // The words are on screen to type.
            }
          })()
        }
        title="Copy"
        type="button"
      >
        <span className="r-prompt-text">“{prompt}”</span>
        <span aria-hidden className="r-prompt-copy">
          {copied ? <BiCheck size={14} /> : <BiCopy size={13} />}
        </span>
      </button>
    </li>
  );
}

/**
 * Adding Stacktape to the coding agent picked on the Start step, as a next-step row.
 *
 * The button runs `stacktape mcp add` for that agent: it registers the Stacktape MCP server in the agent's settings
 * for this user. The row says what that gives in the words a person would type to the agent, because "connect" and
 * "MCP server" do not say what changes; the technical part is in the tooltip and the small print.
 */
function CodingAgentRow({
  setup,
  stage,
  isBusy,
  onConnect
}: {
  setup: NonNullable<WizardState['codingAgentSetup']>;
  stage: string;
  isBusy: boolean;
  onConnect: () => void;
}) {
  const { label, status, detail, command } = setup;
  const prompts = (
    <ul aria-label={`Things to ask ${label}`} className="r-prompts">
      {AGENT_PROMPTS(stage).map((prompt) => (
        <PromptChip key={prompt} prompt={prompt} />
      ))}
    </ul>
  );
  const title = (
    <span className="inline-flex items-center gap-1.5">
      Use Stacktape from {label}
      <InfoTip about={`adding Stacktape to ${label}`}>
        Adds the Stacktape MCP server to {label}’s settings for your user, the same as running{' '}
        <span className="w-code">{command}</span>. {label} can then run Stacktape commands, read your logs and search
        the docs.
      </InfoTip>
    </span>
  );
  if (status === 'connected') {
    return (
      <Row
        description={<>{detail} Then ask it, for example:</>}
        icon={<BiBot size={17} />}
        label={`Use Stacktape from ${label}`}
        title={
          <span className="inline-flex items-center gap-2">
            {title}
            <span className="w-saved">
              <BiCheck aria-hidden size={16} /> Added
            </span>
          </span>
        }
      >
        {prompts}
      </Row>
    );
  }
  return (
    <Row
      action={
        <Button isLoading={isBusy || status === 'running'} onClick={onConnect} variant="secondary">
          {status === 'failed' ? 'Try again' : `Add to ${label}`}
        </Button>
      }
      description={`Gives ${label} the Stacktape commands, so you can ask it things like:`}
      icon={<BiBot size={17} />}
      label={`Use Stacktape from ${label}`}
      title={title}
    >
      {prompts}
      {status === 'failed' ? (
        <>
          <p className="w-error-text">{detail}</p>
          <CommandLine command={command} fill label="Copy the command" />
        </>
      ) : (
        <p className="r-prompts-note">
          Changes {label}’s settings for your user, not this repository. {label} asks you before it changes anything on
          AWS.
        </p>
      )}
    </Row>
  );
}

type FailureStory = {
  /** The part of the app that failed, as stacktape.yml names it. */
  part: string;
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
    part: failed,
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
              Update your code to read <span className="w-code">{wired}</span>
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
  const [showDetails, setShowDetails] = useState(false);
  const target = {
    configPath,
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
        <h1 className="w-title">
          {story === undefined ? (
            `The deploy to ${deployment.stage} stopped`
          ) : (
            <>
              <span className="w-title-code">{story.part}</span> did not start on AWS
            </>
          )}
        </h1>
        <p className="w-lede">
          {deployment.keptPartialProgress === true
            ? 'What this attempt created is kept for the next one, and billed until you deploy again or remove it.'
            : wasUpdate
              ? `AWS put ${deployment.stage} back to the version that was running. Your live app is unchanged.`
              : `AWS rolled back the deploy to ${deployment.stage}, so nothing it created is running. Your saved secrets stay.`}
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
        <div className="w-fail-more">
          <button
            aria-controls="full-error"
            aria-expanded={showError}
            className="w-disclosure"
            onClick={() => setShowError(!showError)}
            type="button"
          >
            <BiChevronRight aria-hidden className="w-chevron" size={16} />
            Full error
          </button>
          <Expand id="full-error" isOpen={showError}>
            <pre className="w-log">{message}</pre>
          </Expand>
          <button
            aria-controls="failed-deploy-log"
            aria-expanded={showDetails}
            className="w-disclosure"
            onClick={() => setShowDetails(!showDetails)}
            type="button"
          >
            <BiChevronRight aria-hidden className="w-chevron" size={16} />
            Deploy log
          </button>
          <Expand id="failed-deploy-log" isOpen={showDetails}>
            <DeployActivity
              className="is-inline"
              context={{ resources, services: state.facts?.services ?? [] }}
              failed
              initialView="log"
              initiallyOpen={['DEPLOY']}
              live={false}
              model={model}
            />
          </Expand>
        </div>
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
        <p className="w-fix-text">
          {story?.fixDetail ??
            (explained.length > 0 ? (
              <>
                The full error has the details. Change <span className="w-code">{configPath}</span> or your code.
              </>
            ) : (
              <>Read the full error above, then change your code or the file.</>
            ))}
        </p>
        <div className="w-fix-actions">
          <Button onClick={onBackToFile} variant="secondary">
            {story === undefined ? `Open ${configPath}` : `View the database setting in ${configPath}`}
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
        <span className="w-quiet">After your change. It reads your code and {configPath} from disk again.</span>
      </div>
      {deployment.keptPartialProgress === true && (
        <section className="mt-8">
          <h2 className="w-section-title">Or put the stack back</h2>
          <CommandLine command={stackCommand('stack recover', target)} fill label="Copy the recover command" />
        </section>
      )}
    </div>
  );
}
