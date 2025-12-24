// Deployment TUI - Beautiful phase-based progress display
// Reads from formattedEventLogData and groups events into phases

import type { Instance } from 'ink';
import type { FormattedEventData } from '../../app/event-manager/event-log';
import type { PhaseMapping } from './types';
import { Box, render, Text } from 'ink';
import Spinner from 'ink-spinner';
import { useEffect, useState } from 'react';
import { colors, symbols } from './theme';
import { formatDuration, formatTime } from './utils';
import { deployPhases, deletePhases } from './phases';

const BOX_WIDTH = 70; // Inner width (total width = 72 with borders)

type TuiConfig = {
  command: 'deploy' | 'delete' | 'dev';
  stackName: string;
  stage: string;
  region: string;
};

// Phase with its events
type PhaseWithEvents = {
  phase: PhaseMapping;
  phaseNumber: number;
  events: FormattedEventData[];
  status: 'pending' | 'active' | 'completed';
  startedAt?: number;
  duration?: number;
};

// Group events into phases
const groupEventsIntoPhases = (
  events: FormattedEventData[],
  command: 'deploy' | 'delete' | 'dev'
): PhaseWithEvents[] => {
  const phaseDefinitions = command === 'delete' ? deletePhases : deployPhases;

  return phaseDefinitions.map((phase, index) => {
    const phaseEvents = events.filter((event) => phase.eventTypes.includes(event.eventType));

    let status: 'pending' | 'active' | 'completed' = 'pending';
    let startedAt: number | undefined;
    let duration: number | undefined;

    if (phaseEvents.length > 0) {
      const startedEvents = phaseEvents.filter((e) => e.started !== null && e.started > 0);
      const allCompleted = phaseEvents.every((e) => e.duration !== null);
      const anyStarted = startedEvents.length > 0;

      if (allCompleted && anyStarted) {
        status = 'completed';
        startedAt = Math.min(...startedEvents.map((e) => e.started));
        const finishedEvents = phaseEvents.filter((e) => e.finished !== null && e.finished > 0);
        const lastFinished = finishedEvents.length > 0 ? Math.max(...finishedEvents.map((e) => e.finished)) : startedAt;
        duration = lastFinished - startedAt;
      } else if (anyStarted) {
        status = 'active';
        startedAt = Math.min(...startedEvents.map((e) => e.started));
      }
    }

    return {
      phase,
      phaseNumber: index + 1,
      events: phaseEvents,
      status,
      startedAt,
      duration
    };
  });
};

// Child event row (workload under a parent event)
const ChildEventRow = ({ child }: { child: FormattedEventData['childEvents'][0] }) => {
  const isFinished = child.duration !== null && child.duration !== undefined;
  const lastEvent = child.events[child.events.length - 1];
  const currentStep = lastEvent?.message || '';
  const currentAdditional = lastEvent?.additionalMessage || '';

  return (
    <Box>
      <Text color={colors.gray600}>{symbols.treeCorner} </Text>
      {isFinished ? (
        <Text color={colors.success}>{symbols.success}</Text>
      ) : (
        <Text color={colors.primary}>
          <Spinner type="dots" />
        </Text>
      )}
      <Text> </Text>
      <Text color={colors.warning}>{child.id}</Text>
      {!isFinished && currentStep && (
        <Text color={colors.gray500}>
          {' '}
          {symbols.arrowRight} {currentStep}
          {currentAdditional ? ` ${currentAdditional}` : ''}
        </Text>
      )}
      {isFinished && child.duration && <Text color={colors.gray500}> {formatDuration(child.duration)}</Text>}
      {isFinished && child.finalMessage && <Text color={colors.gray500}> {child.finalMessage}</Text>}
    </Box>
  );
};

// Event row with optional children
const EventRow = ({ event }: { event: FormattedEventData }) => {
  const { message, duration, additionalMessage, childEvents } = event;
  const isFinished = duration !== null;

  return (
    <Box flexDirection="column">
      {/* Main event line */}
      <Box>
        {isFinished ? (
          <Text color={colors.success}>{symbols.success}</Text>
        ) : (
          <Text color={colors.primary}>
            <Spinner type="dots" />
          </Text>
        )}
        <Text> </Text>
        <Text color={colors.white}>{message}</Text>
        {additionalMessage && !isFinished && <Text color={colors.gray500}> {additionalMessage}</Text>}
        {isFinished && duration && <Text color={colors.gray500}> {formatDuration(duration)}</Text>}
      </Box>

      {/* Child events (workloads) */}
      {childEvents.length > 0 && (
        <Box flexDirection="column" marginLeft={2}>
          {childEvents.map((child) => (
            <ChildEventRow key={child.id} child={child} />
          ))}
        </Box>
      )}
    </Box>
  );
};

