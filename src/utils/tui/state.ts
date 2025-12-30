import type {
  TuiDeploymentHeader,
  TuiEvent,
  TuiEventStatus,
  TuiLink,
  TuiMessage,
  TuiMessageType,
  TuiState,
  TuiSummary,
  TuiWarning
} from './types';
import { PHASE_NAMES, PHASE_ORDER } from './types';

type StateListener = (state: TuiState) => void;

/**
 * Events whose CHILDREN should be hidden when the parent is finished.
 * The parent event itself is still shown.
 */
const HIDE_CHILDREN_WHEN_FINISHED_EVENTS: LoggableEventType[] = ['LOAD_METADATA_FROM_AWS'];

class TuiStateManager {
  private state: TuiState;
  private listeners: Set<StateListener> = new Set();

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): TuiState {
    return {
      phases: PHASE_ORDER.map((id) => ({
        id,
        name: PHASE_NAMES[id],
        status: 'pending' as TuiEventStatus,
        events: []
      })),
      warnings: [],
      messages: [],
      isComplete: false,
      startTime: Date.now()
    };
  }

  reset() {
    this.state = this.createInitialState();
    this.notifyListeners();
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
    this.state = { ...this.state, header };
    this.notifyListeners();
  }

  setCurrentPhase(phase: DeploymentPhase) {
    const currentPhaseIndex = PHASE_ORDER.indexOf(phase);

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
    parentEventType?: LoggableEventType;
    instanceId?: string;
  }) {
    const { eventType, additionalMessage, parentEventType, instanceId } = params;
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
                  return { ...child, additionalMessage };
                }
                return child;
              })
            };
          }
        } else if (event.id === eventId) {
          return { ...event, additionalMessage };
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
}

export const tuiState = new TuiStateManager();
