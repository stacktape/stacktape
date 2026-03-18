import { Show, For } from 'solid-js';
import type { TuiEvent, TuiPhase, CfProgressData } from '../../types';
import {
  parseEstimatePercent,
  getProgressPercent,
  parseResourceState,
  parseProgressCounts,
  parseSummaryCounts,
  parseDetailLists,
  isCleanupPhase,
  formatListSummary
} from '../../deploy-progress-parser';
import { formatDuration } from '../../utils';
import { StatusIcon } from '../../ui/status-icon';
import { useTheme } from '../../context/theme';
import { ProgressBar } from '../../ui/progress-bar';
import { EventTree } from './event-tree';

const CF_EVENT_TYPES: LoggableEventType[] = [
  'UPDATE_STACK',
  'DELETE_STACK',
  'ROLLBACK_STACK',
  'CREATE_RESOURCES_FOR_ARTIFACTS'
];

const HOTSWAP_EVENT_TYPES: LoggableEventType[] = ['HOTSWAP_UPDATE'];

const extractCfProgress = (event: TuiEvent) => {
  const data = event.data as CfProgressData | undefined;
  const msg = event.additionalMessage;

  if (data?.kind === 'cloudformation-progress') {
    const estimatePercent = parseEstimatePercent(msg);
    const percent = getProgressPercent(estimatePercent, event.status);
    return {
      completedCount: data.completedCount,
      totalPlanned: data.totalPlanned ?? 0,
      inProgressResources: data.inProgressResources ?? [],
      waitingResources: data.waitingResources ?? [],
      changeCounts: data.changeCounts,
      percent,
      isCleanup: data.status === 'cleanup'
    };
  }

  if (msg) {
    const estimatePercent = parseEstimatePercent(msg);
    const percent = getProgressPercent(estimatePercent, event.status);
    const { active, waiting } = parseResourceState(msg);
    const { done, total } = parseProgressCounts(msg);
    const summary = parseSummaryCounts(msg);
    return {
      completedCount: done ?? 0,
      totalPlanned: total ?? 0,
      inProgressResources:
        active
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean) ?? [],
      waitingResources:
        waiting
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean) ?? [],
      changeCounts: summary,
      percent,
      isCleanup: isCleanupPhase(msg)
    };
  }

  return {
    completedCount: 0,
    totalPlanned: 0,
    inProgressResources: [] as string[],
    waitingResources: [] as string[],
    changeCounts: { created: 0, updated: 0, deleted: 0 },
    percent: null as number | null,
    isCleanup: false
  };
};

const ResourceList = (props: { label: string; labelColor: string; icon: string; resources: string[] }) => {
  const { theme } = useTheme();
  return (
    <Show when={props.resources.length > 0}>
      <box flexDirection="column">
        <text fg={props.labelColor}>
          {props.icon} {props.label}
        </text>
        <For each={props.resources}>
          {(name) => (
            <text fg={theme.text}>
              {'    '}
              {name}
            </text>
          )}
        </For>
      </box>
    </Show>
  );
};

const PlannedChanges = (props: { counts: { created: number; updated: number; deleted: number } }) => {
  const { theme } = useTheme();
  const parts = () => {
    const p: string[] = [];
    if (props.counts.created > 0) p.push(`+${props.counts.created} create`);
    if (props.counts.updated > 0) p.push(`~${props.counts.updated} update`);
    if (props.counts.deleted > 0) p.push(`-${props.counts.deleted} delete`);
    return p;
  };
  return (
    <Show when={parts().length > 0}>
      <text fg={theme.dim}>
        {'  '}
        {parts().join('  ')}
      </text>
    </Show>
  );
};

