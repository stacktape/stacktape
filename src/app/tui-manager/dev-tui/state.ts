import type {
  DevPhase,
  DevTuiState,
  Hook,
  HookStatus,
  LocalResource,
  LogEntry,
  RebuildStep,
  RebuildWorkloadState,
  ResourceStatus,
  SetupStep,
  SetupStepStatus,
  Workload,
  WorkloadType
} from './types';

type Listener = (state: DevTuiState) => void;

const DEFAULT_MAX_LOGS = 1000;

const createInitialState = (): DevTuiState => ({
  phase: 'startup',
  devMode: 'normal',
  projectName: '',
  stageName: '',
  localResources: [],
  setupSteps: [],
  hooks: [],
  workloads: [],
  logs: [],
  maxLogs: DEFAULT_MAX_LOGS,
  selectedLogFilter: null,
  sidebarVisible: true,
  isQuitting: false,
  inputBuffer: '',
  rebuildingWorkloads: [],
  startTime: Date.now()
});

class DevTuiStateManager {
  private state: DevTuiState = createInitialState();
  private listeners: Set<Listener> = new Set();
  private logIdCounter = 0;
  private notifyScheduled = false;

  getState(): DevTuiState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  flushPendingNotifications() {
    this.notifyScheduled = false;
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch {}
    }
  }

  private notify() {
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;

    setImmediate(() => {
      this.notifyScheduled = false;
      for (const listener of this.listeners) {
        listener(this.state);
      }
    });
  }

  private setState(updates: Partial<DevTuiState>) {
    const changed = Object.entries(updates).some(([key, value]) => !Object.is((this.state as any)[key], value));
    if (!changed) return;
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  init(config: { projectName: string; stageName: string; devMode?: 'normal' | 'legacy' }) {
    this.state = {
      ...createInitialState(),
      projectName: config.projectName,
      stageName: config.stageName,
      devMode: config.devMode || 'normal',
      startTime: Date.now()
    };
    this.logIdCounter = 0;
    this.notify();
  }

  reset() {
    this.state = createInitialState();
    this.logIdCounter = 0;
    this.notify();
  }

  setPhase(phase: DevPhase) {
    this.setState({ phase });
  }

  addLocalResource(resource: Omit<LocalResource, 'status'>) {
    if (this.state.localResources.some((r) => r.name === resource.name)) return;
    const newResource: LocalResource = { ...resource, status: 'pending' };
    this.setState({
      localResources: [...this.state.localResources, newResource]
    });
  }

  updateLocalResource(name: string, updates: Partial<LocalResource>) {
    let hasAnyTarget = false;
    let changed = false;
    const updatedResources = this.state.localResources.map((r) => {
      if (r.name !== name) return r;
      hasAnyTarget = true;
      const next = { ...r, ...updates };
      const didChange = Object.keys(next).some((key) => !Object.is((r as any)[key], (next as any)[key]));
      if (didChange) {
        changed = true;
        return next;
      }
      return r;
    });
    if (!hasAnyTarget || !changed) return;
    this.setState({
      localResources: updatedResources
    });
  }

  setLocalResourceStatus(name: string, status: ResourceStatus, extras?: Partial<LocalResource>) {
    this.updateLocalResource(name, { status, ...extras });
  }

  addWorkload(workload: Omit<Workload, 'status'>) {
    if (this.state.workloads.some((w) => w.name === workload.name)) return;
    const newWorkload: Workload = { ...workload, status: 'pending' };
    this.setState({
      workloads: [...this.state.workloads, newWorkload]
    });
  }

  updateWorkload(name: string, updates: Partial<Workload>) {
    let hasAnyTarget = false;
    let changed = false;
    const updatedWorkloads = this.state.workloads.map((w) => {
      if (w.name !== name) return w;
      hasAnyTarget = true;
      const next = { ...w, ...updates };
      const didChange = Object.keys(next).some((key) => !Object.is((w as any)[key], (next as any)[key]));
      if (didChange) {
        changed = true;
        return next;
      }
      return w;
    });
    if (!hasAnyTarget || !changed) return;
    this.setState({
      workloads: updatedWorkloads
    });
  }

  setWorkloadStatus(name: string, status: ResourceStatus, extras?: Partial<Workload>) {
    this.updateWorkload(name, { status, ...extras });
  }

  addHook(hook: Omit<Hook, 'status'>) {
    if (this.state.hooks.some((h) => h.name === hook.name)) return;
    const newHook: Hook = { ...hook, status: 'pending' };
    this.setState({
      hooks: [...this.state.hooks, newHook]
    });
  }

  updateHook(name: string, updates: Partial<Hook>) {
    let hasAnyTarget = false;
    let changed = false;
    const updatedHooks = this.state.hooks.map((h) => {
      if (h.name !== name) return h;
      hasAnyTarget = true;
      const next = { ...h, ...updates };
      const didChange = Object.keys(next).some((key) => !Object.is((h as any)[key], (next as any)[key]));
      if (didChange) {
        changed = true;
        return next;
      }
      return h;
    });
    if (!hasAnyTarget || !changed) return;
    this.setState({
      hooks: updatedHooks
    });
  }

  setHookStatus(name: string, status: HookStatus, extras?: Partial<Hook>) {
    this.updateHook(name, { status, ...extras });
  }

  addSetupStep(step: Omit<SetupStep, 'status'>) {
    if (this.state.setupSteps.some((s) => s.id === step.id)) return;
    const newStep: SetupStep = { ...step, status: 'pending' };
    this.setState({
      setupSteps: [...this.state.setupSteps, newStep]
    });
  }

  setSetupStepStatus(id: string, status: SetupStepStatus, detail?: string) {
    let hasAnyTarget = false;
    let changed = false;
    const updatedSteps = this.state.setupSteps.map((s) => {
      if (s.id !== id) return s;
      hasAnyTarget = true;
      const next = { ...s, status, detail: detail ?? s.detail };
      const didChange = Object.keys(next).some((key) => !Object.is((s as any)[key], (next as any)[key]));
      if (didChange) {
        changed = true;
        return next;
      }
      return s;
    });
    if (!hasAnyTarget || !changed) return;
    this.setState({
      setupSteps: updatedSteps
    });
  }

  addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    const newLog: LogEntry = {
      ...entry,
      id: `log-${++this.logIdCounter}`,
      timestamp: Date.now()
    };

    let newLogs = [...this.state.logs, newLog];

    if (newLogs.length > this.state.maxLogs) {
      newLogs = newLogs.slice(-this.state.maxLogs);
    }

    this.setState({ logs: newLogs });
  }

  private normalizeLogMessage(message: string): string[] {
    let clean = '';
    for (let i = 0; i < message.length; i++) {
      const code = message.charCodeAt(i);

      // ESC-initiated sequences
      if (code === 27) {
        const next = message[i + 1];
        if (next === '[') {
          // CSI sequence: ESC [ <params> <final byte>
          i += 2;
          while (i < message.length) {
            const c = message.charCodeAt(i);
            if (c >= 64 && c <= 126) break;
            i++;
          }
          continue;
        }
        if (next === ']') {
          // OSC sequence: ESC ] ... (ST | BEL)
          // Terminated by BEL (\x07) or ST (ESC \)
          i += 2;
          while (i < message.length) {
            if (message.charCodeAt(i) === 7) break; // BEL
            if (message.charCodeAt(i) === 27 && message[i + 1] === '\\') {
              i++;
              break;
            }
            i++;
          }
          continue;
        }
        if (next === '(' || next === ')' || next === '*' || next === '+') {
          // Designate character set: ESC ( <char>
          i += 2;
          continue;
        }
        // Single-character escape (e.g., ESC M, ESC 7, ESC 8, ESC P for DCS)
        if (next === 'P') {
          // DCS: ESC P ... ST
          i += 2;
          while (i < message.length) {
            if (message.charCodeAt(i) === 27 && message[i + 1] === '\\') {
              i++;
              break;
            }
            i++;
          }
          continue;
        }
        // Skip ESC + any single char
        i++;
        continue;
      }

      // 8-bit CSI (0x9B) -- rare but can appear
      if (code === 0x9b) {
        i++;
        while (i < message.length) {
          const c = message.charCodeAt(i);
          if (c >= 64 && c <= 126) break;
          i++;
        }
        continue;
      }

      // Carriage return handling:
      // - Trailing \r (end of string or followed by \n): just strip it
      // - Mid-line \r followed by more text: progress-bar overwrite, discard current line
      if (code === 13) {
        const nextIdx = i + 1;
        if (nextIdx >= message.length || message.charCodeAt(nextIdx) === 10) {
          // Trailing \r or \r\n -- just skip the \r
          continue;
        }
        // Mid-line \r followed by more text: discard what we've accumulated on the current line
        clean = this.discardCurrentLine(clean);
        continue;
      }

      if (code === 9) {
        clean += '  ';
        continue;
      }
      // Strip other control chars (C0 except \n, C1 delete)
      if ((code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127) {
        continue;
      }
      clean += message[i];
    }

    const lines = clean
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);
    return lines.length > 0 ? lines : [''];
  }

  private discardCurrentLine(text: string): string {
    const lastNewline = text.lastIndexOf('\n');
    return lastNewline === -1 ? '' : text.slice(0, lastNewline + 1);
  }

  addLogLine(source: string, message: string, level: LogEntry['level'] = 'info') {
    const lines = this.normalizeLogMessage(message);
    for (const line of lines) {
      this.addLog({
        source,
        sourceType: 'workload',
        message: line,
        level
      });
    }
  }

  addSystemLog(message: string, level: LogEntry['level'] = 'info') {
    const lines = this.normalizeLogMessage(message);
    for (const line of lines) {
      this.addLog({
        source: 'system',
        sourceType: 'system',
        message: line,
        level
      });
    }
  }

  clearLogs() {
    if (this.state.logs.length === 0) return;
    this.setState({ logs: [] });
  }

  setLogFilter(filter: string | null) {
    if (Object.is(this.state.selectedLogFilter, filter)) return;
    this.setState({ selectedLogFilter: filter });
  }

  setSidebarVisible(visible: boolean) {
    if (Object.is(this.state.sidebarVisible, visible)) return;
    this.setState({ sidebarVisible: visible });
  }

  toggleSidebar() {
    this.setState({ sidebarVisible: !this.state.sidebarVisible });
  }

  setQuitting(isQuitting: boolean) {
    if (Object.is(this.state.isQuitting, isQuitting)) return;
    this.setState({ isQuitting });
  }

  setInputBuffer(buffer: string) {
    if (Object.is(this.state.inputBuffer, buffer)) return;
    this.setState({ inputBuffer: buffer });
  }

  appendToInputBuffer(char: string) {
    this.setState({ inputBuffer: this.state.inputBuffer + char });
  }

  clearInputBuffer() {
    if (this.state.inputBuffer.length === 0) return;
    this.setState({ inputBuffer: '' });
  }

  startRebuild(workloadNames: string[], workloadTypes: Map<string, WorkloadType>) {
    const rebuildingWorkloads: RebuildWorkloadState[] = workloadNames.map((name) => ({
      name,
      type: workloadTypes.get(name) || 'container',
      status: 'pending',
      startTime: Date.now()
    }));
    this.setState({ phase: 'rebuilding', rebuildingWorkloads });
  }

  setRebuildWorkloadStep(name: string, step: RebuildStep, detail?: string) {
    const updated = this.state.rebuildingWorkloads.map((w) => {
      if (w.name !== name) return w;
      return { ...w, status: 'in-progress' as const, step, stepDetail: detail };
    });
    this.setState({ rebuildingWorkloads: updated });
  }

  setRebuildWorkloadSize(name: string, size: string) {
    const updated = this.state.rebuildingWorkloads.map((w) => {
      if (w.name !== name) return w;
      return { ...w, size };
    });
    this.setState({ rebuildingWorkloads: updated });
  }

  setRebuildWorkloadDone(name: string, size?: string) {
    const updated = this.state.rebuildingWorkloads.map((w) => {
      if (w.name !== name) return w;
      return { ...w, status: 'done' as const, step: 'done' as const, endTime: Date.now(), size: size ?? w.size };
    });
    this.setState({ rebuildingWorkloads: updated });
  }

  setRebuildWorkloadError(name: string, error: string) {
    const updated = this.state.rebuildingWorkloads.map((w) => {
      if (w.name !== name) return w;
      return { ...w, status: 'error' as const, step: 'error' as const, endTime: Date.now(), error };
    });
    this.setState({ rebuildingWorkloads: updated });
  }

  finishRebuild() {
    this.setState({ phase: 'running', rebuildingWorkloads: [] });
  }
}

export const devTuiState = new DevTuiStateManager();
