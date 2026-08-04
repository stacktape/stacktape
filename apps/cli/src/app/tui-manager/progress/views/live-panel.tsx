import type { LoggableEventType } from '@application-services/event-manager/types';
import { Show, Index } from 'solid-js';
import type { CfProgressData, CfResourceInProgress, TuiEvent } from '../types';
import {
  parseEstimatePercent,
  parseResourceState,
  parseProgressCounts,
  parseSummaryCounts,
  isCleanupPhase,
  resolveCfPercent
} from '../cf-progress';
import { Spinner } from '../../ui/spinner';
import { glyphs } from '../../ui/glyphs';
import { useTheme } from '../../ui/theme';
import { createTuiSignal } from './signals';

export const CF_EVENT_TYPES: LoggableEventType[] = [
  'UPDATE_STACK',
  'DELETE_STACK',
  'ROLLBACK_STACK',
  'CREATE_RESOURCES_FOR_ARTIFACTS'
];

export const HOTSWAP_EVENT_TYPES: LoggableEventType[] = ['HOTSWAP_UPDATE'];

type CfSnapshot = {
  action: string;
  completedCount: number;
  totalPlanned: number;
  inProgress: CfResourceInProgress[];
  waitingCount: number;
  changeCounts: { created: number; updated: number; deleted: number };
  percent: number | null;
  isCleanup: boolean;
  hasData: boolean;
};

const extractCfSnapshot = (event: TuiEvent, isRollingBack: boolean): CfSnapshot => {
  const data = event.data as CfProgressData | undefined;
  const msg = event.additionalMessage;
  const baseAction =
    event.eventType === 'DELETE_STACK' ? 'delete' : event.eventType === 'ROLLBACK_STACK' ? 'rollback' : 'update';
  const action = isRollingBack ? 'rollback' : baseAction;

  if (data?.kind === 'cloudformation-progress') {
    const totalPlanned = data.totalPlanned ?? 0;
    return {
      action: isRollingBack ? 'rollback' : data.stackAction || baseAction,
      completedCount: data.completedCount,
      totalPlanned,
      inProgress:
        data.inProgressDetails ?? (data.inProgressResources ?? []).map((name) => ({ name, action: 'UPDATE' as const })),
      waitingCount: data.waitingResources?.length ?? 0,
      changeCounts: data.changeCounts,
      percent: resolveCfPercent({
        completedCount: data.completedCount,
        totalPlanned,
        estimatePercent: parseEstimatePercent(msg),
        status: event.status
      }),
      isCleanup: data.status === 'cleanup',
      hasData: true
    };
  }

  if (msg) {
    const { active, waiting } = parseResourceState(msg);
    const { done, total } = parseProgressCounts(msg);
    const activeNames =
      active
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [];
    const waitingNames =
      waiting
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [];
    return {
      action,
      completedCount: done ?? 0,
      totalPlanned: total ?? 0,
      inProgress: activeNames.map((name) => ({ name, action: 'UPDATE' as const })),
      waitingCount: waitingNames.length,
      changeCounts: parseSummaryCounts(msg),
      percent: resolveCfPercent({
        completedCount: done ?? 0,
        totalPlanned: total ?? 0,
        estimatePercent: parseEstimatePercent(msg),
        status: event.status
      }),
      isCleanup: isCleanupPhase(msg),
      hasData: true
    };
  }

  return {
    action,
    completedCount: 0,
    totalPlanned: 0,
    inProgress: [],
    waitingCount: 0,
    changeCounts: { created: 0, updated: 0, deleted: 0 },
    percent: null,
    isCleanup: false,
    hasData: false
  };
};

const BAR_WIDTH = 28;

const ProgressBarRow = (props: { percent: number; suffixPrimary: string; suffixSecondary?: string }) => {
  const { theme } = useTheme();
  const filled = () => Math.round((Math.max(0, Math.min(100, props.percent)) / 100) * BAR_WIDTH);
  return (
    <box height={1} flexShrink={0} flexDirection="row" overflow="hidden">
      <text flexShrink={0} wrapMode="none" fg={theme.running}>
        {glyphs.barFilled.repeat(filled())}
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.border}>
        {glyphs.barEmpty.repeat(BAR_WIDTH - filled())}
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
        {'  '}
        {props.suffixPrimary}
      </text>
      <Show when={props.suffixSecondary}>
        <text flexShrink={1} wrapMode="none" fg={theme.muted}>
          {' '}
          {glyphs.separator} {props.suffixSecondary}
        </text>
      </Show>
    </box>
  );
};

const CF_ACTION_LABELS: Record<string, string> = {
  create: 'CloudFormation create',
  update: 'CloudFormation update',
  delete: 'CloudFormation delete',
  rollback: 'CloudFormation rollback'
};