const CfDeployView = (props: { event: TuiEvent; isDelete: boolean }) => {
  const { theme } = useTheme();
  const progress = () => extractCfProgress(props.event);
  const isFinished = () => props.event.status === 'success' || props.event.status === 'error';
  const actionLabel = () => (props.isDelete ? 'Deleting via CloudFormation' : 'Deploying via CloudFormation');
  const durationText = () => (props.event.duration ? formatDuration(props.event.duration) : '');
  const msg = () => props.event.additionalMessage;
  const details = () => parseDetailLists(msg());

  return (
    <Show
      when={!isFinished()}
      fallback={
        <CfDeployFinished
          event={props.event}
          actionLabel={actionLabel()}
          durationText={durationText()}
          changeCounts={progress().changeCounts}
          details={details()}
        />
      }
    >
      <Show
        when={!progress().isCleanup}
        fallback={
          <box flexDirection="column" width="100%">
            <text fg={theme.textBright}>
              <b>{actionLabel()}</b>
            </text>
            <box height={1} />
            <box flexDirection="row">
              <ProgressBar percent={100} width={30} />
              <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
                {'  '}100%
              </text>
            </box>
            <box height={1} />
            <text fg={theme.purple}>⟳ Cleaning up old resources...</text>
          </box>
        }
      >
        <CfDeployInProgress event={props.event} actionLabel={actionLabel()} progress={progress()} />
      </Show>
    </Show>
  );
};

const CfDeployFinished = (props: {
  event: TuiEvent;
  actionLabel: string;
  durationText: string;
  changeCounts: { created: number; updated: number; deleted: number };
  details: { created: string | null; updated: string | null; deleted: string | null };
}) => {
  const { theme } = useTheme();
  const icon = () => (props.event.status === 'success' ? '✓' : '✗');
  const iconColor = () => (props.event.status === 'success' ? theme.success : theme.error);
  const hasChanges = () =>
    props.changeCounts.created > 0 || props.changeCounts.updated > 0 || props.changeCounts.deleted > 0;

  return (
    <box flexDirection="column" width="100%">
      <box flexDirection="row">
        <text flexShrink={0} wrapMode="none" fg={iconColor()}>
          {icon()}
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
          {' '}
          {props.actionLabel}
        </text>
        <Show when={props.durationText}>
          <text flexShrink={0} wrapMode="none" fg={theme.dim}>
            {'  '}
            {props.durationText}
          </text>
        </Show>
      </box>
      <Show when={hasChanges()}>
        <box flexDirection="column" paddingLeft={2}>
          <Show when={props.changeCounts.created > 0}>
            <box flexDirection="row">
              <text flexShrink={0} wrapMode="none" fg={theme.success}>
                Created {props.changeCounts.created}
              </text>
              <Show when={props.details.created}>
                <text fg={theme.muted}>
                  {'  '}
                  {formatListSummary(props.details.created, props.changeCounts.created, 4)}
                </text>
              </Show>
            </box>
          </Show>
          <Show when={props.changeCounts.updated > 0}>
            <box flexDirection="row">
              <text flexShrink={0} wrapMode="none" fg={theme.blue}>
                Updated {props.changeCounts.updated}
              </text>
              <Show when={props.details.updated}>
                <text fg={theme.muted}>
                  {'  '}
                  {formatListSummary(props.details.updated, props.changeCounts.updated, 4)}
                </text>
              </Show>
            </box>
          </Show>
          <Show when={props.changeCounts.deleted > 0}>
            <box flexDirection="row">
              <text flexShrink={0} wrapMode="none" fg={theme.error}>
                Deleted {props.changeCounts.deleted}
              </text>
              <Show when={props.details.deleted}>
                <text fg={theme.muted}>
                  {'  '}
                  {formatListSummary(props.details.deleted, props.changeCounts.deleted, 4)}
                </text>
              </Show>
            </box>
          </Show>
        </box>
      </Show>
    </box>
  );
};

