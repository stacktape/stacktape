import type {
  Hook,
  HookStatus,
  LocalResource,
  LogEntry,
  ResourceStatus,
  SetupStepStatus,
  Workload,
  WorkloadType
} from './types';
import { applicationManager } from '@application-services/application-manager';
import { tuiManager } from '@application-services/tui-manager';
import logUpdate from 'log-update';
import { setSpinnerDevTuiActive } from '../spinners';
import { formatDuration, getWorkloadColor, resetWorkloadColors } from './utils';
import { type BufferedLog, type RebuildStep, getRebuildRenderer, stopRebuild } from './rebuild';
import { devTuiState } from './state';

export type { Hook, HookStatus, LocalResource, LogEntry, ResourceStatus, Workload, WorkloadType };
export type { RebuildStep } from './rebuild';

type CommandHandler = (command: string) => void;
type RebuildHandler = (workloadName: string | null) => Promise<void>;
type DevPhase = 'startup' | 'running' | 'rebuilding';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

class DevTuiRenderer {
  private spinnerFrame = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private renderPending = false;

  start() {
    this.stopped = false;
    this.spinnerFrame = 0;
    this.renderPending = false;
    // Only use interval for spinner animation, render is triggered by state changes
    this.interval = setInterval(() => {
      this.spinnerFrame = (this.spinnerFrame + 1) % SPINNER_FRAMES.length;
      this.doRender();
    }, 80);
    this.doRender();
  }

  stop() {
    this.stopped = true;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    // Final render and persist
    const output = this.buildOutput();
    logUpdate(output);
    logUpdate.done();
  }

  render() {
    if (this.stopped) return;
    // Debounce renders triggered by state changes - the interval will pick it up
    if (this.renderPending) return;
    this.renderPending = true;
    setImmediate(() => {
      this.renderPending = false;
      this.doRender();
    });
  }

  private doRender() {
    if (this.stopped) return;
    const output = this.buildOutput();
    logUpdate(output);
  }

