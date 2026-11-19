import type { StacktapeConfig } from '@stacktape/config';
import type {
  DeploymentPreferenceChange,
  DeploymentPreferenceKey,
  DeploymentPreferences
} from '@stacktape/config-inference/compose/preferences';
import { DEPLOYMENT_TOOL_LABELS } from '@stacktape/config-inference/facts/existing-deployment';
import { Select, type SelectOption } from '@stacktape/ui-react/select';
import { Spinner } from '@stacktape/ui-react/spinner';
import { Tabs } from '@stacktape/ui-react/tabs';
import { Tooltip } from '@stacktape/ui-react/tooltip';
import { lazy, Suspense, type ReactNode } from 'react';
import { BiInfoCircle } from 'react-icons/bi';
import { AnimatedPrice } from '../components/AnimatedPrice';
import { RegionPicker } from '../components/RegionPicker';
import { DECISION_COPY } from '../decisions';
import type { WizardState } from '../session';
import { quoteLabel, type ResourceStory } from '../workspace/resource-story';
import { deploymentPreferenceKeysFor, plainList, splitMonthly, summarise } from './review-model';

/** Heavy on purpose, light on arrival: the diagram loads after the page. */
const Diagram = lazy(() => import('../components/Diagram'));

type Resources = Record<string, { type: string; properties: Record<string, unknown> }>;

type PreferenceCopy = {
  label: string;
  /** What the setting is about, for its info tooltip. */
  about: string;
  options: Array<{ value: string; label: string; help: string }>;
};

/** The settings, in a developer's words. Each option's consequence is in its tooltip. */
const PREFERENCES: Record<DeploymentPreferenceKey, PreferenceCopy> = {
  capacity: {
    label: 'Starting size',
    about: 'How big the app and the database start. You can resize them any time.',
    options: [
      {
        value: 'economical',
        label: 'Small',
        help: 'The smallest useful sizes. Good for trying it out and dev stages.'
      },
      {
        value: 'balanced',
        label: 'Standard',
        help: 'Middle sizes for the app and database. Always-on apps add copies when busy.'
      },
      { value: 'performance', label: 'Large', help: 'Larger app and database sizes for steady, heavy traffic.' }
    ]
  },
  availability: {
    label: 'If a server fails',
    about: 'What happens when the machine running your app or database fails.',
    options: [
      { value: 'single', label: 'Restart it', help: 'One copy. A failure means a short outage while it restarts.' },
      {
        value: 'redundant',
        label: 'Stay online',
        help: 'A second copy in another data center takes over. Roughly doubles the app and database cost.'
      }
    ]
  },
  dataProtection: {
    label: 'Backups',
    about: 'How long database backups and old file versions are kept. Deleting the database is blocked either way.',
    options: [
      { value: 'lean', label: '1 day', help: 'One day of database backups. For data you can recreate.' },
      { value: 'protected', label: '7 days', help: 'A week of database backups and old file versions.' }
    ]
  },
  databaseAccess: {
    label: 'Database reachable from',
    about: 'Where your database accepts connections from.',
    options: [
      {
        value: 'private',
        label: 'Private network',
        help: 'No public address. Adds a small access server your laptop and migrations connect through.'
      },
      {
        value: 'public',
        label: 'Internet',
        help: 'A public address, but only the generated 32-character password over TLS gets in. Simplest for your laptop and migrations.'
      }
    ]
  }
};

/** "+$31/mo" as an option label shows it: "+$31". */
const shortDelta = (delta: string | undefined): string | undefined =>
  delta === undefined || delta === 'Same price' ? undefined : delta.replace(/\/mo$/, '').replace(/^-/, '−');

/**
 * Review, the left side of the workspace: what this is, the picture of it, and the few settings that apply.
 *
 * Everything about a single resource (why it is there, its price) is on its node's hover card and above its block in
 * the editor; a click on a node finds the block. The settings rewrite the file, and the editor shows the lines they
 * changed.
 */
