export type TuiEventStatus = 'pending' | 'running' | 'success' | 'error' | 'warning';

export type TuiEvent = {
  id: string;
  eventType: LoggableEventType;
  description: string;
  status: TuiEventStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  message?: string;
  finalMessage?: string;
  additionalMessage?: string;
  phase?: DeploymentPhase;
  hideChildrenWhenFinished?: boolean;
  parentEventType?: LoggableEventType;
  instanceId?: string;
  children: TuiEvent[];
  data?: Record<string, any>;
  outputLines?: string[];
};

export type TuiPhase = {
  id: DeploymentPhase;
  name: string;
  status: TuiEventStatus;
  startTime?: number;
  endTime?: number;
  duration?: number;
  events: TuiEvent[];
};

export type TuiWarning = {
  id: string;
  message: string;
  timestamp: number;
  phase?: DeploymentPhase;
};

export type TuiLink = {
  label: string;
  url: string;
};

export type TuiSummary = {
  success: boolean;
  message: string;
  links: TuiLink[];
  consoleUrl?: string;
};

export type TuiMessageType = 'info' | 'warn' | 'error' | 'success' | 'debug' | 'hint' | 'start' | 'announcement';

export type TuiMessage = {
  id: string;
  name: string;
  type: TuiMessageType;
  message: string;
  timestamp: number;
  phase?: DeploymentPhase;
  data?: Record<string, any>;
};

export type TuiDeploymentHeader = {
  projectName: string;
  stageName: string;
  region: string;
  action:
    | 'DEPLOYING'
    | 'DEPLOYING DEV STACK'
    | 'DELETING'
    | 'UPDATING'
    | 'PREVIEWING CHANGES'
    | 'RUNNING DEV MODE'
    | 'RUNNING DEV MODE (legacy)'
    | 'RUNNING SCRIPT'
    | `RUNNING SCRIPT: ${string}`;
  subtitle?: string;
};

export type TuiSelectOption = {
  label: string;
  value: string;
  description?: string;
};

export type TuiPromptSelect = {
  type: 'select';
  message: string;
  options: TuiSelectOption[];
  defaultValue?: string;
  resolve: (value: string) => void;
  reject?: () => void;
};

export type TuiPromptMultiSelect = {
  type: 'multiSelect';
  message: string;
  options: TuiSelectOption[];
  defaultValues?: string[];
  resolve: (values: string[]) => void;
  reject?: () => void;
};

export type TuiPromptConfirm = {
  type: 'confirm';
  message: string;
  defaultValue?: boolean;
  resolve: (value: boolean) => void;
  reject?: () => void;
};

export type TuiPromptText = {
  type: 'text';
  message: string;
  placeholder?: string;
  isPassword?: boolean;
  description?: string;
  defaultValue?: string;
  resolve: (value: string) => void;
  reject?: () => void;
};

export type TuiPrompt = TuiPromptSelect | TuiPromptMultiSelect | TuiPromptConfirm | TuiPromptText;

export type TuiCancelDeployment = {
  message: string;
  onCancel: () => void;
  isCancelling?: boolean;
};

export type TuiState = {
  header?: TuiDeploymentHeader;
  phases: TuiPhase[];
  currentPhase?: DeploymentPhase;
  warnings: TuiWarning[];
  messages: TuiMessage[];
  summary?: TuiSummary;
  isComplete: boolean;
  startTime: number;
  activePrompt?: TuiPrompt;
  streamingMode?: boolean;
  showPhaseHeaders?: boolean;
  isFinalizing?: boolean;
  pendingCompletion?: { success: boolean; message: string; links: TuiLink[]; consoleUrl?: string };
  cancelDeployment?: TuiCancelDeployment;
};

export const PHASE_NAMES: Record<DeploymentPhase, string> = {
  INITIALIZE: 'Initialize',
  BUILD_AND_PACKAGE: 'Build & Package',
  UPLOAD: 'Upload',
  DEPLOY: 'Deploy',
  SUMMARY: 'Summary'
};

export const PHASE_ORDER: DeploymentPhase[] = ['INITIALIZE', 'BUILD_AND_PACKAGE', 'UPLOAD', 'DEPLOY', 'SUMMARY'];

export const DELETE_PHASE_ORDER: DeploymentPhase[] = ['INITIALIZE', 'DEPLOY'];
export const DELETE_PHASE_NAMES: Partial<Record<DeploymentPhase, string>> = {
  INITIALIZE: 'Initialize',
  DEPLOY: 'Delete'
};

export const CODEBUILD_DEPLOY_PHASE_ORDER: DeploymentPhase[] = ['INITIALIZE', 'UPLOAD', 'DEPLOY'];
export const CODEBUILD_DEPLOY_PHASE_NAMES: Partial<Record<DeploymentPhase, string>> = {
  INITIALIZE: 'Initialize',
  UPLOAD: 'Prepare Pipeline',
  DEPLOY: 'Deploy'
};

export type CommandTui = {
  isRunning: boolean;
  start: () => void;
  stop: () => Promise<void>;
  forceStop?: () => void;
  setPrompt?: (prompt: TuiPrompt | undefined) => void;
  clearPrompt?: () => void;
  setPhase: (phase: DeploymentPhase) => void;
  finishPhase: () => void;
  startEvent: (params: {
    eventType: LoggableEventType;
    description: string;
    phase?: DeploymentPhase;
    parentEventType?: LoggableEventType;
    instanceId?: string;
  }) => void;
  updateEvent: (params: {
    eventType: LoggableEventType;
    additionalMessage?: string;
    data?: Record<string, any>;
    description?: string;
    parentEventType?: LoggableEventType;
    instanceId?: string;
  }) => void;
  finishEvent: (params: {
    eventType: LoggableEventType;
    finalMessage?: string;
    data?: Record<string, any>;
    parentEventType?: LoggableEventType;
    instanceId?: string;
    status?: TuiEventStatus;
  }) => void;
  appendEventOutput?: (params: { eventType: LoggableEventType; lines: string[]; instanceId?: string }) => void;
  markAllAsErrored?: () => void;
};
