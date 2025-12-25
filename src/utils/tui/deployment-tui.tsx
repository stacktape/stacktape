// Deployment TUI - Beautiful phase-based progress display
// Reads from formattedEventLogData and groups events into phases

import type { Instance } from 'ink';
import type { FormattedEventData } from '../../app/event-manager/event-log';
import type { PhaseMapping } from './types';
import type { ExpectedError, UnexpectedError } from '../errors';
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

// Log item component - displays a captured log within a phase
const LogItem = ({ log }: { log: CapturedLog }) => {
  const getLogColor = (type: CapturedLog['type']) => {
    switch (type) {
      case 'ERROR':
        return colors.error;
      case 'WARN':
        return colors.warning;
      case 'SUCCESS':
        return colors.success;
      case 'INFO':
        return colors.info;
      case 'HINT':
        return colors.primary;
      case 'DEBUG':
        return colors.gray500;
      case 'START':
        return colors.gray400;
      default:
        return colors.gray400;
    }
  };

  const getLogIcon = (type: CapturedLog['type']) => {
    switch (type) {
      case 'ERROR':
        return symbols.error;
      case 'WARN':
        return '⚠';
      case 'SUCCESS':
        return symbols.success;
      case 'HINT':
        return 'ℹ';
      case 'INFO':
      case 'DEBUG':
      case 'START':
      default:
        return symbols.bullet;
    }
  };

  return (
    <Box>
      <Text color={getLogColor(log.type)}>{getLogIcon(log.type)}</Text>
      <Text> </Text>
      <Text color={colors.gray400}>[{log.type}]</Text>
      <Text> </Text>
      <Text color={colors.gray300}>{log.message}</Text>
    </Box>
  );
};

