import type { StacktapeConfig } from '@stacktape/config';
import { DEPLOYMENT_TOOL_LABELS } from '@stacktape/config-inference/facts/existing-deployment';
import { lazy, Suspense, useState } from 'react';
import { Alert } from '@stacktape/ui-react/alert';
import { Button } from '@stacktape/ui-react/button';
import { ConfigEditor, type ConfigEditorViewId } from '@stacktape/ui-react/config-editor';
import '@stacktape/ui-react/config-editor.css';
import type {
  DeploymentPreferenceChange,
  DeploymentPreferenceKey,
  DeploymentPreferences
} from '@stacktape/config-inference/compose/preferences';
import { ResourceIcon } from '@stacktape/ui-react/resource-icon';
import { SelectionCard, SelectionCardGroup } from '@stacktape/ui-react/selection-card';
import { Spinner } from '@stacktape/ui-react/spinner';
import type { WizardState } from '../session';
import { DecisionRow } from '../components/DecisionRow';
import { Evidence } from '../components/Evidence';

/** Heavy on purpose, light on arrival: the diagram and its icon catalogue load after the page. */
const Diagram = lazy(() => import('../components/Diagram'));

type PreferenceOption<Key extends DeploymentPreferenceKey> = {
  value: DeploymentPreferences[Key];
  title: string;
  description: string;
  meta: string;
};

const PREFERENCE_COPY: {
  [Key in DeploymentPreferenceKey]: {
    title: string;
    description: string;
    options: PreferenceOption<Key>[];
  };
} = {
  capacity: {
    title: 'How much traffic should it be ready for?',
    description: 'Sets starting sizes for always-on apps, databases, and caches. You can resize them later.',
    options: [
      {
        value: 'economical',
        title: 'Start small',
        description: 'The smallest useful sizes. Best for a trial, side project, or development environment.',
        meta: 'Lowest fixed cost'
      },
      {
        value: 'balanced',
        title: 'Ready for traffic',
        description: 'Middle starting sizes, with space for always-on apps to add copies when they get busy.',
        meta: 'Balanced'
      },
      {
        value: 'performance',
        title: 'More headroom',
        description: 'Larger always-on app, database, and cache sizes for workloads expecting sustained traffic.',
        meta: 'Highest fixed cost'
      }
    ]
  },
  availability: {
    title: 'What should happen when one machine fails?',
    description: 'Redundancy costs more because AWS keeps another copy ready.',
    options: [
      {
        value: 'single',
        title: 'Restart it',
        description: 'One app copy and one database location. A failure can cause a short interruption.',
        meta: 'Lower cost'
      },
      {
        value: 'redundant',
        title: 'Stay online',
        description: 'Two copies of container apps and a standby SQL database in another location, when those exist.',
        meta: 'Roughly doubles them'
      }
    ]
  },
  dataProtection: {
    title: 'How much history should your data keep?',
    description: 'Accidental database deletion is blocked either way. This controls backup and file-version history.',
    options: [
      {
        value: 'lean',
        title: 'Short history',
        description: 'One day of database backups and no old file versions. Good for data you can recreate.',
        meta: 'Less storage'
      },
      {
        value: 'protected',
        title: 'Keep recovery copies',
        description: 'A week of database backups, and old versions of files in managed storage.',
        meta: 'More recovery history'
      }
    ]
  },
  databaseAccess: {
    title: 'Who should be able to reach the SQL database?',
    description: 'Private access is the safer boundary, but Lambda-backed apps lose direct access to public APIs.',
    options: [
      {
        value: 'private',
        title: 'Only this private network',
        description:
          'No public address. Adds one small keyless jump box so local tools and generated migrations can tunnel in.',
        meta: 'Adds one small instance'
      },
      {
        value: 'public',
        title: 'Internet reachable',
        description:
          'Anyone can attempt a connection, but the generated password is still required. Simplest for Lambda and SSR.',
        meta: 'No jump box'
      }
    ]
  }
};

