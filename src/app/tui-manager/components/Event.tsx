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
      return <Text color="gray">•</Text>;
  }
};

type AggregatedEvent = TuiEvent & { boldPrefix?: string };

/**
 * In TTY mode, aggregate children by instanceId (workload name) to show a cleaner summary.
 * Shows "Workload: current action" while running, "Workload: Done" or "Workload: Skipped" when finished.
 */
const getAggregatedChildren = (children: TuiEvent[]): AggregatedEvent[] => {
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

    // Get the last event's finalMessage (most relevant for display)
    const finishedEvents = events.filter((e) => e.status === 'success' || e.status === 'error');
    const lastFinishedEvent = finishedEvents[finishedEvents.length - 1];
    const aggregatedFinalMessage = lastFinishedEvent?.finalMessage;

    // For running events, show the current action as additional message
    const runningDescription = runningEvent?.description || '';

    return {
      ...firstEvent,
      id: `aggregated-${instanceId}`,
      boldPrefix: instanceId,
      description: '', // Empty - boldPrefix is the main identifier
      additionalMessage: runningEvent ? runningDescription : undefined,
      finalMessage: allFinished ? aggregatedFinalMessage : undefined,
      status: runningEvent ? 'running' : allFinished ? (anyError ? 'error' : 'success') : 'running',
      startTime,
      endTime,
      duration: allFinished && endTime ? endTime - startTime : undefined,
      children: []
    } as AggregatedEvent;
  });
};

/**
 * Aggregate hotswap children by workload, showing current action while running
 * and "Hotswap done" when finished.
 */
const getAggregatedHotswapChildren = (children: TuiEvent[]): AggregatedEvent[] => {
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

    // Get the status message for finished hotswap
    const hotswapStatus = allFinished ? (anyError ? 'Hotswap failed' : 'Hotswap done') : undefined;

    // For running events, show the current action as additional message
    const runningDescription = runningEvent?.description || firstEvent.description;

    return {
      ...firstEvent,
      id: `hotswap-${instanceId}`,
      boldPrefix: instanceId,
      description: '', // Empty - boldPrefix is the main identifier
      additionalMessage: runningEvent ? runningDescription : undefined,
      finalMessage: hotswapStatus,
      status: runningEvent ? 'running' : allFinished ? (anyError ? 'error' : 'success') : 'running',
      startTime,
      endTime,
      duration: allFinished && endTime ? endTime - startTime : undefined,
      children: []
    } as AggregatedEvent;
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

  let displayChildren: AggregatedEvent[];
  if (shouldAggregateHotswap) {
    displayChildren = getAggregatedHotswapChildren(event.children);
  } else if (shouldAggregateNormal) {
    displayChildren = getAggregatedChildren(event.children);
  } else {
    displayChildren = event.children;
  }

  // Flatten single-child events: show "Parent Child: status" instead of nested display
  // Don't flatten for certain event types that should always show hierarchy (packaging, uploads)
  const NEVER_FLATTEN_EVENT_TYPES: LoggableEventType[] = ['PACKAGE_ARTIFACTS', 'UPLOAD_DEPLOYMENT_ARTIFACTS', 'SYNC_BUCKET'];
  const shouldFlatten = isTTY && displayChildren.length === 1 && !hasOutputLines && !NEVER_FLATTEN_EVENT_TYPES.includes(event.eventType);
  const flattenedChild = shouldFlatten ? displayChildren[0] : null;

  // Use child's status/duration when flattened
  const displayStatus = flattenedChild ? flattenedChild.status : event.status;
  const displayDuration = flattenedChild ? flattenedChild.duration : event.duration;
  const displayFinalMessage = flattenedChild ? flattenedChild.finalMessage : event.finalMessage;
  const displayAdditionalMessage = flattenedChild ? flattenedChild.additionalMessage : event.additionalMessage;

  // Get bold prefix (workload name) - from flattened child OR from the event itself if it's an aggregated child
  const boldPrefix = flattenedChild?.boldPrefix ?? (event as AggregatedEvent).boldPrefix;
  // Build description parts
  const descriptionPrefix = event.description;
  const descriptionSuffix = flattenedChild?.description || '';

  return (
    <Box flexDirection="column">
      <Box>
        <Text>{indent}</Text>
        {isChild && <Text color="gray">{prefix} </Text>}
        <StatusIcon status={displayStatus} />
        <Text> </Text>
        {descriptionPrefix && <Text>{descriptionPrefix}</Text>}
        {descriptionPrefix && boldPrefix && <Text> </Text>}
        {boldPrefix && <Text bold>{boldPrefix}</Text>}
        {descriptionSuffix && <Text>: {descriptionSuffix}</Text>}
        {displayDuration !== undefined && displayStatus !== 'running' && (
          <Text color="yellow"> {formatDuration(displayDuration)}</Text>
        )}
        {displayFinalMessage && displayStatus !== 'running' && <Text color="gray"> {displayFinalMessage}</Text>}
        {displayAdditionalMessage && displayStatus === 'running' && (
          <Text color="gray"> {displayAdditionalMessage}</Text>
        )}
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

      {/* Don't show children when flattened */}
      {hasChildren && !shouldHideChildren && !shouldFlatten && (
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
