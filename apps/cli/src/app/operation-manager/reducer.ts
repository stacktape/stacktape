import type {
  DeploymentPhase,
  OperationActivity,
  OperationPhase,
  OperationPhasePreset,
  OperationRecord,
  OperationState,
  OperationStatus
} from './types';
import { plainOperationText } from './text';

export const PHASE_NAMES: Record<DeploymentPhase, string> = {
  INITIALIZE: 'Initialize',
  BUILD_AND_PACKAGE: 'Build & Package',
  UPLOAD: 'Upload',
  DEPLOY: 'Deploy',
  POST_DEPLOY: 'Finalize'
};

const PRESET_PHASES: Record<OperationPhasePreset, DeploymentPhase[]> = {
  deploy: ['INITIALIZE', 'BUILD_AND_PACKAGE', 'UPLOAD', 'DEPLOY', 'POST_DEPLOY'],
  delete: ['INITIALIZE', 'DEPLOY'],
  'codebuild-deploy': ['INITIALIZE', 'UPLOAD', 'DEPLOY']
};

const phaseName = (preset: OperationPhasePreset, phase: DeploymentPhase): string => {
  if (preset === 'delete' && phase === 'DEPLOY') return 'Delete';
  if (preset === 'codebuild-deploy' && phase === 'UPLOAD') return 'Prepare Pipeline';
  return PHASE_NAMES[phase];
};

const createPhases = (preset: OperationPhasePreset): OperationPhase[] =>
  PRESET_PHASES[preset].map((id) => ({ id, name: phaseName(preset, id), status: 'pending', activityIds: [] }));

let sessionSequence = 0;

export const createInitialOperationState = (
  preset: OperationPhasePreset = 'deploy',
  startTime = Date.now()
): OperationState => ({
  sessionId: `operation-${startTime}-${++sessionSequence}`,
  startTime,
  inputPausedMs: 0,
  phasePreset: preset,
  showPhaseHeaders: true,
  phases: createPhases(preset),
  activities: {},
  activityOrder: [],
  isComplete: false,
  isFinalizing: false
});

const finishRunningPhase = (phase: OperationPhase, timestamp: number, status: OperationStatus = 'success') =>
  phase.status !== 'running'
    ? phase
    : {
        ...phase,
        status,
        endTime: timestamp,
        duration: phase.startTime ? timestamp - phase.startTime : 0
      };

const updateActivity = (
  state: OperationState,
  activityId: string,
  update: (activity: OperationActivity) => OperationActivity
): OperationState => {
  const activity = state.activities[activityId];
  if (!activity) return state;
  return { ...state, activities: { ...state.activities, [activityId]: update(activity) } };
};

const MAX_ACTIVITY_OUTPUT_LINES = 2_000;

/** Pure replay reducer. The same record sequence always produces the same state. */
export const reduceOperationState = (state: OperationState, record: OperationRecord): OperationState => {
  switch (record.type) {
    case 'session-configured':
      return {
        ...state,
        phasePreset: record.preset,
        showPhaseHeaders: record.showPhaseHeaders,
        phases: createPhases(record.preset),
        activities: {},
        activityOrder: [],
        currentPhase: undefined
      };
    case 'header-set':
      return { ...state, header: record.header };
    case 'phase-entered': {
      const phaseIndex = state.phases.findIndex((phase) => phase.id === record.phase);
      const phases = state.phases.map((phase, index) => {
        if (index < phaseIndex && phase.status !== 'success' && phase.status !== 'error') {
          return finishRunningPhase({ ...phase, status: 'running' }, record.timestamp);
        }
        if (phase.id === record.phase && phase.status === 'pending') {
          return { ...phase, status: 'running' as const, startTime: record.timestamp };
        }
        return phase;
      });
      return { ...state, phases, currentPhase: record.phase };
    }
    case 'phase-finished': {
      const phaseId = record.phase ?? state.currentPhase;
      if (!phaseId) return state;
      return {
        ...state,
        phases: state.phases.map((phase) =>
          phase.id === phaseId ? finishRunningPhase(phase, record.timestamp) : phase
        )
      };
    }
    case 'activity-started': {
      const activity = record.activity;
      const phases = state.phases.map((phase) =>
        phase.id === activity.phase && !phase.activityIds.includes(activity.id)
          ? { ...phase, activityIds: [...phase.activityIds, activity.id] }
          : phase
      );
      return {
        ...state,
        phases,
        activities: { ...state.activities, [activity.id]: activity },
        activityOrder: [...state.activityOrder, activity.id]
      };
    }
    case 'activity-updated':
      return updateActivity(state, record.activityId, (activity) => ({
        ...activity,
        ...(record.description !== undefined && { description: record.description }),
        ...(record.label !== undefined && { label: record.label }),
        ...(record.additionalMessage !== undefined && {
          additionalMessage: record.additionalMessage,
          message: record.additionalMessage
        }),
        ...(record.detail !== undefined && { detail: record.detail })
      }));
    case 'activity-output':
      return updateActivity(state, record.activityId, (activity) => ({
        ...activity,
        outputLines: [...activity.outputLines, ...record.lines.map(plainOperationText)].slice(
          -MAX_ACTIVITY_OUTPUT_LINES
        )
      }));
    case 'activity-finished':
      return updateActivity(state, record.activityId, (activity) => ({
        ...activity,
        status: record.status,
        endTime: record.timestamp,
        duration: Math.max(0, record.timestamp - activity.startTime),
        ...(record.finalMessage !== undefined && { finalMessage: record.finalMessage }),
        ...(record.detail !== undefined && { detail: record.detail })
      }));
    case 'prompt-opened':
      return { ...state, activePrompt: record.prompt, inputPausedSince: record.timestamp };
    case 'prompt-closed': {
      if (state.activePrompt?.id !== record.promptId) return state;
      const pause = state.inputPausedSince ? record.timestamp - state.inputPausedSince : 0;
      return {
        ...state,
        activePrompt: undefined,
        inputPausedSince: undefined,
        inputPausedMs: state.inputPausedMs + Math.max(0, pause)
      };
    }
    case 'completion-pending':
      return { ...state, pendingCompletion: record.summary };
    case 'session-completed': {
      const status: OperationStatus = record.summary.success ? 'success' : 'error';
      return {
        ...state,
        summary: record.summary,
        pendingCompletion: undefined,
        isComplete: true,
        phases: state.phases.map((phase) =>
          phase.id === state.currentPhase ? finishRunningPhase(phase, record.timestamp, status) : phase
        )
      };
    }
    case 'finalizing':
      return { ...state, isFinalizing: true };
    case 'cancellation-set':
      return { ...state, cancellation: record.cancellation };
    case 'running-marked-error': {
      const activities = { ...state.activities };
      for (const id of state.activityOrder) {
        const activity = activities[id];
        if (activity?.status !== 'running') continue;
        activities[id] = {
          ...activity,
          status: 'error',
          endTime: record.timestamp,
          duration: Math.max(0, record.timestamp - activity.startTime)
        };
      }
      return {
        ...state,
        activities,
        phases: state.phases.map((phase) => finishRunningPhase(phase, record.timestamp, 'error'))
      };
    }
    case 'message':
      return state;
  }
};

export const replayOperationRecords = (
  records: readonly OperationRecord[],
  initial = createInitialOperationState('deploy', records[0]?.timestamp ?? Date.now())
): OperationState => records.reduce(reduceOperationState, initial);

export const getPhaseOrder = (preset: OperationPhasePreset): DeploymentPhase[] => [...PRESET_PHASES[preset]];
