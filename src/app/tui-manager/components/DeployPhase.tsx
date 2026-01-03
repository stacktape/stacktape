/** @jsxImportSource @opentui/react */
/* eslint-disable no-control-regex */
import type { TuiEvent, TuiMessage, TuiPhase, TuiWarning } from '../types';
import React, { useEffect, useState } from 'react';
import { Message } from './Message';
import { PhaseTimer } from './PhaseTimer';

const PROGRESS_BAR_WIDTH = 72;
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

const GreenProgressBar: React.FC<{ value: number }> = ({ value }) => {
  const filledWidth = Math.round((value / 100) * PROGRESS_BAR_WIDTH);
  const emptyWidth = PROGRESS_BAR_WIDTH - filledWidth;
  return (
    <text>
      <span fg="green">{'#'.repeat(filledWidth)}</span>
      <span fg="gray">{'-'.repeat(emptyWidth)}</span>
    </text>
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
    <box flexDirection="row">
      <text fg="gray">{label} </text>
      <text>{list.join(', ')}</text>
    </box>
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
    <box flexDirection="column" marginBottom={1}>
      <box flexDirection="row">
        <text>
          <strong>PHASE {phaseNumber}</strong>
        </text>
        <text> - </text>
        <text>
          <strong>{phase.name}</strong>
        </text>
        {phase.status !== 'pending' && (
          <PhaseTimer startTime={phase.startTime} duration={phase.duration} isRunning={phase.status === 'running'} />
        )}
      </box>
      <text fg="gray">{'-'.repeat(54)}</text>

      <box flexDirection="column">
        {isWaitingForProgress && (
          <box flexDirection="row">
            <Spinner />
            <text fg="gray">
              {' '}
              {isDeleteOperation ? 'Preparing stack deletion...' : 'Preparing CloudFormation update...'}
            </text>
          </box>
        )}

        {showProgressUI && (
          <box flexDirection="column">
            <box flexDirection="row">
              <text>{actionVerb} using CloudFormation </text>
              {progressPercent !== null && <text fg="cyan">{progressPercent}%</text>}
              {progressCounts.done !== null && progressCounts.total !== null && (
                <text fg="gray">
                  {' '}
                  ({progressCounts.done}/{progressCounts.total} resources)
                </text>
              )}
            </box>
            <box marginTop={0}>
              {progressPercent !== null ? (
                <GreenProgressBar value={progressPercent} />
              ) : (
                <box flexDirection="row">
                  <Spinner />
                  <text fg="gray"> Estimating progress...</text>
                </box>
              )}
            </box>
          </box>
        )}

        {showProgressUI && (
          <box flexDirection="column" marginTop={1}>
            {resourceState.active &&
              renderResourceList(
                currentlyLabel,
                resourceState.active === 'none' ? 'waiting for resources' : resourceState.active
              )}
            {resourceState.waiting && renderResourceList('Waiting:', resourceState.waiting)}
          </box>
        )}

        {isDone && (
          <box flexDirection="column" marginTop={0}>
            {!isDeleteOperation && (
              <>
                <box flexDirection="row">
                  <text fg="green">+</text>
                  <text> Created: {summaryCounts.created}</text>
                  {formatListSummary(detailLists.created, summaryCounts.created, 4) && (
                    <text fg="gray"> ({formatListSummary(detailLists.created, summaryCounts.created, 4)})</text>
                  )}
                </box>
                <box flexDirection="row">
                  <text fg="green">+</text>
                  <text> Updated: {summaryCounts.updated}</text>
                  {formatListSummary(detailLists.updated, summaryCounts.updated, 4) && (
                    <text fg="gray"> ({formatListSummary(detailLists.updated, summaryCounts.updated, 4)})</text>
                  )}
                </box>
              </>
            )}
            <box flexDirection="row">
              <text fg="green">+</text>
              <text> Deleted: {summaryCounts.deleted}</text>
              {formatListSummary(detailLists.deleted, summaryCounts.deleted, 4) && (
                <text fg="gray"> ({formatListSummary(detailLists.deleted, summaryCounts.deleted, 4)})</text>
              )}
            </box>
          </box>
        )}
      </box>

      {phaseWarnings.map((warning) => (
        <box key={warning.id} flexDirection="column">
          {warning.message.split('\n').map((line, idx) => (
            <box key={idx} flexDirection="row">
              {idx === 0 ? <text fg="yellow">? </text> : <text> </text>}
              <text fg="yellow">{stripAnsi(line)}</text>
            </box>
          ))}
        </box>
      ))}

      {phaseMessages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
    </box>
  );
};
