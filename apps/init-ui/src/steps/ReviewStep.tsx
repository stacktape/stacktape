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
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ResourceIcon } from '@stacktape/ui-react/resource-icon';
import { BiChevronDown, BiCodeAlt, BiInfoCircle, BiLinkExternal, BiPointer, BiX } from 'react-icons/bi';
import { InfoTip } from '../components/InfoTip';
import { RegionPicker } from '../components/RegionPicker';
import { DECISION_COPY } from '../decisions';
import type { WizardState } from '../session';
import { evidenceSays, lineRange, quoteLabel, type Citation, type ResourceStory } from '../workspace/resource-story';
import { EvidenceLine } from '../workspace/EvidenceLine';
import { deploymentPreferenceKeysFor, NOT_CREATED_KINDS, plainList } from './review-model';

/** Whether a media query matches now, following changes. */
const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches === true);
  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (list === undefined) return;
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
};

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

/** The settings that change the price most, always in view; the rest fold under "More settings". */
const PRIMARY_PREFERENCES: ReadonlySet<DeploymentPreferenceKey> = new Set(['capacity', 'availability']);

/** "+$31/mo" as an option label shows it: "+$31". */
const shortDelta = (delta: string | undefined): string | undefined =>
  delta === undefined || delta === 'Same price' ? undefined : delta.replace(/\/mo$/, '').replace(/^-/, '−');

/**
 * Review, the left side of the workspace: what this is, the picture of it, and the few settings that apply.
 *
 * Everything about a single resource (why it is there, its price) is in the row under the picture, for the resource
 * the pointer is on or the one picked, and above its block in the editor; a click on a node finds the block. Nothing
 * floats over the picture. The settings rewrite the file, and the editor shows the lines they changed.
 */
