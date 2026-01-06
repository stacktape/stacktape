/* eslint-disable no-control-regex */
import type { TuiEvent, TuiMessage, TuiPhase, TuiWarning } from '../types';
import { Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React from 'react';
import { Event } from './Event';
import { Message } from './Message';
import { PhaseTimer } from './PhaseTimer';

const PROGRESS_BAR_WIDTH = 72;

const GreenProgressBar: React.FC<{ value: number }> = ({ value }) => {
  const filledWidth = Math.round((value / 100) * PROGRESS_BAR_WIDTH);
  const emptyWidth = PROGRESS_BAR_WIDTH - filledWidth;
  return (
    <Text>
      <Text color="green">{'█'.repeat(filledWidth)}</Text>
      <Text color="gray">{'░'.repeat(emptyWidth)}</Text>
    </Text>
  );
};

type DeployPhaseProps = {
  phase: TuiPhase;
  phaseNumber: number;
  warnings: TuiWarning[];
  messages: TuiMessage[];
};

const DEPLOY_EVENT_TYPES: LoggableEventType[] = [
  'UPDATE_STACK',
  'CREATE_RESOURCES_FOR_ARTIFACTS',
  'DELETE_STACK',
  'ROLLBACK_STACK',
  'HOTSWAP_UPDATE'
];

const getActiveDeployEvent = (events: TuiEvent[]) => {
  const runningEvent = events.find(
    (event) => DEPLOY_EVENT_TYPES.includes(event.eventType) && event.status === 'running'
  );
  if (runningEvent) return runningEvent;
  // If no running deploy event, return most recently finished deploy event
  const finishedDeployEvent = [...events]
    .reverse()
    .find(
      (event) =>
        DEPLOY_EVENT_TYPES.includes(event.eventType) && (event.status === 'success' || event.status === 'error')
    );
  if (finishedDeployEvent) return finishedDeployEvent;
  // If no deploy events at all, return undefined (not first event which could be non-deploy)
  return events.find((event) => DEPLOY_EVENT_TYPES.includes(event.eventType));
};

const stripAnsi = (message?: string) => {
  if (!message) return message;
  return message.replace(/\x1B\[[0-9;]*m/g, '');
};

const parseRemainingPercent = (message?: string) => {
  const cleaned = stripAnsi(message);
  if (!cleaned) return null;
  const match = cleaned.match(/Est\. remaining:\s*~(<)?(\d+)%/);
  if (!match) return null;
  const isLessThan = !!match[1];
  const value = Number(match[2]);
  if (!Number.isFinite(value)) return null;
  return isLessThan ? 1 : value;
};

const getProgressPercent = (remainingPercent: number | null, status: TuiEvent['status']) => {
  if (status !== 'running') return 100;
  if (remainingPercent === null) return null;
  return Math.max(0, Math.min(100, Math.round(100 - remainingPercent)));
};

const parseResourceState = (message?: string) => {
  const cleaned = stripAnsi(message);
  if (!cleaned) return { active: null, waiting: null };
  const activeMatch = cleaned.match(/Currently updating:\s*([^.|]+)\./i);
  const waitingMatch = cleaned.match(/Waiting:\s*([^.|]+)\./i);
  return {
    active: activeMatch ? activeMatch[1].trim() : null,
    waiting: waitingMatch ? waitingMatch[1].trim() : null
  };
};

const parseProgressCounts = (message?: string) => {
  const cleaned = stripAnsi(message);
  if (!cleaned) return { done: null, total: null };
  const match = cleaned.match(/Progress:\s*(\d+)\/(\d+)/i);
  if (!match) return { done: null, total: null };
  return { done: Number(match[1]), total: Number(match[2]) };
};

const parseSummaryCounts = (message?: string) => {
  const cleaned = stripAnsi(message);
  if (!cleaned) return { created: 0, updated: 0, deleted: 0 };
  const match = cleaned.match(/Summary:\s*created=(\d+)\s*updated=(\d+)\s*deleted=(\d+)/i);
  if (!match) return { created: 0, updated: 0, deleted: 0 };
  return { created: Number(match[1]), updated: Number(match[2]), deleted: Number(match[3]) };
};

const parseDetailLists = (message?: string) => {
  const cleaned = stripAnsi(message);
  if (!cleaned) return { created: null, updated: null, deleted: null };
  const match = cleaned.match(/Details:\s*created=([^;]+);\s*updated=([^;]+);\s*deleted=([^.]+)\./i);
  if (!match) return { created: null, updated: null, deleted: null };
  return { created: match[1].trim(), updated: match[2].trim(), deleted: match[3].trim() };
};

const formatListSummary = (items: string | null, count: number, maxItems: number) => {
  if (count === 0) return null;
  if (!items || items === 'none') return '...';
  const list = items
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (!list.length) return null;
  const visible = list.slice(0, maxItems);
  const overflow = list.length - visible.length;
  const needsEllipsis = overflow > 0 || count > list.length;
  return `${visible.join(', ')}${needsEllipsis ? ', ...' : ''}`;
};

const renderResourceList = (label: string, items: string) => {
  if (items === 'none') return null;
  const list = items
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (!list.length) return null;
  return (
    <Box>
      <Text color="gray">{label} </Text>
      <Text>{list.join(' • ')}</Text>
    </Box>
  );
};

export const DeployPhase: React.FC<DeployPhaseProps> = ({ phase, phaseNumber, warnings, messages }) => {
  const phaseWarnings = warnings.filter((w) => w.phase === phase.id);
  const phaseMessages = messages.filter((m) => m.phase === phase.id);
  const deployEvent = getActiveDeployEvent(phase.events);
  const remainingPercent = parseRemainingPercent(deployEvent?.additionalMessage);
  const progressPercentFromTime = getProgressPercent(remainingPercent, deployEvent?.status || 'running');
  const resourceState = parseResourceState(deployEvent?.additionalMessage);
  const progressCounts = parseProgressCounts(deployEvent?.additionalMessage);

  const summaryCounts = parseSummaryCounts(deployEvent?.additionalMessage);
  const detailLists = parseDetailLists(deployEvent?.additionalMessage);
  const progressPercent =
    progressPercentFromTime === null && progressCounts.done !== null && progressCounts.total
      ? Math.round((progressCounts.done / progressCounts.total) * 100)
      : progressPercentFromTime;

  // Track if CloudFormation deployment is done (event finished successfully)
  const isDeploymentDone = deployEvent?.status === 'success' || deployEvent?.status === 'error';

  // Only show progress UI if we have meaningful progress data (event has been running long enough to report progress)
  // This prevents a brief flash of progress bar when deploy finishes instantly (no changes)
  const hasProgressData = deployEvent?.additionalMessage && deployEvent.additionalMessage.length > 0;
  const showProgressUI = !isDeploymentDone && hasProgressData;

  // Detect if this is a hotswap deployment
  const isHotswapDeploy = deployEvent?.eventType === 'HOTSWAP_UPDATE';

  // Check if we have a deploy event at all (CloudFormation related)
  const hasDeployEvent = !!deployEvent;

  // Show "Preparing" message only before deploy event exists or is pending (not running yet)
  // If deploy event is running (even without progress data), show "Deploying..." message
  const isWaitingForDeployStart =
    phase.status === 'running' && !isDeploymentDone && (!hasDeployEvent || deployEvent?.status === 'pending');

  // Detect operation type
  const isDeleteOperation = deployEvent?.eventType === 'DELETE_STACK';
  const isCreateArtifactsOperation = deployEvent?.eventType === 'CREATE_RESOURCES_FOR_ARTIFACTS';
  // Hotswap and delete don't use CloudFormation progress UI
  const isCloudFormationDeploy = !isHotswapDeploy && !isDeleteOperation;
  const actionVerb = isHotswapDeploy
    ? 'Hot-swapping'
    : isDeleteOperation
      ? 'Deleting'
      : isCreateArtifactsOperation
        ? 'Creating resources'
        : 'Deploying';
  const currentlyLabel = isDeleteOperation ? 'Currently deleting:' : 'Currently creating:';

  // For hotswap deployments, render the deploy event as an Event component to show its children nested
  // For CloudFormation, we use custom UI instead
  const shouldShowDeployAsEvent = isHotswapDeploy && deployEvent;
  // Events to show at phase level (not nested under deploy event):
  // - For hotswap: exclude deploy event and its children (they're rendered via deploy event)
  // - For CloudFormation: exclude deploy events (we show custom UI), but include children
  const deployEventChildren = deployEvent?.children || [];
  const phaseLevelEvents = phase.events.filter((e) => {
    const isDeployEventType = DEPLOY_EVENT_TYPES.includes(e.eventType);
    const isChildOfDeploy = deployEventChildren.some((child) => child.id === e.id);
    return !isDeployEventType && !isChildOfDeploy;
  });

  // Split phase-level events into those that started before deploy and those that started after
  const deployStartTime = deployEvent?.startTime || Infinity;
  const eventsBeforeDeploy = phaseLevelEvents.filter((e) => e.startTime < deployStartTime);
  const eventsAfterDeploy = phaseLevelEvents.filter((e) => e.startTime >= deployStartTime);

  // Only show "Preparing/Deploying" message if there are no other events to display
  const hasPhaseLevelEvents = phaseLevelEvents.length > 0;
  const shouldShowPreparingMessage = isWaitingForDeployStart && !hasPhaseLevelEvents;

  // Deploy is running but has no progress data yet
  const isDeployingNoProgress =
    phase.status === 'running' &&
    !isDeploymentDone &&
    deployEvent?.status === 'running' &&
    !hasProgressData &&
    !hasPhaseLevelEvents;

  // For hotswap, we render it as Event component with children - don't show generic message
  // For CloudFormation without progress, show generic "Deploying..." message
  const showGenericDeployMessage = isDeployingNoProgress && !isHotswapDeploy && !deployEvent?.additionalMessage;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold>PHASE {phaseNumber}</Text>
        <Text> • </Text>
        <Text bold>{phase.name}</Text>
        {phase.status !== 'pending' && (
          <PhaseTimer startTime={phase.startTime} duration={phase.duration} isRunning={phase.status === 'running'} />
        )}
      </Box>
      <Text color="gray">{'─'.repeat(54)}</Text>

      <Box flexDirection="column">
        {/* Show events that happened BEFORE the deploy started (e.g., Validating template) */}
        {eventsBeforeDeploy.map((event) => (
          <Event key={event.id} event={event} isTTY={true} />
        ))}

        {shouldShowPreparingMessage && (
          <Box>
            <Spinner type="dots" />
            <Text color="gray">
              {' '}
              {isDeleteOperation ? 'Preparing stack deletion...' : 'Preparing CloudFormation update...'}
            </Text>
          </Box>
        )}

        {showGenericDeployMessage && (
          <Box>
            <Spinner type="dots" />
            <Text color="gray">
              {' '}
              {isDeleteOperation ? 'Deleting using CloudFormation...' : 'Deploying using CloudFormation...'}
            </Text>
          </Box>
        )}

        {/* For hotswap, render deploy event as Event component to show nested children (workloads) */}
        {shouldShowDeployAsEvent && <Event key={deployEvent!.id} event={deployEvent!} isTTY={true} />}

        {/* Hotswap doesn't show CloudFormation-style progress bar */}
        {isCloudFormationDeploy && showProgressUI && (
          <Box flexDirection="column">
            <Box>
              <Text>{actionVerb} using CloudFormation </Text>
              {progressPercent !== null && <Text color="cyan">{progressPercent}%</Text>}
              {progressCounts.done !== null && progressCounts.total !== null && (
                <Text color="gray">
                  {' '}
                  ({progressCounts.done}/{progressCounts.total} resources)
                </Text>
              )}
            </Box>
            <Box marginTop={0}>
              {progressPercent !== null ? (
                <GreenProgressBar value={progressPercent} />
              ) : (
                <Box>
                  <Spinner type="dots" />
                  <Text color="gray"> Estimating progress...</Text>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Hotswap doesn't show resource state */}
        {isCloudFormationDeploy && showProgressUI && (
          <Box flexDirection="column" marginTop={1}>
            {resourceState.active &&
              renderResourceList(
                currentlyLabel,
                resourceState.active === 'none' ? 'waiting for resources' : resourceState.active
              )}
            {resourceState.waiting && renderResourceList('Waiting:', resourceState.waiting)}
          </Box>
        )}

        {/* Show CloudFormation summary (not for hotswap) */}
        {isCloudFormationDeploy && isDeploymentDone && (
          <Box flexDirection="column" marginTop={0}>
            {!isDeleteOperation && (
              <>
                <Box>
                  <Text color="green">✓</Text>
                  <Text> Created: {summaryCounts.created}</Text>
                  {formatListSummary(detailLists.created, summaryCounts.created, 4) && (
                    <Text color="gray"> ({formatListSummary(detailLists.created, summaryCounts.created, 4)})</Text>
                  )}
                </Box>
                <Box>
                  <Text color="green">✓</Text>
                  <Text> Updated: {summaryCounts.updated}</Text>
                  {formatListSummary(detailLists.updated, summaryCounts.updated, 4) && (
                    <Text color="gray"> ({formatListSummary(detailLists.updated, summaryCounts.updated, 4)})</Text>
                  )}
                </Box>
              </>
            )}
            <Box>
              <Text color="green">✓</Text>
              <Text> Deleted: {summaryCounts.deleted}</Text>
              {formatListSummary(detailLists.deleted, summaryCounts.deleted, 4) && (
                <Text color="gray"> ({formatListSummary(detailLists.deleted, summaryCounts.deleted, 4)})</Text>
              )}
            </Box>
          </Box>
        )}

        {/* Hotswap completion message */}
        {isHotswapDeploy && isDeploymentDone && (
          <Box flexDirection="column" marginTop={0}>
            <Box>
              <Text color="green">✓</Text>
              <Text> Hotswap deployment completed.</Text>
            </Box>
          </Box>
        )}

        {/* Show events that happened AFTER the deploy started (hooks, scripts, etc.) */}
        {eventsAfterDeploy.map((event) => (
          <Event key={event.id} event={event} isTTY={true} />
        ))}
      </Box>

      {phaseWarnings.map((warning) => (
        <Box key={warning.id} flexDirection="column">
          {warning.message.split('\n').map((line, idx) => (
            <Box key={idx}>
              {idx === 0 ? <Text color="yellow">⚠ </Text> : <Text> </Text>}
              <Text color="yellow">{line}</Text>
            </Box>
          ))}
        </Box>
      ))}

      {phaseMessages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
    </Box>
  );
};