function PreferenceCards<Key extends DeploymentPreferenceKey>({
  preference,
  value,
  recommended,
  isBusy,
  onChange
}: {
  preference: Key;
  value: DeploymentPreferences[Key];
  recommended: DeploymentPreferences[Key];
  isBusy: boolean;
  onChange: (change: DeploymentPreferenceChange) => void;
}) {
  const copy = PREFERENCE_COPY[preference];
  const values = copy.options.map((option) => option.value);
  const choose = (next: string) => {
    if (isBusy) return;
    onChange({ key: preference, value: next as DeploymentPreferences[Key] } as DeploymentPreferenceChange);
  };
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h4 className="m-0 text-[0.95rem] font-semibold">{copy.title}</h4>
        <p className="wizard-lede mt-1">{copy.description}</p>
      </div>
      <SelectionCardGroup ariaLabel={copy.title} direction="row" onValueChange={choose} value={value} values={values}>
        {copy.options.map((option) => (
          <SelectionCard
            description={option.description}
            isDisabled={isBusy}
            isRecommended={option.value === recommended}
            isSelected={option.value === value}
            key={option.value}
            meta={option.meta}
            onSelect={choose}
            title={option.title}
            value={option.value}
          />
        ))}
      </SelectionCardGroup>
    </div>
  );
}

/** The product rule: never ask about a setting that changes none of this app's resources. */
export const deploymentPreferenceKeysFor = (types: Iterable<string>): DeploymentPreferenceKey[] => {
  const resourceTypes = new Set(types);
  return [
    ...(['web-service', 'worker-service', 'private-service', 'batch-job', 'relational-database', 'redis-cluster'].some(
      (type) => resourceTypes.has(type)
    )
      ? (['capacity'] as const)
      : []),
    ...(['web-service', 'worker-service', 'private-service', 'relational-database'].some((type) =>
      resourceTypes.has(type)
    )
      ? (['availability'] as const)
      : []),
    ...(['relational-database', 'bucket'].some((type) => resourceTypes.has(type)) ? (['dataProtection'] as const) : []),
    ...(resourceTypes.has('relational-database') ? (['databaseAccess'] as const) : [])
  ];
};

