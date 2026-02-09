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
  /** If true, hide only the children when the event is finished (event itself stays visible) */
  hideChildrenWhenFinished?: boolean;
  /** Parent event type for grouping */
  parentEventType?: LoggableEventType;
  /** Instance ID for parallel events */
  instanceId?: string;
  /** Child events */
  children: TuiEvent[];
  /** Data associated with the event */
  data?: Record<string, any>;
  /** Captured output lines from script execution */
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

export type TuiMessageType =
  | 'info'
  | 'warn'
  | 'error'
  | 'success'
  | 'debug'
  | 'hint'
  | 'question'
  | 'start'
  | 'announcement';

export type TuiMessage = {
  id: string;
  /** Semantic identifier for the message (e.g., 'version-info', 'stack-deleted') */
  name: string;
  type: TuiMessageType;
  message: string;
  timestamp: number;
  /** Phase this message belongs to (if any) - messages with phase render inline */
  phase?: DeploymentPhase;
  /** Optional data for structured logging */
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
  resolve: (value: string) => void;
};

export type TuiPromptMultiSelect = {
  type: 'multiSelect';
  message: string;
  options: TuiSelectOption[];
  defaultValues?: string[];
  resolve: (values: string[]) => void;
};

export type TuiPromptConfirm = {
  type: 'confirm';
  message: string;
  defaultValue?: boolean;
  resolve: (value: boolean) => void;
};

export type TuiPromptText = {
  type: 'text';
  message: string;
  placeholder?: string;
  isPassword?: boolean;
  /** Description shown in gray next to the question */
  description?: string;
  defaultValue?: string;
  resolve: (value: string) => void;
};

export type TuiPrompt = TuiPromptSelect | TuiPromptMultiSelect | TuiPromptConfirm | TuiPromptText;

export type TuiCancelDeployment = {
  /** Message to display in the banner */
  message: string;
  /** Callback to invoke when user confirms cancellation */
  onCancel: () => void;
  /** Whether cancellation is in progress */
  isCancelling?: boolean;
};

export type TuiState = {
  header?: TuiDeploymentHeader;
  phases: TuiPhase[];
  currentPhase?: DeploymentPhase;
  warnings: TuiWarning[];
  /** Generic messages (info, error, success, etc.) */
  messages: TuiMessage[];
  summary?: TuiSummary;
  isComplete: boolean;
  startTime: number;
  /** Active prompt waiting for user input */
  activePrompt?: TuiPrompt;
  /** When true, hides dynamic phase rendering to allow console.log streaming */
  streamingMode?: boolean;
  /** When false, phase headers are hidden in TUI output */
  showPhaseHeaders?: boolean;
  /** When true, the TUI is about to stop and phases should be finalized */
  isFinalizing?: boolean;
  /** Stored completion info to be committed after hooks finish */
  pendingCompletion?: { success: boolean; message: string; links: TuiLink[]; consoleUrl?: string };
  /** When set, shows a cancel deployment banner that user can trigger with 'c' key */
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

// Delete command uses only these phases with custom names
export const DELETE_PHASE_ORDER: DeploymentPhase[] = ['INITIALIZE', 'DEPLOY'];
export const DELETE_PHASE_NAMES: Partial<Record<DeploymentPhase, string>> = {
  INITIALIZE: 'Initialize',
  DEPLOY: 'Delete'
};

// Codebuild deploy command uses these phases (no Build & Package, Upload renamed)
export const CODEBUILD_DEPLOY_PHASE_ORDER: DeploymentPhase[] = ['INITIALIZE', 'UPLOAD', 'DEPLOY'];
export const CODEBUILD_DEPLOY_PHASE_NAMES: Partial<Record<DeploymentPhase, string>> = {
  INITIALIZE: 'Initialize',
  UPLOAD: 'Prepare Pipeline',
  DEPLOY: 'Deploy'
};

/**
 * Interface for command-specific TUIs (deploy, delete, etc.).
 * Allows tuiManager to delegate rendering to command-specific UI when active.
 */
export type CommandTui = {
  /** Whether the TUI is currently running */
  isRunning: boolean;
  /** Start the TUI */
  start: () => void;
  /** Stop the TUI gracefully */
  stop: () => Promise<void>;
  /** Force stop the TUI immediately (for error handling) */
  forceStop?: () => void;
  /** Set an active prompt to render in the TUI */
  setPrompt?: (prompt: TuiPrompt | undefined) => void;
  /** Clear the active prompt */
  clearPrompt?: () => void;
  /** Set the current phase */
  setPhase: (phase: DeploymentPhase) => void;
  /** Finish the current phase */
  finishPhase: () => void;
  /** Start tracking an event */
  startEvent: (params: {
    eventType: LoggableEventType;
    description: string;
    phase?: DeploymentPhase;
    parentEventType?: LoggableEventType;
    instanceId?: string;
  }) => void;
  /** Update an existing event */
  updateEvent: (params: {
    eventType: LoggableEventType;
    additionalMessage?: string;
    description?: string;
    parentEventType?: LoggableEventType;
    instanceId?: string;
  }) => void;
  /** Finish an event */
  finishEvent: (params: {
    eventType: LoggableEventType;
    finalMessage?: string;
    data?: Record<string, any>;
    parentEventType?: LoggableEventType;
    instanceId?: string;
    status?: TuiEventStatus;
  }) => void;
  /** Append output lines to an event */
  appendEventOutput?: (params: { eventType: LoggableEventType; lines: string[]; instanceId?: string }) => void;
  /** Mark all running events as errored */
  markAllAsErrored?: () => void;
};
