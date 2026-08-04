import type { DeploymentPhase, LoggableEventType } from '@application-services/event-manager/types';
import type { TuiDeploymentHeader, TuiEventStatus, TuiLink, TuiSelectOption } from '../types';

/**
 * Identity of an event inside the progress state. The same derivation is used
 * by the state store, the scrollback sink, and the JSONL emitter — keep them in
 * sync by always going through this helper.
 */
export const eventId = (eventType: LoggableEventType | string, instanceId?: string): string =>
  instanceId ? `${eventType}-${instanceId}` : `${eventType}`;

export type CfResourceInProgress = {
  name: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  /** CloudFormation resource type, e.g. AWS::ECS::Service. */
  resourceType?: string;
  /** Epoch ms of the first IN_PROGRESS event — used for stable oldest-first slots. */
  since?: number;
};

export type CfProgressData = {
  kind: 'cloudformation-progress';
  stackAction: string;
  status?: 'active' | 'cleanup';
  completedCount: number;
  totalPlanned?: number;
  inProgressCount?: number;
  inProgressResources?: string[];
  /** Rich per-resource rows; falls back to inProgressResources names when absent. */
  inProgressDetails?: CfResourceInProgress[];
  waitingResources?: string[];
  changeCounts: {
    created: number;
    updated: number;
    deleted: number;
  };
};

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

export type TuiSummary = {
  success: boolean;
  message: string;
  links: TuiLink[];
  consoleUrl?: string;
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
  summary?: TuiSummary;
  isComplete: boolean;
  startTime: number;
  activePrompt?: TuiPrompt;
  showPhaseHeaders?: boolean;
  isFinalizing?: boolean;
  pendingCompletion?: { success: boolean; message: string; links: TuiLink[]; consoleUrl?: string };
  cancelDeployment?: TuiCancelDeployment;
};

/**
 * Phase presets: which deployment phases a command walks through and how they
 * are titled. Chosen when the progress app starts; the codebuild deploy runner
 * switches preset at runtime once the runner choice is known.
 */
export type PhasePreset = 'deploy' | 'delete' | 'codebuild-deploy';

/**
 * Footer chrome — how the live panel is visually separated from scrollback.
 * Selectable while the final look is being chosen (`STP_TUI_FOOTER`, also
 * settable as a trailing demo argument):
 *
 *   divider  top rule + panel background                        (default)
 *   frame    full rounded border with the title in the frame
 *   edge     solid brand-accent bar down the left edge
 *   bar      inverse accent title bar (tmux/vim statusline style)
 */
export type FooterVariant = 'divider' | 'frame' | 'edge' | 'bar';

export const footerVariant = (): FooterVariant => {
  const value = process.env.STP_TUI_FOOTER;
  return value === 'frame' || value === 'edge' || value === 'bar' ? value : 'divider';
};

/**
 * Fixed footer heights per chrome — the footer never changes height while
 * mounted. The body area is 6 rows (phase) / 3 rows (simple) in every chrome;
 * only the surrounding chrome rows differ.
 */
export const getFooterHeights = (): { phase: number; simple: number } => {
  switch (footerVariant()) {
    case 'frame':
      return { phase: 13, simple: 9 };
    case 'bar':
      return { phase: 11, simple: 7 };
    default:
      return { phase: 12, simple: 8 };
  }
};

export const PHASE_NAMES: Record<DeploymentPhase, string> = {
  INITIALIZE: 'Initialize',
  BUILD_AND_PACKAGE: 'Build & Package',
  UPLOAD: 'Upload',
  DEPLOY: 'Deploy',
  POST_DEPLOY: 'Finalize'
};

export const PHASE_ORDER: DeploymentPhase[] = ['INITIALIZE', 'BUILD_AND_PACKAGE', 'UPLOAD', 'DEPLOY', 'POST_DEPLOY'];

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
