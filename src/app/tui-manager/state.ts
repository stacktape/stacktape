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

const HIDE_CHILDREN_WHEN_FINISHED_EVENTS: LoggableEventType[] = ['LOAD_METADATA_FROM_AWS'];

class TuiStateManager {
  private state: TuiState;
  private listeners: Set<StateListener> = new Set();
  private phaseOrder: DeploymentPhase[] = PHASE_ORDER;
  private phaseNames: Record<DeploymentPhase, string> = PHASE_NAMES;
  private notifyTimeout: NodeJS.Timeout | undefined;

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
      startTime: Date.now(),
      showPhaseHeaders: true
    };
  }

  configureForDelete() {
    this.phaseOrder = DELETE_PHASE_ORDER;
    this.phaseNames = { ...PHASE_NAMES, ...DELETE_PHASE_NAMES };
    this.state = this.createInitialState();
    this.notifyListeners();
  }

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

  setShowPhaseHeaders(show: boolean) {
    this.state = { ...this.state, showPhaseHeaders: show };
    this.notifyListeners();
  }

  setStreamingMode(enabled: boolean) {
    this.state = { ...this.state, streamingMode: enabled };
    this.notifyListeners();
  }

  setFinalizing() {
    this.state = { ...this.state, isFinalizing: true };
    this.notifyListeners();
  }

  setPendingCompletion(params: { success: boolean; message: string; links: TuiLink[]; consoleUrl?: string }) {
    this.state = { ...this.state, pendingCompletion: params };
    this.notifyListeners();
  }

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
    if (this.notifyTimeout) return;
    this.notifyTimeout = setTimeout(() => {
      this.notifyTimeout = undefined;
      for (const listener of this.listeners) {
        listener(this.state);
      }
    }, 16);
  }

  setHeader(header: TuiDeploymentHeader) {
    this.state = { ...this.state, header };
    this.notifyListeners();
  }

  getPhaseOrder(): DeploymentPhase[] {
    return this.phaseOrder;
  }

  setCurrentPhase(phase: DeploymentPhase) {
    const currentPhaseIndex = this.phaseOrder.indexOf(phase);

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

    const targetPhase = phase || this.state.currentPhase || 'INITIALIZE';

    if (parentEventType && instanceId) {
      this.addChildEvent(targetPhase, parentEventType, newEvent);
    } else {
      this.addEventToPhase(targetPhase, newEvent);
    }

    this.notifyListeners();
  }

  private addEventToPhase(phaseId: DeploymentPhase, event: TuiEvent) {
    const newPhases = this.state.phases.map((p) => {
      const withoutSameEventId = p.events.filter((existingEvent) => existingEvent.id !== event.id);
      if (p.id === phaseId) {
        return { ...p, events: [...withoutSameEventId, event] };
      }
      if (withoutSameEventId.length !== p.events.length) {
        return { ...p, events: withoutSameEventId };
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
              if (childEvent.instanceId) {
                const existingIndex = e.children.findIndex((c) => c.instanceId === childEvent.instanceId);
                if (existingIndex >= 0) {
                  const updatedChildren = [...e.children];
                  updatedChildren[existingIndex] = {
                    ...childEvent,
                    startTime: e.children[existingIndex].startTime
                  };
                  return { ...e, children: updatedChildren };
                }
              }
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
    data?: Record<string, any>;
    description?: string;
    parentEventType?: LoggableEventType;
    instanceId?: string;
  }) {
    const { eventType, additionalMessage, data, description, parentEventType, instanceId } = params;
    const eventId = instanceId ? `${eventType}-${instanceId}` : eventType;

    const newPhases = this.state.phases.map((phase) => ({
      ...phase,
      events: phase.events.map((event) => {
        if (parentEventType && instanceId) {
          if (event.eventType === parentEventType) {
            return {
              ...event,
              children: event.children.map((child) => {
                if (child.instanceId === instanceId) {
                  return {
                    ...child,
                    ...(additionalMessage !== undefined && { additionalMessage }),
                    ...(data !== undefined && { data }),
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
            ...(data !== undefined && { data }),
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
          if (event.eventType === parentEventType) {
            return {
              ...event,
              children: event.children.map((child) => {
                if (child.instanceId === instanceId) {
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
    if (this.state.currentPhase) {
      const endTime = Date.now();
      const finalStatus: TuiEventStatus = success ? 'success' : 'error';
      this.state = {
        ...this.state,
        phases: this.state.phases.map((p) => {
          if (p.id === this.state.currentPhase && p.status === 'running') {
            return { ...p, status: finalStatus, endTime, duration: p.startTime ? endTime - p.startTime : 0 };
          }
          return p;
        })
      };
    }
    this.setSummary({ success, message, links, consoleUrl });
  }

  markAllRunningAsErrored() {
    const endTime = Date.now();

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

  setActivePrompt(prompt: TuiPrompt) {
    this.state = { ...this.state, activePrompt: prompt };
    this.notifyListeners();
  }

  clearActivePrompt() {
    this.state = { ...this.state, activePrompt: undefined };
    this.notifyListeners();
  }

  setCancelDeployment(cancelDeployment: TuiCancelDeployment) {
    this.state = { ...this.state, cancelDeployment };
    this.notifyListeners();
  }

  updateCancelDeployment(updates: Partial<TuiCancelDeployment>) {
    if (this.state.cancelDeployment) {
      this.state = {
        ...this.state,
        cancelDeployment: { ...this.state.cancelDeployment, ...updates }
      };
      this.notifyListeners();
    }
  }

  clearCancelDeployment() {
    this.state = { ...this.state, cancelDeployment: undefined };
    this.notifyListeners();
  }
}

export const tuiState = new TuiStateManager();
