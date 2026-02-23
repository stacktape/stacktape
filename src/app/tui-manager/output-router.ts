import { logCollectorStream } from '@utils/log-collector';
import { jsonlEmitter } from './jsonl-emitter';
import type { JsonlLevel } from './jsonl-types';
import type { OutputMode } from './output-mode';
import { plainEmitter } from './plain-emitter';
import type { OutputRecord } from './output-record';

type OutputSink = {
  emit: (record: OutputRecord) => void;
  reset?: () => void;
};

const createJsonlSink = ({ stdout }: { stdout: boolean }): OutputSink => {
  return {
    reset: () => jsonlEmitter.reset(),
    emit: (record) => {
      let serialized: string | undefined;
      if (record.type === 'event') {
        serialized = jsonlEmitter.emitEvent({ ...record, stdout });
      } else if (record.type === 'log') {
        serialized = jsonlEmitter.emitLog({ ...record, stdout });
      } else if (record.type === 'output') {
        serialized = jsonlEmitter.emitOutput({ ...record, stdout });
      } else if (record.type === 'result') {
        serialized = jsonlEmitter.emitResult({ ...record, stdout });
      }

      if (serialized) {
        logCollectorStream.write(serialized);
      }
    }
  };
};

const createPlainSink = (): OutputSink => {
  return {
    reset: () => plainEmitter.reset(),
    emit: (record) => {
      if (record.type === 'progress') {
        plainEmitter.emitProgress({ phase: record.phase, message: record.message });
        return;
      }
      if (record.type === 'event') {
        const message = record.instanceId ? `${record.message} (${record.instanceId})` : record.message;
        plainEmitter.emitProgress({ phase: record.phase, message });
        return;
      }
      if (record.type === 'log') {
        plainEmitter.emitLog({ level: record.level, message: record.message });
        return;
      }
      if (record.type === 'output') {
        for (const line of record.lines) {
          if (line.trim()) plainEmitter.emitOutputLine(line);
        }
        return;
      }
      if (record.type === 'result') {
        plainEmitter.emitResult(record);
      }
    }
  };
};

const getSinksForMode = (mode: OutputMode): OutputSink[] => {
  const sinks: OutputSink[] = [createJsonlSink({ stdout: mode === 'jsonl' })];
  if (mode === 'plain') {
    sinks.push(createPlainSink());
  }
  return sinks;
};

export class OutputRouter {
  private sinks: OutputSink[];

  constructor(mode: OutputMode) {
    this.sinks = getSinksForMode(mode);
  }

  reconfigure(mode: OutputMode) {
    this.sinks = getSinksForMode(mode);
  }

  reset() {
    for (const sink of this.sinks) {
      sink.reset?.();
    }
  }

  emit(record: OutputRecord) {
    for (const sink of this.sinks) {
      sink.emit(record);
    }
  }

  emitCollectorLog({
    level,
    source,
    message,
    data
  }: {
    level: JsonlLevel;
    source: string;
    message: string;
    data?: Record<string, unknown>;
  }) {
    const serialized = jsonlEmitter.emitLog({ level, source, message, data, stdout: false });
    if (serialized) {
      logCollectorStream.write(serialized);
    }
  }
}
