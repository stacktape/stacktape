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
 * Instead of showing every build step, show one entry per workload with its final status.
 * For hotswap deployment, we want to show actual event descriptions (e.g., "Updating ECS service")
 * instead of just workload name, so we use most recently active event's description.
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

    // For hotswap deployments, prefer showing actual action descriptions
    // But prepend workload name for context, e.g., "LambdaMcpServer: Updating function code"
    const useActualDescription = events.some((e) =>
      ['UPDATE_ECS_SERVICE', 'REGISTER_ECS_TASK_DEFINITION', 'UPDATE_FUNCTION_CODE'].includes(e.eventType)
    );
    const description = useActualDescription
      ? `${formatDescription(instanceId)}: ${firstEvent.description}`
      : formatDescription(instanceId);

    return {
      ...firstEvent,
      id: `aggregated-${instanceId}`,
      description,
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
  const hasOutputLines = event.outputLines && event.outputLines.length > 0;
  const allChildrenFinished = event.children.every((c) => c.status === 'success' || c.status === 'error');
  const shouldHideChildren = event.hideChildrenWhenFinished && event.status === 'success' && allChildrenFinished;

  // In TTY mode, aggregate children by workload for cleaner display
  // But for hotswap parent event, show individual steps with workload names
  const isHotswapParent = event.eventType === 'HOTSWAP_UPDATE';
  const isHotswapChild = ['UPDATE_ECS_SERVICE', 'REGISTER_ECS_TASK_DEFINITION', 'UPDATE_FUNCTION_CODE'].includes(
    event.eventType
  );
  const shouldAggregate = isTTY && hasChildren && !isHotswapParent && !isHotswapChild;
  const displayChildren = shouldAggregate ? getAggregatedChildren(event.children) : event.children;

  // For hotswap parent events that have instanceId, prepend workload name to description
  const hotswapParentDescription =
    isHotswapParent && event.instanceId
      ? `${formatDescription(event.instanceId)}: ${event.description}`
      : event.description;

  return (
    <Box flexDirection="column">
      <Box>
        <Text>{indent}</Text>
        {isChild && <Text color="gray">{prefix} </Text>}
        <StatusIcon status={event.status} />
        <Text> {hotswapParentDescription || event.description}</Text>
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
