/** @jsxImportSource @opentui/react */
import type { TuiEvent } from '../types';
import React, { useEffect, useState } from 'react';
import { formatDuration, stripAnsi } from '../utils';

type EventProps = {
  event: TuiEvent;
  isChild?: boolean;
  isLast?: boolean;
  depth?: number;
  isTTY?: boolean;
};

const SPINNER_FRAMES = ['-', '\\', '|', '/'];

const Spinner = ({ color = 'gray' }: { color?: string }) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((index) => (index + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return <text fg={color}>{SPINNER_FRAMES[frameIndex]}</text>;
};

const StatusIcon: React.FC<{ status: TuiEvent['status'] }> = ({ status }) => {
  switch (status) {
    case 'running':
      return <Spinner />;
    case 'success':
      return <text fg="green">+</text>;
    case 'error':
      return <text fg="red">x</text>;
    case 'warning':
      return <text fg="yellow">!</text>;
    default:
      return <text fg="gray"> </text>;
  }
};

/**
 * Format an instanceId or key into a readable description.
 * e.g., "stack-data" -> "Stack data", "previous-artifacts" -> "Previous artifacts"
 */
const formatDescription = (id: string): string => {
  return id.replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase());
};

/**
 * In TTY mode, aggregate children by instanceId (workload name) to show a cleaner summary.
 * Instead of showing every build step, show one entry per workload with its final status.
 */
const getAggregatedChildren = (children: TuiEvent[]): TuiEvent[] => {
  const byInstanceId = new Map<string, TuiEvent[]>();

  for (const child of children) {
    const key = child.instanceId || child.id;
    if (!byInstanceId.has(key)) {
      byInstanceId.set(key, []);
    }
    byInstanceId.get(key)!.push(child);
  }

  // For each workload, create a summary event
  return Array.from(byInstanceId.entries()).map(([instanceId, events]) => {
    // Find the last finished event to get duration and final message
    const lastFinished = [...events].reverse().find((e) => e.status === 'success' || e.status === 'error');
    const firstEvent = events[0];
    const anyRunning = events.some((e) => e.status === 'running');
    const anyError = events.some((e) => e.status === 'error');
    const allFinished = events.every((e) => e.status === 'success' || e.status === 'error');

    // Calculate total duration from first start to last end (only when all are finished)
    const startTime = Math.min(...events.map((e) => e.startTime));
    const endTimes = events.filter((e) => e.endTime).map((e) => e.endTime!);
    const endTime = allFinished && endTimes.length > 0 ? Math.max(...endTimes) : undefined;

    return {
      ...firstEvent,
      id: `aggregated-${instanceId}`,
      description: formatDescription(instanceId), // Use formatted workload name as description
      status: anyRunning ? 'running' : anyError ? 'error' : lastFinished?.status || firstEvent.status,
      startTime,
      endTime,
      duration: allFinished && endTime ? endTime - startTime : undefined,
      finalMessage: allFinished ? lastFinished?.finalMessage : undefined,
      children: [] // Don't show nested children in aggregated view
    } as TuiEvent;
  });
};

export const Event: React.FC<EventProps> = ({ event, isChild = false, isLast = false, depth = 0, isTTY = false }) => {
  const prefix = isChild ? (isLast ? '`-' : '|-') : '';
  const indent = isChild ? ' '.repeat(depth) : '';

  const hasChildren = event.children.length > 0;
  const allChildrenFinished = event.children.every((c) => c.status === 'success' || c.status === 'error');
  const shouldHideChildren = event.hideChildrenWhenFinished && event.status === 'success' && allChildrenFinished;

  // In TTY mode, aggregate children by workload for cleaner display
  const displayChildren = isTTY && hasChildren ? getAggregatedChildren(event.children) : event.children;

  return (
    <box flexDirection="column">
      <box flexDirection="row">
        <text>{indent}</text>
        {isChild && <text fg="gray">{prefix} </text>}
        <StatusIcon status={event.status} />
        <text> {stripAnsi(event.description)}</text>
        {event.duration !== undefined && event.status !== 'running' && (
          <text fg="yellow"> {formatDuration(event.duration)}</text>
        )}
        {event.finalMessage && event.status !== 'running' && <text fg="gray"> {stripAnsi(event.finalMessage)}</text>}
        {event.additionalMessage && event.status === 'running' && (
          <text fg="gray"> {stripAnsi(event.additionalMessage)}</text>
        )}
      </box>

      {hasChildren && !shouldHideChildren && (
        <box flexDirection="column" marginLeft={2}>
          {displayChildren.map((child, index) => (
            <Event
              key={child.id}
              event={child}
              isChild
              isLast={index === displayChildren.length - 1}
              depth={depth + 1}
              isTTY={isTTY}
            />
          ))}
        </box>
      )}
    </box>
  );
};
