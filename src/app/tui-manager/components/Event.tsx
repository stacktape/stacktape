import type { TuiEvent } from '../types';
import { Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
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
      return <Spinner type="dots" />;
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
 * Shows "Workload: current action" while running, "Workload: Done" or "Workload: Skipped" when finished.
 */
const getAggregatedChildren = (children: TuiEvent[]): TuiEvent[] => {
  if (children.length === 0) return [];

  const byInstanceId = new Map<string, TuiEvent[]>();

  for (const child of children) {
    const key = child.instanceId || child.id;
    if (!byInstanceId.has(key)) {
      byInstanceId.set(key, []);
    }
    byInstanceId.get(key)!.push(child);
  }

  // Sort by first event start time for stable order
  const sortedEntries = Array.from(byInstanceId.entries()).sort(([, aEvents], [, bEvents]) => {
    const aStart = Math.min(...aEvents.map((e) => e.startTime));
    const bStart = Math.min(...bEvents.map((e) => e.startTime));
    return aStart - bStart;
  });

  // For each workload, create a summary event
  return sortedEntries.map(([instanceId, events]) => {
    const firstEvent = events[0];
    const runningEvent = events.find((e) => e.status === 'running');
    const anyError = events.some((e) => e.status === 'error');
    const allFinished = events.every((e) => e.status === 'success' || e.status === 'error');

    // Calculate total duration from first start to last end (only when all are finished)
    const startTime = Math.min(...events.map((e) => e.startTime));
    const endTimes = events.filter((e) => e.endTime).map((e) => e.endTime!);
    const endTime = allFinished && endTimes.length > 0 ? Math.max(...endTimes) : undefined;

    // Build description: "Workload: current action" while running, "Workload: Done/Skipped" when finished
    const workloadName = formatDescription(instanceId);
    let description: string;
    if (allFinished) {
      // Check if all events were skipped (finalMessage contains "Skipped" or outcome was skipped)
      const wasSkipped = events.length === 1 && events[0].finalMessage?.toLowerCase().includes('skipped');
      description = anyError
        ? `${workloadName}: Failed`
        : wasSkipped
          ? `${workloadName}: Skipped`
          : `${workloadName}: Done`;
    } else if (runningEvent) {
      description = `${workloadName}: ${runningEvent.description}`;
    } else {
      description = workloadName;
    }

    return {
      ...firstEvent,
      id: `aggregated-${instanceId}`,
      description,
      status: runningEvent ? 'running' : anyError ? 'error' : 'success',
      startTime,
      endTime,
      duration: allFinished && endTime ? endTime - startTime : undefined,
      children: [] // Don't show nested children in aggregated view
    } as TuiEvent;
  });
};

/**
 * Aggregate hotswap children by workload, showing current action while running
 * and "Hotswap done" when finished.
 */
const getAggregatedHotswapChildren = (children: TuiEvent[]): TuiEvent[] => {
  if (children.length === 0) return [];

  const byInstanceId = new Map<string, TuiEvent[]>();

  for (const child of children) {
    const key = child.instanceId || child.id;
    if (!byInstanceId.has(key)) {
      byInstanceId.set(key, []);
    }
    byInstanceId.get(key)!.push(child);
  }

  // Sort by first event start time for stable order
  const sortedEntries = Array.from(byInstanceId.entries()).sort(([, aEvents], [, bEvents]) => {
    const aStart = Math.min(...aEvents.map((e) => e.startTime));
    const bStart = Math.min(...bEvents.map((e) => e.startTime));
    return aStart - bStart;
  });

  return sortedEntries.map(([instanceId, events]) => {
    const firstEvent = events[0];
    const runningEvent = events.find((e) => e.status === 'running');
    const anyError = events.some((e) => e.status === 'error');
    const allFinished = events.every((e) => e.status === 'success' || e.status === 'error');

    // Calculate total duration from first start to last end
    const startTime = Math.min(...events.map((e) => e.startTime));
    const endTimes = events.filter((e) => e.endTime).map((e) => e.endTime!);
    const endTime = allFinished && endTimes.length > 0 ? Math.max(...endTimes) : undefined;

    // Build description: "Workload: current action" while running, "Workload: Hotswap done" when finished
    const workloadName = formatDescription(instanceId);
    let description: string;
    if (allFinished) {
      description = anyError ? `${workloadName}: Hotswap failed` : `${workloadName}: Hotswap done`;
    } else if (runningEvent) {
      description = `${workloadName}: ${runningEvent.description}`;
    } else {
      // Pending or unknown state
      description = `${workloadName}: ${firstEvent.description}`;
    }

    return {
      ...firstEvent,
      id: `hotswap-${instanceId}`,
      description,
      status: runningEvent ? 'running' : anyError ? 'error' : 'success',
      startTime,
      endTime,
      duration: allFinished && endTime ? endTime - startTime : undefined,
      children: []
    } as TuiEvent;
  });
};

export const Event: React.FC<EventProps> = ({ event, isChild = false, isLast = false, depth = 0, isTTY = false }) => {
  const prefix = isChild ? (isLast ? '└' : '├') : '';
  const indent = isChild ? ' '.repeat(depth) : '';

  const hasChildren = event.children.length > 0;
  const hasOutputLines = event.outputLines && event.outputLines.length > 0;
  const allChildrenFinished = event.children.every((c) => c.status === 'success' || c.status === 'error');
  const shouldHideChildren = event.hideChildrenWhenFinished && event.status === 'success' && allChildrenFinished;

  // In TTY mode, aggregate children by workload for cleaner display
  const isHotswapParent = event.eventType === 'HOTSWAP_UPDATE';
  const shouldAggregateHotswap = isTTY && hasChildren && isHotswapParent;
  const shouldAggregateNormal = isTTY && hasChildren && !isHotswapParent;

  let displayChildren: TuiEvent[];
  if (shouldAggregateHotswap) {
    displayChildren = getAggregatedHotswapChildren(event.children);
  } else if (shouldAggregateNormal) {
    displayChildren = getAggregatedChildren(event.children);
  } else {
    displayChildren = event.children;
  }

  const displayDescription = event.description;

  return (
    <Box flexDirection="column">
      <Box>
        <Text>{indent}</Text>
        {isChild && <Text color="gray">{prefix} </Text>}
        <StatusIcon status={event.status} />
        <Text> {displayDescription}</Text>
        {event.duration !== undefined && event.status !== 'running' && (
          <Text color="yellow"> {formatDuration(event.duration)}</Text>
        )}
        {event.finalMessage && event.status !== 'running' && <Text color="gray"> {event.finalMessage}</Text>}
        {event.additionalMessage && event.status === 'running' && <Text color="gray"> {event.additionalMessage}</Text>}
      </Box>

      {/* Render captured output lines (e.g., from script execution) */}
      {hasOutputLines && (
        <Box flexDirection="column" marginLeft={3}>
          {event
            .outputLines!.filter((line) => line.trim()) // Filter empty lines
            .map((line, index) => (
              <Text key={index} dimColor>
                {line}
              </Text>
            ))}
        </Box>
      )}

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
