import type { JsonlEventDetail, JsonlEventStatus, JsonlLevel } from './jsonl-types';

export type OutputLogRecord = {
  type: 'log';
  level: JsonlLevel;
  source: string;
  message: string;
  data?: Record<string, unknown>;
};

export type OutputEventRecord = {
  type: 'event';
  phase: string;
  eventType: string;
  status: JsonlEventStatus;
  message: string;
  instanceId?: string;
  parentEventType?: string;
  parentInstanceId?: string;
  detail?: JsonlEventDetail;
};

export type OutputProgressRecord = {
  type: 'progress';
  phase: string;
  message: string;
};

export type OutputLinesRecord = {
  type: 'output';
  eventType?: string;
  instanceId?: string;
  parentEventType?: string;
  parentInstanceId?: string;
  lines: string[];
};

export type OutputResultRecord = {
  type: 'result';
  ok: boolean;
  code: string;
  message: string;
  data?: Record<string, unknown>;
};

export type OutputRecord =
  | OutputLogRecord
  | OutputEventRecord
  | OutputProgressRecord
  | OutputLinesRecord
  | OutputResultRecord;