  private buildOutput(): string {
    const state = devTuiState.getState();
    const lines: string[] = [];

    // Section 1: Local Resources
    if (state.localResources.length > 0) {
      const allDone = state.localResources.every((r) => r.status === 'running' || r.status === 'error');
      const headerIcon = allDone
        ? tuiManager.colorize('green', '✓')
        : tuiManager.colorize('cyan', SPINNER_FRAMES[this.spinnerFrame]);
      lines.push(`${headerIcon} ${tuiManager.colorize('white', 'Starting local resources')}`);
      state.localResources.forEach((r, idx) => {
        const isLast = idx === state.localResources.length - 1;
        const prefix = isLast ? ' └─' : ' ├─';
        const icon = this.getResourceIcon(r.status);
        const name = r.name.padEnd(18);
        let detail = '';
        if (r.status === 'running' && r.port) {
          detail = tuiManager.colorize('cyan', `localhost:${r.port}`);
        } else if (r.status === 'starting') {
          detail = tuiManager.colorize('gray', 'Starting...');
        } else if (r.status === 'error') {
          detail = tuiManager.colorize('red', r.error || 'Failed');
        }
        lines.push(`${tuiManager.colorize('gray', prefix)} ${icon} ${tuiManager.makeBold(name)} ${detail}`);
      });
      lines.push('');
    }

    // Section 2: Setup steps (tunnels, env injection) - happens after local resources
    if (state.setupSteps.length > 0) {
      const allDone = state.setupSteps.every((s) => s.status === 'done' || s.status === 'skipped');
      const anyRunning = state.setupSteps.some((s) => s.status === 'running');
      const headerIcon = allDone
        ? tuiManager.colorize('green', '✓')
        : anyRunning
          ? tuiManager.colorize('cyan', SPINNER_FRAMES[this.spinnerFrame])
          : tuiManager.colorize('gray', '○');
      lines.push(`${headerIcon} ${tuiManager.colorize('white', 'Creating tunnels')}`);
      state.setupSteps.forEach((step, idx) => {
        const isLast = idx === state.setupSteps.length - 1;
        const prefix = isLast ? ' └─' : ' ├─';
        const icon = this.getSetupIcon(step.status);
        const label = step.label.padEnd(18);
        const detail = step.detail ? tuiManager.colorize('gray', step.detail) : '';
        lines.push(`${tuiManager.colorize('gray', prefix)} ${icon} ${tuiManager.colorize('gray', label)} ${detail}`);
      });
      lines.push('');
    }

    // Section 3: Hooks - happens after tunnels
    if (state.hooks.length > 0) {
      const allDone = state.hooks.every((h) => h.status === 'success' || h.status === 'error');
      const anyRunning = state.hooks.some((h) => h.status === 'running');
      const headerIcon = allDone
        ? tuiManager.colorize('green', '✓')
        : anyRunning
          ? tuiManager.colorize('cyan', SPINNER_FRAMES[this.spinnerFrame])
          : tuiManager.colorize('gray', '○');
      lines.push(`${headerIcon} ${tuiManager.colorize('white', 'Executing hooks')}`);
      state.hooks.forEach((h, idx) => {
        const isLast = idx === state.hooks.length - 1;
        const prefix = isLast ? ' └─' : ' ├─';
        const icon = this.getHookIcon(h.status);
        const name = h.name.padEnd(18);
        let detail = '';
        if (h.status === 'success') {
          detail = tuiManager.colorize('yellow', formatDuration(h.duration || 0));
        } else if (h.status === 'running') {
          detail = tuiManager.colorize('gray', h.message || 'Running...');
        } else if (h.status === 'error') {
          detail = tuiManager.colorize('red', h.error || 'Failed');
        }
        lines.push(`${tuiManager.colorize('gray', prefix)} ${icon} ${tuiManager.makeBold(name)} ${detail}`);
      });
      lines.push('');
    }

    // Section 4: Workloads - happens after hooks
    if (state.workloads.length > 0) {
      const allDone = state.workloads.every((w) => w.status === 'running' || w.status === 'error');
      const anyRunning = state.workloads.some((w) => w.status === 'starting');
      const headerIcon = allDone
        ? tuiManager.colorize('green', '✓')
        : anyRunning
          ? tuiManager.colorize('cyan', SPINNER_FRAMES[this.spinnerFrame])
          : tuiManager.colorize('gray', '○');
      lines.push(`${headerIcon} ${tuiManager.colorize('white', 'Starting workloads')}`);
      state.workloads.forEach((w, idx) => {
        const isLast = idx === state.workloads.length - 1;
        const prefix = isLast ? ' └─' : ' ├─';
        const icon = this.getResourceIcon(w.status);
        const name = w.name.padEnd(18);
        let detail = '';
        if (w.status === 'running') {
          // Show size/info only (no type label)
          detail = w.size ? tuiManager.colorize('gray', w.size) : '';
        } else if (w.status === 'starting') {
          detail = tuiManager.colorize('gray', w.statusMessage || 'Starting...');
        } else if (w.status === 'error') {
          detail = tuiManager.colorize('red', w.error || 'Failed');
        }
        lines.push(`${tuiManager.colorize('gray', prefix)} ${icon} ${tuiManager.makeBold(name)} ${detail}`);
      });
    }

    return lines.join('\n');
  }

  private getResourceIcon(status: ResourceStatus): string {
    switch (status) {
      case 'pending':
        return tuiManager.colorize('gray', '○');
      case 'starting':
        return tuiManager.colorize('cyan', SPINNER_FRAMES[this.spinnerFrame]);
      case 'running':
        return tuiManager.colorize('green', '●');
      case 'error':
      case 'stopped':
        return tuiManager.colorize('red', '✗');
      default:
        return tuiManager.colorize('gray', '○');
    }
  }

  private getHookIcon(status: string): string {
    switch (status) {
      case 'pending':
        return tuiManager.colorize('gray', '○');
      case 'running':
        return tuiManager.colorize('cyan', SPINNER_FRAMES[this.spinnerFrame]);
      case 'success':
        return tuiManager.colorize('green', '✓');
      case 'error':
        return tuiManager.colorize('red', '✗');
      default:
        return tuiManager.colorize('gray', '○');
    }
  }

  private getSetupIcon(status: SetupStepStatus): string {
    switch (status) {
      case 'pending':
        return tuiManager.colorize('gray', '○');
      case 'running':
        return tuiManager.colorize('cyan', SPINNER_FRAMES[this.spinnerFrame]);
      case 'done':
        return tuiManager.colorize('green', '✓');
      case 'skipped':
        return tuiManager.colorize('gray', '−');
      default:
        return tuiManager.colorize('gray', '○');
    }
  }

