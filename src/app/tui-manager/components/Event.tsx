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
  /** When true, rendered inside <Static> from a frozen snapshot - no animated components */
  isSnapshot?: boolean;
};

const StatusIcon: React.FC<{ status: TuiEvent['status']; isSnapshot?: boolean }> = ({ status, isSnapshot }) => {
  switch (status) {
    case 'running':
      // Animated spinner must not run inside Ink's <Static> (uses intervals)
      if (isSnapshot) return <Text color="yellow">⠿</Text>;
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

    const startTime = Math.min(...events.map((e) => e.startTime));
    const endTimes = events.filter((e) => e.endTime).map((e) => e.endTime!);
    const endTime = allFinished && endTimes.length > 0 ? Math.max(...endTimes) : undefined;

    const finishedEvents = events.filter((e) => e.status === 'success' || e.status === 'error');
    const lastFinishedEvent = finishedEvents[finishedEvents.length - 1];
    const aggregatedFinalMessage = lastFinishedEvent?.finalMessage;

    const runningDescription = runningEvent?.description || '';

    return {
      ...firstEvent,
      id: `aggregated-${instanceId}`,
      boldPrefix: instanceId,
      description: '',
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

    const startTime = Math.min(...events.map((e) => e.startTime));
    const endTimes = events.filter((e) => e.endTime).map((e) => e.endTime!);
    const endTime = allFinished && endTimes.length > 0 ? Math.max(...endTimes) : undefined;

    const hotswapStatus = allFinished ? (anyError ? 'Hotswap failed' : 'Hotswap done') : undefined;

    const runningDescription = runningEvent?.description || firstEvent.description;

    return {
      ...firstEvent,
      id: `hotswap-${instanceId}`,
      boldPrefix: instanceId,
      description: '',
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

export const Event: React.FC<EventProps> = React.memo(
  ({ event, isChild = false, isLast = false, depth = 0, isTTY = false, isSnapshot }) => {
    const prefix = isChild ? (isLast ? '└' : '├') : '';
    const indent = isChild ? ' '.repeat(depth) : '';

    const hasChildren = event.children.length > 0;
    const hasOutputLines = event.outputLines && event.outputLines.length > 0;
    const allChildrenFinished = event.children.every((c) => c.status === 'success' || c.status === 'error');
    const shouldHideChildren = event.hideChildrenWhenFinished && event.status === 'success' && allChildrenFinished;

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

    const NEVER_FLATTEN_EVENT_TYPES: LoggableEventType[] = [
      'PACKAGE_ARTIFACTS',
      'UPLOAD_DEPLOYMENT_ARTIFACTS',
      'SYNC_BUCKET'
    ];
    const shouldFlatten =
      isTTY && displayChildren.length === 1 && !hasOutputLines && !NEVER_FLATTEN_EVENT_TYPES.includes(event.eventType);
    const flattenedChild = shouldFlatten ? displayChildren[0] : null;

    const displayStatus = flattenedChild ? flattenedChild.status : event.status;
    const displayDuration = flattenedChild ? flattenedChild.duration : event.duration;
    const displayFinalMessage = flattenedChild ? flattenedChild.finalMessage : event.finalMessage;
    const displayAdditionalMessage = flattenedChild ? flattenedChild.additionalMessage : event.additionalMessage;

    const boldPrefix = flattenedChild?.boldPrefix ?? (event as AggregatedEvent).boldPrefix;
    const descriptionPrefix = event.description;
    const descriptionSuffix = flattenedChild?.description || '';

    return (
      <Box flexDirection="column">
        <Box>
          <Text>{indent}</Text>
          {isChild && <Text color="gray">{prefix} </Text>}
          <StatusIcon status={displayStatus} isSnapshot={isSnapshot} />
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

        {hasOutputLines && (
          <Box flexDirection="column" marginLeft={3}>
            {event
              .outputLines!.filter((line) => line.trim())
              .map((line, index) => (
                <Text key={index} dimColor>
                  {line}
                </Text>
              ))}
          </Box>
        )}

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
                isSnapshot={isSnapshot}
              />
            ))}
          </Box>
        )}
      </Box>
    );
  }
);

Event.displayName = 'Event';