/**
 * The five content rows of the CloudFormation live panel (+1 overflow row):
 *   1 operation + change set     4 more running resources
 *   2 resource-operation progress  (stable, oldest-first slots)
 *   3 longest-running resource   6 hidden-concurrency aggregate
 */
export const CfPanel = (props: { event: TuiEvent; rows: number }) => {
  const { theme } = useTheme();
  const cancelDeployment = createTuiSignal((s) => s.cancelDeployment);
  const snapshot = () => extractCfSnapshot(props.event, !!cancelDeployment()?.isCancelling);

  // Stable slots: a resource keeps its row until it completes; new resources
  // fill from the back. Oldest-running first so a stuck resource stays visible.
  let slotOrder: string[] = [];
  const slotResources = () => {
    const active = [...snapshot().inProgress].sort((a, b) => (a.since ?? 0) - (b.since ?? 0));
    const activeNames = new Set(active.map((r) => r.name));
    const byName = new Map(active.map((r) => [r.name, r]));
    slotOrder = [
      ...slotOrder.filter((name) => activeNames.has(name)),
      ...active.map((r) => r.name).filter((name) => !slotOrder.includes(name))
    ];
    return slotOrder.map((name) => byName.get(name)!).filter(Boolean);
  };

  const slotCount = () => Math.max(1, props.rows - 3);
  const visibleSlots = () => slotResources().slice(0, slotCount());

  const changesText = () => {
    const { created, updated, deleted } = snapshot().changeCounts;
    if (created + updated + deleted === 0) return '';
    const parts: string[] = [];
    if (created > 0) parts.push(`${created} CREATE`);
    if (updated > 0) parts.push(`${updated} UPDATE`);
    if (deleted > 0) parts.push(`${deleted} DELETE`);
    return parts.join(` ${glyphs.separator} `);
  };

  return (
    <box flexDirection="column" paddingLeft={2} paddingRight={1} overflow="hidden">
      <box height={1} flexShrink={0} flexDirection="row" overflow="hidden">
        <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
          <b>{CF_ACTION_LABELS[snapshot().action] ?? 'CloudFormation'}</b>
        </text>
        <box flexGrow={1} />
        <text flexShrink={0} wrapMode="none" fg={theme.muted}>
          <Show when={snapshot().isCleanup} fallback={changesText()}>
            resource operations complete
          </Show>
        </text>
      </box>
      <Show
        when={snapshot().isCleanup}
        fallback={
          <>
            <Show
              when={snapshot().percent !== null && snapshot().totalPlanned > 0}
              fallback={
                <box height={1} flexShrink={0} flexDirection="row" overflow="hidden">
                  <Show
                    when={snapshot().hasData}
                    fallback={
                      <>
                        <Spinner />
                        <text wrapMode="none" fg={theme.text}>
                          {' '}
                          Starting {snapshot().action === 'rollback' ? 'rollback' : `stack ${snapshot().action}`}
                        </text>
                      </>
                    }
                  >
                    <text wrapMode="none" fg={theme.dim}>
                      {`${snapshot().completedCount} complete`} {glyphs.separator} total calculating
                    </text>
                  </Show>
                </box>
              }
            >
              <ProgressBarRow
                percent={snapshot().percent ?? 0}
                suffixPrimary={`${snapshot().percent}%`.padStart(4)}
                suffixSecondary={`${String(snapshot().completedCount).padStart(2)}/${snapshot().totalPlanned} complete`}
              />
            </Show>
            <Index each={visibleSlots()}>
              {(resource) => (
                <box height={1} flexShrink={0} flexDirection="row" overflow="hidden">
                  <Spinner />
                  <text flexShrink={0} wrapMode="none" fg={theme.muted}>
                    {' '}
                    {resource().action.padEnd(7)}
                  </text>
                  <text flexShrink={1} wrapMode="none" fg={theme.text}>
                    {' '}
                    {resource().name}
                  </text>
                  <box flexGrow={1} />
                  <Show when={resource().resourceType}>
                    <text flexShrink={0} wrapMode="none" fg={theme.dim}>
                      {resource().resourceType}
                    </text>
                  </Show>
                </box>
              )}
            </Index>
            <Index each={Array.from({ length: Math.max(0, slotCount() - visibleSlots().length) })}>
              {() => <box height={1} flexShrink={0} />}
            </Index>
          </>
        }
      >
        <>
          <ProgressBarRow
            percent={100}
            suffixPrimary={'100%'}
            suffixSecondary={
              snapshot().totalPlanned > 0
                ? `${String(snapshot().totalPlanned).padStart(2)}/${snapshot().totalPlanned} complete`
                : undefined
            }
          />
          <box height={1} flexShrink={0} flexDirection="row" overflow="hidden">
            <Spinner />
            <text wrapMode="none" fg={theme.text}>
              {' '}
              Finalizing stack {snapshot().action}
            </text>
          </box>
          <box height={1} flexShrink={0} overflow="hidden">
            <text wrapMode="none" fg={theme.dim}>
              {'  '}cleaning up replaced resources
            </text>
          </box>
        </>
      </Show>
    </box>
  );
};