const CfDeployInProgress = (props: {
  event: TuiEvent;
  actionLabel: string;
  progress: ReturnType<typeof extractCfProgress>;
}) => {
  const { theme } = useTheme();
  const hasProgress = () => props.progress.percent !== null || props.progress.totalPlanned > 0;

  return (
    <box flexDirection="column" width="100%">
      <box flexDirection="row">
        <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
          <b>{props.actionLabel}</b>
        </text>
        <PlannedChanges counts={props.progress.changeCounts} />
      </box>
      <box height={1} />
      <Show when={hasProgress()} fallback={<text fg={theme.dim}>Waiting for CloudFormation to start...</text>}>
        <box flexDirection="row">
          <ProgressBar percent={props.progress.percent ?? 0} width={30} />
          <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
            {'  '}
            {props.progress.percent ?? 0}%
          </text>
          <Show when={props.progress.totalPlanned > 0}>
            <text flexShrink={0} wrapMode="none" fg={theme.muted}>
              {'  '}({props.progress.completedCount}/{props.progress.totalPlanned} resources)
            </text>
          </Show>
        </box>
      </Show>
      <Show when={hasProgress()}>
        <box height={1} />
      </Show>
      <ResourceList
        label="In progress"
        labelColor={theme.amber}
        icon="▸"
        resources={props.progress.inProgressResources}
      />
      <Show when={props.progress.inProgressResources.length > 0 && props.progress.waitingResources.length > 0}>
        <box height={1} />
      </Show>
      <ResourceList label="Queued" labelColor={theme.dim} icon="◦" resources={props.progress.waitingResources} />
    </box>
  );
};

const HotswapChildRow = (props: {
  child: { instanceId: string; status: TuiEvent['status']; detail: string; duration?: number };
}) => {
  const { theme } = useTheme();
  const durationText = () => (props.child.duration ? formatDuration(props.child.duration) : '');
  return (
    <box flexDirection="row" width="100%">
      <StatusIcon status={props.child.status} />
      <text flexShrink={0} wrapMode="none">
        {' '}
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
        <b>{props.child.instanceId}</b>
      </text>
      <Show when={props.child.detail}>
        <text fg={theme.muted}>
          {'  '}
          {props.child.detail}
        </text>
      </Show>
      <Show when={durationText()}>
        <text flexShrink={0} wrapMode="none" fg={theme.dim}>
          {'  '}
          {durationText()}
        </text>
      </Show>
    </box>
  );
};

