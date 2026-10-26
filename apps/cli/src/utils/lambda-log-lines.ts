export type LambdaLogLevel = 'info' | 'warn' | 'error';

/** One CloudWatch event of a Lambda function's log group, as the log printers show it. */
export type ParsedLambdaLogLine =
  /** Runtime and extension start-up lines, which carry nothing for the reader. */
  | { kind: 'skip' }
  | { kind: 'start'; requestId: string }
  | { kind: 'end'; requestId: string }
  | {
      kind: 'report';
      requestId: string;
      duration?: string;
      memoryUsed?: string;
      initDuration?: string;
      /** `error` or `timeout`; a successful invocation has none. */
      status?: string;
      errorType?: string;
      level: LambdaLogLevel;
    }
  | { kind: 'init-report'; initDuration?: string; status?: string; errorType?: string; level: LambdaLogLevel }
  | {
      kind: 'entry';
      level: LambdaLogLevel;
      requestId?: string;
      /** The runtime's own label: `INFO`, `ERROR`, `Invoke Error`, `[WARNING]`, `fail`, ... */
      logType?: string;
      content: string;
      /** Node's error records (`Invoke Error`, `Uncaught Exception`, ...) carry the error as JSON in `content`. */
      nodeErrorRecord?: boolean;
    };

const TIMESTAMP = String.raw`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z`;
const REQUEST_ID = String.raw`[0-9a-fA-F-]{36}|undefined`;
/** Node and .NET: `<time>\t<request ID>\t<level>\t<message>`. */
const TAB_FORMAT = new RegExp(String.raw`^(${TIMESTAMP})\t(${REQUEST_ID})?\t([A-Za-z][A-Za-z ]*?) ?\t([\s\S]*)$`);
/** Python's logging handler: `[<LEVEL>]\t<time>\t<request ID>\t<message>`. */
const PYTHON_LOGGING_FORMAT = new RegExp(String.raw`^\[([A-Z]+)\]\t(${TIMESTAMP})\t(${REQUEST_ID})?\t([\s\S]*)$`);

const NODE_ERROR_RECORDS = new Set(['Invoke Error', 'Uncaught Exception', 'Unhandled Promise Rejection']);

const levelOfLabel = (label: string): LambdaLogLevel => {
  const normalized = label.trim().toUpperCase();
  if (NODE_ERROR_RECORDS.has(label.trim())) return 'error';
  // .NET writes `fail` and `crit`; Python `CRITICAL`; Node `FATAL` with advanced logging controls.
  if (['ERROR', 'FATAL', 'CRITICAL', 'CRIT', 'FAIL'].includes(normalized)) return 'error';
  if (['WARN', 'WARNING'].includes(normalized)) return 'warn';
  return 'info';
};

