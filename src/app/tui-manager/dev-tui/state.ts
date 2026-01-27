import type {
  DevPhase,
  DevTuiState,
  Hook,
  HookStatus,
  LocalResource,
  LogEntry,
  ResourceStatus,
  SetupStep,
  SetupStepStatus,
  Workload
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
  isQuitting: false,
  inputBuffer: ''
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

  private notify() {
    // Debounce notifications to prevent rapid re-renders
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
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  // ─── Initialization ───

  init(config: { projectName: string; stageName: string; devMode?: 'normal' | 'legacy' }) {
    this.state = {
      ...createInitialState(),
      projectName: config.projectName,
      stageName: config.stageName,
      devMode: config.devMode || 'normal'
    };
    this.logIdCounter = 0;
    this.notify();
  }

  reset() {
    this.state = createInitialState();
    this.logIdCounter = 0;
    this.notify();
  }

  // ─── Phase Management ───

  setPhase(phase: DevPhase) {
    this.setState({ phase });
  }

  // ─── Local Resources ───

  addLocalResource(resource: Omit<LocalResource, 'status'>) {
    const newResource: LocalResource = { ...resource, status: 'pending' };
    this.setState({
      localResources: [...this.state.localResources, newResource]
    });
  }

  updateLocalResource(name: string, updates: Partial<LocalResource>) {
    this.setState({
      localResources: this.state.localResources.map((r) => (r.name === name ? { ...r, ...updates } : r))
    });
  }

  setLocalResourceStatus(name: string, status: ResourceStatus, extras?: Partial<LocalResource>) {
    this.updateLocalResource(name, { status, ...extras });
  }

  // ─── Workloads ───

  addWorkload(workload: Omit<Workload, 'status'>) {
    const newWorkload: Workload = { ...workload, status: 'pending' };
    this.setState({
      workloads: [...this.state.workloads, newWorkload]
    });
  }

  updateWorkload(name: string, updates: Partial<Workload>) {
    this.setState({
      workloads: this.state.workloads.map((w) => (w.name === name ? { ...w, ...updates } : w))
    });
  }

  setWorkloadStatus(name: string, status: ResourceStatus, extras?: Partial<Workload>) {
    this.updateWorkload(name, { status, ...extras });
  }

  // ─── Hooks ───

  addHook(hook: Omit<Hook, 'status'>) {
    const newHook: Hook = { ...hook, status: 'pending' };
    this.setState({
      hooks: [...this.state.hooks, newHook]
    });
  }

  updateHook(name: string, updates: Partial<Hook>) {
    this.setState({
      hooks: this.state.hooks.map((h) => (h.name === name ? { ...h, ...updates } : h))
    });
  }

  setHookStatus(name: string, status: HookStatus, extras?: Partial<Hook>) {
    this.updateHook(name, { status, ...extras });
  }

  // ─── Setup Steps ───

  addSetupStep(step: Omit<SetupStep, 'status'>) {
    const newStep: SetupStep = { ...step, status: 'pending' };
    this.setState({
      setupSteps: [...this.state.setupSteps, newStep]
    });
  }

  setSetupStepStatus(id: string, status: SetupStepStatus, detail?: string) {
    this.setState({
      setupSteps: this.state.setupSteps.map((s) => (s.id === id ? { ...s, status, detail: detail ?? s.detail } : s))
    });
  }

  // ─── Logs ───

  addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    const newLog: LogEntry = {
      ...entry,
      id: `log-${++this.logIdCounter}`,
      timestamp: Date.now()
    };

    let newLogs = [...this.state.logs, newLog];

    // Trim logs if exceeding max
    if (newLogs.length > this.state.maxLogs) {
      newLogs = newLogs.slice(-this.state.maxLogs);
    }

    this.setState({ logs: newLogs });
  }

  addLogLine(source: string, message: string, level: LogEntry['level'] = 'info') {
    this.addLog({
      source,
      sourceType: 'workload',
      message,
      level
    });
  }

  addSystemLog(message: string, level: LogEntry['level'] = 'info') {
    this.addLog({
      source: 'system',
      sourceType: 'system',
      message,
      level
    });
  }

  clearLogs() {
    this.setState({ logs: [] });
  }

  // ─── UI State ───

  setLogFilter(filter: string | null) {
    this.setState({ selectedLogFilter: filter });
  }

  setQuitting(isQuitting: boolean) {
    this.setState({ isQuitting });
  }

  setInputBuffer(buffer: string) {
    this.setState({ inputBuffer: buffer });
  }

  appendToInputBuffer(char: string) {
    this.setState({ inputBuffer: this.state.inputBuffer + char });
  }

  clearInputBuffer() {
    this.setState({ inputBuffer: '' });
  }
}

export const devTuiState = new DevTuiStateManager();
