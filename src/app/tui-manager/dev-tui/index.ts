import type {
  Hook,
  HookStatus,
  LocalResource,
  LogEntry,
  ResourceStatus,
  SetupStep,
  SetupStepStatus,
  Workload,
  WorkloadType
} from './types';
import { applicationManager } from '@application-services/application-manager';
import { tuiManager } from '@application-services/tui-manager';
import { box as clackBox } from '@clack/prompts';
import logUpdate from 'log-update';
import { setSpinnerDevTuiActive } from '../spinners';
import { formatDuration, getWorkloadColor, resetWorkloadColors } from './utils';
import { type BufferedLog, type RebuildStep, getRebuildRenderer, stopRebuild } from './rebuild';
import { devTuiState } from './state';
import { agentLog } from 'src/commands/dev/agent-logger';

export type { Hook, HookStatus, LocalResource, LogEntry, ResourceStatus, Workload, WorkloadType };
export type { RebuildStep } from './rebuild';

type CommandHandler = (command: string) => void;
type RebuildHandler = (workloadName: string | null) => Promise<void>;
type ReadyHandler = () => void;
type DevPhase = 'startup' | 'running' | 'rebuilding';

// Common renderer interface
interface DevTuiRendererInterface {
  start: () => void;
  stop: () => void;
  render: () => void;
}

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
      lines.push(`\n${headerIcon} ${tuiManager.colorize('white', 'Starting local resources')}`);
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

/**
 * Non-TTY renderer for dev mode - used in agent mode or CI environments.
 * Outputs append-only plain text without colors, animations, or log-update.
 * Optimized for consumption by LLMs and automated tools.
 */
class DevTuiNonTtyRenderer implements DevTuiRendererInterface {
  private printedItems = new Set<string>();
  private unsubscribe: (() => void) | null = null;

  start() {
    this.printedItems.clear();
    // Subscribe to state changes and render incrementally
    this.unsubscribe = devTuiState.subscribe(() => this.render());
    this.render();
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    // Final render to ensure all items are printed
    this.render();
  }

  render() {
    const state = devTuiState.getState();
    this.renderLocalResources(state.localResources);
    this.renderSetupSteps(state.setupSteps);
    this.renderHooks(state.hooks);
    this.renderWorkloads(state.workloads);
  }

  private log(message: string) {
    console.log(message);
  }

  private renderLocalResources(resources: LocalResource[]) {
    for (const r of resources) {
      const key = `local-${r.name}-${r.status}`;
      if (this.printedItems.has(key)) continue;

      if (r.status === 'starting') {
        this.log(`[~] Local resource "${r.name}" (${r.type}): starting`);
        this.printedItems.add(key);
      } else if (r.status === 'running') {
        const port = r.port ? ` on localhost:${r.port}` : '';
        this.log(`[+] Local resource "${r.name}" (${r.type}): running${port}`);
        this.printedItems.add(key);
      } else if (r.status === 'error') {
        this.log(`[x] Local resource "${r.name}" (${r.type}): error - ${r.error || 'Failed'}`);
        this.printedItems.add(key);
      }
    }
  }

  private renderSetupSteps(steps: SetupStep[]) {
    for (const step of steps) {
      const key = `setup-${step.id}-${step.status}`;
      if (this.printedItems.has(key)) continue;

      if (step.status === 'running') {
        this.log(`[~] Setup "${step.label}": running`);
        this.printedItems.add(key);
      } else if (step.status === 'done') {
        const detail = step.detail ? ` - ${step.detail}` : '';
        this.log(`[+] Setup "${step.label}": done${detail}`);
        this.printedItems.add(key);
      } else if (step.status === 'skipped') {
        this.log(`[-] Setup "${step.label}": skipped`);
        this.printedItems.add(key);
      }
    }
  }

  private renderHooks(hooks: Hook[]) {
    for (const hook of hooks) {
      const key = `hook-${hook.name}-${hook.status}`;
      if (this.printedItems.has(key)) continue;

      if (hook.status === 'running') {
        this.log(`[~] Hook "${hook.name}": running`);
        this.printedItems.add(key);
      } else if (hook.status === 'success') {
        const duration = hook.duration ? ` (${formatDuration(hook.duration)})` : '';
        this.log(`[+] Hook "${hook.name}": success${duration}`);
        this.printedItems.add(key);
      } else if (hook.status === 'error') {
        this.log(`[x] Hook "${hook.name}": error - ${hook.error || 'Failed'}`);
        this.printedItems.add(key);
      }
    }
  }

