import type { TuiEvent, TuiMessage, TuiPhase, TuiWarning } from '../types';
import { Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React from 'react';
import {
  formatListSummary,
  getProgressPercent,
  parseDetailLists,
  parseEstimatePercent,
  parseProgressCounts,
  parseResourceState,
  parseSummaryCounts,
  stripDeployMessageAnsi
} from '../deploy-progress-parser';
import { formatDuration } from '../utils';
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
  isProgressPaused?: boolean;
  /** When true, rendered inside <Static> from a frozen snapshot - no animated components */
  isSnapshot?: boolean;
};

const DEPLOY_EVENT_TYPES: LoggableEventType[] = ['UPDATE_STACK', 'DELETE_STACK', 'ROLLBACK_STACK', 'HOTSWAP_UPDATE'];

const hasRunningDescendant = (event: TuiEvent): boolean =>
  event.children.some((child) => child.status === 'running' || hasRunningDescendant(child));

const getActiveDeployEvent = (events: TuiEvent[]) => {
  const runningEvent = events.find(
    (event) => DEPLOY_EVENT_TYPES.includes(event.eventType) && event.status === 'running'
  );
  if (runningEvent) return runningEvent;
  const finishedDeployEvent = [...events]
    .reverse()
    .find(
      (event) =>
        DEPLOY_EVENT_TYPES.includes(event.eventType) && (event.status === 'success' || event.status === 'error')
    );
  if (finishedDeployEvent) return finishedDeployEvent;
  return events.find((event) => DEPLOY_EVENT_TYPES.includes(event.eventType));
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
      <Text color="gray">{label}</Text>
      <Text wrap="truncate"> {list.join(' • ')}</Text>
    </Box>
  );
};

/**
 * Static-safe spinner: renders animated Spinner in live zone, static dot in snapshot zone.
 * Spinners use intervals internally, which must not run inside Ink's <Static>.
 */
const SafeSpinner: React.FC<{ isSnapshot?: boolean }> = ({ isSnapshot }) => {
  if (isSnapshot) return <Text color="yellow">⠿</Text>;
  return <Spinner type="dots" />;
};

