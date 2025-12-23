// State management for the TUI - bridges eventManager to React state

import type { DeploymentState, Phase, Task, DeploymentCommand, Resource } from './types';
import { getPhasesForCommand, getPhaseForEvent } from './phases';
import { generateId } from './utils';

// Create initial state for a deployment
export const createInitialState = ({
  command,
  stackName,
  stage,
  region
}: {
  command: DeploymentCommand;
  stackName: string;
  stage: string;
  region: string;
}): DeploymentState => {
  const phaseMappings = getPhasesForCommand(command);

  const phases: Phase[] = phaseMappings.map((mapping) => ({
    id: mapping.phaseId,
    name: mapping.phaseName,
    status: 'pending',
    tasks: [],
    view: mapping.view
  }));

  return {
    command,
    stackName,
    stage,
    region,
    phases,
    currentPhaseId: undefined,
    resources: [],
    startedAt: Date.now()
  };
};

// State reducer actions
export type StateAction =
  | { type: 'START_TASK'; eventType: string; taskName: string; taskId?: string }
  | { type: 'UPDATE_TASK'; eventType: string; taskId: string; message?: string; progress?: Task['progress'] }
  | { type: 'FINISH_TASK'; eventType: string; taskId: string; message?: string }
  | { type: 'FAIL_TASK'; eventType: string; taskId: string; message?: string }
  | { type: 'ADD_CHILD_TASK'; eventType: string; parentTaskId: string; childTask: Task }
  | {
      type: 'UPDATE_CHILD_TASK';
      eventType: string;
      parentTaskId: string;
      childTaskId: string;
      status: Task['status'];
      message?: string;
      duration?: number;
    }
  | { type: 'UPDATE_RESOURCE'; resource: Resource }
  | { type: 'SET_ERROR'; error: DeploymentState['error'] }
  | { type: 'COMPLETE' };

// Find or create a task in the state
const findTask = (phases: Phase[], _eventType: string, taskId: string): { phase: Phase; task: Task } | null => {
  for (const phase of phases) {
    const task = phase.tasks.find((t) => t.id === taskId);
    if (task) {
      return { phase, task };
    }
  }
  return null;
};

// State reducer
export const stateReducer = (state: DeploymentState, action: StateAction): DeploymentState => {
  const newState = { ...state, phases: state.phases.map((p) => ({ ...p, tasks: [...p.tasks] })) };

  switch (action.type) {
    case 'START_TASK': {
      const phaseMapping = getPhaseForEvent(action.eventType, state.command);
      if (!phaseMapping) return state;

      const phase = newState.phases.find((p) => p.id === phaseMapping.phaseId);
      if (!phase) return state;

      // Start the phase if not already started
      if (phase.status === 'pending') {
        phase.status = 'active';
        phase.startedAt = Date.now();
        newState.currentPhaseId = phase.id;
      }

      // Add the task
      const task: Task = {
        id: action.taskId || generateId(),
        name: action.taskName,
        status: 'active',
        startedAt: Date.now()
      };
      phase.tasks.push(task);

      return newState;
    }

    case 'UPDATE_TASK': {
      const result = findTask(newState.phases, action.eventType, action.taskId);
      if (!result) return state;

      const { task } = result;
      if (action.message) task.message = action.message;
      if (action.progress) task.progress = action.progress;

      return newState;
    }

    case 'FINISH_TASK': {
      const result = findTask(newState.phases, action.eventType, action.taskId);
      if (!result) return state;

      const { phase, task } = result;
      task.status = 'success';
      if (task.startedAt) {
        task.duration = Date.now() - task.startedAt;
      }
      if (action.message) task.message = action.message;
      delete task.progress;

      // Check if all tasks in phase are done
      const allDone = phase.tasks.every((t) => t.status === 'success' || t.status === 'error');
      if (allDone && phase.status === 'active') {
        phase.status = 'success';
        if (phase.startedAt) {
          phase.duration = Date.now() - phase.startedAt;
        }
      }

      return newState;
    }

    case 'FAIL_TASK': {
      const result = findTask(newState.phases, action.eventType, action.taskId);
      if (!result) return state;

      const { phase, task } = result;
      task.status = 'error';
      if (task.startedAt) {
        task.duration = Date.now() - task.startedAt;
      }
      if (action.message) task.message = action.message;
      phase.status = 'error';

      return newState;
    }

    case 'ADD_CHILD_TASK': {
      const result = findTask(newState.phases, action.eventType, action.parentTaskId);
      if (!result) return state;

      const { task } = result;
      if (!task.children) task.children = [];
      task.children.push(action.childTask);

      return newState;
    }

    case 'UPDATE_CHILD_TASK': {
      const result = findTask(newState.phases, action.eventType, action.parentTaskId);
      if (!result) return state;

      const { task } = result;
      const child = task.children?.find((c) => c.id === action.childTaskId);
      if (!child) return state;

      child.status = action.status;
      if (action.message) child.message = action.message;
      if (action.duration) child.duration = action.duration;

      return newState;
    }

    case 'UPDATE_RESOURCE': {
      const existingIndex = newState.resources.findIndex((r) => r.logicalId === action.resource.logicalId);
      if (existingIndex >= 0) {
        newState.resources[existingIndex] = action.resource;
      } else {
        newState.resources.push(action.resource);
      }
      return newState;
    }

    case 'SET_ERROR': {
      newState.error = action.error;
      return newState;
    }

    case 'COMPLETE': {
      newState.completedAt = Date.now();
      // Mark any remaining active phases as success
      for (const phase of newState.phases) {
        if (phase.status === 'active') {
          phase.status = 'success';
          if (phase.startedAt) {
            phase.duration = Date.now() - phase.startedAt;
          }
        }
      }
      return newState;
    }

    default:
      return state;
  }
};