  private renderWorkloads(workloads: Workload[]) {
    for (const w of workloads) {
      const key = `workload-${w.name}-${w.status}`;
      if (this.printedItems.has(key)) continue;

      if (w.status === 'starting') {
        const msg = w.statusMessage ? ` - ${w.statusMessage}` : '';
        this.log(`[~] Workload "${w.name}" (${w.type}): starting${msg}`);
        this.printedItems.add(key);
      } else if (w.status === 'running') {
        const url = w.url ? ` at ${w.url}` : '';
        const size = w.size ? ` [${w.size}]` : '';
        this.log(`[+] Workload "${w.name}" (${w.type}): running${url}${size}`);
        this.printedItems.add(key);
      } else if (w.status === 'error') {
        this.log(`[x] Workload "${w.name}" (${w.type}): error - ${w.error || 'Failed'}`);
        this.printedItems.add(key);
      }
    }
  }
}

class DevTuiManager {
  private renderer: DevTuiRendererInterface | null = null;
  private commandHandler: CommandHandler | null = null;
  private rebuildHandler: RebuildHandler | null = null;
  private readyHandler: ReadyHandler | null = null;
  private isRunning = false;
  private phase: DevPhase = 'startup';
  private stdinListenerSetup = false;
  private unsubscribe: (() => void) | null = null;
  private rebuildLogBuffer: BufferedLog[] = [];
  private startupLogBuffer: BufferedLog[] = [];
  private workloadTypes: Map<string, WorkloadType> = new Map();
  private _agentMode = false;

  start(config: {
    projectName: string;
    stageName: string;
    onCommand?: CommandHandler;
    onReady?: ReadyHandler;
    devMode?: 'normal' | 'legacy';
    /** When true, uses non-TTY renderer optimized for LLM/agent consumption */
    agentMode?: boolean;
  }) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.phase = 'startup';
    this.commandHandler = config.onCommand || null;
    this.readyHandler = config.onReady || null;
    this.startupLogBuffer = [];
    this.rebuildLogBuffer = [];
    this._agentMode = config.agentMode ?? false;

    tuiManager.setDevTuiActive(true);
    setSpinnerDevTuiActive(true);

    resetWorkloadColors();
    devTuiState.init({
      projectName: config.projectName,
      stageName: config.stageName,
      devMode: config.devMode || 'normal'
    });