const plainList = (items: readonly string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

/** What the file will be called, given the format and whether the project already has one. */
const filenameFor = (format: 'yaml' | 'typescript', hasExisting: boolean): string =>
  `stacktape${hasExisting ? '.generated' : ''}.${format === 'typescript' ? 'ts' : 'yml'}`;

/**
 * One plain sentence saying what was found, before any panel or tab.
 *
 * This is the answer to the question the user actually arrived with — "what did it find?" — and it
 * has to survive being the only thing they read.
 */
const TECHNOLOGY_LABELS: Readonly<Record<string, string>> = {
  fastapi: 'FastAPI',
  nextjs: 'Next.js',
  nestjs: 'NestJS',
  express: 'Express',
  react: 'React',
  remix: 'Remix',
  javascript: 'JavaScript',
  typescript: 'TypeScript'
};

const technologyOf = (service: { framework?: string; language?: string } | undefined): string | undefined => {
  const raw = service?.framework ?? service?.language;
  return raw === undefined || raw === 'unknown' ? undefined : (TECHNOLOGY_LABELS[raw.toLowerCase()] ?? raw);
};

const named = (
  service: { framework?: string; language?: string } | undefined,
  noun: 'app' | 'site' = 'app'
): string => {
  const technology = technologyOf(service);
  if (technology === undefined) return `an ${noun}`;
  const article = /^[aeiou]/i.test(technology) ? 'an' : 'a';
  return `${article} ${technology} ${noun}`;
};

/** Exported only so the sentence users rely on can be tested without mounting the diagram. */
export const summarise = (state: WizardState): string => {
  const services = state.facts?.services ?? [];
  const dependencies = state.facts?.dependencies ?? [];

  const web = services.find((service) => service.exposesHttp);
  const nonWeb = services.filter((service) => !service.exposesHttp);
  const staticSites = nonWeb.filter((service) => service.servesStaticAssets !== undefined);
  const workers = nonWeb.filter(
    (service) => service.servesStaticAssets === undefined && service.executionModel === 'long-running'
  );
  const functions = nonWeb.filter((service) => service.executionModel === 'per-request');
  const scheduled = nonWeb.filter((service) => service.executionModel === 'scheduled');

  const companionPhrases = [
    ...(staticSites.length === 0
      ? []
      : [staticSites.length === 1 ? named(staticSites[0], 'site') : `${staticSites.length} static sites`]),
    ...(workers.length === 0
      ? []
      : [workers.length === 1 ? 'a background worker' : `${workers.length} background workers`]),
    ...(functions.length === 0
      ? []
      : [functions.length === 1 ? 'a serverless function' : `${functions.length} serverless functions`]),
    ...(scheduled.length === 0
      ? []
      : [scheduled.length === 1 ? 'a scheduled job' : `${scheduled.length} scheduled jobs`])
  ];

  const appPhrase =
    services.length === 0
      ? 'nothing that runs'
      : services.length === 1
        ? staticSites.length === 1
          ? named(services[0], 'site')
          : functions.length === 1
            ? 'a serverless function'
            : scheduled.length === 1
              ? 'a scheduled job'
              : named(services[0])
        : web !== undefined &&
            nonWeb.length === staticSites.length + workers.length + functions.length + scheduled.length
          ? `${named(web)} with ${plainList(companionPhrases)}`
          : functions.length === services.length
            ? `${functions.length} serverless functions`
            : `${services.length} services`;
  const opening = appPhrase.charAt(0).toUpperCase() + appPhrase.slice(1);

  const DEPENDENCY_PHRASES: Record<string, string> = {
    postgres: 'a Postgres database',
    mysql: 'a MySQL database',
    mssql: 'a SQL Server database',
    mongodb: 'a MongoDB database',
    redis: 'a Redis cache',
    'object-storage': 'file storage',
    dynamodb: 'a DynamoDB table',
    queue: 'a queue',
    search: 'a search index',
    email: 'email sending',
    kafka: 'an event stream',
    sqlite: 'a SQLite database'
  };
  const dependencyPhrases = dependencies.map((entry) => DEPENDENCY_PHRASES[entry.kind] ?? entry.kind);
  const list =
    dependencyPhrases.length === 0
      ? ''
      : dependencyPhrases.length === 1
        ? `, using ${dependencyPhrases[0]}`
        : `, using ${dependencyPhrases.slice(0, -1).join(', ')} and ${dependencyPhrases.at(-1)}`;

  return `${opening}${list}.`;
};

/**
 * The Review step: here is your app on AWS — look at it, adjust it, take it.
 *
 * Rebuilt around showing rather than describing. The centrepiece is the shared config editor frame
 * with three ways of looking at the same thing: a picture (the isometric diagram Console uses), the
 * list of what will exist and why, and the actual file that will be written. The format choice is
 * no longer its own section of cards — it is a toggle on the file view, decided by looking at the
 * file, which is the only place the choice means anything.
 */
export function ReviewStep({
  state,
  onWrite,
  onChangeDecision,
  onChangePreference,
  busy
}: {
  state: WizardState;
  onWrite: (format: 'yaml' | 'typescript') => void;
  onChangeDecision: (id: string, value: string) => void;
  onChangePreference: (change: DeploymentPreferenceChange) => void;
  /** Which action is in flight. Decisions use their own id, so only the row being changed spins. */
  busy: string | undefined;
}) {
  const [view, setView] = useState<ConfigEditorViewId>('diagram');
  const [format, setFormat] = useState<'yaml' | 'typescript'>('yaml');
  const [showAll, setShowAll] = useState(false);

  const resources = Object.entries(state.composition?.resources ?? {});
  const gaps = state.composition?.gaps ?? [];
  const decisions = state.facts?.decisions ?? [];
  const existingDeployments = state.facts?.existingDeployments ?? [];
  const notable = decisions.filter((decision) => decision.notable);
  const rest = decisions.filter((decision) => !decision.notable);
  const price = state.composition?.price;
  const configText = state.composition?.configText;
  const filename = filenameFor(format, state.existingConfig !== undefined);
  const written = state.configFile !== undefined;
  const preferences = state.preferences;
  const recommendedPreferences = state.recommendedPreferences ?? preferences;
  const preferenceKeys = deploymentPreferenceKeysFor(resources.map(([, resource]) => resource.type));
  const automaticAlarmCount = resources.reduce((count, [, resource]) => {
    const alarms = resource.properties.alarms;
    return count + (Array.isArray(alarms) ? alarms.length : 0);
  }, 0);

  if (resources.length === 0) {
    return (
      <div className="wizard-panel p-5">
        <p className="m-0 text-[var(--stp-text-muted)]">
          We did not find anything to deploy — no server, no worker, no site. If that is wrong, the analysis missed it:
          try again with a coding agent selected under Options, which reads more than the built-in scanner.
        </p>
      </div>
    );
  }

  const sourceText = format === 'typescript' ? configText?.typescript : configText?.yaml;

  return (
    <div className="flex flex-col gap-8">
      <p className="wizard-summary">
        {summarise(state)}
        {price !== undefined && (
          <>
            {' '}
            About <strong>{price.monthly}</strong> to run.
          </>
        )}
      </p>

      {existingDeployments.length > 0 && (
        <Alert
          tone="info"
          title={`We found ${plainList(
            existingDeployments.map(
              ({ tool }) => (DEPLOYMENT_TOOL_LABELS as Readonly<Record<string, string>>)[tool] ?? tool
            )
          )} already in this project`}
        >
          {existingDeployments.some((deployment) => deployment.managesAws) ? (
            <>
              Those files may describe resources that are already running. This Stacktape configuration is separate: it
              does not import, change or delete anything they own. Databases and other stored data declared there are
              left alone by default; any new copy is shown under <strong>Decided for you</strong> before you save.
            </>
          ) : (
            <>
              Saving this file does not change that platform. If you deploy, Stacktape creates a separate copy of the
              application on AWS; anything already running on the other platform stays untouched.
            </>
          )}
        </Alert>
      )}

      <div className="wizard-editor">
        <ConfigEditor
          activeView={view}
          onActiveViewChange={setView}
          views={[
            { id: 'diagram', label: 'Diagram', description: 'Your infrastructure, as a picture' },
            { id: 'tree', label: 'What & why', description: 'Each resource, with the code that led to it' },
            { id: 'source', label: filename, shortLabel: 'File', description: 'The file that will be saved' }
          ]}
          {...(view === 'source'
            ? {
                actions: (
                  <fieldset aria-label="Configuration format" className="wizard-format-toggle">
                    <button aria-pressed={format === 'yaml'} onClick={() => setFormat('yaml')} type="button">
                      YAML
                    </button>
                    <button
                      aria-pressed={format === 'typescript'}
                      onClick={() => setFormat('typescript')}
                      type="button"
                    >
                      TypeScript
                    </button>
                  </fieldset>
                )
              }
            : {})}
        >
          {view === 'diagram' && (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <Spinner />
                </div>
              }
            >
              <Diagram
                ariaLabel="Diagram of the infrastructure this configuration creates"
                // The composed resources are the real configuration schema — the same objects the
                // file is rendered from — so the cast states a fact the type system cannot see
                // across the package boundary.
                config={{ resources: state.composition?.resources } as unknown as StacktapeConfig}
                style={{ width: '100%', height: '100%' }}
              />
            </Suspense>
          )}

          {view === 'tree' && (
            <div className="wizard-resources p-4">
              {resources.map(([name, resource]) => {
                const provenance = state.composition?.provenance[name];
                const cost = price?.byResource[name];
                return (
                  <article className="wizard-resource" key={name}>
                    <ResourceIcon className="wizard-resource-icon" resourceType={resource.type} size={24} />
                    <div className="min-w-0 flex-1">
                      <div className="flex w-full items-baseline gap-3">
                        <h3 className="wizard-resource-name">{name}</h3>
                        <span className="wizard-code text-[var(--stp-text-subtle)]">{resource.type}</span>
                        {cost !== undefined && <span className="wizard-resource-cost">{cost}</span>}
                      </div>
                      {provenance !== undefined && (
                        <>
                          <p className="wizard-resource-reason">{provenance.reason}</p>
                          <Evidence citations={provenance.evidence} label="Where we saw this" />
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {view === 'source' &&
            (sourceText === undefined ? (
              <div className="flex h-full items-center justify-center gap-3 text-[var(--stp-text-subtle)]">
                <Spinner /> Formatting…
              </div>
            ) : (
              <pre className="wizard-source">{sourceText}</pre>
            ))}
        </ConfigEditor>
      </div>

      {price !== undefined && (
        <p className="wizard-total-cost">
          <strong>{price.monthly}</strong> in fixed monthly costs, at AWS list prices for {price.region}. Traffic,
          storage and requests add usage on top — this is the floor, not a bill.
        </p>
      )}

      {preferences !== undefined && recommendedPreferences !== undefined && preferenceKeys.length > 0 && (
        <section>
          <h3 className="wizard-section-heading">Important choices</h3>
          <p className="wizard-lede mb-5">
            These are the consequences your code cannot decide. Only choices that affect this app are shown; the file
            and price above update when you switch one.
          </p>
          <div className="flex flex-col gap-6">
            {preferenceKeys.map((preference) => (
              <PreferenceCards
                isBusy={busy === `preference-${preference}`}
                key={preference}
                onChange={onChangePreference}
                preference={preference}
                recommended={recommendedPreferences[preference]}
                value={preferences[preference]}
              />
            ))}
          </div>
        </section>
      )}

      {automaticAlarmCount > 0 && (
        <Alert tone="info" title="Monitoring is already included">
          {automaticAlarmCount === 1
            ? 'One alarm watches for a sustained production problem.'
            : `${automaticAlarmCount} alarms watch for sustained production problems.`}{' '}
          They appear in Stacktape monitoring history without waking you for one noisy sample. Notification delivery can
          be connected separately.
        </Alert>
      )}

      {decisions.length > 0 && (
        <section>
          <h3 className="wizard-section-heading">Decided for you</h3>
          <p className="wizard-lede mb-4">
            Your code did not say, so we picked. Every one of these can be changed, and the file changes with it.
          </p>
          <div className="flex flex-col gap-2">
            {notable.map((decision) => (
              <DecisionRow
                decision={decision}
                isBusy={busy === decision.id}
                key={decision.id}
                onChange={(value) => onChangeDecision(decision.id, value)}
              />
            ))}
            {showAll &&
              rest.map((decision) => (
                <DecisionRow
                  decision={decision}
                  isBusy={busy === decision.id}
                  key={decision.id}
                  onChange={(value) => onChangeDecision(decision.id, value)}
                />
              ))}
          </div>
          {rest.length > 0 && (
            <button className="wizard-disclosure mt-3" onClick={() => setShowAll(!showAll)} type="button">
              {showAll ? 'Hide' : `Show ${rest.length} smaller ${rest.length === 1 ? 'one' : 'ones'}`}
            </button>
          )}
        </section>
      )}

      {gaps.length > 0 && (
        <section className="wizard-panel p-4">
          <h3 className="m-0 mb-2 text-[0.95rem] font-semibold">Before you deploy</h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[0.9rem] text-[var(--stp-text-muted)]">
            {gaps.map((gap) => (
              <li key={`${gap.subject}-${gap.message}`}>{gap.message}</li>
            ))}
          </ul>
        </section>
      )}

      {written ? (
        <p className="m-0 text-[0.9rem] text-[var(--stp-text-muted)]">
          Saved <span className="wizard-code text-[var(--stp-text-primary)]">{state.configFile?.filename}</span> to your
          project.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {state.existingConfig !== undefined && (
            <Alert tone="info" title="This project already has a configuration">
              <span className="wizard-code">{state.existingConfig}</span> stays exactly as it is. The new one is written
              beside it as <span className="wizard-code">{filename}</span>.
            </Alert>
          )}
          <div className="flex items-center gap-4">
            <Button
              disabled={busy !== undefined}
              isLoading={busy === 'write'}
              onClick={() => onWrite(format)}
              variant="primary"
            >
              Save {filename} &amp; continue
            </Button>
            <span className="text-[0.9rem] text-[var(--stp-text-subtle)]">
              Puts the file in your project. Deploying stays optional.
            </span>
          </div>
          {(state.awsIdentity !== undefined || state.stacktapeAccount !== undefined) && (
            <p className="m-0 text-[0.82rem] text-[var(--stp-text-subtle)]">
              Saving needs no account. Deploying later needs AWS credentials
              {state.awsIdentity === undefined ? '' : state.awsIdentity.available ? ' ✓' : ' — none found yet'} and a
              Stacktape sign-in
              {state.stacktapeAccount === undefined ? '' : state.stacktapeAccount.signedIn ? ' ✓' : ' — needed'}. The
              next step sorts both out.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
