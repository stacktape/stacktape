import type { OperationJournal } from './journal';
import type { OperationStore } from './store';
import type {
  LegacyEventContext,
  LegacyProgressEvent,
  LoggableEventType,
  OperationActivity,
  OperationStatus,
  ProgressReporter
} from './types';
import { plainOperationText, safeCapturedOutput } from './text';

const locatorKey = ({ eventType, instanceId, parentEventType, parentInstanceId }: LegacyProgressEvent): string =>
  [parentEventType ?? '', parentInstanceId ?? '', eventType, instanceId ?? ''].join('\u001f');

/**
 * Compatibility reporter for existing call sites. It allocates a real ID at
 * START and resolves later UPDATE/FINISH calls to that activity.
 */
export class OperationReporter implements ProgressReporter {
  private registry: { activityCounter: number; activeByLocator: Map<string, string[]> };

  constructor(
    private journal: OperationJournal,
    private store: OperationStore,
    readonly eventContext: LegacyEventContext = {},
    registry?: { activityCounter: number; activeByLocator: Map<string, string[]> }
  ) {
    this.registry = registry ?? { activityCounter: 0, activeByLocator: new Map() };
  }

  reset() {
    this.registry.activityCounter = 0;
    this.registry.activeByLocator.clear();
  }

  createChild(context: LegacyEventContext): OperationReporter {
    return new OperationReporter(this.journal, this.store, context, this.registry);
  }

  startEvent(params: LegacyProgressEvent & { description: string }) {
    const resolved = this.resolveContext(params);
    const id = `${this.store.getSnapshot().sessionId}:activity:${++this.registry.activityCounter}`;
    const parentActivityId = this.resolveParentActivity(resolved);
    const activity: OperationActivity = {
      id,
      eventType: params.eventType,
      description: plainOperationText(params.description),
      phase: params.phase ?? this.store.getSnapshot().currentPhase ?? 'INITIALIZE',
      status: 'running',
      startTime: Date.now(),
      outputLines: [],
      ...(resolved.instanceId !== undefined && { instanceId: resolved.instanceId }),
      ...(resolved.label !== undefined && { label: plainOperationText(resolved.label) }),
      ...(resolved.parentEventType !== undefined && { parentEventType: resolved.parentEventType }),
      ...(resolved.parentInstanceId !== undefined && { parentInstanceId: resolved.parentInstanceId }),
      ...(parentActivityId !== undefined && { parentActivityId }),
      ...(params.detail !== undefined && { detail: params.detail })
    };
    const key = locatorKey({ ...params, ...resolved });
    this.registry.activeByLocator.set(key, [...(this.registry.activeByLocator.get(key) ?? []), id]);
    this.journal.append({ type: 'activity-started', activity }, activity.startTime);
  }

  updateEvent(params: LegacyProgressEvent) {
    const resolved = this.resolveContext(params);
    const activityId = this.findActive({ ...params, ...resolved });
    if (!activityId) return;
    this.journal.append({
      type: 'activity-updated',
      activityId,
      ...(params.description !== undefined && { description: plainOperationText(params.description) }),
      ...(params.additionalMessage !== undefined && {
        additionalMessage: plainOperationText(params.additionalMessage)
      }),
      ...(params.label !== undefined && { label: plainOperationText(params.label) }),
      ...(params.detail !== undefined && { detail: params.detail })
    });
  }

  finishEvent(params: LegacyProgressEvent & { finalMessage?: string }) {
    const resolved = this.resolveContext(params);
    const key = locatorKey({ ...params, ...resolved });
    const activityId = this.findActive({ ...params, ...resolved });
    if (!activityId) return;
    const status: OperationStatus = params.status ?? 'success';
    this.journal.append({
      type: 'activity-finished',
      activityId,
      status,
      ...(params.finalMessage !== undefined && { finalMessage: plainOperationText(params.finalMessage) }),
      ...(params.detail !== undefined && { detail: params.detail })
    });
    const active = this.registry.activeByLocator.get(key) ?? [];
    this.registry.activeByLocator.set(
      key,
      active.filter((id) => id !== activityId)
    );
  }

  appendOutput(params: {
    eventType: LoggableEventType;
    lines: string[];
    instanceId?: string;
    parentEventType?: LoggableEventType;
    parentInstanceId?: string;
    stream?: 'stdout' | 'stderr' | 'diagnostic';
  }) {
    const resolved = this.resolveContext(params);
    const activityId = this.findActive({ ...params, ...resolved });
    if (!activityId || params.lines.length === 0) return;
    this.journal.append({
      type: 'activity-output',
      activityId,
      lines: params.lines.map((line) =>
        safeCapturedOutput(line, params.stream === 'stdout' || params.stream === 'stderr')
      ),
      stream: params.stream ?? 'diagnostic'
    });
  }

  get lastActivity(): OperationActivity | undefined {
    const state = this.store.getSnapshot();
    const id = state.activityOrder.at(-1);
    return id ? state.activities[id] : undefined;
  }

  private resolveContext(params: LegacyEventContext): LegacyEventContext {
    return {
      instanceId: params.instanceId ?? this.eventContext.instanceId,
      label: params.label ?? this.eventContext.label,
      parentEventType: params.parentEventType ?? this.eventContext.parentEventType,
      parentInstanceId: params.parentInstanceId ?? this.eventContext.parentInstanceId
    };
  }

  private findActive(params: LegacyProgressEvent): string | undefined {
    const ids = this.registry.activeByLocator.get(locatorKey(params));
    const exact = ids?.at(-1);
    const state = this.store.getSnapshot();
    if (exact && state.activities[exact]?.status === 'running') return exact;
    for (let index = state.activityOrder.length - 1; index >= 0; index--) {
      const activity = state.activities[state.activityOrder[index]];
      if (activity.status !== 'running' || activity.eventType !== params.eventType) continue;
      if (params.instanceId !== undefined && activity.instanceId !== params.instanceId) continue;
      if (params.parentEventType !== undefined && activity.parentEventType !== params.parentEventType) continue;
      if (params.parentInstanceId !== undefined && activity.parentInstanceId !== params.parentInstanceId) continue;
      return activity.id;
    }
    return undefined;
  }

  private resolveParentActivity(context: LegacyEventContext): string | undefined {
    if (!context.parentEventType) return undefined;
    const state = this.store.getSnapshot();
    for (let index = state.activityOrder.length - 1; index >= 0; index--) {
      const activity = state.activities[state.activityOrder[index]];
      if (activity.eventType !== context.parentEventType || activity.status !== 'running') continue;
      if (context.parentInstanceId !== undefined && activity.instanceId !== context.parentInstanceId) continue;
      return activity.id;
    }
    return undefined;
  }
}