    // Use non-TTY renderer in agent mode for LLM-friendly output
    if (this._agentMode) {
      this.renderer = new DevTuiNonTtyRenderer();
    } else {
      this.renderer = new DevTuiRenderer();
    }
    this.renderer.start();
    // DevTuiNonTtyRenderer handles its own state subscription, only add for TTY renderer
    if (!this._agentMode) {
      this.unsubscribe = devTuiState.subscribe(() => this.renderer?.render());
    }
  }

  get agentMode(): boolean {
    return this._agentMode;
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

    // Call ready handler first (prints agent startup message in agent mode)
    if (this.readyHandler) {
      this.readyHandler();
    }

    this.printRunningSummary();

    // Only setup keyboard shortcuts in interactive mode (not agent mode)
    if (!this._agentMode) {
      this.setupKeyboardShortcuts();
    }

    // Flush buffered startup logs after a short delay (so user can read the summary)
    // In agent mode, flush immediately without delay
    if (this.startupLogBuffer.length > 0) {
      const flushLogs = () => {
        for (const log of this.startupLogBuffer) {
          this.printLog(log.source, log.message, log.level);
        }
        this.startupLogBuffer = [];
      };

      if (this._agentMode) {
        flushLogs();
      } else {
        setTimeout(flushLogs, 1000);
      }
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

    // In agent mode, use simple text output
    if (this._agentMode) {
      console.log(`[~] Rebuilding workloads: ${workloadNames.join(', ')}`);
      return;
    }

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

    // In agent mode, output as plain text
    if (this._agentMode) {
      const detailStr = detail ? ` - ${detail}` : '';
      console.log(`[~] ${name}: ${step}${detailStr}`);
      return;
    }

    getRebuildRenderer().setWorkloadStep(name, step, detail);
  }

  /**
   * Set the package/image size for a workload during rebuild.
   */
  setRebuildSize(name: string, size: string) {
    if (this.phase !== 'rebuilding') return;

    // In agent mode, skip (will be shown in done message)
    if (this._agentMode) return;

    getRebuildRenderer().setWorkloadSize(name, size);
  }

  /**
   * Mark a workload rebuild as complete.
   */
  setRebuildDone(name: string, size?: string) {
    if (this.phase !== 'rebuilding') return;

    // In agent mode, output as plain text
    if (this._agentMode) {
      const sizeStr = size ? ` [${size}]` : '';
      console.log(`[+] ${name}: rebuild complete${sizeStr}`);
      return;
    }

    getRebuildRenderer().setWorkloadDone(name, size);
  }

  /**
   * Mark a workload rebuild as failed.
   */
  setRebuildError(name: string, error: string) {
    if (this.phase !== 'rebuilding') return;

    // In agent mode, output as plain text
    if (this._agentMode) {
      console.log(`[x] ${name}: rebuild failed - ${error}`);
      return;
    }

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

    // In agent mode, skip the fancy renderer stop
    if (!this._agentMode) {
      // Stop the rebuild renderer
      stopRebuild();

      // Re-enable normal output (spinners stay suppressed in running phase)
      tuiManager.setDevTuiActive(false);
      setSpinnerDevTuiActive(false);

      // Wait 1 second so user can read the summary
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

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
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }
    process.stdin.removeAllListeners('data');

    process.stdin.on('data', async (data) => {
      if (applicationManager.isInterrupted) return;
      if (!this.rebuildHandler) return;
      // Ignore input during rebuild
      if (this.phase === 'rebuilding') return;

      const inputChunk = data.toString();
      for (const char of inputChunk) {
        const code = char.charCodeAt(0);

        if (code === 3) {
          await applicationManager.handleExitSignal('SIGINT');
          return;
        }

        if (code === 12) {
          console.clear();
          return;
        }

        if (code === 13 || code === 10) {
          process.stdout.write('\n');
          const buffer = devTuiState.getState().inputBuffer.trim().toLowerCase();
          devTuiState.clearInputBuffer();
          await this.handleBufferedCommand(buffer);
          continue;
        }

        if (code === 8 || code === 127) {
          const current = devTuiState.getState().inputBuffer;
          if (current.length > 0) {
            devTuiState.setInputBuffer(current.slice(0, -1));
            process.stdout.write('\b \b');
          }
          continue;
        }

        if (char.trim()) {
          devTuiState.appendToInputBuffer(char);
          process.stdout.write(char);
        }
      }
    });
  }

  private async handleBufferedCommand(buffer: string) {
    if (!buffer) return;

    const state = devTuiState.getState();
    const workloads = state.workloads.filter((w) => w.status === 'running' || w.status === 'error');

    if (buffer === 'a') {
      await this.rebuildHandler?.(null);
      return;
    }

    const num = parseInt(buffer, 10);
    if (num >= 1 && num <= workloads.length) {
      const workload = workloads[num - 1];
      await this.rebuildHandler?.(workload.name);
      return;
    }

    if (buffer === 'h' || buffer === '?') {
      this.printKeyboardHelp();
    }
  }

  private printKeyboardHelp() {
    const state = devTuiState.getState();
    const workloads = state.workloads.filter((w) => w.status === 'running' || w.status === 'error');

    console.log(`
${tuiManager.colorize('cyan', '  Keyboard shortcuts:')}
 ${workloads.map((w, idx) => `    ${tuiManager.colorize('white', String(idx + 1))} + enter - rebuild ${tuiManager.colorize(getWorkloadColor(w.name), w.name)}`).join('\n')}
    ${tuiManager.colorize('white', 'a')} + enter - rebuild all workloads
    ${tuiManager.colorize('white', 'h')} + enter - show this help
    ${tuiManager.colorize('gray', 'Ctrl+C')} - stop dev mode
`);
  }

  private printRunningSummary() {
    const state = devTuiState.getState();
    const runningWorkloads = state.workloads.filter((w) => w.status === 'running' || w.status === 'error');

    // In agent mode, use plain text output without colors or box decorations
    if (this._agentMode) {
      console.log('');
      console.log('--- Dev mode ready ---');
      console.log(`Workloads running: ${runningWorkloads.length}`);
      for (const workload of runningWorkloads) {
        const status = workload.status === 'running' ? 'running' : 'error';
        const url = workload.url ? ` at ${workload.url}` : '';
        console.log(`  ${workload.name} (${workload.type}): ${status}${url}`);
      }
      console.log('');
      return;
    }

    const contentLines: string[] = [];
    contentLines.push(`${tuiManager.colorize('gray', 'Workloads running:')} ${runningWorkloads.length}`);
    for (const [index, workload] of runningWorkloads.entries()) {
      const color = getWorkloadColor(workload.name);
      const num = tuiManager.colorize('gray', `[${index + 1}]`);
      const label = tuiManager.colorize(color, workload.name);
      contentLines.push(workload.url ? `  ${num} ${label}: ${workload.url}` : `  ${num} ${label}`);
    }
    contentLines.push('');
    contentLines.push(
      tuiManager.colorize(
        'gray',
        `Shortcuts: [1-${runningWorkloads.length}] + enter rebuild  [a] + enter rebuild all  [h] + enter help  [Ctrl+C] stop`
      )
    );

    console.info('');
    clackBox(contentLines.join('\n'), tuiManager.makeBold(' Dev mode ready '), {
      rounded: true,
      width: 'auto',
      titleAlign: 'left',
      contentAlign: 'left'
    });
    console.info('');
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

    // In agent mode, write to JSONL log file and use plain text console output
    if (this._agentMode) {
      agentLog(source, message, level === 'debug' ? 'info' : level);
      const levelPrefix = level === 'error' ? '[ERROR] ' : level === 'warn' ? '[WARN] ' : '';
      console.log(`${timestamp} [${source}] ${levelPrefix}${message}`);
      return;
    }

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
