import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { CloudWatchLogsClient, FilterLogEventsCommand, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { AwsIdentityProtectedClient } from '@shared/trpc/aws-identity-protected';

const cwLogsClient = new CloudWatchLogsClient({});

type CloudWatchLogsEvent = {
  awslogs: {
    data: string;
  };
};

type CloudWatchLogsDecodedData = {
  messageType: string;
  owner: string;
  logGroup: string;
  logStream: string;
  subscriptionFilters: string[];
  logEvents: CloudWatchLogEvent[];
};

type CloudWatchLogEvent = {
  id: string;
  timestamp: number;
  message: string;
};

type ParsedStackFrame = {
  function: string;
  file: string;
  line: number;
  column: number;
};

type ParsedError = {
  errorType: string;
  errorMessage: string;
  stackTrace: ParsedStackFrame[];
  fingerprint: string;
  requestId?: string;
  rawLog: string;
  sourceLogEventId?: string;
  sourceTimestamp?: number;
  sourceMessage?: string;
};

type LambdaRuntimeError = {
  errorType: string;
  errorMessage: string;
  stack?: string[];
  /** Go panic format: array of {path, line, label} objects */
  stackTrace?: Array<{ path: string; line: number; label: string }>;
};

/** Extracts RequestId from Lambda log prefix */
const REQUEST_ID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const MAX_RAW_LOG_LENGTH = 4000;
const DEFAULT_MAX_ERRORS_PER_INVOCATION = 20;
const DEFAULT_MAX_CONTEXT_FETCHES_PER_INVOCATION = 5;
const DEFAULT_MAX_LOG_AGE_MS = 10 * 60 * 1000;

const readIntegerEnv = ({
  name,
  defaultValue,
  min,
  max
}: {
  name: string;
  defaultValue: number;
  min: number;
  max: number;
}) => {
  const parsed = Number.parseInt(process.env[name] || '', 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.min(max, Math.max(min, parsed));
};

const issueEventSampleRatePercent = readIntegerEnv({
  name: 'ISSUE_EVENT_SAMPLE_RATE_PERCENT',
  defaultValue: 100,
  min: 1,
  max: 100
});
const issueOccurrenceWeight = Math.max(1, Math.round(100 / issueEventSampleRatePercent));
const maxErrorsPerInvocation = readIntegerEnv({
  name: 'ISSUE_MAX_ERRORS_PER_INVOCATION',
  defaultValue: DEFAULT_MAX_ERRORS_PER_INVOCATION,
  min: 1,
  max: 100
});
const maxContextFetchesPerInvocation = readIntegerEnv({
  name: 'ISSUE_MAX_CONTEXT_FETCHES_PER_INVOCATION',
  defaultValue: DEFAULT_MAX_CONTEXT_FETCHES_PER_INVOCATION,
  min: 0,
  max: 50
});
const maxLogAgeMs = readIntegerEnv({
  name: 'ISSUE_MAX_LOG_AGE_MS',
  defaultValue: DEFAULT_MAX_LOG_AGE_MS,
  min: 60_000,
  max: 60 * 60 * 1000
});

const truncateRawLog = (rawLog: string) =>
  rawLog.length > MAX_RAW_LOG_LENGTH ? `${rawLog.slice(0, MAX_RAW_LOG_LENGTH)}...` : rawLog;

const shouldProcessSampledError = (error: ParsedError) => {
  if (issueEventSampleRatePercent >= 100) return true;
  const sampleKey = `${error.fingerprint}:${error.sourceLogEventId || error.sourceTimestamp || error.rawLog}`;
  const bucket = createHash('sha256').update(sampleKey).digest().readUInt8(0) % 100;
  return bucket < issueEventSampleRatePercent;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Stack trace parsers per language ────────────────────────────────────────

/** JS/TS: `    at functionName (file:line:col)` or `    at file:line:col` */
const JS_FRAME_REGEX = /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/;

/** Python: `  File "path", line N, in function` */
const PY_FRAME_REGEX = /^\s+File\s+"(.+?)",\s+line\s+(\d+),\s+in\s+(.+)$/;

/** Go: `\t/path/file.go:line +0x...` preceded by `package.function(args)` */
const GO_FRAME_REGEX = /^\s*(.+?\.go):(\d+)/;
const GO_FUNC_REGEX = /^(.+)\(.*\)$/;

/** Java/Kotlin: `    at package.Class.method(File.java:line)` */
const JAVA_FRAME_REGEX = /^\s*at\s+(.+?)\((.+?):(\d+)\)$/;

/** .NET (C#/F#): `   at Namespace.Class.Method(params) in /path/File.cs:line N` */
const DOTNET_FRAME_REGEX = /^\s*at\s+(.+?)\s+in\s+(.+?):line\s+(\d+)$/;
/** .NET fallback without file info: `   at Namespace.Class.Method(params)` */
const DOTNET_FRAME_NO_FILE_REGEX = /^\s*at\s+(.+?\(.*?\))$/;

/** Ruby: `/path/file.rb:line:in 'method'` */
const RUBY_FRAME_REGEX = /^\s*(?:from\s+)?(.+?\.rb):(\d+):in\s+[`'"](.+?)[`'"]$/;

/** PHP: `#N /path/file.php(line): Class->method(args)` */
const PHP_FRAME_REGEX = /^\s*#\d+\s+(.+?\.php)\((\d+)\):\s+(.+)$/;
/** PHP: `in /path/file.php:line` or `thrown in /path/file.php on line N` */
const PHP_INLINE_REGEX = /(?:in|thrown in)\s+(.+?\.php)(?::|\s+on\s+line\s+)(\d+)/;

const parseJsStackTrace = (lines: string[]): ParsedStackFrame[] => {
  const frames: ParsedStackFrame[] = [];
  for (const line of lines) {
    const match = JS_FRAME_REGEX.exec(line);
    if (match) {
      frames.push({ function: match[1] || '<anonymous>', file: match[2], line: +match[3], column: +match[4] });
    }
  }
  return frames;
};

const parsePythonStackTrace = (lines: string[]): ParsedStackFrame[] => {
  const frames: ParsedStackFrame[] = [];
  for (const line of lines) {
    const match = PY_FRAME_REGEX.exec(line);
    if (match) {
      frames.push({ function: match[3], file: match[1], line: +match[2], column: 0 });
    }
  }
  // Python traces are oldest-first; reverse so most-relevant frame is first
  return frames.reverse();
};

const parseGoStackTrace = (lines: string[]): ParsedStackFrame[] => {
  const frames: ParsedStackFrame[] = [];
  for (let i = 0; i < lines.length; i++) {
    const fileMatch = GO_FRAME_REGEX.exec(lines[i]);
    if (fileMatch) {
      // The line above the file path is typically the function name
      const funcLine = i > 0 ? lines[i - 1].trim() : '';
      const funcMatch = GO_FUNC_REGEX.exec(funcLine);
      const createdByMatch = /^created by (.+?) in goroutine \d+$/.exec(funcLine);
      frames.push({
        function: funcMatch ? funcMatch[1] : createdByMatch ? createdByMatch[1] : '<unknown>',
        file: fileMatch[1],
        line: +fileMatch[2],
        column: 0
      });
    }
  }
  return frames;
};

const parseJavaStackTrace = (lines: string[]): ParsedStackFrame[] => {
  const frames: ParsedStackFrame[] = [];
  for (const line of lines) {
    const match = JAVA_FRAME_REGEX.exec(line);
    if (match) {
      frames.push({ function: match[1], file: match[2], line: +match[3], column: 0 });
    }
  }
  return frames;
};

const parseDotnetStackTrace = (lines: string[]): ParsedStackFrame[] => {
  const frames: ParsedStackFrame[] = [];
  for (const line of lines) {
    const match = DOTNET_FRAME_REGEX.exec(line);
    if (match) {
      frames.push({ function: match[1], file: match[2], line: +match[3], column: 0 });
    } else {
      const noFileMatch = DOTNET_FRAME_NO_FILE_REGEX.exec(line);
      if (noFileMatch) {
        frames.push({ function: noFileMatch[1], file: '<unknown>', line: 0, column: 0 });
      }
    }
  }
  return frames;
};

const parseRubyStackTrace = (lines: string[]): ParsedStackFrame[] => {
  const frames: ParsedStackFrame[] = [];
  for (const line of lines) {
    const match = RUBY_FRAME_REGEX.exec(line);
    if (match) {
      frames.push({ function: match[3], file: match[1], line: +match[2], column: 0 });
    }
  }
  return frames;
};

const parsePhpStackTrace = (lines: string[]): ParsedStackFrame[] => {
  const frames: ParsedStackFrame[] = [];
  for (const line of lines) {
    const match = PHP_FRAME_REGEX.exec(line);
    if (match) {
      frames.push({ function: match[3], file: match[1], line: +match[2], column: 0 });
      continue;
    }
    const inlineMatch = PHP_INLINE_REGEX.exec(line);
    if (inlineMatch) {
      frames.push({ function: '<main>', file: inlineMatch[1], line: +inlineMatch[2], column: 0 });
    }
  }
  return frames;
};

// ─── Multi-language stack trace parser ───────────────────────────────────────

const dedupeStackFrames = (frames: ParsedStackFrame[]): ParsedStackFrame[] => {
  const seen = new Set<string>();
  return frames.filter((frame) => {
    const key = `${frame.function}\0${frame.file}\0${frame.line}\0${frame.column}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const parseStackTraceMultiLang = (lines: string[]): ParsedStackFrame[] => {
  // Try each language parser; return the first one that finds frames
  const parsers = [
    parseJsStackTrace,
    parsePythonStackTrace,
    parseJavaStackTrace,
    parseDotnetStackTrace,
    parseGoStackTrace,
    parseRubyStackTrace,
    parsePhpStackTrace
  ];
  for (const parser of parsers) {
    const frames = parser(lines);
    if (frames.length > 0) return dedupeStackFrames(frames);
  }
  return [];
};

const hasStackFrame = (line: string): boolean => parseStackTraceMultiLang([line]).length > 0;

// ─── Error message extraction ────────────────────────────────────────────────

const ERROR_MESSAGE_PATTERNS = [
  // JS/TS: `TypeError: Cannot read properties of undefined`
  /\b(?:Error|TypeError|RangeError|ReferenceError|SyntaxError|URIError|EvalError):\s+.+/,
  // Python: `ValueError: invalid literal` or `TypeError: ...` (last line of traceback)
  /(?:Exception|Error|Warning|KeyError|ValueError|TypeError|AttributeError|ImportError|ModuleNotFoundError|FileNotFoundError|IndexError|RuntimeError|StopIteration|OSError|IOError|PermissionError|ZeroDivisionError|OverflowError|RecursionError|NameError|UnboundLocalError|NotImplementedError|AssertionError):\s*.+/,
  // Java: `java.lang.NullPointerException: ...` or `com.example.CustomException: ...`
  /(?:java\.\w+\.\w+Exception|javax?\.\w+\.\w+Exception|[\w.]+Exception|[\w.]+Error):\s*.+/,
  // .NET: `System.NullReferenceException: ...`
  /(?:Unhandled exception\.\s*)?(?:System\.[\w.]+Exception|Microsoft\.[\w.]+Exception|[\w.]+Exception):\s*.+/,
  // Go: `panic: runtime error: ...` or `panic: ...` or `http: panic serving ...: message`
  /panic:\s*.+/,
  /panic serving\s+\S+:\s*(.+)/,
  // Ruby: `NoMethodError`, `NameError`, etc.
  /(?:NoMethodError|NameError|ArgumentError|RuntimeError|StandardError|LoadError|SyntaxError|SystemCallError|Errno::\w+|ZeroDivisionError|RegexpError|RangeError|IOError|EOFError|TypeError|FloatDomainError|FrozenError):\s*.+/,
  // PHP: `Fatal error:` or `Uncaught ...`
  /(?:PHP\s+)?(?:Fatal error|Uncaught\s+[\w\\]+(?:Exception|Error)):\s*.+/,
  // Lambda runtime
  /Runtime\.\w+:\s*.+/
];

const extractErrorMessage = (message: string): string | undefined => {
  for (const pattern of ERROR_MESSAGE_PATTERNS) {
    const match = pattern.exec(message);
    if (match) {
      const msg = match[0].trim();
      return msg.length > 300 ? `${msg.slice(0, 300)}...` : msg;
    }
  }
  return undefined;
};

const hasJsonError = (message: string): boolean => !!extractJsonError(message);

const isCausedByLine = (line: string): boolean => /^\s*Caused by:\s+/.test(line);

const isGoFunctionLine = (line: string): boolean => {
  const trimmed = line.trim();
  return (
    !isErrorHeaderLine(line) &&
    !hasStackFrame(line) &&
    !trimmed.startsWith('created by ') &&
    /^[\w./*[\]{}?(),\s-]+\(.*\)$/.test(trimmed)
  );
};

const isTracePreambleLine = (line: string): boolean => {
  const trimmed = line.trim();
  return (
    trimmed.startsWith('Traceback (most recent call last):') ||
    trimmed.startsWith('Stack trace:') ||
    /^goroutine \d+ /.test(trimmed) ||
    trimmed.startsWith('Exception in thread ') ||
    trimmed.startsWith('Unhandled exception.')
  );
};

const isBackwardTracePreambleLine = (line: string): boolean =>
  line.trim().startsWith('Traceback (most recent call last):');

const isErrorHeaderLine = (line: string): boolean => hasJsonError(line) || !!extractErrorMessage(line);

const isStackContinuationLine = (line: string): boolean => {
  const trimmed = line.trim();
  return (
    trimmed === '' ||
    hasStackFrame(line) ||
    isTracePreambleLine(line) ||
    isCausedByLine(line) ||
    /^\.\.\. \d+ more$/.test(trimmed) ||
    /^goroutine \d+ \[/.test(trimmed) ||
    trimmed.startsWith('created by ') ||
    trimmed.startsWith('panic: ') ||
    isGoFunctionLine(line) ||
    /^#\d+\s+/.test(trimmed) ||
    /^\s*from\s+/.test(line)
  );
};

const isLikelyIncompleteStackContext = (lines: string[], stackTrace: ParsedStackFrame[]): boolean => {
  if (stackTrace.length === 0) return true;

  const nonEmptyLines = lines.map((line) => line.trim()).filter(Boolean);
  const lastLine = nonEmptyLines[nonEmptyLines.length - 1] || '';
  const rawLog = lines.join('\n');

  return (
    lastLine.endsWith('Stack trace:') ||
    /^goroutine \d+ \[.*\]:$/.test(lastLine) ||
    isGoFunctionLine(lastLine) ||
    (stackTrace.some((frame) => frame.function === '<unknown>') &&
      /\b(?:panic serving|goroutine \d+ \[)/.test(rawLog)) ||
    (stackTrace.length < 2 && /\b(?:Stack trace:|panic serving|goroutine \d+ \[)/.test(rawLog))
  );
};

const shouldFetchLogContext = (error: ParsedError): boolean =>
  error.stackTrace.length === 0 || isLikelyIncompleteStackContext(error.rawLog.split('\n'), error.stackTrace);

const messagesReferToSameError = (line: string, errorMessage: string): boolean => {
  const lineError = extractErrorMessage(line);
  return (
    !!lineError && (lineError === errorMessage || lineError.includes(errorMessage) || errorMessage.includes(lineError))
  );
};

const findErrorLineIndex = (lines: string[], errorMessage: string, fallbackIndex: number): number => {
  const exactIndex = lines.findIndex((line) => line === errorMessage || line.includes(errorMessage));
  if (exactIndex !== -1) return exactIndex;

  const matchingHeaderIndex = lines.findIndex((line) => messagesReferToSameError(line, errorMessage));
  if (matchingHeaderIndex !== -1) return matchingHeaderIndex;

  return fallbackIndex;
};

const extractRelevantContextLines = (lines: string[], errorMessage: string, fallbackIndex: number): string[] => {
  if (lines.length === 0) return [];

  const index = Math.min(Math.max(findErrorLineIndex(lines, errorMessage, fallbackIndex), 0), lines.length - 1);
  let start = index;
  let end = index;

  for (let i = index - 1; i >= 0; i--) {
    const previous = lines[i];
    if (isErrorHeaderLine(previous) && !messagesReferToSameError(previous, errorMessage)) break;
    if (isBackwardTracePreambleLine(previous)) {
      start = i;
      break;
    }
    if (previous.trim() === '') break;
  }

  for (let i = index + 1; i < lines.length; i++) {
    const next = lines[i];
    if (isErrorHeaderLine(next) && !isCausedByLine(next) && !messagesReferToSameError(next, errorMessage)) break;
    if (!isStackContinuationLine(next) && !messagesReferToSameError(next, errorMessage)) break;
    end = i;
  }

  return lines.slice(start, end + 1);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const decodeCloudWatchLogsData = (data: string): CloudWatchLogsDecodedData => {
  const compressedPayload = Buffer.from(data, 'base64');
  const jsonPayload = gunzipSync(compressedPayload).toString('utf-8');
  return JSON.parse(jsonPayload);
};

const extractJsonError = (message: string): LambdaRuntimeError | null => {
  // Find the first `{` that starts a JSON object containing errorMessage
  const startIdx = message.indexOf('{');
  if (startIdx === -1) return null;

  // Try parsing from the first `{` to the last `}` — handles multi-line JSON (Ruby, Go)
  const lastIdx = message.lastIndexOf('}');
  if (lastIdx <= startIdx) return null;

  try {
    const parsed = JSON.parse(message.slice(startIdx, lastIdx + 1));
    if (parsed.errorMessage && parsed.errorType) return parsed;
    return null;
  } catch {
    return null;
  }
};

const classifyErrorType = (message: string): string => {
  if (/Unhandled Promise Rejection|unhandledRejection/.test(message)) return 'unhandled_rejection';
  if (/Runtime\.ExitError/.test(message)) return 'exit_error';
  if (/Runtime\.HandlerNotFound/.test(message)) return 'handler_not_found';
  if (/Invoke Error|uncaughtException/.test(message)) return 'uncaught';
  if (/\bpanic\b/.test(message)) return 'panic';
  if (/Fatal error|Uncaught/.test(message)) return 'uncaught';
  if (/Traceback \(most recent call last\)/.test(message)) return 'uncaught';
  return 'caught';
};

const extractRequestId = (message: string): string | undefined => {
  return REQUEST_ID_REGEX.exec(message)?.[0];
};

const generateFingerprint = (errorMessage: string, resourceName?: string): string => {
  const normalizedMessage = errorMessage
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/\b\d{4,}\b/g, '<num>')
    .replace(/https?:\/\/[^\s)]+/g, '<url>')
    .replace(/0x[0-9a-f]+/gi, '<addr>')
    .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/g, '<ip>');

  const normalizedResource = resourceName || '<unknown-resource>';
  const fingerprintSource = `${normalizedResource}||${normalizedMessage}`;
  return createHash('sha256').update(fingerprintSource).digest('hex').slice(0, 16);
};

// ─── Main parser ─────────────────────────────────────────────────────────────

const parseLogMessageForError = (
  message: string,
  source?: Pick<CloudWatchLogEvent, 'id' | 'timestamp' | 'message'>
): ParsedError | null => {
  // Strategy 1: Lambda runtime structured JSON error (works for all Lambda-supported languages)
  const jsonError = extractJsonError(message);
  if (jsonError) {
    let stackTrace: ParsedStackFrame[] = [];

    if (jsonError.stackTrace && Array.isArray(jsonError.stackTrace)) {
      if (typeof jsonError.stackTrace[0] === 'string') {
        // Ruby format: stackTrace is an array of strings like "/path/file.rb:2:in `method'"
        stackTrace = parseStackTraceMultiLang(jsonError.stackTrace as unknown as string[]);
      } else {
        // Go panic format: [{path, line, label}]
        stackTrace = jsonError.stackTrace.map((f) => ({
          function: f.label || '<unknown>',
          file: f.path || '<unknown>',
          line: f.line || 0,
          column: 0
        }));
      }
    } else if (jsonError.stack && Array.isArray(jsonError.stack)) {
      // JS/TS, Python: stack is an array of strings — parse with multi-lang parser
      stackTrace = parseStackTraceMultiLang(jsonError.stack);
    }

    const errorMessage = `${jsonError.errorType}: ${jsonError.errorMessage}`;
    return {
      errorType: classifyErrorType(message),
      errorMessage,
      stackTrace,
      fingerprint: generateFingerprint(errorMessage),
      requestId: extractRequestId(message),
      rawLog: truncateRawLog(message),
      sourceLogEventId: source?.id,
      sourceTimestamp: source?.timestamp,
      sourceMessage: source?.message
    };
  }

  // Strategy 2: Plain text error (containers, or languages that write to stderr)
  const lines = message.split('\n');
  const stackTrace = parseStackTraceMultiLang(lines);
  const errorMessage = extractErrorMessage(message);

  if (!errorMessage) return null;

  return {
    errorType: classifyErrorType(message),
    errorMessage,
    stackTrace,
    fingerprint: generateFingerprint(errorMessage),
    requestId: extractRequestId(message),
    rawLog: truncateRawLog(message),
    sourceLogEventId: source?.id,
    sourceTimestamp: source?.timestamp,
    sourceMessage: source?.message
  };
};

const parseLogEventForErrors = (
  logEvent: CloudWatchLogEvent,
  logEvents: CloudWatchLogEvent[] = [logEvent],
  logEventIndex = 0
): ParsedError | null => {
  const parsed = parseLogMessageForError(logEvent.message, logEvent);
  if (!parsed) return null;

  const contextLines = extractRelevantContextLines(
    logEvents.map((event) => event.message),
    parsed.errorMessage,
    logEventIndex
  );
  if (contextLines.length <= 1) return parsed;

  const rawLog = contextLines.join('\n');
  const stackTrace = parseStackTraceMultiLang(contextLines);
  return {
    ...parsed,
    stackTrace,
    fingerprint: generateFingerprint(parsed.errorMessage),
    rawLog: truncateRawLog(rawLog)
  };
};

// ─── Reporting ───────────────────────────────────────────────────────────────

const extractResourceNameFromLogGroup = (logGroup: string): string => {
  const project = process.env.PROJECT_NAME;
  const stage = process.env.STAGE;
  const stackPrefix = project && stage ? `${project}-${stage}-` : '';
  // Lambda: /aws/lambda/<project>-<stage>-<resourceName> → extract resourceName
  const lambdaMatch = /\/aws\/lambda\/(.+)/.exec(logGroup);
  if (lambdaMatch) {
    const awsName = lambdaMatch[1];
    return stackPrefix && awsName.startsWith(stackPrefix) ? awsName.slice(stackPrefix.length) : awsName;
  }
  // Container: /stp/<stack>/ecs/<resourceName>/... → extract resourceName
  const containerMatch = /\/stp\/[^/]+\/ecs\/([^/]+)\//.exec(logGroup);
  if (containerMatch) return containerMatch[1];
  const parts = logGroup.split('/');
  return parts[parts.length - 1] || logGroup;
};

const reportToConsoleApi = async (errors: ParsedError[], logGroup: string) => {
  const apiUrl = process.env.STACKTAPE_TRPC_API_ENDPOINT;
  const region = process.env.AWS_REGION;
  const project = process.env.PROJECT_NAME;
  const stage = process.env.STAGE;

  if (!apiUrl || !region || !project || !stage) return;

  try {
    const client = new AwsIdentityProtectedClient();
    await client.init({ credentials: await defaultProvider()(), region, apiUrl });
    const functionName = extractResourceNameFromLogGroup(logGroup);

    for (const error of errors) {
      try {
        await client.reportIssueEvent.mutate({
          fingerprint: generateFingerprint(error.errorMessage, functionName),
          errorMessage: error.errorMessage,
          errorType: error.errorType,
          stackTrace: error.stackTrace,
          functionName,
          logGroup,
          requestId: error.requestId,
          project,
          stage,
          region,
          rawLog: error.rawLog,
          occurrenceWeight: issueOccurrenceWeight
        });
      } catch (err) {
        console.info(`Failed to report issue event: ${err}`);
      }
    }
  } catch (err) {
    console.info(`Failed to init console API client for issue reporting: ${err}`);
  }
};

// ─── Context fetching for container logs ─────────────────────────────────────

/**
 * Fetch surrounding log lines from CloudWatch to reconstruct multi-line stack traces.
 * Container runtimes write each line as a separate log event, so the subscription filter
 * only captures the error message line. This function fetches the lines around it.
 */
const fetchSurroundingLogContext = async (
  logGroup: string,
  logStream: string,
  timestamp: number
): Promise<string[]> => {
  const startTime = timestamp - 10000;
  const endTime = timestamp + 15000;
  try {
    const getResponse = await cwLogsClient.send(
      new GetLogEventsCommand({
        logGroupName: logGroup,
        logStreamName: logStream,
        startTime,
        endTime,
        startFromHead: true,
        limit: 100
      })
    );
    const getMessages = (getResponse.events || []).map((e) => e.message?.trimEnd() || '');
    if (getMessages.length > 0) return getMessages;

    const filterResponse = await cwLogsClient.send(
      new FilterLogEventsCommand({
        logGroupName: logGroup,
        logStreamNames: logStream ? [logStream] : undefined,
        startTime,
        endTime,
        limit: 100
      })
    );
    const filterEvents = (filterResponse.events || []).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return filterEvents.map((e) => e.message?.trimEnd() || '');
  } catch (err) {
    console.info(`Failed to fetch issue log context from CloudWatch: ${err}`);
    return [];
  }
};

/**
 * For errors without stack frames, try fetching surrounding log context and re-parsing.
 * This handles container logs where the stack trace is split across multiple log events.
 */
const enrichWithLogContext = async (
  error: ParsedError,
  logGroup: string,
  logStream: string,
  timestamp: number
): Promise<ParsedError> => {
  if (!shouldFetchLogContext(error)) return error;

  let bestEnrichedError: ParsedError | null = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) await sleep(250 * 2 ** (attempt - 1));

    const contextLines = await fetchSurroundingLogContext(logGroup, logStream, timestamp);
    if (contextLines.length === 0) continue;

    const relevantContextLines = extractRelevantContextLines(contextLines, error.errorMessage, 0);
    const stackTrace = parseStackTraceMultiLang(relevantContextLines);
    if (stackTrace.length === 0) continue;

    const rawLog = relevantContextLines.join('\n');
    const enrichedError = {
      ...error,
      stackTrace,
      fingerprint: generateFingerprint(error.errorMessage),
      rawLog: truncateRawLog(rawLog)
    };

    if (
      !bestEnrichedError ||
      stackTrace.length > bestEnrichedError.stackTrace.length ||
      rawLog.length > bestEnrichedError.rawLog.length
    ) {
      bestEnrichedError = enrichedError;
    }

    if (attempt > 0 && !isLikelyIncompleteStackContext(relevantContextLines, stackTrace)) {
      return enrichedError;
    }
  }

  if (bestEnrichedError) return bestEnrichedError;

  console.info(`No stack trace context found for issue: ${error.errorMessage}`);
  return error;
};

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async (event: CloudWatchLogsEvent) => {
  const decodedData = decodeCloudWatchLogsData(event.awslogs.data);

  if (decodedData.messageType === 'CONTROL_MESSAGE') return;

  const errors: ParsedError[] = [];
  const now = Date.now();
  for (let i = 0; i < decodedData.logEvents.length; i++) {
    const logEvent = decodedData.logEvents[i];
    if (logEvent.timestamp && now - logEvent.timestamp > maxLogAgeMs) {
      continue;
    }
    const parsed = parseLogEventForErrors(logEvent, decodedData.logEvents, i);
    if (parsed && shouldProcessSampledError(parsed)) errors.push(parsed);
    if (errors.length >= maxErrorsPerInvocation) break;
  }

  // For errors without stack frames, fetch surrounding context from CloudWatch
  const enrichedErrors: ParsedError[] = [];
  let contextFetches = 0;
  for (const error of errors) {
    const matchingLogEvent =
      decodedData.logEvents.find((e) => e.id === error.sourceLogEventId) ||
      decodedData.logEvents.find(
        (e) =>
          e.message === error.sourceMessage ||
          error.rawLog.startsWith(e.message.slice(0, 50)) ||
          e.message.includes(error.errorMessage.slice(0, 50))
      );
    if (matchingLogEvent && shouldFetchLogContext(error) && contextFetches < maxContextFetchesPerInvocation) {
      contextFetches += 1;
      const enriched = await enrichWithLogContext(
        error,
        decodedData.logGroup,
        decodedData.logStream,
        matchingLogEvent.timestamp
      );
      enrichedErrors.push(enriched);
    } else {
      enrichedErrors.push(error);
    }
  }

  if (enrichedErrors.length > 0) {
    await reportToConsoleApi(enrichedErrors, decodedData.logGroup);
  }
};

export const __issueProcessorTestUtils = {
  extractErrorMessage,
  extractRelevantContextLines,
  parseLogEventForErrors,
  parseLogMessageForError,
  parseStackTraceMultiLang,
  shouldFetchLogContext
};
