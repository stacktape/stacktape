import type {
  DevPhase,
  DevTuiState,
  Hook,
  HookStatus,
  LocalResource,
  RebuildStep,
  RebuildWorkloadState,
  ResourceStatus,
  SetupStep,
  SetupStepStatus,
  Workload,
  WorkloadType
} from './types';

type Listener = (state: DevTuiState) => void;

const createInitialState = (): DevTuiState => ({
  phase: 'startup',
  devMode: 'normal',
  projectName: '',
  stageName: '',
  localResources: [],
  setupSteps: [],
  hooks: [],
  workloads: [],
  rebuildPickerActive: false,
  rebuildingWorkloads: [],
  startTime: Date.now()
});

class DevTuiStateManager {
  private state: DevTuiState = createInitialState();
  private listeners: Set<Listener> = new Set();
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
    this.notify();
  }

  reset() {
    this.state = createInitialState();
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
    this.setState({
      localResources: this.updateNamedItem(this.state.localResources, (r) => r.name === name, updates)
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
    this.setState({
      workloads: this.updateNamedItem(this.state.workloads, (w) => w.name === name, updates)
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
    this.setState({
      hooks: this.updateNamedItem(this.state.hooks, (h) => h.name === name, updates)
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
    const current = this.state.setupSteps.find((s) => s.id === id);
    this.setState({
      setupSteps: this.updateNamedItem(this.state.setupSteps, (s) => s.id === id, {
        status,
        detail: detail ?? current?.detail
      })
    });
  }

  setRebuildPickerActive(active: boolean) {
    this.setState({ rebuildPickerActive: active });
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
    this.setState({
      rebuildingWorkloads: this.state.rebuildingWorkloads.map((w) =>
        w.name === name ? { ...w, status: 'in-progress' as const, step, stepDetail: detail } : w
      )
    });
  }

  setRebuildWorkloadSize(name: string, size: string) {
    this.setState({
      rebuildingWorkloads: this.state.rebuildingWorkloads.map((w) => (w.name === name ? { ...w, size } : w))
    });
  }

  setRebuildWorkloadDone(name: string, size?: string) {
    this.setState({
      rebuildingWorkloads: this.state.rebuildingWorkloads.map((w) =>
        w.name === name
          ? { ...w, status: 'done' as const, step: 'done' as const, endTime: Date.now(), size: size ?? w.size }
          : w
      )
    });
  }

  setRebuildWorkloadError(name: string, error: string) {
    this.setState({
      rebuildingWorkloads: this.state.rebuildingWorkloads.map((w) =>
        w.name === name ? { ...w, status: 'error' as const, step: 'error' as const, endTime: Date.now(), error } : w
      )
    });
  }

  finishRebuild() {
    this.setState({ phase: 'running', rebuildingWorkloads: [] });
  }

  /** Immutable single-item update; returns the original array when nothing changed. */
  private updateNamedItem<T extends object>(items: T[], matches: (item: T) => boolean, updates: Partial<T>): T[] {
    let changed = false;
    const updated = items.map((item) => {
      if (!matches(item)) return item;
      const next = { ...item, ...updates };
      const didChange = Object.keys(next).some((key) => !Object.is((item as any)[key], (next as any)[key]));
      if (!didChange) return item;
      changed = true;
      return next;
    });
    return changed ? updated : items;
  }
}

export const devTuiState = new DevTuiStateManager();
