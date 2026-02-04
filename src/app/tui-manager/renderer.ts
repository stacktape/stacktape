import type { TuiEvent, TuiPhase, TuiState } from './types';
import { logCollectorStream } from '@utils/log-collector';
import { box as clackBox, note as clackNote } from '@clack/prompts';
import logUpdate from 'log-update';
import { PHASE_NAMES } from './types';
import { formatDuration, stripAnsi } from './utils';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const PROGRESS_BAR_WIDTH = 50;

type ColorFn = (color: string, text: string) => string;
type BoldFn = (text: string) => string;

// Deploy event types that use CloudFormation
const DEPLOY_EVENT_TYPES: LoggableEventType[] = ['UPDATE_STACK', 'DELETE_STACK', 'ROLLBACK_STACK', 'HOTSWAP_UPDATE'];

// ─── Progress parsing utilities ───

const parseEstimatePercent = (message?: string): number | null => {
  const cleaned = stripAnsi(message);
  if (!cleaned) return null;
  const match = cleaned.match(/Estimate:\s*~(<)?(\d+)%/);
  if (!match) return null;
  const isLessThan = !!match[1];
  const value = Number(match[2]);
  if (!Number.isFinite(value)) return null;
  return isLessThan ? 1 : value;
};

const parseProgressCounts = (message?: string): { done: number | null; total: number | null } => {
  const cleaned = stripAnsi(message);
  if (!cleaned) return { done: null, total: null };
  const match = cleaned.match(/Progress:\s*(\d+)\/(\d+)/i);
  if (!match) return { done: null, total: null };
  return { done: Number(match[1]), total: Number(match[2]) };
};

const parseResourceState = (message?: string): { active: string | null; waiting: string | null } => {
  const cleaned = stripAnsi(message);
  if (!cleaned) return { active: null, waiting: null };
  const activeMatch = cleaned.match(/Currently updating:\s*([^.|]+)\./i);
  const waitingMatch = cleaned.match(/Waiting:\s*([^.|]+)\./i);
  return {
    active: activeMatch ? activeMatch[1].trim() : null,
    waiting: waitingMatch ? waitingMatch[1].trim() : null
  };
};

const parseStatusLine = (message?: string): string | null => {
  const cleaned = stripAnsi(message);
  if (!cleaned) return null;
  const match = cleaned.match(/Status:\s*([^.|]+)\./i);
  return match ? match[1].trim() : null;
};

const parseSummaryCounts = (message?: string): { created: number; updated: number; deleted: number } => {
  const cleaned = stripAnsi(message);
  if (!cleaned) return { created: 0, updated: 0, deleted: 0 };
  const match = cleaned.match(/Summary:\s*created=(\d+)\s*updated=(\d+)\s*deleted=(\d+)/i);
  if (!match) return { created: 0, updated: 0, deleted: 0 };
  return { created: Number(match[1]), updated: Number(match[2]), deleted: Number(match[3]) };
};

const parseDetailLists = (
  message?: string
): { created: string | null; updated: string | null; deleted: string | null } => {
  const cleaned = stripAnsi(message);
  if (!cleaned) return { created: null, updated: null, deleted: null };
  const match = cleaned.match(/Details:\s*created=([^;]+);\s*updated=([^;]+);\s*deleted=([^.]+)\./i);
  if (!match) return { created: null, updated: null, deleted: null };
  return { created: match[1].trim(), updated: match[2].trim(), deleted: match[3].trim() };
};

