import { tuiManager } from '@application-services/tui-manager';
import { agentLog } from './agent-logger';

/**
 * The steps a dev session reports while it starts. A first start can spend several minutes creating the dev network
 * and deploying the dev stack; these events let an agent or an MCP client tell that work from a hung start.
 */
type DevStartupStep = 'DEV_NETWORK' | 'DEV_BOX' | 'DEV_STACK' | 'DEV_WORKLOAD' | 'DEV_DATABASE' | 'DEV_SESSION';

const DEV_STARTUP_PHASE = 'DEV_STARTUP';

let reporting = false;
let startedAt = 0;
/**
 * The steps that started and have not completed, with the latest message of each, in the order they started. Workloads
 * and databases start in parallel, so several can wait at once.
 */
const pendingSteps = new Map<string, string>();
/** Every workload that started, for the "2 of 3 workloads running" count. */
const startedWorkloads = new Set<string>();

/** Turns startup reporting on for an agent-mode session, whose JSONL output its parent passes on. */
export const startDevStartupReporting = () => {
  reporting = true;
  startedAt = Date.now();
  pendingSteps.clear();
  startedWorkloads.clear();
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
  key,
  level = 'info'
}: {
  step: DevStartupStep;
  status: 'started' | 'running' | 'completed';
  message: string;
  /** The workload or database the event is about. */
  resource?: string;
  /** Tells apart steps of one kind that are not about a resource, such as the setup steps; the resource by default. */
  key?: string;
  level?: 'info' | 'warn' | 'error';
}) => {
  agentLog('dev', message, level);
  if (!reporting) return;
  const id = `${step}:${key ?? resource ?? ''}`;
  if (status === 'completed') pendingSteps.delete(id);
  else pendingSteps.set(id, message);
  if (step === 'DEV_WORKLOAD') startedWorkloads.add(id);
  tuiManager.emitEvent({
    phase: DEV_STARTUP_PHASE,
    eventType: step,
    status,
    message,
    ...(resource ? { instanceId: resource } : {})
  });
  // The latest event is what a client shows as the progress: after one of several parallel steps completes, say which
  // ones still run.
  if (status === 'completed' && pendingSteps.size) emitStillStarting();
};

/** What the start still waits for: every pending step, and how many workloads run. */
export const describePendingStartup = () => {
  const parts = [...pendingSteps.values()];
  if (startedWorkloads.size) {
    const waiting = [...startedWorkloads].filter((id) => pendingSteps.has(id)).length;
    if (waiting) parts.push(`${startedWorkloads.size - waiting} of ${startedWorkloads.size} workloads running`);
  }
  return parts.join('; ');
};

const emitStillStarting = () => {
  const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
  const pending = describePendingStartup();
  tuiManager.emitEvent({
    phase: DEV_STARTUP_PHASE,
    eventType: 'DEV_SESSION',
    status: 'running',
    message: `Still starting${pending ? `: ${pending}` : ''} (${elapsedSeconds} s)`
  });
};

/**
 * A heartbeat while the session starts, naming the step it waits for. Creating the dev network reports nothing for
 * minutes, and both the daemon parent and MCP clients that reset their timeout on progress need regular output.
 */
export const reportDevStartupHeartbeat = () => {
  if (reporting) emitStillStarting();
};
