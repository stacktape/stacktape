/** @jsxImportSource @opentui/react */

import { useRef } from 'react';
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
import { StatusIcon } from './StatusIcon';
import { EventTree } from './EventTree';

const CF_EVENT_TYPES: LoggableEventType[] = [
  'UPDATE_STACK',
  'DELETE_STACK',
  'ROLLBACK_STACK',
  'CREATE_RESOURCES_FOR_ARTIFACTS'
];

const HOTSWAP_EVENT_TYPES: LoggableEventType[] = ['HOTSWAP_UPDATE'];

// Extract CF progress from event.data (structured) or parse from additionalMessage (fallback).
// Uses a sticky ref so the last valid data is preserved across renders where
// additionalMessage may temporarily be undefined/empty.
const useCfProgress = (event: TuiEvent) => {
  const lastGood = useRef<{
    completedCount: number;
    totalPlanned: number;
    inProgressResources: string[];
    waitingResources: string[];
    changeCounts: { created: number; updated: number; deleted: number };
    percent: number | null;
    isCleanup: boolean;
  } | null>(null);

  const data = event.data as CfProgressData | undefined;
  const msg = event.additionalMessage;

  // Structured data available — preferred path
  if (data?.kind === 'cloudformation-progress') {
    const estimatePercent = parseEstimatePercent(msg);
    const percent = getProgressPercent(estimatePercent, event.status);
    const result = {
      completedCount: data.completedCount,
      totalPlanned: data.totalPlanned ?? 0,
      inProgressResources: data.inProgressResources ?? [],
      waitingResources: data.waitingResources ?? [],
      changeCounts: data.changeCounts,
      percent,
      isCleanup: data.status === 'cleanup'
    };
    lastGood.current = result;
    return result;
  }

  // Fallback: parse from additionalMessage string
  if (msg) {
    const estimatePercent = parseEstimatePercent(msg);
    const percent = getProgressPercent(estimatePercent, event.status);
    const { active, waiting } = parseResourceState(msg);
    const { done, total } = parseProgressCounts(msg);
    const summary = parseSummaryCounts(msg);
    const result = {
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
    lastGood.current = result;
    return result;
  }

  // No data yet — return last known good state or defaults
  return (
    lastGood.current ?? {
      completedCount: 0,
      totalPlanned: 0,
      inProgressResources: [],
      waitingResources: [],
      changeCounts: { created: 0, updated: 0, deleted: 0 },
      percent: null,
      isCleanup: false
    }
  );
};

const ProgressBar = ({ percent, width = 30 }: { percent: number; width?: number }) => {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return (
    <text>
      <span fg="#22c55e">{bar.substring(0, filled)}</span>
      <span fg="#374151">{bar.substring(filled)}</span>
    </text>
  );
};

const ResourceList = ({
  label,
  labelColor,
  icon,
  resources
}: {
  label: string;
  labelColor: string;
  icon: string;
  resources: string[];
}) => {
  if (resources.length === 0) return null;
  return (
    <box flexDirection="column">
      <text fg={labelColor}>
        {icon} {label}
      </text>
      {resources.map((name) => (
        <text key={name} fg="#d1d5db">
          {'    '}
          {name}
        </text>
      ))}
    </box>
  );
};

const PlannedChanges = ({ counts }: { counts: { created: number; updated: number; deleted: number } }) => {
  const parts: string[] = [];
  if (counts.created > 0) parts.push(`+${counts.created} create`);
  if (counts.updated > 0) parts.push(`~${counts.updated} update`);
  if (counts.deleted > 0) parts.push(`-${counts.deleted} delete`);
  if (parts.length === 0) return null;
  return (
    <text fg="#6b7280">
      {'  '}
      {parts.join('  ')}
    </text>
  );
};

const CfDeployView = ({ event, isDelete }: { event: TuiEvent; phase: TuiPhase; isDelete: boolean }) => {
  const progress = useCfProgress(event);
  const isFinished = event.status === 'success' || event.status === 'error';
  const actionLabel = isDelete ? 'Deleting via CloudFormation' : 'Deploying via CloudFormation';
  const durationText = event.duration ? formatDuration(event.duration) : '';

  // For finished state, also parse detail lists from additionalMessage (string-only data)
  const msg = event.additionalMessage;
  const details = parseDetailLists(msg);

  // Finished state — show final summary
  if (isFinished) {
    const icon = event.status === 'success' ? '✓' : '✗';
    const iconColor = event.status === 'success' ? '#22c55e' : '#ef4444';
    const { changeCounts } = progress;
    return (
      <box flexDirection="column" width="100%">
        <box flexDirection="row">
          <text fg={iconColor}>{icon}</text>
          <text fg="#e5e7eb"> {actionLabel}</text>
          {durationText ? (
            <text fg="#6b7280">
              {'  '}
              {durationText}
            </text>
          ) : null}
        </box>
        {changeCounts.created > 0 || changeCounts.updated > 0 || changeCounts.deleted > 0 ? (
          <box flexDirection="column" paddingLeft={2}>
            {changeCounts.created > 0 ? (
              <text fg="#22c55e">
                Created {changeCounts.created}
                {details.created ? (
                  <span fg="#9ca3af">
                    {'  '}
                    {formatListSummary(details.created, changeCounts.created, 4)}
                  </span>
                ) : null}
              </text>
            ) : null}
            {changeCounts.updated > 0 ? (
              <text fg="#3b82f6">
                Updated {changeCounts.updated}
                {details.updated ? (
                  <span fg="#9ca3af">
                    {'  '}
                    {formatListSummary(details.updated, changeCounts.updated, 4)}
                  </span>
                ) : null}
              </text>
            ) : null}
            {changeCounts.deleted > 0 ? (
              <text fg="#ef4444">
                Deleted {changeCounts.deleted}
                {details.deleted ? (
                  <span fg="#9ca3af">
                    {'  '}
                    {formatListSummary(details.deleted, changeCounts.deleted, 4)}
                  </span>
                ) : null}
              </text>
            ) : null}
          </box>
        ) : null}
      </box>
    );
  }

  // Cleanup phase — main deployment done, cleaning up old resources
  if (progress.isCleanup) {
    return (
      <box flexDirection="column" width="100%">
        <text fg="#e5e7eb">
          <b>{actionLabel}</b>
        </text>
        <box height={1} />
        <box flexDirection="row">
          <ProgressBar percent={100} width={30} />
          <text fg="#e5e7eb">{'  '}100%</text>
        </box>
        <box height={1} />
        <text fg="#a78bfa">⟳ Cleaning up old resources...</text>
      </box>
    );
  }

  // In-progress state
  const { completedCount, totalPlanned, inProgressResources, waitingResources, changeCounts, percent } = progress;
  const hasProgress = percent !== null || totalPlanned > 0;

  return (
    <box flexDirection="column" width="100%">
      <box flexDirection="row">
        <text fg="#e5e7eb">
          <b>{actionLabel}</b>
        </text>
        <PlannedChanges counts={changeCounts} />
      </box>
      <box height={1} />
      {hasProgress ? (
        <box flexDirection="row">
          <ProgressBar percent={percent ?? 0} width={30} />
          <text fg="#e5e7eb">
            {'  '}
            {percent ?? 0}%
          </text>
          {totalPlanned > 0 ? (
            <text fg="#9ca3af">
              {'  '}({completedCount}/{totalPlanned} resources)
            </text>
          ) : null}
        </box>
      ) : (
        <text fg="#6b7280">Waiting for CloudFormation to start...</text>
      )}
      {hasProgress ? <box height={1} /> : null}
      <ResourceList label="In progress" labelColor="#f59e0b" icon="▸" resources={inProgressResources} />
      {inProgressResources.length > 0 && waitingResources.length > 0 ? <box height={1} /> : null}
      <ResourceList label="Queued" labelColor="#6b7280" icon="◦" resources={waitingResources} />
    </box>
  );
};

const HotswapChildRow = ({
  child
}: {
  child: { instanceId: string; status: TuiEvent['status']; detail: string; duration?: number };
}) => {
  const durationText = child.duration ? formatDuration(child.duration) : '';
  return (
    <box flexDirection="row" width="100%">
      <StatusIcon status={child.status} />
      <text> </text>
      <text fg="#e5e7eb">
        <b>{child.instanceId}</b>
      </text>
      {child.detail ? (
        <text fg="#9ca3af">
          {'  '}
          {child.detail}
        </text>
      ) : null}
      {durationText ? (
        <text fg="#6b7280">
          {'  '}
          {durationText}
        </text>
      ) : null}
    </box>
  );
};

const HotswapView = ({ event }: { event: TuiEvent }) => {
  const isFinished = event.status === 'success' || event.status === 'error';
  const durationText = event.duration ? formatDuration(event.duration) : '';

  // Aggregate children by instanceId (workload name)
  const grouped = new Map<string, TuiEvent[]>();
  for (const child of event.children) {
    const key = child.instanceId || child.id;
    const group = grouped.get(key) || [];
    group.push(child);
    grouped.set(key, group);
  }

  const workloads = Array.from(grouped.entries()).map(([instanceId, events]) => {
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

  const doneCount = workloads.filter((w) => w.status === 'success' || w.status === 'error').length;
  const totalCount = workloads.length;

  // No-changes case
  if (isFinished && totalCount === 0) {
    const icon = event.status === 'success' ? '✓' : '✗';
    const iconColor = event.status === 'success' ? '#22c55e' : '#ef4444';
    return (
      <box flexDirection="column" width="100%">
        <box flexDirection="row">
          <text fg={iconColor}>{icon}</text>
          <text fg="#e5e7eb"> Hot-swap update</text>
          {durationText ? (
            <text fg="#6b7280">
              {'  '}
              {durationText}
            </text>
          ) : null}
        </box>
        {event.finalMessage ? (
          <text fg="#9ca3af">
            {'  '}
            {event.finalMessage}
          </text>
        ) : null}
      </box>
    );
  }

  // Finished with resources
  if (isFinished) {
    const icon = event.status === 'success' ? '✓' : '✗';
    const iconColor = event.status === 'success' ? '#22c55e' : '#ef4444';
    return (
      <box flexDirection="column" width="100%">
        <box flexDirection="row">
          <text fg={iconColor}>{icon}</text>
          <text fg="#e5e7eb"> Hot-swap update</text>
          <text fg="#9ca3af">
            {'  '}
            {doneCount} resource{doneCount !== 1 ? 's' : ''} updated
          </text>
          {durationText ? (
            <text fg="#6b7280">
              {'  '}
              {durationText}
            </text>
          ) : null}
        </box>
        <box flexDirection="column" paddingLeft={2}>
          {workloads.map((w) => (
            <HotswapChildRow key={w.instanceId} child={w} />
          ))}
        </box>
      </box>
    );
  }

  // In-progress
  return (
    <box flexDirection="column" width="100%">
      <box flexDirection="row">
        <text fg="#e5e7eb">
          <b>Hot-swapping resources</b>
        </text>
        {totalCount > 0 ? (
          <text fg="#9ca3af">
            {'  '}
            {doneCount}/{totalCount}
          </text>
        ) : (
          <text fg="#6b7280">{'  '}Determining resources to update...</text>
        )}
      </box>
      {totalCount > 0 ? <box height={1} /> : null}
      {workloads.length > 0 ? (
        <box flexDirection="column" paddingLeft={1}>
          {workloads.map((w) => (
            <HotswapChildRow key={w.instanceId} child={w} />
          ))}
        </box>
      ) : null}
    </box>
  );
};

export const DeployPhaseDetail = ({ phase }: { phase: TuiPhase }) => {
  const cfEvent = phase.events.find((e) => CF_EVENT_TYPES.includes(e.eventType));
  const hotswapEvent = phase.events.find((e) => HOTSWAP_EVENT_TYPES.includes(e.eventType));
  const isDelete = phase.events.some((e) => e.eventType === 'DELETE_STACK');
  const otherEvents = phase.events.filter(
    (e) => !CF_EVENT_TYPES.includes(e.eventType) && !HOTSWAP_EVENT_TYPES.includes(e.eventType)
  );
  const eventsBeforeDeploy = otherEvents.filter((e) => cfEvent && e.startTime < cfEvent.startTime);
  const eventsAfterDeploy = otherEvents.filter((e) => !cfEvent || e.startTime >= cfEvent.startTime);

  return (
    <>
      <box height={1}>
        <text fg="#e5e7eb">
          <b>{phase.name}</b>
        </text>
      </box>
      <scrollbox flexGrow={1} stickyScroll={true} focused={true}>
        {eventsBeforeDeploy.length > 0 ? (
          <box flexDirection="column" paddingBottom={1}>
            <EventTree events={eventsBeforeDeploy} />
          </box>
        ) : null}
        {hotswapEvent ? (
          <HotswapView event={hotswapEvent} />
        ) : cfEvent ? (
          <CfDeployView event={cfEvent} phase={phase} isDelete={isDelete} />
        ) : null}
        {eventsAfterDeploy.length > 0 && !cfEvent ? <EventTree events={eventsAfterDeploy} /> : null}
      </scrollbox>
    </>
  );
};
