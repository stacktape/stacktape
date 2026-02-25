import stripAnsi from 'strip-ansi';
import { serializeJsonlEvent } from './jsonl-serializer';
import type {
  JsonlData,
  JsonlEvent,
  JsonlEventDetail,
  JsonlEventEvent,
  JsonlEventStatus,
  JsonlLogEvent,
  JsonlOutputEvent,
  JsonlResultEvent
} from './jsonl-types';

const now = () => new Date().toISOString();

class JsonlEmitter {
  private resultEmitted = false;
  private lastEventKey: string | null = null;
  private lastEventAt = 0;
  private recentLogKeys = new Map<string, number>();
  private lastStructuredDetailByOperation = new Map<string, string>();

  private getOperationKey({ phase, eventType, instanceId }: { phase: string; eventType: string; instanceId?: string }) {
    return `${phase}|${eventType}|${instanceId || ''}`;
  }

  private getEventDedupeKey({
    phase,
    eventType,
    status,
    message,
    instanceId,
    parentEventType,
    parentInstanceId,
    detail
  }: {
    phase: string;
    eventType: string;
    status: JsonlEventStatus;
    message: string;
    instanceId?: string;
    parentEventType?: string;
    parentInstanceId?: string;
    detail?: JsonlEventDetail;
  }) {
    return JSON.stringify({
      phase,
      eventType,
      status,
      message,
      instanceId: instanceId || '',
      parentEventType: parentEventType || '',
      parentInstanceId: parentInstanceId || '',
      detail: detail || null
    });
  }

  private sanitizeData(data?: Record<string, unknown>): JsonlData | undefined {
    if (!data) return undefined;

    try {
      const serialized = JSON.stringify(data);
      if (serialized.length <= 2_000) {
        return data;
      }

      return {
        truncated: true,
        reason: 'data_too_large',
        keys: Object.keys(data),
        size: serialized.length
      };
    } catch {
      return {
        truncated: true,
        reason: 'data_unserializable'
      };
    }
  }

  reset() {
    this.resultEmitted = false;
    this.lastEventKey = null;
    this.lastEventAt = 0;
    this.recentLogKeys.clear();
    this.lastStructuredDetailByOperation.clear();
  }

  emitEvent({
    phase,
    eventType,
    status,
    message,
    instanceId,
    parentEventType,
    parentInstanceId,
    detail,
    stdout = true
  }: {
    phase: string;
    eventType: string;
    status: JsonlEventStatus;
    message: string;
    instanceId?: string;
    parentEventType?: string;
    parentInstanceId?: string;
    detail?: JsonlEventDetail;
    stdout?: boolean;
  }): string | undefined {
    const cleanMessage = stripAnsi(message);
    const operationKey = this.getOperationKey({ phase, eventType, instanceId });
    const eventKey = this.getEventDedupeKey({
      phase,
      eventType,
      status,
      message: cleanMessage,
      instanceId,
      parentEventType,
      parentInstanceId,
      detail
    });
    const nowMs = Date.now();

    if (detail?.kind === 'cloudformation-progress') {
      const structuredKey = JSON.stringify({ status, message: cleanMessage, detail });
      if (this.lastStructuredDetailByOperation.get(operationKey) === structuredKey) {
        return undefined;
      }
      this.lastStructuredDetailByOperation.set(operationKey, structuredKey);
    }

    if (status === 'completed') {
      this.lastStructuredDetailByOperation.delete(operationKey);
    }

    if (eventKey === this.lastEventKey && nowMs - this.lastEventAt < 800) {
      return undefined;
    }
    this.lastEventKey = eventKey;
    this.lastEventAt = nowMs;

    const payload: JsonlEventEvent = {
      type: 'event',
      ts: now(),
      phase,
      eventType,
      status,
      message: cleanMessage,
      ...(instanceId ? { instanceId } : {}),
      ...(parentEventType ? { parentEventType } : {}),
      ...(parentInstanceId ? { parentInstanceId } : {}),
      ...(detail ? { detail } : {})
    };
    return this.write(payload, { stdout });
  }

  emitLog({
    level,
    source,
    message,
    data,
    stdout = true
  }: {
    level: 'info' | 'warn' | 'error';
    source: string;
    message: string;
    data?: Record<string, unknown>;
    stdout?: boolean;
  }): string | undefined {
    const cleanMessage = stripAnsi(message);
    const logKey = `${level}|${source}|${cleanMessage}`;
    const nowMs = Date.now();
    const lastSeenAt = this.recentLogKeys.get(logKey);
    if (lastSeenAt !== undefined && nowMs - lastSeenAt < 2000) {
      return undefined;
    }
    this.recentLogKeys.set(logKey, nowMs);

    if (this.recentLogKeys.size > 500) {
      for (const [key, ts] of this.recentLogKeys) {
        if (nowMs - ts > 5000) {
          this.recentLogKeys.delete(key);
        }
      }
    }

    const safeData = this.sanitizeData(data);
    const payload: JsonlLogEvent = {
      type: 'log',
      ts: now(),
      level,
      source,
      message: cleanMessage,
      ...(safeData ? { data: safeData } : {})
    };
    return this.write(payload, { stdout });
  }

  emitOutput({
    eventType,
    instanceId,
    parentEventType,
    parentInstanceId,
    lines,
    stdout = true
  }: {
    eventType?: string;
    instanceId?: string;
    parentEventType?: string;
    parentInstanceId?: string;
    lines: string[];
    stdout?: boolean;
  }): string | undefined {
    const cleaned = lines.map((l) => stripAnsi(l)).filter((l) => l.trim());
    if (!cleaned.length) return undefined;

    const payload: JsonlOutputEvent = {
      type: 'output',
      ts: now(),
      ...(eventType ? { eventType } : {}),
      ...(instanceId ? { instanceId } : {}),
      ...(parentEventType ? { parentEventType } : {}),
      ...(parentInstanceId ? { parentInstanceId } : {}),
      lines: cleaned
    };
    return this.write(payload, { stdout });
  }

  emitResult({
    ok,
    code,
    message,
    data,
    stdout = true
  }: {
    ok: boolean;
    code: string;
    message: string;
    data?: Record<string, unknown>;
    stdout?: boolean;
  }): string | undefined {
    if (this.resultEmitted) return undefined;
    this.resultEmitted = true;
    const safeData = this.sanitizeData(data);

    const payload: JsonlResultEvent = {
      ts: now(),
      type: 'result',
      ok,
      code,
      message: stripAnsi(message),
      ...(safeData ? { data: safeData } : {})
    };
    return this.write(payload, { stdout });
  }

  private write(payload: JsonlEvent, { stdout = true }: { stdout?: boolean } = {}): string {
    const serialized = serializeJsonlEvent(payload);
    if (stdout) {
      process.stdout.write(`${serialized}\n`);
    }
    return serialized;
  }
}

export const jsonlEmitter = new JsonlEmitter();
