// Types for the TUI system

export type TaskStatus = 'pending' | 'active' | 'success' | 'error' | 'warning';

export type Task = {
  id: string;
  name: string;
  status: TaskStatus;
  message?: string;
  duration?: number; // milliseconds
  startedAt?: number;
  children?: Task[];
  progress?: {
    current: number;
    total: number;
    unit?: string; // e.g., 'MB', 'files'
  };
};

export type PhaseView = 'simple' | 'detailed' | 'resource-table';

export type Phase = {
  id: string;
  name: string;
  status: TaskStatus;
  tasks: Task[];
  startedAt?: number;
  duration?: number;
  view: PhaseView;
};

export type ResourceStatus =
  | 'CREATE_IN_PROGRESS'
  | 'CREATE_COMPLETE'
  | 'CREATE_FAILED'
  | 'UPDATE_IN_PROGRESS'
  | 'UPDATE_COMPLETE'
  | 'UPDATE_FAILED'
  | 'DELETE_IN_PROGRESS'
  | 'DELETE_COMPLETE'
  | 'DELETE_FAILED'
  | 'ROLLBACK_IN_PROGRESS'
  | 'ROLLBACK_COMPLETE'
  | 'ROLLBACK_FAILED'
  | 'WAITING';

export type Resource = {
  logicalId: string;
  resourceType: string;
  stacktapeResource?: string; // Associated Stacktape resource name
  status: ResourceStatus;
  statusReason?: string;
  startedAt?: number;
  duration?: number;
};

export type DeploymentError = {
  message: string;
  details?: string;
  hints?: string[];
};

export type DeploymentCommand = 'deploy' | 'delete' | 'dev';

export type DeploymentState = {
  command: DeploymentCommand;
  stackName: string;
  stage: string;
  region: string;
  phases: Phase[];
  currentPhaseId?: string;
  resources: Resource[];
  error?: DeploymentError;
  startedAt: number;
  completedAt?: number;
};

// Event types that map to phases
export type PhaseMapping = {
  phaseId: string;
  phaseName: string;
  view: PhaseView;
  eventTypes: string[];
};

// Hint configuration
export type ResourceHint = {
  resourceType: string;
  message: string;
};
