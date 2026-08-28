import type {
  DeploymentPhase,
  OperationActivity,
  OperationCancellation,
  OperationPhasePreset,
  OperationPromptRequest,
  OperationState,
  OperationSummary
} from '@application-services/operation-manager';
import { getPhaseOrder, PHASE_NAMES as OPERATION_PHASE_NAMES } from '@application-services/operation-manager/reducer';

export type CfResourceInProgress = {
  name: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  resourceType?: string;
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
  inProgressDetails?: CfResourceInProgress[];
  waitingResources?: string[];
  changeCounts: { created: number; updated: number; deleted: number };
};

export type TuiEvent = Omit<OperationActivity, 'detail' | 'outputLines' | 'phase'> & {
  phase?: DeploymentPhase;
  children: TuiEvent[];
  data?: Record<string, unknown>;
  outputLines?: string[];
  hideChildrenWhenFinished?: boolean;
};

export type TuiPhase = {
  id: DeploymentPhase;
  name: string;
  status: OperationActivity['status'];
  startTime?: number;
  endTime?: number;
  duration?: number;
  events: TuiEvent[];
};

export type TuiSummary = OperationSummary;
export type TuiPrompt = OperationPromptRequest;
export type TuiPromptSelect = Extract<TuiPrompt, { type: 'select' }>;
export type TuiPromptMultiSelect = Extract<TuiPrompt, { type: 'multiSelect' }>;
export type TuiPromptConfirm = Extract<TuiPrompt, { type: 'confirm' }>;
export type TuiPromptText = Extract<TuiPrompt, { type: 'text' }>;

/** Public callback-bearing input; the callback is held by InteractionCoordinator, never render state. */
export type TuiCancelDeployment = OperationCancellation & { onCancel: () => void };

export type TuiState = Omit<
  OperationState,
  'activities' | 'activityOrder' | 'phases' | 'phasePreset' | 'showPhaseHeaders' | 'cancellation' | 'isFinalizing'
> & {
  phases: TuiPhase[];
  showPhaseHeaders?: boolean;
  cancelDeployment?: OperationCancellation;
  isFinalizing?: boolean;
};

export type PhasePreset = OperationPhasePreset;

export const MAX_DOCUMENT_WIDTH = 100;

export const sessionElapsedMs = (
  state: Pick<TuiState, 'startTime' | 'inputPausedMs' | 'inputPausedSince' | 'activePrompt'>,
  now: number
) => {
  const openPause = state.activePrompt && state.inputPausedSince ? now - state.inputPausedSince : 0;
  return Math.max(0, now - state.startTime - (state.inputPausedMs ?? 0) - openPause);
};

export const PHASE_NAMES = OPERATION_PHASE_NAMES;
export const PHASE_ORDER = getPhaseOrder('deploy');
export const DELETE_PHASE_ORDER = getPhaseOrder('delete');
export const CODEBUILD_DEPLOY_PHASE_ORDER = getPhaseOrder('codebuild-deploy');
export const DELETE_PHASE_NAMES: Partial<Record<DeploymentPhase, string>> = { DEPLOY: 'Delete' };
export const CODEBUILD_DEPLOY_PHASE_NAMES: Partial<Record<DeploymentPhase, string>> = {
  UPLOAD: 'Prepare Pipeline'
};

/** Legacy exports retained until downstream demo tooling is migrated. */
export const PHASE_FOOTER_HEIGHT = 13;
export const SIMPLE_FOOTER_HEIGHT = 9;

export const eventId = (eventType: string, instanceId?: string) =>
  instanceId ? `${eventType}-${instanceId}` : eventType;
