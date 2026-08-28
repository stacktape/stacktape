import {
  getPhaseOrder,
  operationSession,
  type DeploymentPhase,
  type LoggableEventType,
  type OperationActivity,
  type OperationPromptRequest,
  type OperationState,
  type OperationStatus
} from '@application-services/operation-manager';
import { interactionCoordinator } from '../interaction/coordinator';
import type { TuiDeploymentHeader, TuiEventStatus, TuiLink } from '../types';
import type { PhasePreset, TuiCancelDeployment, TuiEvent, TuiPrompt, TuiState, TuiSummary } from './types';

type StateListener = (state: TuiState) => void;
type PromptWithoutId = TuiPrompt extends infer Prompt
  ? Prompt extends TuiPrompt
    ? Omit<Prompt, 'id'> & { id?: string }
    : never
  : never;
const HIDE_CHILDREN_WHEN_FINISHED_EVENTS: LoggableEventType[] = ['LOAD_METADATA_FROM_AWS'];

const detailAsRecord = (detail: unknown): Record<string, unknown> | undefined =>
  detail !== null && typeof detail === 'object' && !Array.isArray(detail)
    ? (detail as Record<string, unknown>)
    : undefined;

const toTuiEvent = (state: OperationState, activity: OperationActivity): TuiEvent => {
  const children = state.activityOrder
    .map((id) => state.activities[id])
    .filter((candidate) => candidate.parentActivityId === activity.id)
    .map((candidate) => toTuiEvent(state, candidate));
  return {
    ...activity,
    children,
    data: detailAsRecord(activity.detail),
    outputLines: activity.outputLines,
    hideChildrenWhenFinished: HIDE_CHILDREN_WHEN_FINISHED_EVENTS.includes(activity.eventType)
  };
};

export const toTuiState = (state: OperationState): TuiState => ({
  sessionId: state.sessionId,
  startTime: state.startTime,
  inputPausedMs: state.inputPausedMs,
  inputPausedSince: state.inputPausedSince,
  header: state.header,
  phases: state.phases.map((phase) => ({
    id: phase.id,
    name: phase.name,
    status: phase.status,
    startTime: phase.startTime,
    endTime: phase.endTime,
    duration: phase.duration,
    events: phase.activityIds
      .map((id) => state.activities[id])
      .filter((activity) => activity && !activity.parentActivityId)
      .map((activity) => toTuiEvent(state, activity))
  })),
  currentPhase: state.currentPhase,
  activePrompt: state.activePrompt,
  summary: state.summary,
  pendingCompletion: state.pendingCompletion,
  cancelDeployment: state.cancellation,
  showPhaseHeaders: state.showPhaseHeaders,
  isComplete: state.isComplete,
  isFinalizing: state.isFinalizing
});

/** Compatibility view over the canonical operation journal/store. */
class TuiStateManager {
  private previewPromptSequence = 0;

  reset() {
    interactionCoordinator.reset();
    operationSession.reset();
  }

  destroy() {}

  flushPendingNotifications() {
    operationSession.store.flush();
  }

  getState = (): TuiState => toTuiState(operationSession.store.getSnapshot());
  getSnapshot = this.getState;

  subscribe(listener: StateListener): () => void {
    return operationSession.store.subscribe((state) => listener(toTuiState(state)));
  }

  setPhasePreset(preset: PhasePreset) {
    operationSession.reset({ preset, showPhaseHeaders: true });
  }

  setShowPhaseHeaders(show: boolean) {
    const state = operationSession.store.getSnapshot();
    operationSession.reset({ preset: state.phasePreset, showPhaseHeaders: show });
  }

  setFinalizing() {
    operationSession.setFinalizing();
  }

  setPendingCompletion(params: { success: boolean; message: string; links: TuiLink[]; consoleUrl?: string }) {
    operationSession.setPendingCompletion(params);
  }

  commitPendingCompletion(options?: { hookFailureCount?: number }) {
    operationSession.commitPendingCompletion(options);
  }

  setHeader(header: TuiDeploymentHeader) {
    operationSession.setHeader(header);
  }

  getPhaseOrder(): DeploymentPhase[] {
    return getPhaseOrder(operationSession.store.getSnapshot().phasePreset);
  }

  setCurrentPhase(phase: DeploymentPhase) {
    operationSession.setPhase(phase);
  }

  finishCurrentPhase() {
    operationSession.finishPhase();
  }

  startEvent(params: {
    eventType: LoggableEventType;
    description: string;
    phase?: DeploymentPhase;
    parentEventType?: LoggableEventType;
    parentInstanceId?: string;
    instanceId?: string;
  }) {
    operationSession.reporter.startEvent(params);
  }

  updateEvent(params: {
    eventType: LoggableEventType;
    additionalMessage?: string;
    data?: Record<string, unknown>;
    description?: string;
    parentEventType?: LoggableEventType;
    parentInstanceId?: string;
    instanceId?: string;
  }) {
    operationSession.reporter.updateEvent({ ...params, detail: params.data });
  }

  finishEvent(params: {
    eventType: LoggableEventType;
    finalMessage?: string;
    data?: Record<string, unknown>;
    parentEventType?: LoggableEventType;
    parentInstanceId?: string;
    instanceId?: string;
    status?: TuiEventStatus;
  }) {
    operationSession.reporter.finishEvent({ ...params, detail: params.data, status: params.status });
  }

  appendEventOutput(params: {
    eventType: LoggableEventType;
    lines: string[];
    instanceId?: string;
    parentEventType?: LoggableEventType;
    parentInstanceId?: string;
  }) {
    operationSession.reporter.appendOutput(params);
  }

  setSummary(summary: TuiSummary) {
    operationSession.complete(summary);
  }

  setComplete(success: boolean, message: string, links: TuiLink[] = [], consoleUrl?: string) {
    operationSession.complete({ success, message, links, consoleUrl });
  }

  markAllRunningAsErrored() {
    operationSession.markRunningAsErrored();
  }

  setActivePrompt(prompt: PromptWithoutId) {
    const id = prompt.id ?? `preview-prompt-${++this.previewPromptSequence}`;
    operationSession.journal.append({
      type: 'prompt-opened',
      prompt: { ...prompt, id } as OperationPromptRequest
    });
  }

  clearActivePrompt() {
    const prompt = operationSession.store.getSnapshot().activePrompt;
    if (!prompt) return;
    operationSession.journal.append({
      type: 'prompt-closed',
      promptId: prompt.id,
      cancelled: false,
      sensitive: prompt.type === 'text' && !!prompt.isPassword
    });
  }

  setCancelDeployment(cancelDeployment: TuiCancelDeployment) {
    interactionCoordinator.setCancellation(cancelDeployment);
  }

  updateCancelDeployment(updates: Partial<Omit<TuiCancelDeployment, 'onCancel'>>) {
    interactionCoordinator.updateCancellation(updates);
  }

  clearCancelDeployment() {
    interactionCoordinator.clearCancellation();
  }

  /** Test helper for reducer coverage. */
  setActivityStatusForTest(activityId: string, status: OperationStatus) {
    operationSession.journal.append({ type: 'activity-finished', activityId, status });
  }
}

export const tuiState = new TuiStateManager();
