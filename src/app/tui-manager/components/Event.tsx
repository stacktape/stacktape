import type { TuiEvent } from '../types';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';
import { formatDuration } from '../utils';

type EventProps = {
  event: TuiEvent;
  isChild?: boolean;
  isLast?: boolean;
  depth?: number;
  isTTY?: boolean;
};

const StatusIcon: React.FC<{ status: TuiEvent['status'] }> = ({ status }) => {
  switch (status) {
    case 'running':
      return (
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
      );
    case 'success':
      return <Text color="green">✓</Text>;
    case 'error':
      return <Text color="red">✗</Text>;
    case 'warning':
      return <Text color="yellow">!</Text>;
    default:
      return <Text color="gray">○</Text>;
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
  const prefix = isChild ? (isLast ? '└' : '├') : '';
  const indent = isChild ? ' '.repeat(depth) : '';

  const hasChildren = event.children.length > 0;
  const allChildrenFinished = event.children.every((c) => c.status === 'success' || c.status === 'error');
  const shouldHideChildren = event.hideChildrenWhenFinished && event.status === 'success' && allChildrenFinished;

  // In TTY mode, aggregate children by workload for cleaner display
  const displayChildren = isTTY && hasChildren ? getAggregatedChildren(event.children) : event.children;

  return (
    <Box flexDirection="column">
      <Box>
        <Text>{indent}</Text>
        {isChild && <Text color="gray">{prefix} </Text>}
        <StatusIcon status={event.status} />
        <Text> {event.description}</Text>
        {event.duration !== undefined && event.status !== 'running' && (
          <Text color="yellow"> {formatDuration(event.duration)}</Text>
        )}
        {event.finalMessage && event.status !== 'running' && <Text color="gray"> {event.finalMessage}</Text>}
        {event.additionalMessage && event.status === 'running' && <Text color="gray"> {event.additionalMessage}</Text>}
      </Box>

      {hasChildren && !shouldHideChildren && (
        <Box flexDirection="column" marginLeft={2}>
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
        </Box>
      )}
    </Box>
  );
};