const HotswapView = (props: { event: TuiEvent }) => {
  const { theme } = useTheme();
  const isFinished = () => props.event.status === 'success' || props.event.status === 'error';
  const durationText = () => (props.event.duration ? formatDuration(props.event.duration) : '');

  const workloads = () => {
    const grouped = new Map<string, TuiEvent[]>();
    for (const child of props.event.children) {
      const key = child.instanceId || child.id;
      const group = grouped.get(key) || [];
      group.push(child);
      grouped.set(key, group);
    }

    return Array.from(grouped.entries()).map(([instanceId, events]) => {
      const running = events.find((e) => e.status === 'running');
      const anyError = events.find((e) => e.status === 'error');
      const allDone = events.every((e) => e.status === 'success' || e.status === 'error');
      const lastFinished = [...events].reverse().find((e) => e.status === 'success' || e.status === 'error');

      let status: TuiEvent['status'] = 'pending';
      if (anyError) status = 'error';
      else if (running) status = 'running';
      else if (allDone && events.length > 0) status = lastFinished?.status || 'success';

      const detail =
        status === 'running'
          ? running?.additionalMessage || running?.description || ''
          : lastFinished?.finalMessage || '';
      const totalDuration = allDone ? events.reduce((sum, e) => sum + (e.duration || 0), 0) : undefined;

      return { instanceId, status, detail, duration: totalDuration };
    });
  };

  const doneCount = () => workloads().filter((w) => w.status === 'success' || w.status === 'error').length;
  const totalCount = () => workloads().length;

  const icon = () => (props.event.status === 'success' ? '✓' : '✗');
  const iconColor = () => (props.event.status === 'success' ? theme.success : theme.error);

  return (
    <Show
      when={!isFinished()}
      fallback={
        <Show
          when={totalCount() > 0}
          fallback={
            <box flexDirection="column" width="100%">
              <box flexDirection="row">
                <text flexShrink={0} wrapMode="none" fg={iconColor()}>
                  {icon()}
                </text>
                <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
                  {' '}
                  Hot-swap update
                </text>
                <Show when={durationText()}>
                  <text flexShrink={0} wrapMode="none" fg={theme.dim}>
                    {'  '}
                    {durationText()}
                  </text>
                </Show>
              </box>
              <Show when={props.event.finalMessage}>
                <text fg={theme.muted}>
                  {'  '}
                  {props.event.finalMessage}
                </text>
              </Show>
            </box>
          }
        >
          <box flexDirection="column" width="100%">
            <box flexDirection="row">
              <text flexShrink={0} wrapMode="none" fg={iconColor()}>
                {icon()}
              </text>
              <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
                {' '}
                Hot-swap update
              </text>
              <text flexShrink={0} wrapMode="none" fg={theme.muted}>
                {'  '}
                {doneCount()} resource{doneCount() !== 1 ? 's' : ''} updated
              </text>
              <Show when={durationText()}>
                <text flexShrink={0} wrapMode="none" fg={theme.dim}>
                  {'  '}
                  {durationText()}
                </text>
              </Show>
            </box>
            <box flexDirection="column" paddingLeft={2}>
              <For each={workloads()}>{(w) => <HotswapChildRow child={w} />}</For>
            </box>
          </box>
        </Show>
      }
    >
      <box flexDirection="column" width="100%">
        <box flexDirection="row">
          <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
            <b>Hot-swapping resources</b>
          </text>
          <Show when={totalCount() > 0} fallback={<text fg={theme.dim}>{'  '}Determining resources to update...</text>}>
            <text flexShrink={0} wrapMode="none" fg={theme.muted}>
              {'  '}
              {doneCount()}/{totalCount()}
            </text>
          </Show>
        </box>
        <Show when={totalCount() > 0}>
          <box height={1} />
        </Show>
        <Show when={workloads().length > 0}>
          <box flexDirection="column" paddingLeft={1}>
            <For each={workloads()}>{(w) => <HotswapChildRow child={w} />}</For>
          </box>
        </Show>
      </box>
    </Show>
  );
};

export const DeployPhaseDetail = (props: { phase: TuiPhase }) => {
  const { theme } = useTheme();
  const cfEvent = () => props.phase.events.find((e) => CF_EVENT_TYPES.includes(e.eventType));
  const hotswapEvent = () => props.phase.events.find((e) => HOTSWAP_EVENT_TYPES.includes(e.eventType));
  const isDelete = () => props.phase.events.some((e) => e.eventType === 'DELETE_STACK');
  const otherEvents = () =>
    props.phase.events.filter(
      (e) => !CF_EVENT_TYPES.includes(e.eventType) && !HOTSWAP_EVENT_TYPES.includes(e.eventType)
    );
  const eventsBeforeDeploy = () => otherEvents().filter((e) => cfEvent() && e.startTime < cfEvent()!.startTime);
  const eventsAfterDeploy = () => otherEvents().filter((e) => !cfEvent() || e.startTime >= cfEvent()!.startTime);

  return (
    <>
      <box height={1}>
        <text fg={theme.textBright}>
          <b>{props.phase.name}</b>
        </text>
      </box>
      <scrollbox flexGrow={1} stickyScroll={true} focused={true}>
        <Show when={eventsBeforeDeploy().length > 0}>
          <box flexDirection="column" paddingBottom={1}>
            <EventTree events={eventsBeforeDeploy()} />
          </box>
        </Show>
        <Show
          when={hotswapEvent()}
          fallback={<Show when={cfEvent()}>{(ev) => <CfDeployView event={ev()} isDelete={isDelete()} />}</Show>}
        >
          {(ev) => <HotswapView event={ev()} />}
        </Show>
        <Show when={eventsAfterDeploy().length > 0 && !cfEvent()}>
          <EventTree events={eventsAfterDeploy()} />
        </Show>
      </scrollbox>
    </>
  );
};