export function ReviewPane({
  state,
  resources,
  stories,
  selected,
  onSelect,
  progress,
  busy,
  isLocked,
  isEdited,
  onPreference,
  onDecision,
  onRegion,
  onDiscardEdits
}: {
  state: WizardState;
  /** What the file declares now: the edited text when it parses, the composition otherwise. */
  resources: Resources;
  stories: Readonly<Record<string, ResourceStory>>;
  selected: string | undefined;
  onSelect: (resourceName: string) => void;
  /** Nodes still appearing after the reveal. */
  progress: Readonly<Record<string, 'pending' | 'ready'>> | undefined;
  busy: string | undefined;
  isLocked: boolean;
  isEdited: boolean;
  onPreference: (change: DeploymentPreferenceChange) => void;
  onDecision: (id: string, value: string) => void;
  onRegion: (region: string) => void;
  onDiscardEdits: () => void;
}) {
  const existing = state.facts?.existingDeployments ?? [];
  const agent = state.agents?.find((option) => option.id === state.choice?.agentId);
  const opened = new Set(
    state.timeline
      .filter((entry) => entry.kind === 'tool' && entry.label.startsWith('read_file '))
      .map((entry) => entry.label)
  ).size;

  return (
    <div className="ws-review">
      <header className="ws-review-head">
        <div className="min-w-0">
          <h1 className="ws-title">{state.projectName} on AWS</h1>
          <p className="ws-summary">{summarise(state)}</p>
        </div>
        <p className="ws-receipt">
          {agent === undefined || agent.id === 'none'
            ? 'Read without AI'
            : `Read by ${agent.label}${opened > 0 ? ` · ${opened} ${opened === 1 ? 'file' : 'files'}` : ''}`}
        </p>
      </header>
      {existing.length > 0 && (
        <p className="ws-review-note">
          <BiInfoCircle aria-hidden size={14} />
          <span>
            Also has{' '}
            {plainList(
              existing.map(({ tool }) => (DEPLOYMENT_TOOL_LABELS as Readonly<Record<string, string>>)[tool] ?? tool)
            )}{' '}
            config. This deploy is a separate copy; nothing there changes.
          </span>
        </p>
      )}

      <section aria-label="Diagram" className="ws-panel ws-diagram">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          }
        >
          <Diagram
            ariaLabel="Diagram of what stacktape.yml creates on AWS"
            config={{ resources } as unknown as StacktapeConfig}
            hint="Hover for why it is here · click to find it in stacktape.yml"
            initialZoom={1.2}
            onSelectResource={onSelect}
            resourceProgress={progress}
            resourceTooltip={cardsFor(stories)}
            selectedResource={selected ?? null}
            style={{ width: '100%', height: '100%' }}
          />
        </Suspense>
      </section>

      <Settings
        busy={busy}
        isEdited={isEdited}
        isLocked={isLocked}
        onDecision={onDecision}
        onDiscardEdits={onDiscardEdits}
        onPreference={onPreference}
        onRegion={onRegion}
        state={state}
        types={Object.values(resources).map((resource) => resource.type)}
      />
    </div>
  );
}

/** The diagram's hover cards, one per resource with a story. */
const cardsFor =
  (stories: Readonly<Record<string, ResourceStory>>) =>
  (name: string): ReactNode =>
    stories[name] === undefined ? undefined : <ResourceCard story={stories[name]} />;

/** A node's hover card: its plain name and price, and the line of code it came from. */
export function ResourceCard({ story }: { story: ResourceStory }) {
  return (
    <div className="ws-node-card">
      <div className="ws-node-card-head">
        <strong>{story.plainName}</strong>
        {story.priceLabel !== undefined && <span>{story.priceLabel}</span>}
      </div>
      {story.reason !== undefined && <p className="ws-node-card-reason">{story.reason}</p>}
      {story.evidence !== undefined && (
        <p className="ws-node-card-evidence">
          <code>{quoteLabel(story.evidence.quote)}</code>
          <span>
            {story.evidence.file}:{story.evidence.line}
          </span>
        </p>
      )}
      {story.reason === undefined && <p className="ws-node-card-reason">Added in stacktape.yml by hand.</p>}
    </div>
  );
}

function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip content={children} maxWidth={300} placement="top">
      <button aria-label={`About ${label}`} className="ws-info" type="button">
        <BiInfoCircle aria-hidden size={14} />
      </button>
    </Tooltip>
  );
}

function SettingRow({ label, about, children }: { label: string; about: ReactNode; children: ReactNode }) {
  return (
    <div className="ws-setting">
      <div className="ws-setting-label">
        <span>{label}</span>
        <InfoTip label={label}>{about}</InfoTip>
      </div>
      <div className="ws-setting-control">{children}</div>
    </div>
  );
}

/** A choice between a few short options is a segmented control; anything longer is a select. */
function Choice({
  label,
  value,
  options,
  disabled,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; delta?: string | undefined; help?: string | undefined }>;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (options.length > 3 || options.some((option) => option.label.length > 24)) {
    const choices: Array<SelectOption<string>> = options.map((option) => ({
      value: option.value,
      label: option.label
    }));
    return (
      <Select
        disabled={disabled}
        hideLabel
        label={label}
        name={label}
        onChange={(picked) => {
          if (picked !== null && !Array.isArray(picked)) onChange((picked as SelectOption<string>).value);
        }}
        options={choices}
        reserveMessageSpace={false}
        value={choices.find((choice) => choice.value === value) ?? null}
        width={260}
      />
    );
  }
  return (
    <Tabs
      appearance="segmented"
      ariaLabel={label}
      disabled={disabled}
      onValueChange={onChange}
      size="small"
      tabs={options.map((option) => {
        const text = (
          <span className="ws-option">
            {option.label}
            {option.delta !== undefined && option.value !== value && (
              <span className="ws-option-delta"> · {option.delta}</span>
            )}
          </span>
        );
        return {
          value: option.value,
          label:
            option.help === undefined ? (
              text
            ) : (
              <Tooltip content={option.help} maxWidth={280} placement="top">
                {text}
              </Tooltip>
            )
        };
      })}
      value={value}
      width="fit"
    />
  );
}