const getActiveDeployEvent = (events: TuiEvent[]): TuiEvent | undefined => {
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

/**
 * TTY renderer using log-update for ALL content.
 *
 * All output (completed phases + active phases) goes through logUpdate().
 * When a phase completes, its output is "frozen" into committedLines and rendered
 * at the top of every frame. This avoids mixing console.info with log-update,
 * which causes cursor tracking issues.
 */
export class TtyRenderer {
  private colorize: ColorFn;
  private makeBold: BoldFn;
  private spinnerFrame = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  /** Static lines that have been committed (completed phases, header). Always rendered at top. */
  private committedLines: string[] = [];
  /** Phase IDs that have been committed (to avoid re-committing) */
  private committedPhaseIds = new Set<string>();
  private phaseStartTimes = new Map<string, number>();
  /** Lines written to log collector for completed phases */
  private loggedPhaseIds = new Set<string>();
  private pausedPhaseIds = new Set<string>();

  constructor(colorize: ColorFn, makeBold?: BoldFn) {
    this.colorize = colorize;
    this.makeBold = makeBold || ((t) => t);
  }

  start() {
    this.committedLines = [];
    this.committedPhaseIds.clear();
    this.loggedPhaseIds.clear();
    this.phaseStartTimes.clear();
    this.spinnerFrame = 0;
    this.startSpinnerInterval();
  }

  /** Resume rendering without clearing committed state */
  resume() {
    this.startSpinnerInterval();
  }

  /**
   * Pause rendering for prompts.
   * Persists all current content (committed + dynamic) to the terminal,
   * then resets log-update so prompts render cleanly below.
   */
  pause(state: TuiState) {
    this.stopSpinnerInterval();
    const runningPhaseIds = state.phases.filter((phase) => phase.status === 'running').map((phase) => phase.id);
    this.pausedPhaseIds = new Set(runningPhaseIds);

    // Persist the current log-update frame to terminal, then reset tracking.
    // The running phase stays visible above the prompt as static terminal text.
    logUpdate.done();
  }

  /** Stop rendering and persist final output */
  stop() {
    this.stopSpinnerInterval();
    logUpdate.done();
  }

  /** Clear dynamic content and stop without persisting - used during Ctrl+C to avoid encoding issues */
  clearAndStop() {
    this.stopSpinnerInterval();
    logUpdate.clear();
  }

  private stopSpinnerInterval() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private startSpinnerInterval() {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.spinnerFrame = (this.spinnerFrame + 1) % SPINNER_FRAMES.length;
    }, 80);
  }

  render(state: TuiState) {
    // Commit header into committed lines once
    if (state.header && !this.committedPhaseIds.has('header')) {
      this.committedPhaseIds.add('header');
      logCollectorStream.write(
        `[${state.header.action}] ${state.header.projectName} → ${state.header.stageName} (${state.header.region})`
      );
    }

    // Commit completed phases (persists to stdout, resets log-update)
    this.commitCompletedPhases(state);

    // Render dynamic content (only running, uncommitted phases)
    const dynamicLines = this.buildDynamicContent(state);
    if (dynamicLines.length > 0) {
      logUpdate(dynamicLines.join('\n'));
    } else {
      logUpdate.clear();
    }
  }

  private commitCompletedPhases(state: TuiState) {
    for (const phase of state.phases) {
      if (this.committedPhaseIds.has(phase.id)) continue;

      const isCompleted = phase.status === 'success' || phase.status === 'error';
      const isFinalizingCurrent = state.isFinalizing && phase.id === state.currentPhase && phase.status === 'running';

      if (isCompleted || isFinalizingCurrent) {
        const wasPaused = this.pausedPhaseIds.has(phase.id);
        const phaseLines = wasPaused
          ? this.buildCompletedPhaseHeaderOnly(phase, state)
          : this.buildCompletedPhaseOutput(phase, state);
        this.persistCommittedLines(phaseLines);
        this.committedPhaseIds.add(phase.id);

        if (wasPaused) {
          this.pausedPhaseIds.delete(phase.id);
        }

        // Write to log collector once
        if (!this.loggedPhaseIds.has(phase.id)) {
          for (const line of phaseLines) {
            logCollectorStream.write(line);
          }
          this.loggedPhaseIds.add(phase.id);
        }
      }
    }
  }

  private buildDynamicContent(state: TuiState): string[] {
    const lines: string[] = [];

    const currentPhase = state.currentPhase
      ? state.phases.find((phase) => phase.id === state.currentPhase)
      : state.phases.find((phase) => phase.status === 'running');

    if (currentPhase && !this.committedPhaseIds.has(currentPhase.id) && currentPhase.status === 'running') {
      if (!this.phaseStartTimes.has(currentPhase.id)) {
        this.phaseStartTimes.set(currentPhase.id, currentPhase.startTime || Date.now());
      }

      lines.push(...this.buildActivePhaseOutput(currentPhase, state));
    }

    return lines;
  }

  private buildCompletedPhaseHeaderOnly(phase: TuiPhase, state: TuiState): string[] {
    const phaseNumber = state.phases.findIndex((p) => p.id === phase.id) + 1;
    const phaseName = state.phases.find((p) => p.id === phase.id)?.name || PHASE_NAMES[phase.id] || phase.id;
    const isSuccess = phase.status === 'success' || phase.status === 'running';
    const icon = isSuccess ? this.colorize('green', '✓') : this.colorize('red', '✖');
    const duration = phase.duration ? ` ${this.colorize('yellow', formatDuration(phase.duration))}` : '';
    return [`${icon} ${this.makeBold(`PHASE ${phaseNumber}`)} • ${phaseName}${duration}`];
  }

  private persistCommittedLines(lines: string[]) {
    if (lines.length === 0) return;
    // Clear any dynamic content log-update is tracking, then release it.
    // This prevents logUpdate.done() from flushing a stale running-phase frame.
    logUpdate('');
    logUpdate.clear();
    logUpdate.done();
    for (const line of lines) {
      console.info(line);
    }
  }

  /**
   * Commit the header. Called externally before the render loop starts,
   * because clackBox writes directly to stdout (not through log-update).
   */
  commitHeader(state: TuiState, options: { logToCollector?: boolean } = {}) {
    if (!state.header) return;
    const { header } = state;
    const project = this.makeBold(header.projectName);
    const stage = this.colorize('cyan', header.stageName);
    const region = this.colorize('gray', header.region);
    const detailText = `${project} → ${stage} (${region})`;
    const subtitle = header.subtitle ? `\n${this.colorize('gray', header.subtitle)}` : '';
    console.info('');
    clackBox(`${detailText}${subtitle}`, this.makeBold(` ${header.action} `), {
      rounded: true,
      width: 'auto',
      titleAlign: 'left',
      contentAlign: 'left'
    });
    if (options.logToCollector !== false) {
      logCollectorStream.write(
        `[${header.action}] ${header.projectName} → ${header.stageName} (${header.region})${
          header.subtitle ? ` | ${header.subtitle}` : ''
        }`
      );
    }
  }

  // ─── Active (running) phase rendering ───

  private buildActivePhaseOutput(phase: TuiPhase, state: TuiState): string[] {
    const lines: string[] = [];
    const phaseNumber = state.phases.findIndex((p) => p.id === phase.id) + 1;
    const phaseName = state.phases.find((p) => p.id === phase.id)?.name || PHASE_NAMES[phase.id] || phase.id;

    const simpleMode = state.showPhaseHeaders === false;
    const eventIndent = simpleMode ? 0 : 1;

    if (!simpleMode) {
      // Phase header with spinner and timer
      const spinner = this.colorize('cyan', SPINNER_FRAMES[this.spinnerFrame]);
      const elapsed = this.getElapsedTime(phase);
      const timerStr = this.colorize('gray', elapsed);

      lines.push('');
      lines.push(`${spinner} ${this.makeBold(`PHASE ${phaseNumber}`)} • ${phaseName} ${timerStr}`);
      lines.push(this.colorize('gray', '─'.repeat(54)));
    }

    // Special handling for deploy phase
    if (phase.id === 'DEPLOY') {
      lines.push(...this.buildDeployPhaseContent(phase, state));
    } else {
      // Regular phase content
      for (const event of phase.events) {
        lines.push(...this.buildEventOutput(event, eventIndent, true));
      }
    }

    // Warnings
    const phaseWarnings = state.warnings.filter((w) => w.phase === phase.id);
    for (const warning of phaseWarnings) {
      lines.push(`  ${this.colorize('yellow', '⚠')} ${warning.message}`);
    }

    // Messages
    const phaseMessages = state.messages.filter((m) => m.phase === phase.id);
    for (const msg of phaseMessages) {
      lines.push(`  ${this.getMessageIcon(msg.type)} ${msg.message}`);
    }

    return lines;
  }

  private buildDeployPhaseContent(phase: TuiPhase, _state: TuiState): string[] {
    const lines: string[] = [];
    const deployEvent = getActiveDeployEvent(phase.events);

    if (!deployEvent) {
      lines.push(`  ${this.colorize('cyan', SPINNER_FRAMES[this.spinnerFrame])} Preparing deployment...`);
      return lines;
    }

    const isHotswap = deployEvent.eventType === 'HOTSWAP_UPDATE';
    const isDelete = deployEvent.eventType === 'DELETE_STACK';
    const isRunning = deployEvent.status === 'running';
    const isComplete = deployEvent.status === 'success' || deployEvent.status === 'error';

    // For hotswap, render as regular events
    if (isHotswap) {
      for (const event of phase.events) {
        lines.push(...this.buildEventOutput(event, 1, true));
      }
      return lines;
    }

    const progressLines = this.buildDeployProgressLines(deployEvent, isRunning, isComplete, isDelete);
    const orderedEvents = [...new Map(phase.events.map((event) => [event.id, event])).values()].sort(
      (a, b) => (a.startTime ?? 0) - (b.startTime ?? 0) || a.id.localeCompare(b.id)
    );
    let progressInserted = false;

    for (const event of orderedEvents) {
      if (DEPLOY_EVENT_TYPES.includes(event.eventType)) {
        if (event.id === deployEvent.id && !progressInserted) {
          lines.push(...progressLines);
          progressInserted = true;
          continue;
        }
      }
      lines.push(...this.buildEventOutput(event, 1, true));
    }

    if (!progressInserted) {
      lines.push(...progressLines);
    }

    return lines;
  }

  private buildDeployProgressLines(
    deployEvent: TuiEvent,
    isRunning: boolean,
    isComplete: boolean,
    isDelete: boolean
  ): string[] {
    const lines: string[] = [];
    const additionalMsg = deployEvent.additionalMessage;
    const estimatePercent = parseEstimatePercent(additionalMsg);
    const progressCounts = parseProgressCounts(additionalMsg);
    const resourceState = parseResourceState(additionalMsg);
    const summaryCounts = parseSummaryCounts(additionalMsg);
    const statusLine = parseStatusLine(additionalMsg);

    let progressPercent: number | null = null;
    if (isComplete) {
      progressPercent = 100;
    } else if (estimatePercent !== null) {
      progressPercent = Math.max(0, Math.min(100, estimatePercent));
    } else if (progressCounts.done !== null && progressCounts.total) {
      progressPercent = Math.round((progressCounts.done / progressCounts.total) * 100);
    }

    const actionVerb = isDelete ? 'Deleting' : 'Deploying';

    if (isRunning) {
      if (statusLine) {
        lines.push(`  ${this.colorize('cyan', SPINNER_FRAMES[this.spinnerFrame])} ${statusLine}`);
      }
      if (progressPercent !== null) {
        const filledWidth = Math.round((progressPercent / 100) * PROGRESS_BAR_WIDTH);
        const emptyWidth = PROGRESS_BAR_WIDTH - filledWidth;
        const progressBar =
          this.colorize('green', '█'.repeat(filledWidth)) + this.colorize('gray', '░'.repeat(emptyWidth));
        const percentStr = `${progressPercent}%`;

        lines.push(`  ${progressBar} ${this.colorize('cyan', percentStr)}`);
        lines.push('');
      }

      if (progressCounts.done !== null && progressCounts.total !== null) {
        lines.push(
          `  ${this.colorize('gray', 'Done:')} ${this.colorize('green', String(progressCounts.done))}/${progressCounts.total} resources`
        );
      } else {
        lines.push(
          `  ${this.colorize('cyan', SPINNER_FRAMES[this.spinnerFrame])} ${actionVerb} infrastructure resources...`
        );
      }

      if (resourceState.active && resourceState.active !== 'none') {
        const resources = resourceState.active
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean);
        if (resources.length > 0) {
          lines.push(
            `  ${this.colorize('gray', 'In progress:')} ${resources.slice(0, 3).join(', ')}${resources.length > 3 ? ` +${resources.length - 3} more` : ''}`
          );
        }
      }

      if (resourceState.waiting && resourceState.waiting !== 'none') {
        const waiting = resourceState.waiting
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean);
        if (waiting.length > 0) {
          lines.push(
            `  ${this.colorize('gray', 'Waiting:')} ${waiting.slice(0, 3).join(', ')}${waiting.length > 3 ? ` +${waiting.length - 3} more` : ''}`
          );
        }
      }
    } else if (isComplete) {
      const icon = deployEvent.status === 'success' ? this.colorize('green', '✓') : this.colorize('red', '✖');
      const duration = deployEvent.duration ? ` ${this.colorize('yellow', formatDuration(deployEvent.duration))}` : '';
      lines.push(`  ${icon} ${actionVerb} complete${duration}`);

      if (summaryCounts.created > 0 || summaryCounts.updated > 0 || summaryCounts.deleted > 0) {
        const parts: string[] = [];
        if (summaryCounts.created > 0) {
          parts.push(`${this.colorize('green', `+${summaryCounts.created}`)} created`);
        }
        if (summaryCounts.updated > 0) {
          parts.push(`${this.colorize('yellow', `~${summaryCounts.updated}`)} updated`);
        }
        if (summaryCounts.deleted > 0) {
          parts.push(`${this.colorize('red', `-${summaryCounts.deleted}`)} deleted`);
        }
        lines.push(`  ${parts.join('  ')}`);
      }
    }

    return lines;
  }

  // ─── Completed phase rendering ───

  private buildCompletedPhaseOutput(phase: TuiPhase, state: TuiState): string[] {
    const lines: string[] = [];
    const phaseNumber = state.phases.findIndex((p) => p.id === phase.id) + 1;
    const phaseName = state.phases.find((p) => p.id === phase.id)?.name || PHASE_NAMES[phase.id] || phase.id;
    const simpleMode = state.showPhaseHeaders === false;
    const eventIndent = simpleMode ? 0 : 1;

    if (!simpleMode) {
      // Phase header with status icon and duration
      // Treat 'running' phases committed during finalization as successful (not errored)
      const isSuccess = phase.status === 'success' || phase.status === 'running';
      const icon = isSuccess ? this.colorize('green', '✓') : this.colorize('red', '✖');
      const duration = phase.duration ? ` ${this.colorize('yellow', formatDuration(phase.duration))}` : '';

      lines.push('');
      lines.push(`${icon} ${this.makeBold(`PHASE ${phaseNumber}`)} • ${phaseName}${duration}`);
      lines.push(this.colorize('gray', '─'.repeat(54)));
    }

    // Special handling for completed deploy phase
    if (phase.id === 'DEPLOY') {
      lines.push(...this.buildCompletedDeployContent(phase, simpleMode));
    } else {
      // Regular events
      for (const event of phase.events) {
        lines.push(...this.buildEventOutput(event, eventIndent, false));
      }
    }

    // Warnings
    const phaseWarnings = state.warnings.filter((w) => w.phase === phase.id);
    for (const warning of phaseWarnings) {
      lines.push(`  ${this.colorize('yellow', '⚠')} ${warning.message}`);
    }

    // Messages
    const phaseMessages = state.messages.filter((m) => m.phase === phase.id);
    for (const msg of phaseMessages) {
      lines.push(`  ${this.getMessageIcon(msg.type)} ${msg.message}`);
    }

    return lines;
  }

  private buildCompletedDeployContent(phase: TuiPhase, simpleMode = false): string[] {
    const lines: string[] = [];
    const deployEvent = getActiveDeployEvent(phase.events);
    const eventIndent = simpleMode ? 0 : 1;

    if (!deployEvent) {
      return lines;
    }

    const isHotswap = deployEvent.eventType === 'HOTSWAP_UPDATE';
    const isDelete = deployEvent.eventType === 'DELETE_STACK';

    // For hotswap, show as regular events
    if (isHotswap) {
      for (const event of phase.events) {
        lines.push(...this.buildEventOutput(event, eventIndent, false));
      }
      return lines;
    }

    const completionLines = this.buildDeployCompletionLines(deployEvent, isDelete, simpleMode);
    const orderedEvents = [...new Map(phase.events.map((event) => [event.id, event])).values()].sort(
      (a, b) => (a.startTime ?? 0) - (b.startTime ?? 0) || a.id.localeCompare(b.id)
    );
    let completionInserted = false;

    for (const event of orderedEvents) {
      if (DEPLOY_EVENT_TYPES.includes(event.eventType)) {
        if (event.id === deployEvent.id && !completionInserted) {
          lines.push(...completionLines);
          completionInserted = true;
          continue;
        }
      }
      lines.push(...this.buildEventOutput(event, eventIndent, false));
    }

    if (!completionInserted) {
      lines.push(...completionLines);
    }

    return lines;
  }

  private buildDeployCompletionLines(deployEvent: TuiEvent, isDelete: boolean, simpleMode = false): string[] {
    const lines: string[] = [];
    const summaryCounts = parseSummaryCounts(deployEvent.additionalMessage);
    const detailLists = parseDetailLists(deployEvent.additionalMessage);
    const actionVerb = isDelete ? 'Deleted' : 'Deployed';
    const indent = simpleMode ? '' : '  ';
    const subIndent = simpleMode ? '  ' : '    ';

    const icon = deployEvent.status === 'success' ? this.colorize('green', '✓') : this.colorize('red', '✖');
    const duration = deployEvent.duration ? ` ${this.colorize('yellow', formatDuration(deployEvent.duration))}` : '';
    lines.push(`${indent}${icon} ${actionVerb} infrastructure${duration}`);

    const totalChanges = summaryCounts.created + summaryCounts.updated + summaryCounts.deleted;
    if (totalChanges > 0) {
      if (isDelete) {
        lines.push(`${subIndent}${summaryCounts.deleted} resources removed`);
      } else {
        const parts: string[] = [];
        if (summaryCounts.created > 0) {
          parts.push(`${this.colorize('green', `+${summaryCounts.created}`)} created`);
        }
        if (summaryCounts.updated > 0) {
          parts.push(`${this.colorize('yellow', `~${summaryCounts.updated}`)} updated`);
        }
        if (summaryCounts.deleted > 0) {
          parts.push(`${this.colorize('red', `-${summaryCounts.deleted}`)} deleted`);
        }
        lines.push(`${subIndent}${parts.join('  ')}`);

        if (detailLists.created && detailLists.created !== 'none') {
          const resources = detailLists.created
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean);
          if (resources.length > 0) {
            lines.push(`${subIndent}${this.colorize('gray', 'Created:')} ${this.formatResourceList(resources)}`);
          }
        }
        if (detailLists.updated && detailLists.updated !== 'none') {
          const resources = detailLists.updated
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean);
          if (resources.length > 0) {
            lines.push(`${subIndent}${this.colorize('gray', 'Updated:')} ${this.formatResourceList(resources)}`);
          }
        }
        if (detailLists.deleted && detailLists.deleted !== 'none') {
          const resources = detailLists.deleted
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean);
          if (resources.length > 0) {
            lines.push(`${subIndent}${this.colorize('gray', 'Deleted:')} ${this.formatResourceList(resources)}`);
          }
        }
      }
    }

    return lines;
  }

  // ─── Event rendering ───

  private buildEventOutput(event: TuiEvent, indent: number, isDynamic: boolean, treeConnector?: string): string[] {
    const lines: string[] = [];
    const basePrefix = '  '.repeat(indent);
    const prefix = treeConnector !== undefined ? `${basePrefix}${treeConnector}` : basePrefix;
    const icon = this.getStatusIcon(event.status, isDynamic);
    const isChild = treeConnector !== undefined;

    const label = isChild
      ? event.instanceId || event.description
      : event.instanceId
        ? `${event.description} (${event.instanceId})`
        : event.description;

    let line = `${prefix}${icon} ${label}`;

    if (event.status === 'running' && event.additionalMessage) {
      const cleanMsg = stripAnsi(event.additionalMessage)?.trim();
      if (cleanMsg && cleanMsg.length < 60 && !cleanMsg.includes('Progress:')) {
        line += ` ${this.colorize('gray', cleanMsg)}`;
      }
    } else if ((event.status === 'success' || event.status === 'error') && event.duration) {
      line += ` ${this.colorize('yellow', formatDuration(event.duration))}`;
    }

    if (event.finalMessage && (event.status === 'success' || event.status === 'error')) {
      line += ` ${this.colorize('gray', event.finalMessage)}`;
    }

    lines.push(line);

    // Output lines
    if (event.outputLines && event.outputLines.length > 0) {
      const outputPrefix = `${basePrefix}   `;
      for (const outputLine of event.outputLines) {
        if (outputLine.trim()) {
          lines.push(`${outputPrefix}${this.colorize('gray', outputLine)}`);
        }
      }
    }

    // Children - use tree-drawing characters (├, └)
    const showChildren = event.status === 'running' || !event.hideChildrenWhenFinished;
    if (showChildren && event.children.length > 0) {
      for (let i = 0; i < event.children.length; i++) {
        const child = event.children[i];
        const isLast = i === event.children.length - 1;
        const connector = this.colorize('gray', isLast ? '└ ' : '├ ');
        lines.push(...this.buildEventOutput(child, indent + 1, isDynamic, connector));
      }
    }

    return lines;
  }

  // ─── Summary rendering ───

  commitSummary(state: TuiState) {
    if (!state.summary) return;
    const { summary } = state;

    console.info('');
    const icon = summary.success ? this.colorize('green', '✓') : this.colorize('red', '✖');
    const message = `${icon} ${this.makeBold(summary.message)}`;

    // Build note content for links
    const noteLines: string[] = [];
    if (summary.links.length > 0) {
      for (const link of summary.links) {
        noteLines.push(`${this.colorize('cyan', '→')} ${link.label}`);
        noteLines.push(`  ${this.colorize('blue', link.url)}`);
      }
    }
    if (summary.consoleUrl) {
      if (noteLines.length > 0) noteLines.push('');
      noteLines.push(`${this.colorize('gray', 'Stack details:')} ${this.colorize('blue', summary.consoleUrl)}`);
    }

    if (noteLines.length > 0) {
      clackNote(noteLines.join('\n'), message, { format: (line: string) => line });
    } else {
      console.info(message);
      console.info('');
    }

    logCollectorStream.write(summary.message);
    for (const link of summary.links) {
      logCollectorStream.write(`${link.label}: ${link.url}`);
    }
  }

  // ─── Helpers ───

  private getElapsedTime(phase: TuiPhase): string {
    const startTime = this.phaseStartTimes.get(phase.id) || phase.startTime || Date.now();
    const elapsed = Date.now() - startTime;
    return formatDuration(elapsed);
  }

  private formatResourceList(resources: string[], max = 5): string {
    if (resources.length <= max) {
      return resources.join(', ');
    }
    return `${resources.slice(0, max).join(', ')}, +${resources.length - max} more`;
  }

  private getStatusIcon(status: string, isDynamic: boolean): string {
    switch (status) {
      case 'success':
        return this.colorize('green', '✓');
      case 'error':
        return this.colorize('red', '✖');
      case 'running':
        return isDynamic ? this.colorize('cyan', SPINNER_FRAMES[this.spinnerFrame]) : this.colorize('cyan', '●');
      case 'warning':
        return this.colorize('yellow', '⚠');
      default:
        return this.colorize('gray', '○');
    }
  }

  private getMessageIcon(type: string): string {
    switch (type) {
      case 'success':
        return this.colorize('green', '✓');
      case 'error':
        return this.colorize('red', '✖');
      case 'warn':
        return this.colorize('yellow', '⚠');
      case 'hint':
        return this.colorize('blue', '💡');
      case 'info':
        return this.colorize('cyan', 'ℹ');
      case 'question':
        return this.colorize('cyan', '?');
      default:
        return this.colorize('gray', '●');
    }
  }

  reset() {
    this.committedLines = [];
    this.committedPhaseIds.clear();
    this.loggedPhaseIds.clear();
    this.phaseStartTimes.clear();
    this.pausedPhaseIds.clear();
  }
}

