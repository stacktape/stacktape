import type { DeploymentPhase, LoggableEventType } from '@application-services/event-manager/types';
import type { TuiDeploymentHeader, TuiEventStatus, TuiLink, TuiSelectOption } from '../types';

/**
 * Identity of an event inside the progress state. The same derivation is used
 * by the state store, the scrollback sink, and the JSONL emitter — keep them in
 * sync by always going through this helper.
 */
export const eventId = (eventType: LoggableEventType | string, instanceId?: string): string =>
  instanceId ? `${eventType}-${instanceId}` : `${eventType}`;

export type CfProgressData = {
  kind: 'cloudformation-progress';
  stackAction: string;
  status?: 'active' | 'cleanup';
  completedCount: number;
  totalPlanned?: number;
  inProgressCount?: number;
  inProgressResources?: string[];
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
