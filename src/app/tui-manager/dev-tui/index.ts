import type {
  Hook,
  HookStatus,
  LocalResource,
  LogEntry,
  RebuildStep,
  ResourceStatus,
  SetupStep,
  SetupStepStatus,
  Workload,
  WorkloadType
} from './types';
import { applicationManager } from '@application-services/application-manager';
import { tuiManager } from '@application-services/tui-manager';
import { formatSectionHeaderLine } from '@application-services/tui-manager/command-header';
import type { CliRenderer } from '@opentui/core';
import { setSpinnerDevTuiActive } from '../spinners';
import { formatDuration, resetWorkloadColors } from './utils';
import { devTuiState } from './state';
import { agentLog } from 'src/commands/dev/agent-logger';

export type { Hook, HookStatus, LocalResource, LogEntry, RebuildStep, ResourceStatus, Workload, WorkloadType };

type CommandHandler = (command: string) => void;
type RebuildHandler = (workloadName: string | null) => Promise<void>;
type ReadyHandler = () => void;
type DevPhase = 'startup' | 'running' | 'rebuilding';

interface DevTuiRendererInterface {
  start: () => void;
  stop: () => void | Promise<void>;
}

class DevTuiRenderer {
  private renderer: CliRenderer | null = null;
  private rebuildHandler: RebuildHandler | null = null;
  private quitHandler: (() => void) | null = null;
  private errorHandler: ((error: Error) => void) | null = null;

  setHandlers(config: { onRebuild?: RebuildHandler; onQuit?: () => void; onRenderError?: (error: Error) => void }) {
    this.rebuildHandler = config.onRebuild || null;
    this.quitHandler = config.onQuit || null;
    this.errorHandler = config.onRenderError || null;
  }

  async startAsync() {
    if (this.renderer) return;

    const { render, useRenderer } = await import('@opentui/solid');
    const { DevDashboard } = await import('../routes/dev/dev-dashboard');

    const rebuildHandler = this.rebuildHandler;
    const quitHandler = this.quitHandler;
    const errorHandler = this.errorHandler;
    const setRenderer = (r: CliRenderer) => {
      this.renderer = r;
      // Force full renders (no cell diffing) so OSC 8 hyperlink sequences
      // are always re-emitted. Without this, the native Zig diff engine
      // skips unchanged cells, dropping OSC 8 start/end sequences for links
      // that haven't visually changed, making them non-clickable.
      const lib = (r as any).lib;
      const ptr = (r as any).rendererPtr;
      if (lib?.render && ptr) {
        (r as any).renderNative = function () {
          if ((this as any).renderingNative) throw new Error('Rendering called concurrently');
          (this as any).renderingNative = true;
          lib.render(ptr, true);
          (this as any).renderingNative = false;
        };
      }
    };

    const RendererCapture = () => {
      setRenderer(useRenderer() as unknown as CliRenderer);
      return DevDashboard({
        onRebuild: (name: string | null) => {
          void rebuildHandler?.(name);
        },
        onQuit: () => {
          quitHandler?.();
        },
        onRenderError: (error: Error) => {
          errorHandler?.(error);
        }
      });
    };

    await render(RendererCapture, {
      exitOnCtrlC: false,
      useAlternateScreen: true,
      useMouse: true,
      targetFps: 60,
      exitSignals: []
    });

    try {
      process.stdout.write('\x1B[5 q');
    } catch {}
  }

  start() {
    void this.startAsync().catch((err) => {
      console.error('Failed to start dev TUI renderer:', err?.message || err);
      this.errorHandler?.(err instanceof Error ? err : new Error(String(err)));
    });
  }

  async stop() {
    const renderer = this.renderer;
    this.renderer = null;

    if (!renderer) return;

    try {
      renderer.destroy();
    } catch {}
    try {
      await Promise.race([renderer.idle(), new Promise<void>((resolve) => setTimeout(resolve, 700))]);
    } catch {}
    try {
      process.stdout.write('\x1B[0 q');
    } catch {}
    try {
      if (process.stdin.isTTY) {
        if (process.stdin.isRaw) process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.unref();
      }
    } catch {}
  }

  suspend() {
    try {
      this.renderer?.suspend();
    } catch {}
  }

  resume() {
    try {
      this.renderer?.resume();
    } catch {}
  }
}

class DevTuiNonTtyRenderer implements DevTuiRendererInterface {
  private printedItems = new Set<string>();
  private unsubscribe: (() => void) | null = null;

  start() {
    this.printedItems.clear();
    this.unsubscribe = devTuiState.subscribe(() => this.render());
    this.render();
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
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
    console.info(message);
  }