/**
 * Non-TTY renderer for CI/CD environments.
 * Outputs plain text, one line at a time (append-only).
 */
export class NonTtyRenderer {
  private printedItems = new Set<string>();
  private lastAdditionalMessages = new Map<string, string>();

  reset() {
    this.printedItems.clear();
    this.lastAdditionalMessages.clear();
  }

  render(state: TuiState) {
    // Header
    if (state.header && !this.printedItems.has('header')) {
      this.printHeader(state);
      this.printedItems.add('header');
    }

    // Phases
    for (const phase of state.phases) {
      this.renderPhase(phase, state);
    }

    // Global messages
    const globalMessages = state.messages.filter((m) => !m.phase);
    for (const msg of globalMessages) {
      const msgKey = `msg-${msg.id}`;
      if (!this.printedItems.has(msgKey)) {
        const prefix = this.getMessagePrefix(msg.type);
        this.log(`${prefix} ${msg.message}`);
        this.printedItems.add(msgKey);
      }
    }

    // Summary
    if (state.summary && !this.printedItems.has('summary')) {
      this.printSummary(state);
      this.printedItems.add('summary');
    }
  }

  private log(message: string) {
    console.info(message);
    logCollectorStream.write(message);
  }

  private printHeader(state: TuiState) {
    if (!state.header) return;
    const { header } = state;
    const subtitleLine = header.subtitle ? `| ${header.subtitle.padEnd(68)} |` : null;
    this.log('');
    this.log('+----------------------------------------------------------------------+');
    this.log(`| ${header.action.padEnd(68)} |`);
    this.log(`| ${`${header.projectName} -> ${header.stageName} (${header.region})`.padEnd(68)} |`);
    if (subtitleLine) {
      this.log(subtitleLine);
    }
    this.log('+----------------------------------------------------------------------+');
    this.log('');
  }

