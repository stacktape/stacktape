import type { StacktapeConfig } from '@stacktape/config';
import {
  settingsForResource,
  type SettingChange,
  type SettingValue
} from '@stacktape/config-inference/compose/resource-settings';
import { DEPLOYMENT_TOOL_LABELS } from '@stacktape/config-inference/facts/existing-deployment';
import { Select, type SelectOption } from '@stacktape/ui-react/select';
import { Spinner } from '@stacktape/ui-react/spinner';
import { Tabs } from '@stacktape/ui-react/tabs';
import { Tooltip } from '@stacktape/ui-react/tooltip';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BiChevronDown, BiInfoCircle, BiLinkExternal } from 'react-icons/bi';
import { ResourceIcon } from '@stacktape/ui-react/resource-icon';
import { InfoTip } from '../components/InfoTip';
import { RegionPicker } from '../components/RegionPicker';
import { DECISION_COPY } from '../decisions';
import type { WizardState } from '../session';
import type { Citation, ResourceStory } from '../workspace/resource-story';
import { useMediaQuery } from '../workspace/use-media-query';
import { NOT_CREATED_KINDS, plainList, sizeSummary } from './review-model';
import { reviewLayout, settingTerms } from './review-version';
import {
  CostOverview,
  OverviewSection,
  PlainSettingRow,
  ResourcePanel,
  ResourcePrice,
  categoryColor,
  type ResourceEntry
} from './ReviewSettings';
import './review.css';

/** Heavy on purpose, light on arrival: the diagram loads after the page. */
const Diagram = lazy(() => import('../components/Diagram'));

type Resources = Record<string, { type: string; properties: Record<string, unknown> }>;
type Price = NonNullable<NonNullable<WizardState['composition']>['price']>;

/** Three columns need this much room; below it the settings go under the picture. */
const THREE_COLUMNS = '(min-width: 1360px)';

