import type {
  TuiCancelDeployment,
  TuiDeploymentHeader,
  TuiEvent,
  TuiEventStatus,
  TuiLink,
  TuiMessage,
  TuiMessageType,
  TuiPrompt,
  TuiState,
  TuiSummary,
  TuiWarning
} from './types';
import {
  CODEBUILD_DEPLOY_PHASE_NAMES,
  CODEBUILD_DEPLOY_PHASE_ORDER,
  DELETE_PHASE_NAMES,
  DELETE_PHASE_ORDER,
  PHASE_NAMES,
  PHASE_ORDER
} from './types';

type StateListener = (state: TuiState) => void;

/**
 * Events whose CHILDREN should be hidden when the parent is finished.
 * The parent event itself is still shown.
 */
const HIDE_CHILDREN_WHEN_FINISHED_EVENTS: LoggableEventType[] = ['LOAD_METADATA_FROM_AWS'];

class TuiStateManager {
  private state: TuiState;
  private listeners: Set<StateListener> = new Set();
  private phaseOrder: DeploymentPhase[] = PHASE_ORDER;
  private phaseNames: Record<DeploymentPhase, string> = PHASE_NAMES;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): TuiState {
    return {
      phases: this.phaseOrder.map((id) => ({
        id,
        name: this.phaseNames[id] || PHASE_NAMES[id],
        status: 'pending' as TuiEventStatus,
        events: []
      })),
      warnings: [],
      messages: [],
      isComplete: false,
      startTime: Date.now()
    };
  }

  /**
   * Configure phases for delete command (simpler phase structure).
   * Must be called before setHeader for delete operations.
   */
  configureForDelete() {
    this.phaseOrder = DELETE_PHASE_ORDER;
    this.phaseNames = { ...PHASE_NAMES, ...DELETE_PHASE_NAMES };
    this.state = this.createInitialState();
    this.notifyListeners();
  }

  /**
   * Configure phases for codebuild:deploy command.
   * Uses: Initialize, Prepare Pipeline, Deploy (no Build & Package).
   */
  configureForCodebuildDeploy() {
    this.phaseOrder = CODEBUILD_DEPLOY_PHASE_ORDER;
    this.phaseNames = { ...PHASE_NAMES, ...CODEBUILD_DEPLOY_PHASE_NAMES };
    this.state = this.createInitialState();
    this.notifyListeners();
  }

  reset() {
    this.phaseOrder = PHASE_ORDER;
    this.phaseNames = PHASE_NAMES;
    this.state = this.createInitialState();
    this.notifyListeners();
  }

  /**
   * Enable/disable streaming mode. When enabled, hides dynamic phase rendering
   * to prevent conflicts with console.log output (e.g., cloudwatch logs).
   */
  setStreamingMode(enabled: boolean) {
    this.state = { ...this.state, streamingMode: enabled };
    this.notifyListeners();
  }

  /**
   * Mark the TUI as finalizing. This signals that no more events will be added
   * and the current phase can be committed to Static.
   */
  setFinalizing() {
    this.state = { ...this.state, isFinalizing: true };
    this.notifyListeners();
  }

  /**
   * Store completion info without displaying summary yet.
   * This allows hooks to run and add events before showing the summary.
   * Call commitPendingCompletion() to actually display the summary.
   */
  setPendingCompletion(params: { success: boolean; message: string; links: TuiLink[]; consoleUrl?: string }) {
    this.state = { ...this.state, pendingCompletion: params };
    this.notifyListeners();
  }

  /**
   * Commit the pending completion by calling setComplete with stored info.
   * This should be called after hooks finish running.
   */
  commitPendingCompletion() {
    if (this.state.pendingCompletion) {
      const { success, message, links, consoleUrl } = this.state.pendingCompletion;
      this.setComplete(success, message, links, consoleUrl);
      this.state = { ...this.state, pendingCompletion: undefined };
      this.notifyListeners();
    }
  }

  getState(): TuiState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  setHeader(header: TuiDeploymentHeader) {
    // Clear any messages that were added before the header (e.g., from confirmation prompts)
    // These will be displayed via non-TUI console output, so don't duplicate in TUI
    this.state = { ...this.state, header, messages: [] };
    this.notifyListeners();
  }

  getPhaseOrder(): DeploymentPhase[] {
    return this.phaseOrder;
  }

  setCurrentPhase(phase: DeploymentPhase) {
    const currentPhaseIndex = this.phaseOrder.indexOf(phase);

    // Mark all previous phases as complete
    this.state.phases = this.state.phases.map((p, index) => {
      if (index < currentPhaseIndex && p.status !== 'success' && p.status !== 'error') {
        return {
          ...p,
          status: 'success' as TuiEventStatus,
          endTime: Date.now(),
          duration: p.startTime ? Date.now() - p.startTime : 0
        };
      }
      if (p.id === phase && p.status === 'pending') {
        return { ...p, status: 'running' as TuiEventStatus, startTime: Date.now() };
      }
      return p;
    });

    this.state = { ...this.state, currentPhase: phase };
    this.notifyListeners();
  }

  finishCurrentPhase() {
    if (!this.state.currentPhase) return;

    const newPhases = this.state.phases.map((p) => {
      if (p.id === this.state.currentPhase && p.status === 'running') {
        return {
          ...p,
          status: 'success' as TuiEventStatus,
          endTime: Date.now(),
          duration: p.startTime ? Date.now() - p.startTime : 0
        };
      }
      return p;
    });
    this.state = { ...this.state, phases: newPhases };
    this.notifyListeners();
  }

  startEvent(params: {
    eventType: LoggableEventType;
    description: string;
    phase?: DeploymentPhase;
    parentEventType?: LoggableEventType;
    instanceId?: string;
  }) {
    const { eventType, description, phase, parentEventType, instanceId } = params;
    const eventId = instanceId ? `${eventType}-${instanceId}` : eventType;

    const newEvent: TuiEvent = {
      id: eventId,
      eventType,
      description,
      status: 'running',
      startTime: Date.now(),
      phase,
      parentEventType,
      instanceId,
      hideChildrenWhenFinished: HIDE_CHILDREN_WHEN_FINISHED_EVENTS.includes(eventType),
      children: []
    };

    // Determine which phase this event belongs to
    const targetPhase = phase || this.state.currentPhase || 'INITIALIZE';

    // If it's a child event, add it to the parent
    if (parentEventType && instanceId) {
      this.addChildEvent(targetPhase, parentEventType, newEvent);
    } else {
      // Add as a top-level event in the phase
      this.addEventToPhase(targetPhase, newEvent);
    }

    this.notifyListeners();
  }

  private addEventToPhase(phaseId: DeploymentPhase, event: TuiEvent) {
    const newPhases = this.state.phases.map((p) => {
      if (p.id === phaseId) {
        // Check if event already exists (update instead of add)
        const existingIndex = p.events.findIndex((e) => e.id === event.id);
        if (existingIndex >= 0) {
          const updatedEvents = [...p.events];
          updatedEvents[existingIndex] = { ...updatedEvents[existingIndex], ...event };
          return { ...p, events: updatedEvents };
        }
        return { ...p, events: [...p.events, event] };
      }
      return p;
    });
    this.state = { ...this.state, phases: newPhases };
  }

  private addChildEvent(phaseId: DeploymentPhase, parentEventType: LoggableEventType, childEvent: TuiEvent) {
    const newPhases = this.state.phases.map((p) => {
      if (p.id === phaseId) {
        return {
          ...p,
          events: p.events.map((e) => {
            if (e.eventType === parentEventType) {
              return { ...e, children: [...e.children, childEvent] };
            }
            return e;
          })
        };
      }
      return p;
    });
    this.state = { ...this.state, phases: newPhases };
  }

  updateEvent(params: {
    eventType: LoggableEventType;
    additionalMessage?: string;
    description?: string;
    parentEventType?: LoggableEventType;
    instanceId?: string;
  }) {
    const { eventType, additionalMessage, description, parentEventType, instanceId } = params;
    const eventId = instanceId ? `${eventType}-${instanceId}` : eventType;

    const newPhases = this.state.phases.map((phase) => ({
      ...phase,
      events: phase.events.map((event) => {
        if (parentEventType && instanceId) {
          // Update child event
          if (event.eventType === parentEventType) {
            return {
              ...event,
              children: event.children.map((child) => {
                if (child.id === eventId) {
                  return {
                    ...child,
                    ...(additionalMessage !== undefined && { additionalMessage }),
                    ...(description !== undefined && { description })
                  };
                }
                return child;
              })
            };
          }
        } else if (event.id === eventId) {
          return {
            ...event,
            ...(additionalMessage !== undefined && { additionalMessage }),
            ...(description !== undefined && { description })
          };
        }
        return event;
      })
    }));

    this.state = { ...this.state, phases: newPhases };
    this.notifyListeners();
  }

  finishEvent(params: {
    eventType: LoggableEventType;
    finalMessage?: string;
    data?: Record<string, any>;
    parentEventType?: LoggableEventType;
    instanceId?: string;
    status?: TuiEventStatus;
  }) {
    const { eventType, finalMessage, data, parentEventType, instanceId, status = 'success' } = params;
    const eventId = instanceId ? `${eventType}-${instanceId}` : eventType;
    const endTime = Date.now();

    const newPhases = this.state.phases.map((phase) => ({
      ...phase,
      events: phase.events.map((event) => {
        if (parentEventType && instanceId) {
          // Finish child event
          if (event.eventType === parentEventType) {
            return {
              ...event,
              children: event.children.map((child) => {
                if (child.id === eventId) {
                  return {
                    ...child,
                    status,
                    endTime,
                    duration: endTime - child.startTime,
                    finalMessage,
                    data
                  };
                }
                return child;
              })
            };
          }
        } else if (event.id === eventId) {
          return {
            ...event,
            status,
            endTime,
            duration: endTime - event.startTime,
            finalMessage,
            data
          };
        }
        return event;
      })
    }));

    this.state = { ...this.state, phases: newPhases };
    this.notifyListeners();
  }

  addWarning(message: string, phase?: DeploymentPhase) {
    const warning: TuiWarning = {
      id: `warning-${Date.now()}`,
      message,
      timestamp: Date.now(),
      phase: phase || this.state.currentPhase
    };
    this.state = { ...this.state, warnings: [...this.state.warnings, warning] };
    this.notifyListeners();
  }

  addMessage(name: string, type: TuiMessageType, message: string, data?: Record<string, any>) {
    const tuiMessage: TuiMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      type,
      message,
      timestamp: Date.now(),
      phase: this.state.currentPhase, // Attach to current phase for inline rendering
      data
    };
    this.state = { ...this.state, messages: [...this.state.messages, tuiMessage] };
    this.notifyListeners();
  }

  setSummary(summary: TuiSummary) {
    this.state = { ...this.state, summary, isComplete: true };
    this.notifyListeners();
  }

  setComplete(success: boolean, message: string, links: TuiLink[] = [], consoleUrl?: string) {
    this.setSummary({ success, message, links, consoleUrl });
  }

  /**
   * Mark all currently running events and phases as errored.
   * Called when an error occurs to show failed state in the UI.
   */
  markAllRunningAsErrored() {
    const endTime = Date.now();

    // Helper to mark event and its children as errored if running
    const markEventErrored = (event: TuiEvent): TuiEvent => {
      const children = event.children.map((child) =>
        child.status === 'running'
          ? { ...child, status: 'error' as TuiEventStatus, endTime, duration: endTime - child.startTime }
          : child
      );

      if (event.status === 'running') {
        return {
          ...event,
          status: 'error' as TuiEventStatus,
          endTime,
          duration: endTime - event.startTime,
          children
        };
      }
      return { ...event, children };
    };

    // Mark all running events in all phases as errored
    const newPhases = this.state.phases.map((phase) => {
      const events = phase.events.map(markEventErrored);
      if (phase.status === 'running') {
        return {
          ...phase,
          status: 'error' as TuiEventStatus,
          endTime,
          duration: phase.startTime ? endTime - phase.startTime : 0,
          events
        };
      }
      return { ...phase, events };
    });

    this.state = { ...this.state, phases: newPhases };
    this.notifyListeners();
  }

  /**
   * Append output lines to an event (for script output capture).
   * Lines are stored in the event and rendered as part of the event UI.
   */
  appendEventOutput(params: { eventType: LoggableEventType; lines: string[]; instanceId?: string }) {
    const { eventType, lines, instanceId } = params;
    const eventId = instanceId ? `${eventType}-${instanceId}` : eventType;

    const newPhases = this.state.phases.map((phase) => ({
      ...phase,
      events: phase.events.map((event) => {
        if (event.id === eventId) {
          const existingLines = event.outputLines || [];
          return { ...event, outputLines: [...existingLines, ...lines] };
        }
        return event;
      })
    }));

    this.state = { ...this.state, phases: newPhases };
    this.notifyListeners();
  }

  /**
   * Set the active prompt for user input.
   */
  setActivePrompt(prompt: TuiPrompt) {
    this.state = { ...this.state, activePrompt: prompt };
    this.notifyListeners();
  }

  /**
   * Clear the active prompt after user has responded.
   */
  clearActivePrompt() {
    this.state = { ...this.state, activePrompt: undefined };
    this.notifyListeners();
  }

  /**
   * Show a cancel deployment banner that the user can trigger with 'c' key.
   * Used when a deployment failure is detected and the user may want to cancel.
   */
  setCancelDeployment(cancelDeployment: TuiCancelDeployment) {
    this.state = { ...this.state, cancelDeployment };
    this.notifyListeners();
  }

  /**
   * Update the cancel deployment state (e.g., to show cancelling in progress).
   */
  updateCancelDeployment(updates: Partial<TuiCancelDeployment>) {
    if (this.state.cancelDeployment) {
      this.state = {
        ...this.state,
        cancelDeployment: { ...this.state.cancelDeployment, ...updates }
      };
      this.notifyListeners();
    }
  }

  /**
   * Clear the cancel deployment banner.
   */
  clearCancelDeployment() {
    this.state = { ...this.state, cancelDeployment: undefined };
    this.notifyListeners();
  }
}

export const tuiState = new TuiStateManager();