// Phase section component
const PhaseSection = ({ phaseData, logs }: { phaseData: PhaseWithEvents; logs: CapturedLog[] }) => {
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

  // Get logs for this phase (match by eventType)
  const phaseEventTypes = new Set(events.map((e) => e.eventType));
  const phaseLogs = logs.filter((log) => log.eventType && phaseEventTypes.has(log.eventType as any));

  return (
    <Box flexDirection="column" marginTop={1} width={BOX_WIDTH + 2}>
      {/* Phase header */}
      <Box width={BOX_WIDTH + 2}>
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

          {/* Logs for this phase */}
          {phaseLogs.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              {phaseLogs.map((log, idx) => (
                <LogItem key={idx} log={log} />
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

// Error display component
const ErrorDisplay = ({ error }: { error: ExpectedError | UnexpectedError }) => {
  const isExpected = error.isExpected;
  const errorTitle = isExpected ? 'DEPLOYMENT FAILED' : 'UNEXPECTED ERROR';
  const errorType = error.details?.errorType || 'ERROR';
  const horizontalLine = symbols.horizontal.repeat(BOX_WIDTH);

  // Parse hints
  const hints = error.isExpected ? (error as ExpectedError).hint : null;
  const hintArray = hints ? (Array.isArray(hints) ? hints : [hints]) : [];

  // Parse stack trace if available
  const stackTrace = error.details?.prettyStackTrace;
  const stackLines = stackTrace ? stackTrace.split('\n').slice(0, 10) : []; // Limit to 10 lines

  return (
    <Box flexDirection="column" width={BOX_WIDTH + 2} marginTop={1}>
      {/* Error header */}
      <Text color={colors.gray700}>
        {symbols.topLeft}
        {horizontalLine}
        {symbols.topRight}
      </Text>
      <Box width={BOX_WIDTH + 2}>
        <Text color={colors.gray700}>{symbols.vertical} </Text>
        <Text bold color={colors.error}>
          {symbols.error} {errorTitle}
        </Text>
        <Box flexGrow={1} />
        <Text color={colors.gray700}> {symbols.vertical}</Text>
      </Box>
      <Text color={colors.gray700}>
        {symbols.bottomLeft}
        {horizontalLine}
        {symbols.topRight}
      </Text>

      {/* Error type badge */}
      <Box marginTop={1}>
        <Text color={colors.error} bold>
          [{errorType}]
        </Text>
      </Box>

      {/* Error message */}
      <Box marginTop={1} flexDirection="column">
        <Text color={colors.white} wrap="wrap">
          {error.message}
        </Text>
      </Box>

      {/* Hints */}
      {hintArray.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.info} bold>
            {symbols.lightbulb} Hints:
          </Text>
          {hintArray.map((hint, idx) => (
            <Box key={idx} marginLeft={2} marginTop={idx > 0 ? 1 : 0}>
              <Text color={colors.gray600}>{symbols.bullet} </Text>
              <Text color={colors.gray300} wrap="wrap">
                {hint}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Stack trace (dev mode) */}
      {stackLines.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.gray500} dimColor>
            Stack trace:
          </Text>
          {stackLines.map((line, idx) => (
            <Text key={idx} color={colors.gray600} dimColor>
              {line}
            </Text>
          ))}
        </Box>
      )}

      {/* Sentry ID if available */}
      {error.details?.sentryEventId && (
        <Box marginTop={1}>
          <Text color={colors.gray500}>Error ID: </Text>
          <Text color={colors.gray400}>{error.details.sentryEventId}</Text>
        </Box>
      )}

      {/* Help footer */}
      <Box marginTop={1} flexDirection="column">
        <Text color={colors.gray600}>
          {symbols.lineDash.repeat(BOX_WIDTH + 2)}
        </Text>
        <Text color={colors.gray500}>
          Need help? Join our Discord: https://discord.gg/gSvzRWe3YD
        </Text>
      </Box>
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
    <Box flexDirection="column" width={BOX_WIDTH + 2}>
      <Text color={colors.gray700}>
        {symbols.topLeft}
        {horizontalLine}
        {symbols.topRight}
      </Text>
      <Box width={BOX_WIDTH + 2}>
        <Text color={colors.gray700}>{symbols.vertical} </Text>
        <Text bold color={colors.primary}>
          {statusText}
        </Text>
        <Box flexGrow={1} />
        <Text color={colors.gray700}> {symbols.vertical}</Text>
      </Box>
      <Box width={BOX_WIDTH + 2}>
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
const DeploymentTuiApp = ({
  getState
}: {
  getState: () => {
    config: TuiConfig;
    events: FormattedEventData[];
    logs: CapturedLog[];
    error?: ExpectedError | UnexpectedError;
  };
}) => {
  const [, setTick] = useState(0);

  // Re-render periodically for spinner animation and time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const { config, events, logs, error } = getState();
  const phases = groupEventsIntoPhases(events, config.command);

  // Only render phases that have events
  const visiblePhases = phases.filter((p) => p.events.length > 0);

  // If there's an error, show error display instead of/after phases
  if (error) {
    return (
      <Box flexDirection="column" width={BOX_WIDTH + 2}>
        <Header config={config} />
        {visiblePhases.map((phaseData) => (
          <PhaseSection key={phaseData.phase.phaseId} phaseData={phaseData} logs={logs} />
        ))}
        <ErrorDisplay error={error} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={BOX_WIDTH + 2}>
      <Header config={config} />
      {visiblePhases.map((phaseData) => (
        <PhaseSection key={phaseData.phase.phaseId} phaseData={phaseData} logs={logs} />
      ))}
    </Box>
  );
};

export type CapturedLog = {
  message: string;
  type: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'HINT' | 'SUCCESS' | 'START';
  timestamp: number;
  eventType?: string; // Which event was active when this log was captured
};

// Singleton TUI manager
class DeploymentTuiManager {
  private inkInstance: Instance | null = null;
  private config: TuiConfig | null = null;
  private events: FormattedEventData[] = [];
  private capturedLogs: CapturedLog[] = [];
  private error: ExpectedError | UnexpectedError | null = null;
  private isStarted = false;

  start(config: TuiConfig) {
    if (this.isStarted) return;
    if (!process.stdout.isTTY) return;

    this.isStarted = true;
    this.config = config;
    this.events = [];
    this.capturedLogs = [];
    this.error = null;

    this.inkInstance = render(
      <DeploymentTuiApp
        getState={() => ({
          config: this.config!,
          events: this.events,
          logs: this.capturedLogs,
          error: this.error ?? undefined
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

  captureLog(log: Omit<CapturedLog, 'timestamp'>) {
    if (!this.isStarted) return;
    this.capturedLogs.push({
      ...log,
      timestamp: Date.now()
    });
  }

  showError(error: ExpectedError | UnexpectedError) {
    if (!this.isStarted) return;
    this.error = error;
    // Give TUI time to render the error before stopping
    // This ensures the error is visible to the user
  }

  complete() {
    // No-op - phases complete automatically based on event status
  }

  stop() {
    if (this.inkInstance) {
      // Unmount the TUI - this will clear the alternate screen buffer
      // The last rendered frame will remain visible in the terminal
      this.inkInstance.unmount();
      this.inkInstance = null;
    }
    this.isStarted = false;
    this.config = null;
    this.events = [];
    this.capturedLogs = [];
    this.error = null;
  }

  get isActive() {
    return this.isStarted;
  }
}

export const deploymentTui = new DeploymentTuiManager();