function Settings({
  state,
  types,
  busy,
  isLocked,
  isEdited,
  onPreference,
  onDecision,
  onRegion,
  onDiscardEdits
}: {
  state: WizardState;
  types: string[];
  busy: string | undefined;
  isLocked: boolean;
  isEdited: boolean;
  onPreference: (change: DeploymentPreferenceChange) => void;
  onDecision: (id: string, value: string) => void;
  onRegion: (region: string) => void;
  onDiscardEdits: () => void;
}) {
  const preferences = state.preferences;
  const recommended = state.recommendedPreferences ?? preferences;
  const inert = new Set(state.composition?.inertChoices ?? []);
  const keys = deploymentPreferenceKeysFor(types).filter((key) => !inert.has(key));
  const deltas = state.composition?.price?.options;
  const decisions = (state.facts?.decisions ?? []).filter(
    (decision) => DECISION_COPY[decision.kind] !== undefined && decision.alternatives.length > 1
  );
  const disabled = isLocked || isEdited || busy !== undefined;

  return (
    <section aria-label="Settings" className="ws-panel ws-settings" data-paused={isEdited ? 'true' : undefined}>
      {isEdited && (
        <p className="ws-settings-paused">
          <span>Paused while you edit stacktape.yml by hand.</span>
          <button className="ws-textbutton" onClick={onDiscardEdits} type="button">
            Discard my edits
          </button>
        </p>
      )}
      <SettingRow about="Where on AWS this runs. Pick the one closest to your users." label="Region">
        <RegionPicker
          hideLabel
          isDisabled={disabled}
          onChange={onRegion}
          value={state.region ?? 'eu-west-1'}
          width={260}
        />
      </SettingRow>
      {preferences !== undefined &&
        keys.map((key) => {
          const copy = PREFERENCES[key];
          const value = preferences[key] as string;
          return (
            <SettingRow about={copy.about} key={key} label={copy.label}>
              <Choice
                disabled={disabled}
                label={copy.label}
                onChange={(next) =>
                  onPreference({ key, value: next as DeploymentPreferences[typeof key] } as DeploymentPreferenceChange)
                }
                options={copy.options.map((option) => ({
                  value: option.value,
                  label: option.label,
                  delta: shortDelta(deltas?.[key]?.[option.value]),
                  help:
                    option.value === (recommended?.[key] as string | undefined)
                      ? `${option.help} Recommended for this app.`
                      : option.help
                }))}
                value={value}
              />
            </SettingRow>
          );
        })}
      {decisions.map((decision) => {
        const copy = DECISION_COPY[decision.kind]!;
        return (
          <SettingRow
            about={copy.detail(decision.parameters, decision.chosen)}
            key={decision.id}
            label={copy.label(decision.parameters)}
          >
            <Choice
              disabled={disabled}
              label={copy.label(decision.parameters)}
              onChange={(next) => onDecision(decision.id, next)}
              options={decision.alternatives.map((value) => ({
                value,
                label: copy.option(value, decision.parameters),
                help: copy.consequence?.(value, decision.parameters)
              }))}
              value={decision.chosen}
            />
          </SettingRow>
        );
      })}
    </section>
  );
}

/** The fixed monthly price, counting when it changes, with its terms in one line. */
export function PriceSummary({ state }: { state: WizardState }) {
  const price = state.composition?.price;
  if (price === undefined) {
    return (
      <div className="w-price">
        <span className="w-price-value">
          {state.composition?.priceUnavailable === true ? (
            <span className="text-[15px] text-[var(--w-muted)]">Price unavailable offline</span>
          ) : (
            <span className="flex items-center gap-2 text-[15px] text-[var(--w-muted)]">
              <Spinner /> Pricing…
            </span>
          )}
        </span>
        <span className="w-price-note">Nothing else depends on the estimate.</span>
      </div>
    );
  }
  const { amount, usage } = splitMonthly(price.monthly);
  return (
    <div aria-live="polite" className="w-price">
      {amount === undefined ? (
        <span className="w-price-value">{price.monthly}</span>
      ) : (
        <AnimatedPrice className="w-price-value" text={`${amount} /month${usage ? ' + usage' : ''}`} />
      )}
      <span className="w-price-note">
        {usage ? 'Traffic and requests billed by use · ' : ''}AWS list prices, {price.region}
      </span>
    </div>
  );
}