type LiveRow =
  | { kind: 'event'; event: TuiEvent }
  | { kind: 'child'; child: AggregatedChild; isLast: boolean }
  | { kind: 'overflow'; count: number };

type AggregatedChild = {
  instanceId: string;
  status: TuiEvent['status'];
  label: string;
  detail: string;
};

const aggregateChildren = (children: TuiEvent[]): AggregatedChild[] => {
  const grouped = new Map<string, TuiEvent[]>();
  for (const child of children) {
    const key = child.instanceId || child.id;
    const group = grouped.get(key) || [];
    group.push(child);
    grouped.set(key, group);
  }

  const result: AggregatedChild[] = [];
  for (const [instanceId, events] of grouped) {
    const running = events.find((e) => e.status === 'running');
    const lastFinished = [...events].reverse().find((e) => e.status === 'success' || e.status === 'error');
    const anyError = events.find((e) => e.status === 'error');
    const allDone = events.every((e) => e.status === 'success' || e.status === 'error');

    let status: TuiEvent['status'] = 'pending';
    if (anyError) status = 'error';
    else if (running) status = 'running';
    else if (allDone && events.length > 0) status = lastFinished?.status || 'success';

    // The name is the first column; the outcome/detail is the second. When a
    // finished message repeats the name ("api-lambda packaged (4.1 MB)"), the
    // repeated prefix is stripped so columns align without duplication.
    const finishedDetail = lastFinished?.finalMessage
      ? lastFinished.finalMessage.startsWith(`${instanceId} `)
        ? lastFinished.finalMessage.slice(instanceId.length + 1)
        : lastFinished.finalMessage
      : '';
    result.push({
      instanceId,
      status,
      label: instanceId,
      detail: running ? running.additionalMessage || '' : finishedDetail
    });
  }
  return result;
};

const RowIcon = (props: { status: TuiEvent['status'] }) => {
  const { theme } = useTheme();
  return (
    <Show
      when={props.status === 'running'}
      fallback={
        <text flexShrink={0} wrapMode="none" fg={props.status === 'error' ? theme.error : theme.success}>
          {props.status === 'error' ? glyphs.error : glyphs.success}
        </text>
      }
    >
      <Spinner />
    </Show>
  );
};

/** Live rows for ordinary (non-CF, non-hotswap) events, capped to the reserved height. */
const GenericRows = (props: { events: TuiEvent[]; rows: number }) => {
  const { theme } = useTheme();

  const childLabelWidth = () => {
    const labels = props.events.flatMap((event) => aggregateChildren(event.children).map((child) => child.label));
    return Math.min(24, Math.max(0, ...labels.map((label) => label.length)));
  };

  const allRows = (): LiveRow[] => {
    const rows: LiveRow[] = [];
    for (const event of [...props.events].sort((a, b) => a.startTime - b.startTime)) {
      rows.push({ kind: 'event', event });
      const children = aggregateChildren(event.children);
      children.forEach((child, index) => {
        rows.push({ kind: 'child', child, isLast: index === children.length - 1 });
      });
    }
    return rows;
  };

  const visible = () => {
    const rows = allRows();
    if (rows.length <= props.rows) return rows;
    const shown = rows.slice(0, props.rows - 1);
    return [...shown, { kind: 'overflow', count: rows.length - shown.length } as LiveRow];
  };

  return (
    <box flexDirection="column" paddingLeft={2} paddingRight={1} overflow="hidden">
      <Index each={visible()}>
        {(row) => (
          <box height={1} flexShrink={0} flexDirection="row" overflow="hidden">
            <Show when={row().kind === 'event'}>
              <RowIcon status={(row() as Extract<LiveRow, { kind: 'event' }>).event.status} />
              <text flexShrink={1} wrapMode="none" fg={theme.text}>
                {' '}
                {(row() as Extract<LiveRow, { kind: 'event' }>).event.description}
              </text>
              <Show when={(row() as Extract<LiveRow, { kind: 'event' }>).event.additionalMessage}>
                <text flexShrink={1} wrapMode="none" fg={theme.dim}>
                  {'  '}
                  {(row() as Extract<LiveRow, { kind: 'event' }>).event.additionalMessage}
                </text>
              </Show>
            </Show>
            <Show when={row().kind === 'child'}>
              <text flexShrink={0} wrapMode="none" fg={theme.border}>
                {'  '}
                {(row() as Extract<LiveRow, { kind: 'child' }>).isLast ? glyphs.treeEnd : glyphs.treeBranch}
              </text>
              <text flexShrink={0} wrapMode="none">
                {' '}
              </text>
              <RowIcon status={(row() as Extract<LiveRow, { kind: 'child' }>).child.status} />
              <text flexShrink={0} wrapMode="none" fg={theme.text}>
                {' '}
                {(row() as Extract<LiveRow, { kind: 'child' }>).child.label.padEnd(childLabelWidth())}
              </text>
              <Show when={(row() as Extract<LiveRow, { kind: 'child' }>).child.detail}>
                <text flexShrink={1} wrapMode="none" fg={theme.dim}>
                  {'  '}
                  {(row() as Extract<LiveRow, { kind: 'child' }>).child.detail}
                </text>
              </Show>
            </Show>
            <Show when={row().kind === 'overflow'}>
              <text wrapMode="none" fg={theme.dim}>
                {'  '}+{(row() as Extract<LiveRow, { kind: 'overflow' }>).count} more
              </text>
            </Show>
          </box>
        )}
      </Index>
    </box>
  );
};

