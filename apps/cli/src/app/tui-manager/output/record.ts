import type { JsonlEventDetail, JsonlEventStatus, JsonlLevel } from './jsonl-types';

type OutputLogRecord = {
  type: 'log';
  level: JsonlLevel;
  source: string;
  message: string;
  data?: Record<string, unknown>;
};

type OutputEventRecord = {
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

type OutputProgressRecord = {
  type: 'progress';
  phase: string;
  message: string;
};

type OutputLinesRecord = {
  type: 'output';
  stream?: 'stdout' | 'stderr';
  eventType?: string;
  instanceId?: string;
  parentEventType?: string;
  parentInstanceId?: string;
  lines: string[];
};

type OutputResultRecord = {
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