  private getWorkloadTypeLabel(w: Workload): string {
    if (w.type === 'hosting-bucket' && w.hostingContentType) {
      const labels: Record<string, string> = { 'single-page-app': 'SPA', 'static-website': 'Static', custom: 'Custom' };
      return labels[w.hostingContentType] || w.hostingContentType;
    }
    const labels: Record<string, string> = {
      container: 'Container',
      function: 'Lambda',
      'hosting-bucket': 'Static',
      'nextjs-web': 'Next.js'
    };
    return labels[w.type] || w.type;
  }
}

class DevTuiManager {
  private renderer: DevTuiRenderer | null = null;
  private commandHandler: CommandHandler | null = null;
  private rebuildHandler: RebuildHandler | null = null;
  private isRunning = false;
  private phase: DevPhase = 'startup';
  private stdinListenerSetup = false;
  private unsubscribe: (() => void) | null = null;
  private rebuildLogBuffer: BufferedLog[] = [];
  private startupLogBuffer: BufferedLog[] = [];
  private workloadTypes: Map<string, WorkloadType> = new Map();

  start(config: { projectName: string; stageName: string; onCommand?: CommandHandler; devMode?: 'normal' | 'legacy' }) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.phase = 'startup';
    this.commandHandler = config.onCommand || null;
    this.startupLogBuffer = [];
    this.rebuildLogBuffer = [];

    tuiManager.setDevTuiActive(true);
    setSpinnerDevTuiActive(true);

    resetWorkloadColors();
    devTuiState.init({
      projectName: config.projectName,
      stageName: config.stageName,
      devMode: config.devMode || 'normal'
    });

