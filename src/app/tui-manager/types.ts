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

export type TuiMessageType = 'info' | 'warn' | 'error' | 'success' | 'debug' | 'hint' | 'start' | 'announcement';

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
  action: 'DEPLOYING' | 'DELETING' | 'UPDATING';
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

export type TuiPrompt = TuiPromptSelect | TuiPromptConfirm | TuiPromptText;

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
  /** When true, the TUI is about to stop and phases should be finalized */
  isFinalizing?: boolean;
  /** Stored completion info to be committed after hooks finish */
  pendingCompletion?: { success: boolean; message: string; links: TuiLink[]; consoleUrl?: string };
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
