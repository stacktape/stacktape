/** @jsxImportSource @opentui/react */

import type { TuiEvent } from '../../types';
import { formatDuration } from '../../utils';
import { StatusIcon } from './StatusIcon';

type AggregatedChild = {
  instanceId: string;
  status: TuiEvent['status'];
  description: string;
  additionalMessage?: string;
  finalMessage?: string;
  duration?: number;
  startTime: number;
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

    const totalDuration = allDone ? events.reduce((sum, e) => sum + (e.duration || 0), 0) : undefined;

    result.push({
      instanceId,
      status,
      description: running ? running.additionalMessage || running.description : '',
      additionalMessage: running?.additionalMessage,
      finalMessage: lastFinished?.finalMessage,
      duration: totalDuration,
      startTime: events[0]?.startTime || Date.now()
    });
  }
  return result;
};

const EventChildRow = ({ child }: { child: AggregatedChild }) => {
  const durationText = child.duration ? formatDuration(child.duration) : '';
  const detailText = child.status === 'running' ? child.description || '' : child.finalMessage || '';

  return (
    <box flexDirection="row" width="100%">
      <text> </text>
      <StatusIcon status={child.status} />
      <text> </text>
      <text fg="#e5e7eb">
        <b>{child.instanceId}</b>
      </text>
      {detailText ? (
        <text fg="#9ca3af">
          {'  '}
          {detailText}
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

export const EventRow = ({ event }: { event: TuiEvent }) => {
  const durationText = event.duration ? formatDuration(event.duration) : '';
  const detailText = event.status === 'running' ? event.additionalMessage || '' : event.finalMessage || '';

  const hasChildren = event.children.length > 0;
  const aggregated = hasChildren ? aggregateChildren(event.children) : [];
  const isHidden = event.status === 'success' && event.hideChildrenWhenFinished;

  return (
    <box flexDirection="column" width="100%">
      <box flexDirection="row" width="100%">
        <StatusIcon status={event.status} />
        <text> </text>
        <text fg="#e5e7eb">{event.description}</text>
        {detailText && !hasChildren ? (
          <text fg="#9ca3af">
            {'  '}
            {detailText}
          </text>
        ) : null}
        {durationText ? (
          <text fg="#6b7280">
            {'  '}
            {durationText}
          </text>
        ) : null}
      </box>
      {hasChildren && !isHidden ? (
        <box flexDirection="column" width="100%">
          {aggregated.map((child) => (
            <EventChildRow key={child.instanceId} child={child} />
          ))}
        </box>
      ) : null}
    </box>
  );
};

export const EventTree = ({ events }: { events: TuiEvent[] }) => {
  if (events.length === 0) return null;
  return (
    <box flexDirection="column" width="100%">
      {events.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </box>
  );
};
