import { tuiState } from './state';
import type { TuiDeploymentHeader, TuiEventStatus, TuiMessageType } from './types';

type StartEventParams = {
  eventType: LoggableEventType;
  description: string;
  phase?: DeploymentPhase;
  parentEventType?: LoggableEventType;
  instanceId?: string;
};

type UpdateEventParams = {
  eventType: LoggableEventType;
  additionalMessage?: string;
  detail?: unknown;
  description?: string;
  parentEventType?: LoggableEventType;
  instanceId?: string;
};

type FinishEventParams = {
  eventType: LoggableEventType;
  finalMessage?: string;
  detail?: unknown;
  parentEventType?: LoggableEventType;
  instanceId?: string;
  status?: TuiEventStatus;
};

export class TuiStateSink {
  getState = () => tuiState.getState();

  reset = () => tuiState.reset();

  setHeader = (header: TuiDeploymentHeader) => {
    const currentHeader = tuiState.getState().header;
    const isDuplicateHeader =
      currentHeader?.action === header.action &&
      currentHeader?.projectName === header.projectName &&
      currentHeader?.stageName === header.stageName &&
      currentHeader?.region === header.region &&
      currentHeader?.subtitle === header.subtitle;
    if (isDuplicateHeader) return false;
    tuiState.setHeader(header);
    return true;
  };

  setPhase = (phase: DeploymentPhase) => tuiState.setCurrentPhase(phase);

  finishPhase = () => tuiState.finishCurrentPhase();

  startEvent = (params: StartEventParams): { phase: DeploymentPhase } => {
    const phase = params.phase || this.getCurrentPhase();
    tuiState.startEvent(params);
    return { phase };
  };

  updateEvent = (params: UpdateEventParams): { phase: DeploymentPhase; message: string } | null => {
    const stateParams: Parameters<typeof tuiState.updateEvent>[0] = {
      eventType: params.eventType,
      additionalMessage: params.additionalMessage,
      description: params.description,
      parentEventType: params.parentEventType,
      instanceId: params.instanceId,
      // Map `detail` (from event system) to `data` (TUI state field) so components
      // can read structured data instead of parsing the formatted message string
      ...(params.detail !== undefined && { data: params.detail as Record<string, any> })
    };
    tuiState.updateEvent(stateParams);
    if (!params.additionalMessage) return null;
    return { phase: this.getCurrentPhase(), message: params.additionalMessage };
  };

  finishEvent = (params: FinishEventParams): { phase: DeploymentPhase; message: string } => {
    const phase = this.getCurrentPhase();
    const existingDescription = this.findEventDescription(params);
    const message =
      params.finalMessage || this.buildFallbackFinishedMessage(params.eventType, params.status, existingDescription);
    tuiState.finishEvent(params);
    return { phase, message };
  };

  appendEventOutput = (params: { eventType: LoggableEventType; lines: string[]; instanceId?: string }) => {
    tuiState.appendEventOutput(params);
  };

  addMessage = (type: TuiMessageType, message: string) => {
    tuiState.addMessage(type, type, message);
  };

  markAllRunningAsErrored = () => {
    tuiState.markAllRunningAsErrored();
  };

  private getCurrentPhase = (): DeploymentPhase => {
    return tuiState.getState().currentPhase || 'INITIALIZE';
  };

  private buildFallbackFinishedMessage = (
    eventType: LoggableEventType,
    status: TuiEventStatus | undefined,
    description: string | undefined
  ): string => {
    const statusPart = status === 'error' ? 'failed' : 'completed';
    if (description) return `${description} ${statusPart}`;
    const normalized = eventType.toLowerCase().split('_').filter(Boolean).join(' ');
    return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)} ${statusPart}`;
  };

  private findEventDescription = (params: {
    eventType: LoggableEventType;
    parentEventType?: LoggableEventType;
    instanceId?: string;
  }): string | undefined => {
    const state = tuiState.getState();

    if (params.parentEventType && params.instanceId) {
      for (const phase of state.phases) {
        const parentEvent = phase.events.find((event) => event.eventType === params.parentEventType);
        if (!parentEvent) continue;
        const childEvent = parentEvent.children.find((child) => child.instanceId === params.instanceId);
        if (childEvent?.description) return childEvent.description;
      }
      return undefined;
    }

    const eventId = params.instanceId ? `${params.eventType}-${params.instanceId}` : params.eventType;
    for (const phase of state.phases) {
      const event = phase.events.find((candidate) => candidate.id === eventId);
      if (event?.description) return event.description;
    }
    return undefined;
  };
}