    this.renderer = new DevTuiRenderer();
    this.renderer.start();
    this.unsubscribe = devTuiState.subscribe(() => this.renderer?.render());
  }

  stop() {
    if (this.renderer) {
      this.renderer.stop();
      this.renderer = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isRunning = false;
    this.phase = 'startup';
    this.commandHandler = null;
    devTuiState.reset();
    tuiManager.setDevTuiActive(false);
    setSpinnerDevTuiActive(false);
  }

  get running(): boolean {
    return this.isRunning;
  }

  get inStartupPhase(): boolean {
    return this.phase === 'startup';
  }

  transitionToRunning() {
    if (this.phase === 'running') return;

    this.phase = 'running';

    // Unsubscribe BEFORE changing state to prevent extra render
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // Stop renderer (will do final render)
    if (this.renderer) {
      this.renderer.stop();
      this.renderer = null;
    }

    devTuiState.setPhase('running');

    tuiManager.setDevTuiActive(false);
    setSpinnerDevTuiActive(false);

    this.printRunningSummary();
    this.setupKeyboardShortcuts();

    // Flush buffered startup logs after a short delay (so user can read the summary)
    if (this.startupLogBuffer.length > 0) {
      setTimeout(() => {
        for (const log of this.startupLogBuffer) {
          this.printLog(log.source, log.message, log.level);
        }
        this.startupLogBuffer = [];
      }, 1000);
    }
  }

  setRebuildHandler(handler: RebuildHandler) {
    this.rebuildHandler = handler;
  }

  // ─── Rebuild UI ───

  /**
   * Start the rebuild UI for one or more workloads.
   * Call this before starting the actual rebuild operations.
   */
  startRebuild(workloadNames: string[]) {
    if (this.phase === 'rebuilding') return;
    this.phase = 'rebuilding';
    this.rebuildLogBuffer = [];

    // Suppress spinners and tuiManager output during rebuild
    tuiManager.setDevTuiActive(true);
    setSpinnerDevTuiActive(true);

    const renderer = getRebuildRenderer();
    renderer.start(workloadNames, this.workloadTypes);
  }

  /**
   * Update the rebuild step for a workload.
   */
  setRebuildStep(name: string, step: RebuildStep, detail?: string) {
    if (this.phase !== 'rebuilding') return;
    getRebuildRenderer().setWorkloadStep(name, step, detail);
  }

  /**
   * Set the package/image size for a workload during rebuild.
   */
  setRebuildSize(name: string, size: string) {
    if (this.phase !== 'rebuilding') return;
    getRebuildRenderer().setWorkloadSize(name, size);
  }

  /**
   * Mark a workload rebuild as complete.
   */
  setRebuildDone(name: string, size?: string) {
    if (this.phase !== 'rebuilding') return;
    getRebuildRenderer().setWorkloadDone(name, size);
  }

  /**
   * Mark a workload rebuild as failed.
   */
  setRebuildError(name: string, error: string) {
    if (this.phase !== 'rebuilding') return;
    getRebuildRenderer().setWorkloadError(name, error);
  }

  /**
   * Buffer a log entry during rebuild (will be printed after rebuild completes).
   */
  bufferRebuildLog(source: string, message: string, level: 'info' | 'warn' | 'error' = 'info') {
    if (this.phase !== 'rebuilding') return;
    this.rebuildLogBuffer.push({ timestamp: Date.now(), source, message, level });
  }

  /**
   * Finish the rebuild UI and flush buffered logs.
   * Call this after all rebuild operations are complete.
   */
  async finishRebuild() {
    if (this.phase !== 'rebuilding') return;

    // Stop the rebuild renderer
    stopRebuild();

    // Re-enable normal output (spinners stay suppressed in running phase)
    tuiManager.setDevTuiActive(false);
    setSpinnerDevTuiActive(false);

    // Wait 1 second so user can read the summary
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Print buffered logs
    for (const log of this.rebuildLogBuffer) {
      this.printLog(log.source, log.message, log.level);
    }
    this.rebuildLogBuffer = [];

    this.phase = 'running';
  }

  /**
   * Check if currently in rebuild phase.
   */
  get inRebuildPhase(): boolean {
    return this.phase === 'rebuilding';
  }

  private setupKeyboardShortcuts() {
    if (this.stdinListenerSetup) return;
    this.stdinListenerSetup = true;

    applicationManager.setUsesStdinWatch();
    process.stdin.removeAllListeners('data');

    process.stdin.on('data', async (data) => {
      if (applicationManager.isInterrupted) return;
      if (!this.rebuildHandler) return;
      // Ignore input during rebuild
      if (this.phase === 'rebuilding') return;

      const input = data.toString().trim().toLowerCase();
      const state = devTuiState.getState();
      const workloads = state.workloads.filter((w) => w.status === 'running' || w.status === 'error');

      if (input === 'a') {
        await this.rebuildHandler(null);
        return;
      }

      const num = parseInt(input, 10);
      if (num >= 1 && num <= workloads.length) {
        const workload = workloads[num - 1];
        await this.rebuildHandler(workload.name);
        return;
      }

      if (input === 'h' || input === '?') {
        this.printKeyboardHelp();
        return;
      }

      if (data.toString().charCodeAt(0) === 12) {
        console.clear();
      }
    });
  }

  private printKeyboardHelp() {
    const state = devTuiState.getState();
    const workloads = state.workloads.filter((w) => w.status === 'running' || w.status === 'error');

    console.log(`
${tuiManager.colorize('cyan', '  Keyboard shortcuts:')}
${workloads.map((w, idx) => `    ${tuiManager.colorize('white', String(idx + 1))} - rebuild ${tuiManager.colorize(getWorkloadColor(w.name), w.name)}`).join('\n')}
    ${tuiManager.colorize('white', 'a')} - rebuild all workloads
    ${tuiManager.colorize('white', 'h')} - show this help
    ${tuiManager.colorize('gray', 'Ctrl+C')} - stop dev mode
`);
  }

  private printRunningSummary() {
    const state = devTuiState.getState();
    const runningWorkloads = state.workloads.filter((w) => w.status === 'running' || w.status === 'error');

    const boxWidth = 78;
    const title = ' Dev mode ready ';
    const padLen = Math.floor((boxWidth - title.length) / 2);
    const topLine = `┌${'─'.repeat(boxWidth)}┐`;
    const titleLine = `│${' '.repeat(padLen)}${tuiManager.makeBold(title)}${' '.repeat(boxWidth - padLen - title.length)}│`;
    const bottomLine = `└${'─'.repeat(boxWidth)}┘`;

    const lines = [
      tuiManager.colorize('cyan', topLine),
      tuiManager.colorize('cyan', titleLine),
      tuiManager.colorize('cyan', bottomLine),
      ...runningWorkloads.map((workload, idx) => {
        const color = getWorkloadColor(workload.name);
        const num = tuiManager.colorize('gray', `[${idx + 1}]`);
        return workload.url
          ? `  ${num} ${tuiManager.colorize(color, workload.name)}: ${workload.url}`
          : `  ${num} ${tuiManager.colorize(color, workload.name)}`;
      }),
      '',
      tuiManager.colorize(
        'gray',
        `  [1-${runningWorkloads.length}] rebuild workload  [a] rebuild all  [h] help  [Ctrl+C] stop`
      ),
      ''
    ];
    console.log(lines.join('\n'));
  }

  // ─── Local Resources ───

  addLocalResource(resource: { name: string; type: LocalResource['type'] }) {
    devTuiState.addLocalResource(resource);
  }

  setLocalResourceStatus(
    name: string,
    status: ResourceStatus,
    extras?: { port?: number; host?: string; connectionString?: string; error?: string }
  ) {
    devTuiState.setLocalResourceStatus(name, status, extras);
  }

  // ─── Setup Steps ───

  addSetupStep(id: string, label: string) {
    devTuiState.addSetupStep({ id, label });
  }

  setSetupStepStatus(id: string, status: SetupStepStatus, detail?: string) {
    devTuiState.setSetupStepStatus(id, status, detail);
  }

  // ─── Workloads ───

  addWorkload(workload: { name: string; type: WorkloadType; hostingContentType?: string }) {
    devTuiState.addWorkload(workload);
    // Track workload types for rebuild UI
    this.workloadTypes.set(workload.name, workload.type);
  }

  setWorkloadStatus(
    name: string,
    status: ResourceStatus,
    extras?: { url?: string; port?: number; statusMessage?: string; error?: string; size?: string }
  ) {
    devTuiState.setWorkloadStatus(name, status, extras);
  }

  // ─── Hooks ───

  addHook(hook: { name: string }) {
    devTuiState.addHook(hook);
  }

  setHookStatus(name: string, status: HookStatus, extras?: { duration?: number; message?: string; error?: string }) {
    devTuiState.setHookStatus(name, status, extras);
  }

  // ─── Logs ───

  log(source: string, message: string, level: LogEntry['level'] = 'info') {
    if (this.phase === 'running') {
      this.printLog(source, message, level);
    } else if (this.phase === 'rebuilding') {
      // Buffer logs during rebuild to print after completion
      this.rebuildLogBuffer.push({ timestamp: Date.now(), source, message, level });
    } else if (this.phase === 'startup') {
      // Buffer logs during startup to print after transition to running
      this.startupLogBuffer.push({ timestamp: Date.now(), source, message, level });
    }
  }

  systemLog(message: string, level: LogEntry['level'] = 'info') {
    if (this.phase === 'running') {
      this.printLog('system', message, level);
    } else if (this.phase === 'rebuilding') {
      this.rebuildLogBuffer.push({ timestamp: Date.now(), source: 'system', message, level });
    } else if (this.phase === 'startup') {
      this.startupLogBuffer.push({ timestamp: Date.now(), source: 'system', message, level });
    } else {
      devTuiState.addSystemLog(message, level);
    }
  }

  private printLog(source: string, message: string, level: LogEntry['level']) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const levelColor = level === 'error' ? 'red' : level === 'warn' ? 'yellow' : undefined;
    const msg = levelColor ? tuiManager.colorize(levelColor, message) : message;

    // Skip source prefix when there's only one workload (and it's not a system message)
    const state = devTuiState.getState();
    const isSingleWorkload = state.workloads.length === 1 && source !== 'system';

    if (isSingleWorkload) {
      console.log(`${tuiManager.colorize('gray', timestamp)} ${msg}`);
    } else {
      const color = source === 'system' ? 'gray' : getWorkloadColor(source);
      const prefix = `${tuiManager.colorize('gray', timestamp)} ${tuiManager.colorize(color, `[${source}]`)}`;
      console.log(`${prefix} ${msg}`);
    }
  }

  logLines(source: string, lines: string[], level: LogEntry['level'] = 'info') {
    for (const line of lines) {
      if (line.trim()) {
        this.log(source, line, level);
      }
    }
  }

  clearLogs() {
    if (this.phase === 'startup') {
      devTuiState.clearLogs();
    }
  }

  setLogFilter(workloadName: string | null) {
    if (this.phase === 'startup') {
      devTuiState.setLogFilter(workloadName);
    }
  }
}

export const devTuiManager = new DevTuiManager();
