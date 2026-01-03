/* eslint-disable no-control-regex */
import type { TuiEvent, TuiMessage, TuiPhase, TuiWarning } from '../types';
import { Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React from 'react';
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
  return runningEvent || events.find((event) => DEPLOY_EVENT_TYPES.includes(event.eventType)) || events[0];
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
  const isDone = phase.status === 'success' || deployEvent?.status === 'success';
  const summaryCounts = parseSummaryCounts(deployEvent?.additionalMessage);
  const detailLists = parseDetailLists(deployEvent?.additionalMessage);
  const progressPercent =
    progressPercentFromTime === null && progressCounts.done !== null && progressCounts.total
      ? Math.round((progressCounts.done / progressCounts.total) * 100)
      : progressPercentFromTime;

  // Only show progress UI if we have meaningful progress data (event has been running long enough to report progress)
  // This prevents a brief flash of the progress bar when deploy finishes instantly (no changes)
  const hasProgressData = deployEvent?.additionalMessage && deployEvent.additionalMessage.length > 0;
  const showProgressUI = !isDone && hasProgressData;
  // Show waiting state when phase is running but no progress data yet
  const isWaitingForProgress = phase.status === 'running' && !isDone && !hasProgressData;

  // Detect if this is a delete operation
  const isDeleteOperation = deployEvent?.eventType === 'DELETE_STACK';
  const actionVerb = isDeleteOperation ? 'Deleting' : 'Deploying';
  const currentlyLabel = isDeleteOperation ? 'Currently deleting:' : 'Currently updating:';

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
        {isWaitingForProgress && (
          <Box>
            <Spinner type="dots" />
            <Text color="gray">
              {' '}
              {isDeleteOperation ? 'Preparing stack deletion...' : 'Preparing CloudFormation update...'}
            </Text>
          </Box>
        )}

        {showProgressUI && (
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

        {showProgressUI && (
          <Box flexDirection="column" marginTop={1}>
            {resourceState.active &&
              renderResourceList(
                currentlyLabel,
                resourceState.active === 'none' ? 'waiting for resources' : resourceState.active
              )}
            {resourceState.waiting && renderResourceList('Waiting:', resourceState.waiting)}
          </Box>
        )}

        {isDone && (
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