// Phase section component
const PhaseSection = ({ phaseData }: { phaseData: PhaseWithEvents }) => {
  const { phase, phaseNumber, events, status, startedAt, duration } = phaseData;
  const now = Date.now();

  // Don't render empty pending phases
  if (status === 'pending' && events.length === 0) {
    return null;
  }

  // Calculate time display
  let timeDisplay = '';
  if (status === 'completed' && duration) {
    timeDisplay = formatTime(duration);
  } else if (status === 'active' && startedAt) {
    timeDisplay = formatTime(now - startedAt);
  }

  // Phase header color
  const headerColor = status === 'pending' ? colors.gray500 : colors.white;

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Phase header */}
      <Box>
        <Text color={colors.gray500}>
          PHASE {phaseNumber} {symbols.bullet}{' '}
        </Text>
        <Text bold color={headerColor}>
          {phase.phaseName}
        </Text>
        <Box flexGrow={1} />
        {timeDisplay && <Text color={colors.gray400}>{timeDisplay}</Text>}
      </Box>

      {/* Separator line */}
      <Text color={colors.gray700}>{symbols.lineDash.repeat(BOX_WIDTH + 2)}</Text>

      {/* Events */}
      {status !== 'pending' && (
        <Box flexDirection="column" marginLeft={2}>
          {events.map((event) => (
            <EventRow key={event.eventType} event={event} />
          ))}
        </Box>
      )}
    </Box>
  );
};

// Header component
const Header = ({ config }: { config: TuiConfig }) => {
  const { command, stackName, stage, region } = config;

  if (!stackName) return null;

  const statusText = `${command.toUpperCase()}ING`;
  const horizontalLine = symbols.horizontal.repeat(BOX_WIDTH);

  return (
    <Box flexDirection="column">
      <Text color={colors.gray700}>
        {symbols.topLeft}
        {horizontalLine}
        {symbols.topRight}
      </Text>
      <Box>
        <Text color={colors.gray700}>{symbols.vertical} </Text>
        <Text bold color={colors.primary}>
          {statusText}
        </Text>
        <Box flexGrow={1} />
        <Text color={colors.gray700}> {symbols.vertical}</Text>
      </Box>
      <Box>
        <Text color={colors.gray700}>{symbols.vertical} </Text>
        <Text color={colors.white}>{stackName}</Text>
        <Text color={colors.gray500}>
          {' '}
          {symbols.arrowRight} {stage}
        </Text>
        <Text color={colors.gray600}> ({region})</Text>
        <Box flexGrow={1} />
        <Text color={colors.gray700}> {symbols.vertical}</Text>
      </Box>
      <Text color={colors.gray700}>
        {symbols.bottomLeft}
        {horizontalLine}
        {symbols.bottomRight}
      </Text>
    </Box>
  );
};

// Main TUI component
const DeploymentTuiApp = ({ getState }: { getState: () => { config: TuiConfig; events: FormattedEventData[] } }) => {
  const [, setTick] = useState(0);

  // Re-render periodically for spinner animation and time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const { config, events } = getState();
  const phases = groupEventsIntoPhases(events, config.command);

  // Only render phases that have events
  const visiblePhases = phases.filter((p) => p.events.length > 0);

  return (
    <Box flexDirection="column">
      <Header config={config} />
      {visiblePhases.map((phaseData) => (
        <PhaseSection key={phaseData.phase.phaseId} phaseData={phaseData} />
      ))}
    </Box>
  );
};

// Singleton TUI manager
class DeploymentTuiManager {
  private inkInstance: Instance | null = null;
  private config: TuiConfig | null = null;
  private events: FormattedEventData[] = [];
  private isStarted = false;

  start(config: TuiConfig) {
    if (this.isStarted) return;
    if (!process.stdout.isTTY) return;

    this.isStarted = true;
    this.config = config;
    this.events = [];

    this.inkInstance = render(
      <DeploymentTuiApp
        getState={() => ({
          config: this.config!,
          events: this.events
        })}
      />
    );
  }

  updateEvents(formattedEvents: FormattedEventData[]) {
    if (!this.isStarted || !this.config) return;
    this.events = formattedEvents;
  }

  updateStackInfo(config: { stackName: string; stage: string; region: string }) {
    if (!this.isStarted || !this.config) return;
    this.config = { ...this.config, ...config };
  }

  complete() {
    // No-op - phases complete automatically based on event status
  }

  stop() {
    if (this.inkInstance) {
      this.inkInstance.unmount();
      this.inkInstance = null;
    }
    this.isStarted = false;
    this.config = null;
    this.events = [];
  }

  get isActive() {
    return this.isStarted;
  }
}

export const deploymentTui = new DeploymentTuiManager();