  private renderLocalResources(resources: LocalResource[]) {
    for (const r of resources) {
      const key = `local-${r.name}-${r.status}`;
      if (this.printedItems.has(key)) continue;

      if (r.status === 'starting') {
        this.log(`[i] Local resource "${r.name}" (${r.type}): starting`);
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
        this.log(`[i] Setup "${step.label}": running`);
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
        this.log(`[i] Hook "${hook.name}": running`);
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
        this.log(`[i] Workload "${w.name}" (${w.type}): starting${msg}`);
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
  private renderer: DevTuiRenderer | DevTuiNonTtyRenderer | null = null;
  private commandHandler: CommandHandler | null = null;
  private rebuildHandler: RebuildHandler | null = null;
  private readyHandler: ReadyHandler | null = null;
  private isRunning = false;
  private phase: DevPhase = 'startup';
  private workloadTypes: Map<string, WorkloadType> = new Map();
  private localResourceStatusSignatures: Map<string, string> = new Map();
  private setupStepStatusSignatures: Map<string, string> = new Map();
  private workloadStatusSignatures: Map<string, string> = new Map();
  private hookStatusSignatures: Map<string, string> = new Map();
  private _agentMode = false;

  start(config: {
    projectName: string;
    stageName: string;
    onCommand?: CommandHandler;
    onReady?: ReadyHandler;
    devMode?: 'normal' | 'legacy';
    agentMode?: boolean;
  }) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.phase = 'startup';
    this.commandHandler = config.onCommand || null;
    this.readyHandler = config.onReady || null;
    this._agentMode = config.agentMode ?? false;
    this.localResourceStatusSignatures.clear();
    this.setupStepStatusSignatures.clear();
    this.workloadStatusSignatures.clear();
    this.hookStatusSignatures.clear();

    tuiManager.setDevTuiActive(true);
    setSpinnerDevTuiActive(true);

    resetWorkloadColors();
    devTuiState.init({
      projectName: config.projectName,
      stageName: config.stageName,
      devMode: config.devMode || 'normal'
    });
  }

  startRenderer() {
    if (this.renderer) return;

    if (this._agentMode) {
      this.renderer = new DevTuiNonTtyRenderer();
    } else {
      const ttyRenderer = new DevTuiRenderer();
      ttyRenderer.setHandlers({
        onRebuild: async (name: string | null) => {
          await this.rebuildHandler?.(name);
        },
        onQuit: () => {
          void applicationManager.handleExitSignal('SIGINT');
        },
        onRenderError: (error: Error) => {
          console.error('Dev TUI render error:', error.message);
          void this.stop();
        }
      });
      this.renderer = ttyRenderer;
    }
    this.renderer.start();
  }

  get agentMode(): boolean {
    return this._agentMode;
  }

  async stop() {
    if (this.renderer) {
      await this.renderer.stop();
      this.renderer = null;
    }
    this.isRunning = false;
    this.phase = 'startup';
    this.commandHandler = null;
    this.localResourceStatusSignatures.clear();
    this.setupStepStatusSignatures.clear();
    this.workloadStatusSignatures.clear();
    this.hookStatusSignatures.clear();
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
    devTuiState.setPhase('running');

    if (this.readyHandler) {
      this.readyHandler();
    }

    if (this._agentMode) {
      this.printAgentRunningSummary();
    }
  }

  private printAgentRunningSummary() {
    const state = devTuiState.getState();
    const runningWorkloads = state.workloads.filter((w) => w.status === 'running' || w.status === 'error');

    console.info('');
    console.info(formatSectionHeaderLine('Dev mode ready'));
    console.info(`Workloads running: ${runningWorkloads.length}`);
    for (const workload of runningWorkloads) {
      const status = workload.status === 'running' ? 'running' : 'error';
      const url = workload.url ? ` at ${workload.url}` : '';
      console.info(`  ${workload.name} (${workload.type}): ${status}${url}`);
    }
    console.info('');
  }

  setRebuildHandler(handler: RebuildHandler) {
    this.rebuildHandler = handler;
  }

  startRebuild(workloadNames: string[]) {
    if (this.phase === 'rebuilding') return;
    this.phase = 'rebuilding';

    if (this._agentMode) {
      console.info(`[i] Rebuilding workloads: ${workloadNames.join(', ')}`);
      return;
    }

    devTuiState.startRebuild(workloadNames, this.workloadTypes);
  }

  setRebuildStep(name: string, step: RebuildStep, detail?: string) {
    if (this.phase !== 'rebuilding') return;

    if (this._agentMode) {
      const detailStr = detail ? ` - ${detail}` : '';
      console.info(`[i] ${name}: ${step}${detailStr}`);
      return;
    }

    devTuiState.setRebuildWorkloadStep(name, step, detail);
  }

  setRebuildSize(name: string, size: string) {
    if (this.phase !== 'rebuilding') return;
    if (this._agentMode) return;
    devTuiState.setRebuildWorkloadSize(name, size);
  }

  setRebuildDone(name: string, size?: string) {
    if (this.phase !== 'rebuilding') return;

    if (this._agentMode) {
      const sizeStr = size ? ` [${size}]` : '';
      console.info(`[+] ${name}: rebuild complete${sizeStr}`);
      return;
    }

    devTuiState.setRebuildWorkloadDone(name, size);
  }

  setRebuildError(name: string, error: string) {
    if (this.phase !== 'rebuilding') return;

    if (this._agentMode) {
      console.info(`[x] ${name}: rebuild failed - ${error}`);
      return;
    }

    devTuiState.setRebuildWorkloadError(name, error);
  }

  bufferRebuildLog(source: string, message: string, level: 'info' | 'warn' | 'error' = 'info') {
    if (this.phase !== 'rebuilding') return;
    devTuiState.addLogLine(source, message, level);
  }

  async finishRebuild() {
    if (this.phase !== 'rebuilding') return;

    if (!this._agentMode) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    devTuiState.finishRebuild();
    this.phase = 'running';
  }

  get inRebuildPhase(): boolean {
    return this.phase === 'rebuilding';
  }

  addLocalResource(resource: { name: string; type: LocalResource['type'] }) {
    devTuiState.addLocalResource(resource);
  }

  setLocalResourceStatus(
    name: string,
    status: ResourceStatus,
    extras?: { port?: number; host?: string; connectionString?: string; error?: string }
  ) {
    const signature = JSON.stringify({ status, extras: extras || null });
    if (this.localResourceStatusSignatures.get(name) === signature) return;
    this.localResourceStatusSignatures.set(name, signature);
    devTuiState.setLocalResourceStatus(name, status, extras);
  }

  addSetupStep(id: string, label: string) {
    devTuiState.addSetupStep({ id, label });
  }

  setSetupStepStatus(id: string, status: SetupStepStatus, detail?: string) {
    const signature = JSON.stringify({ status, detail: detail || null });
    if (this.setupStepStatusSignatures.get(id) === signature) return;
    this.setupStepStatusSignatures.set(id, signature);
    devTuiState.setSetupStepStatus(id, status, detail);
  }

  addWorkload(workload: { name: string; type: WorkloadType; hostingContentType?: string }) {
    devTuiState.addWorkload(workload);
    this.workloadTypes.set(workload.name, workload.type);
  }

  setWorkloadStatus(
    name: string,
    status: ResourceStatus,
    extras?: { url?: string; port?: number; statusMessage?: string; error?: string; size?: string }
  ) {
    const signature = JSON.stringify({ status, extras: extras || null });
    if (this.workloadStatusSignatures.get(name) === signature) return;
    this.workloadStatusSignatures.set(name, signature);
    devTuiState.setWorkloadStatus(name, status, extras);
  }

  addHook(hook: { name: string }) {
    devTuiState.addHook(hook);
  }

  setHookStatus(name: string, status: HookStatus, extras?: { duration?: number; message?: string; error?: string }) {
    const signature = JSON.stringify({ status, extras: extras || null });
    if (this.hookStatusSignatures.get(name) === signature) return;
    this.hookStatusSignatures.set(name, signature);
    devTuiState.setHookStatus(name, status, extras);
  }

  log(source: string, message: string, level: LogEntry['level'] = 'info') {
    if (this._agentMode) {
      agentLog(source, message, level === 'debug' ? 'info' : level);
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      const levelPrefix = level === 'error' ? '[ERROR] ' : level === 'warn' ? '[WARN] ' : '';
      console.info(`${timestamp} [${source}] ${levelPrefix}${message}`);
      return;
    }

    devTuiState.addLogLine(source, message, level);
  }

  systemLog(message: string, level: LogEntry['level'] = 'info') {
    if (this._agentMode) {
      agentLog('system', message, level === 'debug' ? 'info' : level);
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      console.info(`${timestamp} [system] ${message}`);
      return;
    }

    devTuiState.addSystemLog(message, level);
  }

  logLines(source: string, lines: string[], level: LogEntry['level'] = 'info') {
    for (const line of lines) {
      if (line.trim()) {
        this.log(source, line, level);
      }
    }
  }

  clearLogs() {
    devTuiState.clearLogs();
  }

  setLogFilter(workloadName: string | null) {
    devTuiState.setLogFilter(workloadName);
  }
}

export const devTuiManager = new DevTuiManager();
