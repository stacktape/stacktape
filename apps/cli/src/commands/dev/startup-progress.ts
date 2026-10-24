import { tuiManager } from '@application-services/tui-manager';
import { agentLog } from './agent-logger';

/**
 * The steps a dev session reports while it starts. A first start can spend several minutes creating the dev network
 * and deploying the dev stack; these events let an agent or an MCP client tell that work from a hung start.
 */
type DevStartupStep = 'DEV_NETWORK' | 'DEV_BOX' | 'DEV_STACK' | 'DEV_WORKLOAD' | 'DEV_DATABASE' | 'DEV_SESSION';

const DEV_STARTUP_PHASE = 'DEV_STARTUP';

let reporting = false;
let currentStep: string | undefined;
let startedAt = 0;

/** Turns startup reporting on for an agent-mode session, whose JSONL output its parent passes on. */
export const startDevStartupReporting = () => {
  reporting = true;
  startedAt = Date.now();
  currentStep = undefined;
};

export const stopDevStartupReporting = () => {
  reporting = false;
};

/**
 * Writes one dev lifecycle step to the session's log file with `source: "dev"` and, while an agent-mode session
 * starts, reports it as a JSONL `event` record. The interactive dashboard shows the same steps itself.
 */
export const reportDevStartup = ({
  step,
  status,
  message,
  resource,
  level = 'info'
}: {
  step: DevStartupStep;
  status: 'started' | 'running' | 'completed';
  message: string;
  /** The workload or database the event is about. */
  resource?: string;
  level?: 'info' | 'warn' | 'error';
}) => {
  agentLog('dev', message, level);
  if (!reporting) return;
  if (status !== 'completed') currentStep = message;
  else if (currentStep === message) currentStep = undefined;
  tuiManager.emitEvent({
    phase: DEV_STARTUP_PHASE,
    eventType: step,
    status,
    message,
    ...(resource ? { instanceId: resource } : {})
  });
};

/**
 * A heartbeat while the session starts, naming the step it waits for. Creating the dev network reports nothing for
 * minutes, and both the daemon parent and MCP clients that reset their timeout on progress need regular output.
 */
export const reportDevStartupHeartbeat = () => {
  if (!reporting) return;
  const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
  tuiManager.emitEvent({
    phase: DEV_STARTUP_PHASE,
    eventType: 'DEV_SESSION',
    status: 'running',
    message: `Still starting${currentStep ? `: ${currentStep}` : ''} (${elapsedSeconds} s)`
  });
};
