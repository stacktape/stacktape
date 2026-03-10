import { Show, For } from 'solid-js';
import type { TuiEvent } from '../../types';
import { formatDuration } from '../../utils';
import { StatusIcon } from '../shared/status-icon';
import { COLORS } from '../shared/colors';

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

const EventChildRow = (props: { child: AggregatedChild }) => {
  const durationText = () => (props.child.duration ? formatDuration(props.child.duration) : '');
  const detailText = () =>
    props.child.status === 'running' ? props.child.description || '' : props.child.finalMessage || '';

  return (
    <box flexDirection="row" width="100%">
      <text flexShrink={0} wrapMode="none">
        {' '}
      </text>
      <StatusIcon status={props.child.status} />
      <text flexShrink={0} wrapMode="none">
        {' '}
      </text>
      <text flexShrink={0} wrapMode="none" fg={COLORS.textBright}>
        <b>{props.child.instanceId}</b>
      </text>
      <Show when={detailText()}>
        <text fg={COLORS.muted}>
          {'  '}
          {detailText()}
        </text>
      </Show>
      <Show when={durationText()}>
        <text flexShrink={0} wrapMode="none" fg={COLORS.dim}>
          {'  '}
          {durationText()}
        </text>
      </Show>
    </box>
  );
};

export const EventRow = (props: { event: TuiEvent }) => {
  const durationText = () => (props.event.duration ? formatDuration(props.event.duration) : '');
  const detailText = () =>
    props.event.status === 'running' ? props.event.additionalMessage || '' : props.event.finalMessage || '';
  const hasChildren = () => props.event.children.length > 0;
  const aggregated = () => (hasChildren() ? aggregateChildren(props.event.children) : []);
  const isHidden = () => props.event.status === 'success' && props.event.hideChildrenWhenFinished;

  return (
    <box flexDirection="column" width="100%">
      <box flexDirection="row" width="100%">
        <StatusIcon status={props.event.status} />
        <text flexShrink={0} wrapMode="none">
          {' '}
        </text>
        <text flexShrink={0} wrapMode="none" fg={COLORS.textBright}>
          {props.event.description}
        </text>
        <Show when={detailText() && !hasChildren()}>
          <text fg={COLORS.muted}>
            {'  '}
            {detailText()}
          </text>
        </Show>
        <Show when={durationText()}>
          <text flexShrink={0} wrapMode="none" fg={COLORS.dim}>
            {'  '}
            {durationText()}
          </text>
        </Show>
      </box>
      <Show when={hasChildren() && !isHidden()}>
        <box flexDirection="column" width="100%">
          <For each={aggregated()}>{(child) => <EventChildRow child={child} />}</For>
        </box>
      </Show>
    </box>
  );
};

export const EventTree = (props: { events: TuiEvent[] }) => {
  return (
    <Show when={props.events.length > 0}>
      <box flexDirection="column" width="100%">
        <For each={props.events}>{(event) => <EventRow event={event} />}</For>
      </box>
    </Show>
  );
};