export const HotswapPanel = (props: { event: TuiEvent; rows: number }) => {
  const { theme } = useTheme();
  const children = () => aggregateChildren(props.event.children);
  const doneCount = () => children().filter((c) => c.status === 'success' || c.status === 'error').length;

  return (
    <box flexDirection="column" paddingLeft={2} paddingRight={1} overflow="hidden">
      <box height={1} flexShrink={0} flexDirection="row" overflow="hidden">
        <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
          <b>Hot-swap update</b>
        </text>
        <box flexGrow={1} />
        <text flexShrink={0} wrapMode="none" fg={theme.muted}>
          <Show when={children().length > 0} fallback={'determining resources'}>
            {doneCount()}/{children().length} resources
          </Show>
        </text>
      </box>
      <Index each={children().slice(0, props.rows - 1)}>
        {(child) => (
          <box height={1} flexShrink={0} flexDirection="row" overflow="hidden">
            <RowIcon status={child().status} />
            <text flexShrink={1} wrapMode="none" fg={theme.text}>
              {' '}
              {child().label}
            </text>
            <Show when={child().detail}>
              <text flexShrink={1} wrapMode="none" fg={theme.dim}>
                {'  '}
                {child().detail}
              </text>
            </Show>
          </box>
        )}
      </Index>
    </box>
  );
};

/**
 * The reserved live area of the footer. Exactly `rows` rows in every state;
 * unused rows render blank so the geometry never changes between ticks.
 */
export const LivePanel = (props: { rows: number }) => {
  const { theme } = useTheme();
  const phases = createTuiSignal((s) => s.phases);
  const currentPhaseId = createTuiSignal((s) => s.currentPhase);
  const isFinalizing = createTuiSignal((s) => s.isFinalizing);

  const activePhase = () => phases().find((p) => p.id === currentPhaseId());
  const runningEvents = () => activePhase()?.events.filter((e) => e.status === 'running') ?? [];
  const cfEvent = () => runningEvents().find((e) => CF_EVENT_TYPES.includes(e.eventType));
  const hotswapEvent = () => runningEvents().find((e) => HOTSWAP_EVENT_TYPES.includes(e.eventType));
  const plainEvents = () =>
    runningEvents().filter((e) => !CF_EVENT_TYPES.includes(e.eventType) && !HOTSWAP_EVENT_TYPES.includes(e.eventType));

  const idleText = () => {
    if (isFinalizing()) return 'finalizing';
    if (!activePhase()) return 'starting';
    return 'working';
  };

  return (
    <box height={props.rows} flexShrink={0} flexDirection="column" overflow="hidden">
      <Show when={hotswapEvent()}>{(event) => <HotswapPanel event={event()} rows={props.rows} />}</Show>
      <Show when={!hotswapEvent() && cfEvent()}>{(event) => <CfPanel event={event()} rows={props.rows} />}</Show>
      <Show when={!hotswapEvent() && !cfEvent() && plainEvents().length > 0}>
        <GenericRows events={plainEvents()} rows={props.rows} />
      </Show>
      <Show when={!hotswapEvent() && !cfEvent() && plainEvents().length === 0}>
        <box height={1} flexShrink={0} paddingLeft={2}>
          <text wrapMode="none" fg={theme.dim}>
            {idleText()}
          </text>
        </box>
      </Show>
    </box>
  );
};