/**
 * Review, the left side of the workspace: the picture of what gets created, and what each part of it is set to and
 * costs.
 *
 * Nothing is picked: the monthly estimate, split by resource, and the project's own settings. A resource picked on the
 * picture or in the list: its settings, grouped, each with AWS's name beside the plain one and the price of every
 * option, and why it is there. Every setting writes stacktape.yml, and the editor shows the lines it changed. Three
 * layouts of the same parts can be compared with `?review=` (see `review-version.ts`).
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
  isTyping,
  onSetting,
  onDecision,
  onRegion
}: {
  state: WizardState;
  /** What the file declares now: the edited text when it parses, the composition otherwise. */
  resources: Resources;
  stories: Readonly<Record<string, ResourceStory>>;
  /** Each story's citation checked against its file, once the file is read. */
  citations: Readonly<Record<string, Citation>>;
  selected: string | undefined;
  /** Picks a resource, or puts it down when it is already picked. */
  onSelect: (resourceName: string) => void;
  /** Picks a resource and brings its block in stacktape.yml into view. */
  onShowInFile: (resourceName: string) => void;
  /** Nodes still appearing after the reveal. */
  progress: Readonly<Record<string, 'pending' | 'ready'>> | undefined;
  busy: string | undefined;
  isLocked: boolean;
  isEdited: boolean;
  /** The user is typing in stacktape.yml: the text the server has is a moment behind. */
  isTyping: boolean;
  onSetting: (change: SettingChange) => void;
  onDecision: (id: string, value: string) => void;
  onRegion: (region: string) => void;
}) {
  const layout = reviewLayout(window.location.search);
  const terms = settingTerms(window.location.search);
  const isPhone = useMediaQuery('(max-width: 1020px)');
  const threeColumns = useMediaQuery(THREE_COLUMNS);
  // A phone-width screen is read with a finger even where the browser reports a mouse.
  const isTouch = useMediaQuery('(hover: none), (max-width: 760px)');
  const shownLayout = isPhone ? 'stack' : layout;
  const [hovered, setHovered] = useState<string | undefined>(undefined);
  const existing = state.facts?.existingDeployments ?? [];
  const price = state.composition?.price;
  const context = useMemo(() => ({ engineVersions: state.engineVersions ?? {} }), [state.engineVersions]);

  // A value just picked shows at once; the file the CLI sends back says it for real a moment later (or not, refused).
  const [pending, setPending] = useState<Record<string, Record<string, SettingValue>>>({});
  useEffect(() => setPending({}), [state]);
  const changeSetting = (resource: string, setting: string, value: SettingValue) => {
    setPending((current) => ({ ...current, [resource]: { ...current[resource], [setting]: value } }));
    onSetting({ resource, setting, value });
  };

  const entries: ResourceEntry[] = useMemo(
    () =>
      Object.entries(resources).map(([name, resource]) => ({
        name,
        resource,
        title: stories[name]?.plainName ?? name,
        settings: settingsForResource(resource, context)
      })),
    [resources, stories, context]
  );
  const entryOf = (name: string | undefined) => entries.find((entry) => entry.name === name);
  const lockedReason = isLocked
    ? 'Not while stacktape init is disconnected or deploying'
    : isTyping || busy === 'write'
      ? 'One moment'
      : undefined;

  // One object per file: a new one is a new picture, and the diagram forgets what the pointer was on.
  const config = useMemo(() => ({ resources }) as unknown as StacktapeConfig, [resources]);
  // The picture names each resource the way this page does ("Postgres database"), its key in the file under it.
  const titleKey = JSON.stringify(Object.values(stories).map((entry) => [entry.name, entry.plainName]));
  const titles = useMemo(
    () => Object.fromEntries(JSON.parse(titleKey) as Array<[string, string]>) as Record<string, string>,
    [titleKey]
  );

  const panelFor = (
    name: string,
    appearance: 'inspector' | 'card',
    extra: { onBack?: () => void; onClose?: () => void } = {}
  ) => {
    const entry = entryOf(name);
    if (entry === undefined) return null;
    return (
      <ResourcePanel
        appearance={appearance}
        citation={citations[name]}
        isEdited={isEdited}
        key={name}
        lockedReason={lockedReason}
        name={name}
        onSetting={(setting, value) => changeSetting(name, setting, value)}
        onShowInFile={() => onShowInFile(name)}
        pending={pending[name] ?? {}}
        price={price}
        resource={entry.resource}
        settings={entry.settings}
        story={stories[name]}
        terms={terms}
        {...extra}
      />
    );
  };

  const overview = (compactCosts: boolean) => (
    <>
      <CostOverview
        compact={compactCosts}
        entries={entries}
        hovered={hovered}
        onSelect={onSelect}
        price={price}
        priceUnavailable={state.composition?.priceUnavailable === true}
        region={state.region}
        selected={selected}
      />
      <ProjectSettings
        busy={busy}
        isEdited={isEdited}
        lockedReason={lockedReason}
        onDecision={onDecision}
        onRegion={onRegion}
        state={state}
      />
      <NotCreated state={state} />
    </>
  );

  const diagram = (
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
        // The settings beside the picture say what each resource is; the picture only points.
        focusDimming="soft"
        framePadding={shownLayout === 'canvas' ? 40 : 16}
        hint=""
        // A wizard's picture has a handful of resources: no layer switches, and laid out as compactly as it can be.
        layerChoices={[]}
        layout="shown-layers"
        minLabelSize={isTouch ? 12 : 11}
        onHoverResource={(name) => setHovered(name ?? undefined)}
        onSelectResource={onSelect}
        resourceProgress={progress}
        resourceTitles={titles}
        // The database access server is drawn reaching the private database it is there for.
        bastionTunnels
        selectedResource={selected ?? null}
        style={{ width: '100%', height: '100%' }}
        volumeMounts
      />
    </Suspense>
  );

  const note =
    existing.length > 0 ? (
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
    ) : null;

  if (shownLayout === 'stack') {
    return (
      <div className="rv ws-review" data-layout="stack">
        {note}
        <div className="rv-main">
          <section aria-label="Diagram" className="ws-panel rv-diagram">
            <div className="rv-diagram-canvas">{diagram}</div>
            <p className="rv-diagram-hint">
              {isTouch ? 'Tap a resource to change it' : 'Click a resource to change it'}
            </p>
          </section>
          <div className="rv-list">
            <section className="ws-panel rv-card rv-card--costs">
              <CostOverview
                compact
                entries={entries}
                hovered={hovered}
                onSelect={(name) => onSelect(name)}
                rows={false}
                price={price}
                priceUnavailable={state.composition?.priceUnavailable === true}
                region={state.region}
                selected={selected}
              />
            </section>
            {entries.map((entry) => (
              <ResourceCard
                entry={entry}
                isHovered={hovered === entry.name}
                isOpen={selected === entry.name}
                key={entry.name}
                onToggle={() => onSelect(entry.name)}
                price={price}
              >
                {panelFor(entry.name, 'card')}
              </ResourceCard>
            ))}
            <section className="ws-panel rv-card rv-card--project">
              <ProjectSettings
                busy={busy}
                isEdited={isEdited}
                lockedReason={lockedReason}
                onDecision={onDecision}
                onRegion={onRegion}
                state={state}
              />
              <NotCreated state={state} />
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (shownLayout === 'canvas') {
    const picked = selected === undefined ? undefined : entryOf(selected);
    return (
      <div className="rv ws-review" data-layout="canvas" data-picked={picked === undefined ? undefined : 'true'}>
        {note}
        <div className="rv-main">
          <section aria-label="Diagram" className="ws-panel rv-diagram rv-canvas">
            <div className="rv-diagram-canvas">{diagram}</div>
            <aside aria-label="Overview" className="rv-float rv-float--overview">
              {overview(true)}
            </aside>
            {picked !== undefined && (
              <aside aria-label={`${picked.title} settings`} className="rv-float rv-float--inspector" key={picked.name}>
                {panelFor(picked.name, 'inspector', { onClose: () => onSelect(picked.name) })}
              </aside>
            )}
            {picked === undefined && (
              <p className="rv-canvas-hint">
                {isTouch ? 'Tap a resource to change it' : 'Click a resource to change it'}
              </p>
            )}
          </section>
        </div>
      </div>
    );
  }

  // Columns: the picture, then what is picked (or everything), then stacktape.yml.
  return (
    <div className="rv ws-review" data-columns={threeColumns ? '3' : '2'} data-layout="columns">
      {note}
      <div className="rv-main">
        <section aria-label="Diagram" className="ws-panel rv-diagram">
          <div className="rv-diagram-canvas">{diagram}</div>
          {selected === undefined && (
            <p className="rv-diagram-hint">
              {isTouch ? 'Tap a resource to change it' : 'Click a resource to change it'}
            </p>
          )}
        </section>
        <aside
          aria-label={selected === undefined ? 'Overview' : `${entryOf(selected)?.title ?? selected} settings`}
          className="ws-panel rv-inspector"
        >
          {selected !== undefined && entryOf(selected) !== undefined ? (
            panelFor(selected, 'inspector', { onBack: () => onSelect(selected) })
          ) : (
            <div className="rv-overview">{overview(false)}</div>
          )}
        </aside>
      </div>
    </div>
  );
}

/** A resource in the stacked list: what it is, its size and price on one line; opened, its settings. */
function ResourceCard({
  entry,
  price,
  isOpen,
  isHovered,
  onToggle,
  children
}: {
  entry: ResourceEntry;
  price: Price | undefined;
  isOpen: boolean;
  isHovered: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  // Opened from the picture, it comes into view.
  useEffect(() => {
    if (isOpen) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [isOpen]);
  const summary = sizeSummary(entry.settings);
  return (
    <section
      aria-label={entry.title}
      className="ws-panel rv-card rv-card--resource"
      data-hovered={isHovered ? 'true' : undefined}
      data-open={isOpen ? 'true' : undefined}
      ref={ref}
    >
      <button aria-expanded={isOpen} className="rv-card-head" onClick={onToggle} type="button">
        <span aria-hidden className="rv-dot" style={{ background: categoryColor(entry.resource.type) }} />
        <ResourceIcon resourceType={entry.resource.type} size={20} />
        <span className="rv-card-name">
          <strong>{entry.title}</strong>
          <small>
            <code>{entry.name}</code>
            {summary !== undefined && <> · {summary}</>}
          </small>
        </span>
        <ResourcePrice name={entry.name} price={price} />
        <BiChevronDown aria-hidden className="rv-card-chevron" size={20} />
      </button>
      {isOpen && <div className="rv-card-body">{children}</div>}
    </section>
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
  options: Array<{ value: string; label: string; help?: string | undefined }>;
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
        width="100%"
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
      tabs={options.map((option) => ({
        value: option.value,
        label:
          option.help === undefined ? (
            option.label
          ) : (
            <Tooltip content={option.help} maxWidth={280} placement="top">
              <span>{option.label}</span>
            </Tooltip>
          )
      }))}
      value={value}
      width="fit"
    />
  );
}

/**
 * The project's own settings: where it runs, and what the analysis decided for this app (the migrations, how a
 * service is built). A decision regenerates the file, so it waits while the file has hand edits.
 */
function ProjectSettings({
  state,
  busy,
  isEdited,
  lockedReason,
  onDecision,
  onRegion
}: {
  state: WizardState;
  busy: string | undefined;
  isEdited: boolean;
  lockedReason: string | undefined;
  onDecision: (id: string, value: string) => void;
  onRegion: (region: string) => void;
}) {
  const decisions = (state.facts?.decisions ?? []).filter(
    (decision) => DECISION_COPY[decision.kind] !== undefined && decision.alternatives.length > 1
  );
  const decisionsOff = lockedReason !== undefined || isEdited || (busy !== undefined && busy !== 'setting');
  return (
    <>
      <OverviewSection title="Project">
        <PlainSettingRow
          about="Where on AWS this runs. Pick the one closest to your users. Prices differ a little by region."
          label="Region"
        >
          <RegionPicker
            hideLabel
            isDisabled={lockedReason !== undefined || isEdited}
            onChange={onRegion}
            value={state.region ?? 'eu-west-1'}
            width={240}
          />
        </PlainSettingRow>
      </OverviewSection>
      {decisions.length > 0 && (
        <OverviewSection
          note={isEdited ? 'These rewrite stacktape.yml, so they wait while it has your edits.' : undefined}
          title="Decided for this app"
        >
          {decisions.map((decision) => {
            const copy = DECISION_COPY[decision.kind]!;
            const label = copy.label(decision.parameters);
            return (
              <PlainSettingRow
                about={copy.detail(decision.parameters, decision.chosen)}
                key={decision.id}
                label={label}
              >
                <Choice
                  disabled={decisionsOff}
                  label={label}
                  onChange={(next) => onDecision(decision.id, next)}
                  options={decision.alternatives.map((value) => ({
                    value,
                    label: copy.option(value, decision.parameters),
                    help: copy.consequence?.(value, decision.parameters)
                  }))}
                  value={decision.chosen}
                />
              </PlainSettingRow>
            );
          })}
        </OverviewSection>
      )}
    </>
  );
}

const EXTERNAL_LABELS: Readonly<Record<string, string>> = {
  amqp: 'RabbitMQ',
  nats: 'NATS',
  kafka: 'Kafka',
  email: 'Email sending'
};

/**
 * What this app needs that the deploy does not create (a RabbitMQ broker, a NATS server): each with the setting the
 * app reads its address from, which the next step asks for. The composition's own words say where to get one.
 */
function NotCreated({ state }: { state: WizardState }) {
  const external = (state.facts?.dependencies ?? []).filter((dependency) => NOT_CREATED_KINDS.has(dependency.kind));
  if (external.length === 0) return null;
  return (
    <OverviewSection
      note={`You give ${external.length === 1 ? 'its address' : 'their addresses'} before deploying`}
      title="Not created by Stacktape"
    >
      <ul className="ws-external-list rv-external">
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
    </OverviewSection>
  );
}