  private renderPhase(phase: TuiPhase, state: TuiState) {
    const phaseKey = `phase-${phase.id}`;
    const phaseNumber = state.phases.findIndex((p) => p.id === phase.id) + 1;
    const phaseName = state.phases.find((p) => p.id === phase.id)?.name || PHASE_NAMES[phase.id] || phase.name;
    const simpleMode = state.showPhaseHeaders === false;
    const eventIndent = simpleMode ? 0 : 1;

    if (phase.status !== 'pending' && !this.printedItems.has(phaseKey) && !simpleMode) {
      this.log('');
      this.log(`PHASE ${phaseNumber} • ${phaseName}`);
      this.log('------------------------------------------------------');
      this.printedItems.add(phaseKey);
    }

    for (const event of phase.events) {
      this.renderEvent(event, eventIndent);
    }

    // Warnings
    const phaseWarnings = state.warnings.filter((w) => w.phase === phase.id);
    for (const warning of phaseWarnings) {
      const warnKey = `warn-${warning.id}`;
      if (!this.printedItems.has(warnKey)) {
        this.log(`  [!] ${warning.message}`);
        this.printedItems.add(warnKey);
      }
    }

    // Messages
    const phaseMessages = state.messages.filter((m) => m.phase === phase.id);
    for (const msg of phaseMessages) {
      const msgKey = `msg-${msg.id}`;
      if (!this.printedItems.has(msgKey)) {
        const prefix = this.getMessagePrefix(msg.type);
        this.log(`  ${prefix} ${msg.message}`);
        this.printedItems.add(msgKey);
      }
    }
  }