const UNHANDLED_EXCEPTION_WARNING = 'LAMBDA_WARNING: Unhandled exception';
/** A JVM exception: `<message>: java.lang.IllegalStateException` or `java.lang.IllegalStateException: <message>`. */
const JVM_EXCEPTION =
  /(^|\n)(Exception in thread "|(?:[\w$]+\.)+[\w$]*(?:Exception|Error)(?::|\n|$))|: (?:[\w$]+\.)+[\w$]*(?:Exception|Error)(\n|$)/;

/** The level of a line written without a level label: a `print`, `System.out` or a runtime's own error output. */
export const getPlainLambdaLogLineLevel = (message: string): LambdaLogLevel => {
  const text = message.trimStart();
  if (
    /^\[(ERROR|CRITICAL|FATAL)\]/.test(text) ||
    text.startsWith(UNHANDLED_EXCEPTION_WARNING) ||
    text.includes('Traceback (most recent call last)') ||
    /Task timed out after \d/.test(text) ||
    // The .NET runtime's start-up failures, for example a missing `.deps.json`.
    /^Error: /.test(text) ||
    (JVM_EXCEPTION.test(text) && /\n\s*at /.test(text))
  ) {
    return 'error';
  }
  if (/^\[(WARNING|WARN)\]/.test(text)) return 'warn';
  return 'info';
};

const readTabFields = (line: string) => {
  const fields: Record<string, string> = {};
  for (const part of line.split('\t')) {
    const separator = part.indexOf(':');
    if (separator > 0) fields[part.slice(0, separator).trim()] = part.slice(separator + 1).trim();
  }
  return fields;
};

const statusLevel = (status: string | undefined): LambdaLogLevel =>
  status === 'error' || status === 'timeout' || status === 'failure' ? 'error' : 'info';

/** The JSON log format (advanced logging controls): platform records and application records. */
const parseJsonLine = (message: string): ParsedLambdaLogLine | undefined => {
  if (!message.startsWith('{')) return undefined;
  let record: Record<string, any>;
  try {
    record = JSON.parse(message);
  } catch {
    return undefined;
  }
  if (!record || typeof record !== 'object') return undefined;
  if (typeof record.type === 'string' && record.type.startsWith('platform.')) {
    const details = (record.record ?? {}) as Record<string, any>;
    const metrics = (details.metrics ?? {}) as Record<string, any>;
    const status = details.status === 'success' ? undefined : details.status;
    if (record.type === 'platform.start' && details.requestId) return { kind: 'start', requestId: details.requestId };
    if (record.type === 'platform.report' && details.requestId) {
      return {
        kind: 'report',
        requestId: details.requestId,
        duration: metrics.durationMs !== undefined ? `${metrics.durationMs} ms` : undefined,
        memoryUsed: metrics.maxMemoryUsedMB !== undefined ? `${metrics.maxMemoryUsedMB} MB` : undefined,
        initDuration: metrics.initDurationMs !== undefined ? `${metrics.initDurationMs} ms` : undefined,
        status,
        errorType: details.errorType,
        level: statusLevel(status)
      };
    }
    if (record.type === 'platform.initReport') {
      return {
        kind: 'init-report',
        initDuration: metrics.durationMs !== undefined ? `${metrics.durationMs} ms` : undefined,
        status,
        errorType: details.errorType,
        level: statusLevel(status)
      };
    }
    return { kind: 'skip' };
  }
  const label = record.level ?? record.log_level;
  if (typeof label !== 'string') return undefined;
  const body = record.message ?? record.errorMessage ?? message;
  const content =
    typeof body === 'string'
      ? [body, ...(Array.isArray(record.stackTrace) ? record.stackTrace : [])].join('\n')
      : JSON.stringify(body);
  return {
    kind: 'entry',
    level: levelOfLabel(label),
    requestId: typeof record.requestId === 'string' ? record.requestId : undefined,
    logType: label,
    content
  };
};

/**
 * Reads one CloudWatch event of a Lambda function: the runtime's START, END, REPORT and INIT_REPORT lines, Node's and
 * .NET's `time\trequest\tlevel\tmessage` lines, Python's logging format and unhandled errors, JVM exceptions and the JSON
 * log format. A line without a recognizable level is `info`.
 */
export const parseLambdaLogLine = (rawMessage: string): ParsedLambdaLogLine => {
  const message = rawMessage.trim();
  if (message.startsWith('INIT_START') || message.startsWith('EXTENSION') || message.startsWith('TELEMETRY')) {
    return { kind: 'skip' };
  }
  if (message.startsWith('START RequestId:')) {
    return { kind: 'start', requestId: /^START RequestId:\s*(\S+)/.exec(message)![1] };
  }
  if (message.startsWith('END RequestId:')) {
    return { kind: 'end', requestId: /^END RequestId:\s*(\S+)/.exec(message)![1] };
  }
  if (message.startsWith('REPORT RequestId:')) {
    const fields = readTabFields(message.replace(/^REPORT /, ''));
    const status = fields.Status;
    return {
      kind: 'report',
      requestId: fields.RequestId,
      duration: fields.Duration,
      memoryUsed: fields['Max Memory Used'],
      initDuration: fields['Init Duration'],
      status,
      errorType: fields['Error Type'],
      level: statusLevel(status)
    };
  }
  if (message.startsWith('INIT_REPORT')) {
    const fields = readTabFields(message.replace(/^INIT_REPORT /, ''));
    return {
      kind: 'init-report',
      initDuration: fields['Init Duration'],
      status: fields.Status,
      errorType: fields['Error Type'],
      level: statusLevel(fields.Status)
    };
  }
  const json = parseJsonLine(message);
  if (json) return json;

  const python = PYTHON_LOGGING_FORMAT.exec(message);
  if (python) {
    const [, label, , requestId, content] = python;
    return {
      kind: 'entry',
      // The runtime logs an unhandled error at WARNING before it writes the error itself.
      level: content.startsWith(UNHANDLED_EXCEPTION_WARNING) ? 'error' : levelOfLabel(label),
      requestId: requestId || undefined,
      logType: `[${label}]`,
      content
    };
  }
  const tabbed = TAB_FORMAT.exec(message);
  if (tabbed) {
    const [, , requestId, label, text] = tabbed;
    // Node writes its error records as `ERROR\tInvoke Error \t{...}`.
    const record = /^(Invoke Error|Uncaught Exception|Unhandled Promise Rejection) ?\t([\s\S]*)$/.exec(text);
    const logType = record ? record[1] : label.trim();
    return {
      kind: 'entry',
      level: levelOfLabel(logType === label.trim() ? label : 'ERROR'),
      requestId: requestId && requestId !== 'undefined' ? requestId : undefined,
      logType,
      content: record ? record[2] : text,
      ...(NODE_ERROR_RECORDS.has(logType) ? { nodeErrorRecord: true } : {})
    };
  }
  return { kind: 'entry', level: getPlainLambdaLogLineLevel(message), content: message };
};