export function ReviewPane({
  state,
  resources,
  stories,
  citations,
  selected,
  onSelect,
  onShowInFile,
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
  /** Each story's citation checked against its file, once the file is read. */
  citations: Readonly<Record<string, Citation>>;
  selected: string | undefined;
  onSelect: (resourceName: string) => void;
  /** Picks a resource and brings its block in stacktape.yml into view. */
  onShowInFile: (resourceName: string) => void;
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
  // A phone-width screen is read with a finger even where the browser reports a mouse.
  const isTouch = useMediaQuery('(hover: none), (max-width: 760px)');
  /** The resource the pointer or keyboard is on: the row says what it is until it leaves. */
  const [hovered, setHovered] = useState<string | undefined>(undefined);
  const shown = hovered !== undefined && stories[hovered] !== undefined ? hovered : selected;
  const story = shown === undefined ? undefined : stories[shown];
  // The row keeps one height for the app, so a resource with three cited lines never resizes the picture.
  const codeRows = Math.min(
    3,
    Math.max(
      1,
      ...Object.values(stories).map((entry) =>
        entry.designChoice !== undefined || entry.evidence === undefined
          ? 1
          : (citations[entry.name]?.lines.length ?? 1)
      )
    )
  );
  // One object per file: a new one is a new picture, and the diagram forgets what the pointer was on.
  const config = useMemo(() => ({ resources }) as unknown as StacktapeConfig, [resources]);
  // A disk that holds the app's SQLite file says so in the picture.
  const typeLabels = useMemo(
    () =>
      Object.fromEntries(
        Object.values(stories)
          .filter((entry) => entry.type === 'efs-filesystem' && entry.hint === 'sqlite')
          .map((entry) => [entry.name, 'SQLite data'])
      ),
    [stories]
  );

  return (
    <div className="ws-review">
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

      <section
        aria-label="Diagram"
        className="ws-panel ws-diagram"
        style={{ ['--ws-selection-rows' as string]: codeRows }}
      >
        <div className="ws-diagram-canvas">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Spinner />
              </div>
            }
          >
            <Diagram
              ariaLabel="Diagram of what stacktape.yml creates on AWS"
              config={config}
              // The row under the picture says what to do and what each resource is.
              focusDimming="soft"
              // The frame is what the title, the row and the settings leave: the picture fills it, not its margin.
              framePadding={32}
              hint=""
              // A wizard's picture has a handful of resources: no layer switches, and laid out as compactly as it can be.
              layerChoices={[]}
              layout="shown-layers"
              // A larger app is scaled down to fit beside the file; its names stay readable.
              minLabelSize={isTouch ? 12 : 11}
              onHoverResource={(name) => setHovered(name ?? undefined)}
              onSelectResource={onSelect}
              resourceProgress={progress}
              resourceTypeLabels={typeLabels}
              selectedResource={selected ?? null}
              style={{ width: '100%', height: '100%' }}
              volumeMounts
            />
          </Suspense>
        </div>
        <SelectionRow
          citation={story === undefined ? undefined : citations[story.name]}
          isPicked={story !== undefined && story.name === selected}
          isTouch={isTouch}
          onClear={() => selected !== undefined && onSelect(selected)}
          onShowInFile={onShowInFile}
          story={story}
        />
      </section>

      <NotCreated state={state} />

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

/** The why line as plain text, for its tooltip when a narrow row cuts it short. */
const whyText = (story: ResourceStory, citation: Citation | undefined): string | undefined => {
  if (story.designChoice !== undefined) return `Added by Stacktape ${story.designChoice}`;
  const evidence = story.evidence;
  if (evidence === undefined) return story.reason;
  const says = evidenceSays(story, evidence)?.replaceAll('`', '') ?? quoteLabel(evidence.quote);
  return `${says} in ${evidence.file}:${lineRange(citation, evidence)}`;
};

/**
 * The row under the picture: what to do while nothing is picked; then the resource the pointer is on, or the one
 * picked: its plain name and price, what in the code called for it with those lines, and the way to its block in
 * stacktape.yml. It keeps one place and one height, so it never covers the picture or moves it.
 */
function SelectionRow({
  story,
  citation,
  isPicked,
  isTouch,
  onShowInFile,
  onClear
}: {
  story: ResourceStory | undefined;
  citation: Citation | undefined;
  isPicked: boolean;
  isTouch: boolean;
  onShowInFile: (resourceName: string) => void;
  onClear: () => void;
}) {
  if (story === undefined) {
    return (
      <div className="ws-selection" data-empty="true">
        <p className="ws-selection-empty">
          <BiPointer aria-hidden size={15} />
          {isTouch ? 'Tap a resource to see why it is here' : 'Select a resource to see why it is here'}
        </p>
      </div>
    );
  }
  const evidence = story.designChoice === undefined ? story.evidence : undefined;
  const lines =
    evidence === undefined
      ? []
      : citation === undefined
        ? [{ number: evidence.line, text: quoteLabel(evidence.quote) }]
        : citation.lines.slice(0, 3).map((number, index) => ({ number, text: citation.text[index] ?? '' }));
  return (
    <div
      aria-live="polite"
      className="ws-selection"
      data-code={lines.length > 0 ? 'true' : undefined}
      data-picked={isPicked ? 'true' : undefined}
      key={story.name}
    >
      <div className="ws-selection-main">
        <p className="ws-selection-name">
          <ResourceIcon resourceType={story.type} size={16} />
          <strong>{story.plainName}</strong>
          {story.priceLabel !== undefined && <span className="ws-selection-price">{story.priceLabel}</span>}
        </p>
        <p className="ws-selection-why" title={whyText(story, citation)}>
          <EvidenceLine citation={citation} story={story} />
        </p>
      </div>
      {lines.length > 0 && (
        <div className="ws-selection-code">
          {lines.map((line) => (
            <div className="ws-selection-line" key={line.number}>
              <span className="ws-selection-number">{line.number}</span>
              <span className="ws-selection-text">{line.text}</span>
            </div>
          ))}
        </div>
      )}
      {/* One slot for both states, so the lines beside it never move when a resource is picked. */}
      <div className="ws-selection-actions">
        {isPicked ? (
          <>
            <button
              className="ws-selection-show"
              onClick={() => onShowInFile(story.name)}
              title="Show in stacktape.yml"
              type="button"
            >
              <BiCodeAlt aria-hidden size={15} />
              <span className="ws-selection-show-label">Show in stacktape.yml</span>
            </button>
            <button aria-label="Clear the selection" className="ws-selection-clear" onClick={onClear} type="button">
              <BiX aria-hidden size={18} />
            </button>
          </>
        ) : (
          !isTouch && <span className="ws-selection-hint">Click to show it in stacktape.yml</span>
        )}
      </div>
    </div>
  );
}

const EXTERNAL_LABELS: Readonly<Record<string, string>> = {
  amqp: 'RabbitMQ',
  nats: 'NATS',
  kafka: 'Kafka',
  email: 'Email sending'
};

/**
 * What this app needs that the deploy does not create (a RabbitMQ broker, a NATS server), right under the picture:
 * each with the setting the app reads its address from, which the next step asks for. The composition's own words
 * say where to get one.
 */
function NotCreated({ state }: { state: WizardState }) {
  const external = (state.facts?.dependencies ?? []).filter((dependency) => NOT_CREATED_KINDS.has(dependency.kind));
  if (external.length === 0) return null;
  return (
    <section aria-label="Not created by Stacktape" className="ws-panel ws-external">
      <p className="ws-external-title">Not created by Stacktape</p>
      <p className="ws-external-note">
        You give {external.length === 1 ? 'its address' : 'their addresses'} before deploying
      </p>
      <ul className="ws-external-list">
        {external.map((dependency) => {
          const label = EXTERNAL_LABELS[dependency.kind] ?? dependency.name;
          const gap = state.composition?.gaps.find((entry) => entry.subject === dependency.name)?.message;
          const variables = [
            ...new Set(
              dependency.evidence.flatMap((entry) => /^([A-Z][A-Z0-9_]*)=/.exec(entry.quote.trim())?.[1] ?? [])
            )
          ];
          return (
            <li key={dependency.name}>
              <BiLinkExternal aria-hidden className="ws-external-icon" size={14} />
              <strong>{label}</strong>
              {variables.map((variable) => (
                <code key={variable}>{variable}</code>
              ))}
              {gap !== undefined && <InfoTip about={label}>{gap}</InfoTip>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SettingRow({ label, about, children }: { label: string; about: ReactNode; children: ReactNode }) {
  return (
    <div className="ws-setting">
      <div className="ws-setting-label">
        <span>{label}</span>
        <InfoTip about={label.toLowerCase()}>{about}</InfoTip>
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
        width={340}
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
  const [showAll, setShowAll] = useState(false);

  /** Every setting that applies, as a row, with the words its current answer is shown in when it is folded away. */
  const rows: Array<{ key: string; primary: boolean; label: string; current: string; row: ReactNode }> = [
    ...(preferences === undefined
      ? []
      : keys.map((key) => {
          const copy = PREFERENCES[key];
          const value = preferences[key] as string;
          return {
            key,
            primary: PRIMARY_PREFERENCES.has(key),
            label: copy.label,
            current: copy.options.find((option) => option.value === value)?.label ?? value,
            row: (
              <SettingRow about={copy.about} key={key} label={copy.label}>
                <Choice
                  disabled={disabled}
                  label={copy.label}
                  onChange={(next) =>
                    onPreference({
                      key,
                      value: next as DeploymentPreferences[typeof key]
                    } as DeploymentPreferenceChange)
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
            )
          };
        })),
    // What the analysis decided about this app is always in view: it is what makes this app's file its own.
    ...decisions.map((decision) => {
      const copy = DECISION_COPY[decision.kind]!;
      const label = copy.label(decision.parameters);
      return {
        key: decision.id,
        primary: true,
        label,
        current: copy.option(decision.chosen, decision.parameters),
        row: (
          <SettingRow about={copy.detail(decision.parameters, decision.chosen)} key={decision.id} label={label}>
            <Choice
              disabled={disabled}
              label={label}
              onChange={(next) => onDecision(decision.id, next)}
              options={decision.alternatives.map((value) => ({
                value,
                label: copy.option(value, decision.parameters),
                help: copy.consequence?.(value, decision.parameters)
              }))}
              value={decision.chosen}
            />
          </SettingRow>
        )
      };
    })
  ];
  const folded = rows.filter((row) => !row.primary);
  // Folding one row away saves nothing.
  const foldsAny = folded.length > 1 && !showAll;

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
      {rows.filter((row) => row.primary || !foldsAny).map((row) => row.row)}
      {foldsAny && (
        <button aria-expanded={false} className="ws-setting ws-more" onClick={() => setShowAll(true)} type="button">
          <span className="ws-setting-label">More settings</span>
          <span className="ws-more-values">
            {folded.map((row) => (
              <span key={row.key}>
                {row.label} <strong>{row.current}</strong>
              </span>
            ))}
            <BiChevronDown aria-hidden size={18} />
          </span>
        </button>
      )}
    </section>
  );
}