  private renderEvent(event: TuiEvent, indent: number) {
    const prefix = '  '.repeat(indent);
    const startKey = `event-start-${event.id}`;
    const finishKey = `event-finish-${event.id}`;

    const description = event.instanceId ? `${event.description} (${event.instanceId})` : event.description;

    if (event.status === 'running' && !this.printedItems.has(startKey)) {
      this.log(`${prefix}[~] ${description}`);
      this.printedItems.add(startKey);
    }

    // Progress updates (deduplicated)
    if (event.status === 'running' && event.additionalMessage) {
      const cleanMsg = this.stripAnsi(event.additionalMessage)?.trim();
      if (cleanMsg) {
        const normalized = this.normalizeProgress(cleanMsg);
        const previous = this.lastAdditionalMessages.get(event.id);
        if (previous !== normalized) {
          this.log(`${prefix}[~] ${description} - ${cleanMsg}`);
          this.lastAdditionalMessages.set(event.id, normalized);
        }
      }
    }

    // Output lines
    if (event.outputLines) {
      for (let i = 0; i < event.outputLines.length; i++) {
        const line = event.outputLines[i];
        if (!line.trim()) continue;
        const lineKey = `output-${event.id}-${i}`;
        if (!this.printedItems.has(lineKey)) {
          this.log(`${prefix}   ${line}`);
          this.printedItems.add(lineKey);
        }
      }
    }

    // Children
    for (const child of event.children) {
      this.renderEvent(child, indent + 1);
    }

    // Completion
    if ((event.status === 'success' || event.status === 'error') && !this.printedItems.has(finishKey)) {
      const icon = event.status === 'success' ? '[+]' : '[x]';
      const duration = event.duration ? ` (${formatDuration(event.duration)})` : '';
      const finalMsg = event.finalMessage ? ` ${event.finalMessage}` : '';
      this.log(`${prefix}${icon} ${description}${duration}${finalMsg}`);
      this.printedItems.add(finishKey);
    }
  }

  private printSummary(state: TuiState) {
    if (!state.summary) return;
    const { summary } = state;

    this.log('');
    this.log('------------------------------------------------------------------------');
    const icon = summary.success ? '[+]' : '[x]';
    this.log(`${icon} ${summary.message}`);

    for (const link of summary.links) {
      this.log(`  * ${link.label}`);
      this.log(`    ${link.url}`);
    }

    if (summary.consoleUrl) {
      this.log('');
      this.log('  Stack details:');
      this.log(`    ${summary.consoleUrl}`);
    }
  }

  private getMessagePrefix(type: string): string {
    switch (type) {
      case 'success':
        return '[+]';
      case 'error':
        return '[x]';
      case 'warn':
        return '[!]';
      case 'info':
        return '[i]';
      case 'hint':
        return '[?]';
      case 'debug':
        return '[.]';
      default:
        return '[*]';
    }
  }

  private stripAnsi(text?: string): string | undefined {
    if (!text) return text;
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1B\[[0-9;]*m/g, '');
  }

  private normalizeProgress(msg: string): string {
    return msg.replace(/Estimate:\s*~?(<)?\d+%/gi, 'Estimate: ~%').trim();
  }
}
