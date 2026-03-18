export type DevPhase = 'startup' | 'running' | 'rebuilding';

export type SidebarMode = 'normal' | 'collapsed' | 'fullscreen';

export type DevModeType = 'normal' | 'legacy';

export type ResourceStatus = 'pending' | 'starting' | 'running' | 'error' | 'stopped';

export type LocalResource = {
  name: string;
  type: 'postgres' | 'mysql' | 'mariadb' | 'redis' | 'dynamodb' | 'opensearch';
  status: ResourceStatus;
  port?: number;
  host?: string;
  connectionString?: string;
  error?: string;
};

export type WorkloadType = 'container' | 'function' | 'hosting-bucket' | 'nextjs-web' | 'ssr-web';

export type Workload = {
  name: string;
  type: WorkloadType;
  status: ResourceStatus;
  url?: string;
  port?: number;
  statusMessage?: string;
  error?: string;
  hostingContentType?: string;
  size?: string;
};

export type HookStatus = 'pending' | 'running' | 'success' | 'error';

export type Hook = {
  name: string;
  status: HookStatus;
  duration?: number;
  message?: string;
  error?: string;
};

export type SetupStepStatus = 'pending' | 'running' | 'done' | 'skipped';

export type SetupStep = {
  id: string;
  label: string;
  status: SetupStepStatus;
  detail?: string;
};

export type LogEntry = {
  id: string;
  timestamp: number;
  source: string;
  sourceType: 'workload' | 'hook' | 'system';
  message: string;
  level: 'info' | 'warn' | 'error' | 'debug';
};

export type RebuildStep = 'stopping' | 'packaging' | 'starting' | 'updating-code' | 'done' | 'error';

export type RebuildWorkloadState = {
  name: string;
  type: WorkloadType;
  status: 'pending' | 'in-progress' | 'done' | 'error';
  step?: RebuildStep;
  stepDetail?: string;
  startTime: number;
  endTime?: number;
  size?: string;
  error?: string;
};

export type DevTuiState = {
  phase: DevPhase;
  devMode: DevModeType;
  projectName: string;
  stageName: string;

  localResources: LocalResource[];
  setupSteps: SetupStep[];
  hooks: Hook[];
  workloads: Workload[];

  logs: LogEntry[];
  maxLogs: number;

  selectedLogFilter: string | null;
  textFilter: string;
  filterInputActive: boolean;
  filterMode: boolean;
  rebuildPickerActive: boolean;
  sidebarMode: SidebarMode;
  sidebarVisible: boolean;
  isQuitting: boolean;
  inputBuffer: string;

  rebuildingWorkloads: RebuildWorkloadState[];
  startTime: number;
};

export const WORKLOAD_COLORS = ['cyan', 'magenta', 'yellow', 'blue', 'green', 'red', 'white', 'gray'] as const;

export type WorkloadColor = (typeof WORKLOAD_COLORS)[number];
