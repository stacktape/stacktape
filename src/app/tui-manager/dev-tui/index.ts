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
import { formatSectionHeaderLine } from '@application-services/tui-manager/command-header';
import type { Instance } from 'ink';
import { render } from 'ink';
import React from 'react';
import { setSpinnerDevTuiActive } from '../spinners';
import { DevStartupView } from './components/startup-view';
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

interface DevTuiRendererInterface {
  start: () => void;
  stop: () => void;
}

class DevTuiRenderer {
  private inkInstance: Instance | null = null;

  start() {
    if (this.inkInstance) return;

    this.inkInstance = render(React.createElement(DevStartupView), {
      patchConsole: false,
      concurrent: true
    } as any);
  }

  stop() {
    this.inkInstance?.unmount();
    this.inkInstance = null;
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
    console.log(message);
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
  private renderer: DevTuiRendererInterface | null = null;
  private commandHandler: CommandHandler | null = null;
  private rebuildHandler: RebuildHandler | null = null;
  private readyHandler: ReadyHandler | null = null;
  private isRunning = false;
  private phase: DevPhase = 'startup';
  private stdinListenerSetup = false;
  private rebuildLogBuffer: BufferedLog[] = [];
  private startupLogBuffer: BufferedLog[] = [];
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
    this.startupLogBuffer = [];
    this.rebuildLogBuffer = [];
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
      this.renderer = new DevTuiRenderer();
    }
    this.renderer.start();
  }

  get agentMode(): boolean {
    return this._agentMode;
  }

  stop() {
    if (this.renderer) {
      this.renderer.stop();
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

    if (this.renderer) {
      this.renderer.stop();
      this.renderer = null;
    }

    devTuiState.setPhase('running');

    tuiManager.setDevTuiActive(false);
    setSpinnerDevTuiActive(false);

    if (this.readyHandler) {
      this.readyHandler();
    }

    this.printRunningSummary();

    if (!this._agentMode) {
      this.setupKeyboardShortcuts();
    }

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

  startRebuild(workloadNames: string[]) {
    if (this.phase === 'rebuilding') return;
    this.phase = 'rebuilding';
    this.rebuildLogBuffer = [];

    if (this._agentMode) {
      console.log(`[i] Rebuilding workloads: ${workloadNames.join(', ')}`);
      return;
    }

    tuiManager.setDevTuiActive(true);
    setSpinnerDevTuiActive(true);

    const renderer = getRebuildRenderer();
    renderer.start(workloadNames, this.workloadTypes);
  }

  setRebuildStep(name: string, step: RebuildStep, detail?: string) {
    if (this.phase !== 'rebuilding') return;

    if (this._agentMode) {
      const detailStr = detail ? ` - ${detail}` : '';
      console.log(`[i] ${name}: ${step}${detailStr}`);
      return;
    }

    getRebuildRenderer().setWorkloadStep(name, step, detail);
  }

  setRebuildSize(name: string, size: string) {
    if (this.phase !== 'rebuilding') return;

    if (this._agentMode) return;

    getRebuildRenderer().setWorkloadSize(name, size);
  }

  setRebuildDone(name: string, size?: string) {
    if (this.phase !== 'rebuilding') return;

    if (this._agentMode) {
      const sizeStr = size ? ` [${size}]` : '';
      console.log(`[+] ${name}: rebuild complete${sizeStr}`);
      return;
    }

    getRebuildRenderer().setWorkloadDone(name, size);
  }

  setRebuildError(name: string, error: string) {
    if (this.phase !== 'rebuilding') return;

    if (this._agentMode) {
      console.log(`[x] ${name}: rebuild failed - ${error}`);
      return;
    }

    getRebuildRenderer().setWorkloadError(name, error);
  }

  bufferRebuildLog(source: string, message: string, level: 'info' | 'warn' | 'error' = 'info') {
    if (this.phase !== 'rebuilding') return;
    this.rebuildLogBuffer.push({ timestamp: Date.now(), source, message, level });
  }

  async finishRebuild() {
    if (this.phase !== 'rebuilding') return;

    if (!this._agentMode) {
      stopRebuild();
      tuiManager.setDevTuiActive(false);
      setSpinnerDevTuiActive(false);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    for (const log of this.rebuildLogBuffer) {
      this.printLog(log.source, log.message, log.level);
    }
    this.rebuildLogBuffer = [];

    this.phase = 'running';
  }

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

    if (this._agentMode) {
      console.log('');
      console.log(formatSectionHeaderLine('Dev mode ready'));
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
    tuiManager.printBox({ title: 'Dev mode ready', lines: contentLines });
    console.info('');
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
    if (this.phase === 'running') {
      this.printLog(source, message, level);
    } else if (this.phase === 'rebuilding') {
      this.rebuildLogBuffer.push({ timestamp: Date.now(), source, message, level });
    } else if (this.phase === 'startup') {
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

    if (this._agentMode) {
      agentLog(source, message, level === 'debug' ? 'info' : level);
      const levelPrefix = level === 'error' ? '[ERROR] ' : level === 'warn' ? '[WARN] ' : '';
      console.log(`${timestamp} [${source}] ${levelPrefix}${message}`);
      return;
    }

    const levelColor = level === 'error' ? 'red' : level === 'warn' ? 'yellow' : undefined;
    const msg = levelColor ? tuiManager.colorize(levelColor, message) : message;

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
