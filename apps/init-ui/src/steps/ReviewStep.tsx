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
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { BiInfoCircle, BiLinkExternal } from 'react-icons/bi';
import { InfoTip } from '../components/InfoTip';
import { RegionPicker } from '../components/RegionPicker';
import { DECISION_COPY } from '../decisions';
import type { WizardState } from '../session';
import type { ResourceStory } from '../workspace/resource-story';
import { useMediaQuery } from '../workspace/use-media-query';
import { NOT_CREATED_KINDS, plainList } from './review-model';
import { CostOverview, OverviewSection, PlainSettingRow, ResourcePanel, type ResourceEntry } from './ReviewSettings';
import './review.css';

/** Heavy on purpose, light on arrival: the diagram loads after the page. */
const Diagram = lazy(() => import('../components/Diagram'));

type Resources = Record<string, { type: string; properties: Record<string, unknown> }>;

/** Three columns need this much room; below it the settings go under the picture. */
const THREE_COLUMNS = '(min-width: 1360px)';

/**
 * How far the picture may grow past its own size to fill its frame. A wizard's picture has a handful of resources,
 * and on a large screen it would otherwise sit small in the middle of an empty canvas.
 */
const MAX_FIT_SCALE = 1.7;

/**
 * Review, the left side of the workspace: the picture of what gets created, and what each part of it is set to and
 * costs.
 *
 * Nothing is picked: the monthly estimate, a row per resource that opens its settings, and the project's own settings.
 * A resource picked on the picture or in the list: its settings, grouped, each with AWS's name under the plain one and
 * the price of every option. Every setting writes stacktape.yml, and the editor shows the lines it changed. A wide
 * screen has the settings beside the picture; a narrower one has them under it.
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
  isTyping,
  onSetting,
  onDecision,
  onRegion
}: {
  state: WizardState;
  /** What the file declares now: the edited text when it parses, the composition otherwise. */
  resources: Resources;
  stories: Readonly<Record<string, ResourceStory>>;
  selected: string | undefined;
  /** Picks a resource, or puts it down when it is already picked. */
  onSelect: (resourceName: string) => void;
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
  const threeColumns = useMediaQuery(THREE_COLUMNS);
  // A phone-width screen is read with a finger even where the browser reports a mouse.
  const isTouch = useMediaQuery('(hover: none), (max-width: 760px)');
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
  const picked = selected === undefined ? undefined : entries.find((entry) => entry.name === selected);
  const lockedReason = isLocked
    ? 'Not while stacktape init is disconnected or deploying'
    : isTyping || busy === 'write'
      ? 'One moment'
      : state.configEdit?.typescript !== undefined
        ? 'Not while stacktape.ts has your edits. Discard them to use the settings'
        : undefined;

  // A resource opened, or put down, starts at its top: beside the picture the panel scrolls itself; under it, the page
  // brings the panel's top into view when the row that opened it was further down.
  const inspectorRef = useRef<HTMLElement>(null);
  // Read when what is shown changes; a window made narrower moves nothing.
  const besidePicture = useRef(threeColumns);
  besidePicture.current = threeColumns;
  const shownName = picked?.name;
  const firstShown = useRef(true);
  useEffect(() => {
    if (firstShown.current) {
      firstShown.current = false;
      return;
    }
    const inspector = inspectorRef.current;
    if (inspector === null) return;
    if (besidePicture.current) {
      inspector.scrollTop = 0;
      return;
    }
    // The panel's top is hidden under the sticky header, or above the top of the pane that scrolls it.
    const visibleTop = Math.max(
      document.querySelector('.w-top')?.getBoundingClientRect().bottom ?? 0,
      inspector.closest('.ws-left')?.getBoundingClientRect().top ?? 0
    );
    const top = inspector.getBoundingClientRect().top;
    if (top < visibleTop || top > window.innerHeight - 120) {
      inspector.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [shownName]);

  // One object per file: a new one is a new picture, and the diagram forgets what the pointer was on.
  const config = useMemo(() => ({ resources }) as unknown as StacktapeConfig, [resources]);
  // The picture names each resource the way this page does ("Postgres database"), its key in the file under it.
  const titleKey = JSON.stringify(Object.values(stories).map((entry) => [entry.name, entry.plainName]));
  const titles = useMemo(
    () => Object.fromEntries(JSON.parse(titleKey) as Array<[string, string]>) as Record<string, string>,
    [titleKey]
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

  return (
    <div className="rv ws-review" data-columns={threeColumns ? '3' : '2'}>
      {note}
      <div className="rv-main">
        <section aria-label="Diagram" className="ws-panel rv-diagram">
          <div className="rv-diagram-canvas">
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
                framePadding={16}
                hint=""
                // A wizard's picture has a handful of resources: no layer switches, and laid out as compactly as it can
                // be, then grown to fill its frame.
                layerChoices={[]}
                layout="shown-layers"
                maxFitScale={MAX_FIT_SCALE}
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
          </div>
          {selected === undefined && (
            <p className="rv-diagram-hint">
              {isTouch ? 'Tap a resource to change it' : 'Click a resource to change it'}
            </p>
          )}
        </section>
        <aside
          aria-label={picked === undefined ? 'Overview' : `${picked.title} settings`}
          className="ws-panel rv-inspector"
          ref={inspectorRef}
        >
          {picked !== undefined ? (
            <ResourcePanel
              isEdited={isEdited}
              key={picked.name}
              lockedReason={lockedReason}
              name={picked.name}
              onBack={() => onSelect(picked.name)}
              onSetting={(setting, value) => changeSetting(picked.name, setting, value)}
              pending={pending[picked.name] ?? {}}
              price={price}
              resource={picked.resource}
              settings={picked.settings}
              story={stories[picked.name]}
            />
          ) : (
            <div className="rv-overview">
              <CostOverview
                entries={entries}
                hovered={hovered}
                onSelect={onSelect}
                price={price}
                priceUnavailable={state.composition?.priceUnavailable === true}
                region={state.region}
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
            </div>
          )}
        </aside>
      </div>
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
          note={
            isEdited
              ? `These rewrite ${state.configEdit?.typescript === undefined ? 'stacktape.yml' : 'stacktape.ts'}, so they wait while it has your edits.`
              : undefined
          }
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