export const DeployPhase: React.FC<DeployPhaseProps> = React.memo(
  ({ phase, phaseNumber, warnings, messages, isProgressPaused, isSnapshot }) => {
    const phaseWarnings = warnings.filter((w) => w.phase === phase.id);
    const phaseMessages = messages.filter((m) => m.phase === phase.id);
    const deployEvent = getActiveDeployEvent(phase.events);
    const estimatePercent = parseEstimatePercent(deployEvent?.additionalMessage);
    const progressPercentFromTime = isProgressPaused
      ? estimatePercent
      : getProgressPercent(estimatePercent, deployEvent?.status || 'running');
    const resourceState = parseResourceState(deployEvent?.additionalMessage);
    const progressCounts = parseProgressCounts(deployEvent?.additionalMessage);

    const summaryCounts = parseSummaryCounts(deployEvent?.additionalMessage);
    const detailLists = parseDetailLists(deployEvent?.additionalMessage);
    const progressPercent =
      progressPercentFromTime === null && progressCounts.done !== null && progressCounts.total
        ? Math.round((progressCounts.done / progressCounts.total) * 100)
        : progressPercentFromTime;

    const isDeploymentDone = deployEvent?.status === 'success' || deployEvent?.status === 'error';

    const hasProgressData = deployEvent?.additionalMessage && deployEvent.additionalMessage.length > 0;
    const showProgressUI = !isDeploymentDone && hasProgressData;

    const isHotswapDeploy = deployEvent?.eventType === 'HOTSWAP_UPDATE';

    const hasDeployEvent = !!deployEvent;

    const isWaitingForDeployStart =
      phase.status === 'running' && !isDeploymentDone && (!hasDeployEvent || deployEvent?.status === 'pending');

    const isDeleteOperation = deployEvent?.eventType === 'DELETE_STACK';
    const isCloudFormationDeploy = !isHotswapDeploy;
    const actionVerb = isHotswapDeploy ? 'Hot-swapping' : isDeleteOperation ? 'Deleting' : 'Deploying';
    const currentlyLabel = isDeleteOperation ? 'Deleting:' : 'Updating:';

    const shouldShowDeployAsEvent = isHotswapDeploy && deployEvent;
    const deployEventChildren = deployEvent?.children || [];
    const phaseLevelEvents = phase.events.filter((e) => {
      const isDeployEventType = DEPLOY_EVENT_TYPES.includes(e.eventType);
      const isChildOfDeploy = deployEventChildren.some((child) => child.id === e.id);
      return !isDeployEventType && !isChildOfDeploy;
    });

    const visiblePhaseLevelEvents = phaseLevelEvents.filter(
      (event) => phase.status !== 'running' || event.status !== 'pending' || hasRunningDescendant(event)
    );

    const deployStartTime = deployEvent?.startTime || Infinity;
    const eventsBeforeDeploy = visiblePhaseLevelEvents.filter((e) => e.startTime < deployStartTime);
    const eventsAfterDeploy = visiblePhaseLevelEvents.filter((e) => e.startTime >= deployStartTime);

    const hasPhaseLevelEvents = visiblePhaseLevelEvents.length > 0;
    const shouldShowPreparingMessage = isWaitingForDeployStart && !hasPhaseLevelEvents;

    const isDeployingNoProgress =
      phase.status === 'running' && !isDeploymentDone && deployEvent?.status === 'running' && !hasProgressData;

    const showGenericDeployMessage = isDeployingNoProgress && !isHotswapDeploy && !deployEvent?.additionalMessage;

    const hasSimpleStatusMessage =
      deployEvent?.status === 'running' &&
      deployEvent?.additionalMessage &&
      !showProgressUI &&
      !isHotswapDeploy &&
      !isDeploymentDone;
    const simpleStatusMessage = hasSimpleStatusMessage ? stripDeployMessageAnsi(deployEvent?.additionalMessage) : null;

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
          {eventsBeforeDeploy.map((event) => (
            <Event key={event.id} event={event} isTTY={true} isSnapshot={isSnapshot} />
          ))}

          {shouldShowPreparingMessage && (
            <Box>
              <SafeSpinner isSnapshot={isSnapshot} />
              <Text color="gray">
                {' '}
                {isDeleteOperation ? 'Preparing stack deletion...' : 'Preparing CloudFormation update...'}
              </Text>
            </Box>
          )}

          {showGenericDeployMessage && (
            <Box>
              <SafeSpinner isSnapshot={isSnapshot} />
              <Text color="gray">
                {' '}
                {isDeleteOperation ? 'Deleting using CloudFormation...' : 'Deploying using CloudFormation...'}
              </Text>
            </Box>
          )}

          {simpleStatusMessage && (
            <Box>
              <SafeSpinner isSnapshot={isSnapshot} />
              <Text color="gray"> {simpleStatusMessage}</Text>
            </Box>
          )}

          {shouldShowDeployAsEvent && (
            <Event key={deployEvent!.id} event={deployEvent!} isTTY={true} isSnapshot={isSnapshot} />
          )}

          {isCloudFormationDeploy && showProgressUI && (
            <Box flexDirection="column" marginTop={1}>
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
                    <SafeSpinner isSnapshot={isSnapshot} />
                    <Text color="gray"> Estimating progress...</Text>
                  </Box>
                )}
              </Box>
            </Box>
          )}

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

          {isCloudFormationDeploy &&
            isDeploymentDone &&
            (() => {
              const nothingToUpdate =
                !isDeleteOperation &&
                summaryCounts.created === 0 &&
                summaryCounts.updated === 0 &&
                summaryCounts.deleted === 0;
              return (
                <Box flexDirection="column" marginTop={0}>
                  <Box>
                    <Text color={deployEvent?.status === 'success' ? 'green' : 'red'}>
                      {deployEvent?.status === 'success' ? '✓' : '✗'}
                    </Text>
                    <Text> {isDeleteOperation ? 'Deleting' : 'Deploying'}</Text>
                    {deployEvent?.duration !== undefined && (
                      <Text color="yellow"> {formatDuration(deployEvent.duration)}</Text>
                    )}
                    {nothingToUpdate && <Text color="gray"> Nothing to update</Text>}
                  </Box>
                  {!isDeleteOperation && !nothingToUpdate && (
                    <Box flexDirection="column" marginLeft={3}>
                      <Box>
                        <Text color="gray">├ </Text>
                        <Text>Created: {summaryCounts.created}</Text>
                        {formatListSummary(detailLists.created, summaryCounts.created, 4) && (
                          <Text color="gray">
                            {' '}
                            ({formatListSummary(detailLists.created, summaryCounts.created, 4)})
                          </Text>
                        )}
                      </Box>
                      <Box>
                        <Text color="gray">├ </Text>
                        <Text>Updated: {summaryCounts.updated}</Text>
                        {formatListSummary(detailLists.updated, summaryCounts.updated, 4) && (
                          <Text color="gray">
                            {' '}
                            ({formatListSummary(detailLists.updated, summaryCounts.updated, 4)})
                          </Text>
                        )}
                      </Box>
                      <Box>
                        <Text color="gray">└ </Text>
                        <Text>Deleted: {summaryCounts.deleted}</Text>
                        {formatListSummary(detailLists.deleted, summaryCounts.deleted, 4) && (
                          <Text color="gray">
                            {' '}
                            ({formatListSummary(detailLists.deleted, summaryCounts.deleted, 4)})
                          </Text>
                        )}
                      </Box>
                    </Box>
                  )}
                  {isDeleteOperation && (
                    <Box marginLeft={3}>
                      <Text color="gray">└ </Text>
                      <Text>Deleted: {summaryCounts.deleted}</Text>
                      {formatListSummary(detailLists.deleted, summaryCounts.deleted, 4) && (
                        <Text color="gray"> ({formatListSummary(detailLists.deleted, summaryCounts.deleted, 4)})</Text>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })()}

          {isHotswapDeploy && isDeploymentDone && (
            <Box flexDirection="column" marginTop={0}>
              <Box>
                <Text color="green">✓</Text>
                <Text> Hotswap deployment completed.</Text>
              </Box>
            </Box>
          )}

          {eventsAfterDeploy.map((event) => (
            <Event key={event.id} event={event} isTTY={true} isSnapshot={isSnapshot} />
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
  }
);

DeployPhase.displayName = 'DeployPhase';
