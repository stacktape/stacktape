import type { TuiEvent, TuiPhase, TuiState } from './types';
import { logCollectorStream } from '@utils/log-collector';
import logUpdate from 'log-update';
import { PHASE_NAMES, PHASE_ORDER } from './types';
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
 * TTY renderer using log-update for dynamic content.
 *
 * Phases are rendered dynamically while running, then committed to console when complete.
 * This prevents duplicate output and ensures clean re-rendering.
 */
export class TtyRenderer {
  private colorize: ColorFn;
  private makeBold: BoldFn;
  private spinnerFrame = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private committedPhaseIds = new Set<string>();
  private phaseStartTimes = new Map<string, number>();

  constructor(colorize: ColorFn, makeBold?: BoldFn) {
    this.colorize = colorize;
    this.makeBold = makeBold || ((t) => t);
  }

  start() {
    this.committedPhaseIds.clear();
    this.phaseStartTimes.clear();
    this.spinnerFrame = 0;
    this.interval = setInterval(() => {
      this.spinnerFrame = (this.spinnerFrame + 1) % SPINNER_FRAMES.length;
    }, 80);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    logUpdate.done();
  }

  render(state: TuiState) {
    // Commit header once
    if (state.header && !this.committedPhaseIds.has('header')) {
      logUpdate.clear();
      const headerLines = this.buildHeader(state);
      for (const line of headerLines) {
        console.info(line);
        logCollectorStream.write(line);
      }
      this.committedPhaseIds.add('header');
    }

    // Commit completed phases
    this.commitCompletedPhases(state);

    // Render active phases dynamically
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
        logUpdate.clear();
        const phaseLines = this.buildCompletedPhaseOutput(phase, state);
        for (const line of phaseLines) {
          console.info(line);
          logCollectorStream.write(line);
        }
        this.committedPhaseIds.add(phase.id);
      }
    }
  }

  private buildDynamicContent(state: TuiState): string[] {
    const lines: string[] = [];

    for (const phase of state.phases) {
      if (this.committedPhaseIds.has(phase.id)) continue;
      if (phase.status === 'pending') continue;

      // Track phase start time for timer
      if (!this.phaseStartTimes.has(phase.id)) {
        this.phaseStartTimes.set(phase.id, phase.startTime || Date.now());
      }

      lines.push(...this.buildActivePhaseOutput(phase, state));
    }

    // Summary
    if (state.summary && !this.committedPhaseIds.has('summary')) {
      lines.push(...this.buildSummary(state));
    }

    return lines;
  }

  private buildHeader(state: TuiState): string[] {
    if (!state.header) return [];
    const { header } = state;
    const lines: string[] = [];

    const actionText = header.action;
    const detailText = `${header.projectName} → ${header.stageName} (${header.region})`;
    const innerWidth = Math.max(stripAnsi(actionText).length, stripAnsi(detailText).length) + 2;

    const padRight = (text: string, width: number) => {
      const visibleLen = stripAnsi(text).length;
      return text + ' '.repeat(Math.max(0, width - visibleLen));
    };

    lines.push('');
    lines.push(this.colorize('white', `╭${'─'.repeat(innerWidth)}╮`));
    lines.push(
      this.colorize('white', '│') +
        ` ${padRight(this.makeBold(actionText), innerWidth - 1)}` +
        this.colorize('white', '│')
    );
    lines.push(this.colorize('white', '│') + ` ${padRight(detailText, innerWidth - 1)}` + this.colorize('white', '│'));
    lines.push(this.colorize('white', `╰${'─'.repeat(innerWidth)}╯`));
    lines.push('');

    return lines;
  }

  // ─── Active (running) phase rendering ───

  private buildActivePhaseOutput(phase: TuiPhase, state: TuiState): string[] {
    const lines: string[] = [];
    const phaseNumber = PHASE_ORDER.indexOf(phase.id) + 1;
    const phaseName = state.phases.find((p) => p.id === phase.id)?.name || PHASE_NAMES[phase.id] || phase.id;

    // Phase header with spinner and timer
    const spinner = this.colorize('cyan', SPINNER_FRAMES[this.spinnerFrame]);
    const elapsed = this.getElapsedTime(phase);
    const timerStr = this.colorize('gray', `(${elapsed})`);

    lines.push('');
    lines.push(`${spinner} ${this.makeBold(`Phase ${phaseNumber}: ${phaseName}`)} ${timerStr}`);
    lines.push(this.colorize('gray', '─'.repeat(72)));

    // Special handling for deploy phase
    if (phase.id === 'DEPLOY') {
      lines.push(...this.buildDeployPhaseContent(phase, state));
    } else {
      // Regular phase content
      for (const event of phase.events) {
        lines.push(...this.buildEventOutput(event, 1, true));
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

  private buildDeployPhaseContent(phase: TuiPhase, state: TuiState): string[] {
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

    // CloudFormation deploy/delete - show progress UI
    const additionalMsg = deployEvent.additionalMessage;
    const estimatePercent = parseEstimatePercent(additionalMsg);
    const progressCounts = parseProgressCounts(additionalMsg);
    const resourceState = parseResourceState(additionalMsg);
    const summaryCounts = parseSummaryCounts(additionalMsg);
    const detailLists = parseDetailLists(additionalMsg);

    // Calculate progress percentage
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
      // Show progress bar if we have progress data
      if (progressPercent !== null) {
        const filledWidth = Math.round((progressPercent / 100) * PROGRESS_BAR_WIDTH);
        const emptyWidth = PROGRESS_BAR_WIDTH - filledWidth;
        const progressBar =
          this.colorize('green', '█'.repeat(filledWidth)) + this.colorize('gray', '░'.repeat(emptyWidth));
        const percentStr = `${progressPercent}%`;

        lines.push(`  ${progressBar} ${this.colorize('cyan', percentStr)}`);
        lines.push('');
      }

      // Status line
      const statusParts: string[] = [];
      if (progressCounts.done !== null && progressCounts.total !== null) {
        statusParts.push(`${this.colorize('green', String(progressCounts.done))}/${progressCounts.total} resources`);
      }
      if (statusParts.length > 0) {
        lines.push(`  ${actionVerb}: ${statusParts.join(' ')}`);
      } else {
        lines.push(
          `  ${this.colorize('cyan', SPINNER_FRAMES[this.spinnerFrame])} ${actionVerb} infrastructure resources...`
        );
      }

      // Currently updating resources
      if (resourceState.active && resourceState.active !== 'none') {
        const resources = resourceState.active
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean);
        if (resources.length > 0) {
          const label = isDelete ? 'Deleting:' : 'Updating:';
          lines.push(
            `  ${this.colorize('gray', label)} ${resources.slice(0, 3).join(', ')}${resources.length > 3 ? ', ...' : ''}`
          );
        }
      }

      // Waiting resources
      if (resourceState.waiting && resourceState.waiting !== 'none') {
        const waiting = resourceState.waiting
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean);
        if (waiting.length > 0) {
          lines.push(
            `  ${this.colorize('gray', 'Waiting:')} ${waiting.slice(0, 3).join(', ')}${waiting.length > 3 ? ', ...' : ''}`
          );
        }
      }
    } else if (isComplete) {
      // Show completion summary
      const icon = deployEvent.status === 'success' ? this.colorize('green', '✓') : this.colorize('red', '✖');
      const duration = deployEvent.duration ? ` ${this.colorize('yellow', formatDuration(deployEvent.duration))}` : '';
      lines.push(`  ${icon} ${actionVerb} complete${duration}`);

      // Resource counts
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

    // Show non-deploy events (like validation)
    for (const event of phase.events) {
      if (!DEPLOY_EVENT_TYPES.includes(event.eventType)) {
        lines.push(...this.buildEventOutput(event, 1, true));
      }
    }

    return lines;
  }

  // ─── Completed phase rendering ───

  private buildCompletedPhaseOutput(phase: TuiPhase, state: TuiState): string[] {
    const lines: string[] = [];
    const phaseNumber = PHASE_ORDER.indexOf(phase.id) + 1;
    const phaseName = state.phases.find((p) => p.id === phase.id)?.name || PHASE_NAMES[phase.id] || phase.id;

    // Phase header with status icon and duration
    const icon = phase.status === 'success' ? this.colorize('green', '✓') : this.colorize('red', '✖');
    const duration = phase.duration ? ` ${this.colorize('yellow', formatDuration(phase.duration))}` : '';

    lines.push('');
    lines.push(`${icon} ${this.makeBold(`Phase ${phaseNumber}: ${phaseName}`)}${duration}`);
    lines.push(this.colorize('gray', '─'.repeat(72)));

    // Special handling for completed deploy phase
    if (phase.id === 'DEPLOY') {
      lines.push(...this.buildCompletedDeployContent(phase));
    } else {
      // Regular events
      for (const event of phase.events) {
        lines.push(...this.buildEventOutput(event, 1, false));
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

  private buildCompletedDeployContent(phase: TuiPhase): string[] {
    const lines: string[] = [];
    const deployEvent = getActiveDeployEvent(phase.events);

    if (!deployEvent) {
      return lines;
    }

    const isHotswap = deployEvent.eventType === 'HOTSWAP_UPDATE';
    const isDelete = deployEvent.eventType === 'DELETE_STACK';

    // For hotswap, show as regular events
    if (isHotswap) {
      for (const event of phase.events) {
        lines.push(...this.buildEventOutput(event, 1, false));
      }
      return lines;
    }

    // CloudFormation completion summary
    const summaryCounts = parseSummaryCounts(deployEvent.additionalMessage);
    const detailLists = parseDetailLists(deployEvent.additionalMessage);
    const actionVerb = isDelete ? 'Deleted' : 'Deployed';

    const icon = deployEvent.status === 'success' ? this.colorize('green', '✓') : this.colorize('red', '✖');
    const duration = deployEvent.duration ? ` ${this.colorize('yellow', formatDuration(deployEvent.duration))}` : '';
    lines.push(`  ${icon} ${actionVerb} infrastructure${duration}`);

    // Resource summary
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
      lines.push(`    ${parts.join('  ')}`);

      // Detailed resource names
      if (detailLists.created && detailLists.created !== 'none') {
        const resources = detailLists.created
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean);
        if (resources.length > 0) {
          lines.push(`    ${this.colorize('gray', 'Created:')} ${this.formatResourceList(resources)}`);
        }
      }
      if (detailLists.updated && detailLists.updated !== 'none') {
        const resources = detailLists.updated
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean);
        if (resources.length > 0) {
          lines.push(`    ${this.colorize('gray', 'Updated:')} ${this.formatResourceList(resources)}`);
        }
      }
      if (detailLists.deleted && detailLists.deleted !== 'none') {
        const resources = detailLists.deleted
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean);
        if (resources.length > 0) {
          lines.push(`    ${this.colorize('gray', 'Deleted:')} ${this.formatResourceList(resources)}`);
        }
      }
    }

    // Show non-deploy events
    for (const event of phase.events) {
      if (!DEPLOY_EVENT_TYPES.includes(event.eventType)) {
        lines.push(...this.buildEventOutput(event, 1, false));
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

  private buildSummary(state: TuiState): string[] {
    if (!state.summary) return [];
    const { summary } = state;
    const lines: string[] = [];

    lines.push('');
    lines.push(this.colorize('gray', '─'.repeat(72)));
    const icon = summary.success ? this.colorize('green', '✓') : this.colorize('red', '✖');
    lines.push(`${icon} ${this.makeBold(summary.message)}`);

    if (summary.links.length > 0) {
      lines.push('');
      for (const link of summary.links) {
        lines.push(`  ${this.colorize('cyan', '→')} ${link.label}`);
        lines.push(`    ${this.colorize('blue', link.url)}`);
      }
    }

    if (summary.consoleUrl) {
      lines.push('');
      lines.push(`  ${this.colorize('gray', 'Stack details:')} ${this.colorize('blue', summary.consoleUrl)}`);
    }

    return lines;
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
      default:
        return this.colorize('gray', '●');
    }
  }

  reset() {
    this.committedPhaseIds.clear();
    this.phaseStartTimes.clear();
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
    this.log('');
    this.log('+----------------------------------------------------------------------+');
    this.log(`| ${header.action.padEnd(68)} |`);
    this.log(`| ${`${header.projectName} -> ${header.stageName} (${header.region})`.padEnd(68)} |`);
    this.log('+----------------------------------------------------------------------+');
    this.log('');
  }

  private renderPhase(phase: TuiPhase, state: TuiState) {
    const phaseKey = `phase-${phase.id}`;
    const phaseNumber = PHASE_ORDER.indexOf(phase.id) + 1;
    const phaseName = PHASE_NAMES[phase.id] || phase.name;

    if (phase.status !== 'pending' && !this.printedItems.has(phaseKey)) {
      this.log('');
      this.log(`> Phase ${phaseNumber}: ${phaseName}`);
      this.log('------------------------------------------------------------------------');
      this.printedItems.add(phaseKey);
    }

    for (const event of phase.events) {
      this.renderEvent(event, 1);
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
