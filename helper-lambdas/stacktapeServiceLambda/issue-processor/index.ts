import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { CloudWatchLogsClient, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
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

// ─── Stack trace parsers per language ────────────────────────────────────────

/** JS/TS: `    at functionName (file:line:col)` or `    at file:line:col` */
const JS_FRAME_REGEX = /^\s+at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/;

/** Python: `  File "path", line N, in function` */
const PY_FRAME_REGEX = /^\s+File\s+"(.+?)",\s+line\s+(\d+),\s+in\s+(.+)$/;

/** Go: `\t/path/file.go:line +0x...` preceded by `package.function(args)` */
const GO_FRAME_REGEX = /^\t(.+?\.go):(\d+)/;
const GO_FUNC_REGEX = /^(.+?)\(.*\)$/;

/** Java/Kotlin: `    at package.Class.method(File.java:line)` */
const JAVA_FRAME_REGEX = /^\s+at\s+(.+?)\((.+?):(\d+)\)$/;

/** .NET (C#/F#): `   at Namespace.Class.Method(params) in /path/File.cs:line N` */
const DOTNET_FRAME_REGEX = /^\s+at\s+(.+?)\s+in\s+(.+?):line\s+(\d+)$/;
/** .NET fallback without file info: `   at Namespace.Class.Method(params)` */
const DOTNET_FRAME_NO_FILE_REGEX = /^\s+at\s+(.+?\(.*?\))$/;

/** Ruby: `/path/file.rb:line:in 'method'` */
const RUBY_FRAME_REGEX = /^\s*(.+?\.rb):(\d+):in\s+[`'](.+?)'$/;

/** PHP: `#N /path/file.php(line): Class->method(args)` */
const PHP_FRAME_REGEX = /^#\d+\s+(.+?\.php)\((\d+)\):\s+(.+)$/;
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
      frames.push({
        function: funcMatch ? funcMatch[1] : '<unknown>',
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
    if (frames.length > 0) return frames;
  }
  return [];
};

// ─── Error message extraction ────────────────────────────────────────────────

const ERROR_MESSAGE_PATTERNS = [
  // JS/TS: `TypeError: Cannot read properties of undefined`
  /(?:Error|TypeError|RangeError|ReferenceError|SyntaxError|URIError|EvalError):\s+.+/,
  // Python: `ValueError: invalid literal` or `TypeError: ...` (last line of traceback)
  /(?:Exception|Error|Warning|KeyError|ValueError|TypeError|AttributeError|ImportError|ModuleNotFoundError|FileNotFoundError|IndexError|RuntimeError|StopIteration|OSError|IOError|PermissionError|ZeroDivisionError|OverflowError|RecursionError|NameError|UnboundLocalError|NotImplementedError|AssertionError):\s*.+/,
  // Java: `java.lang.NullPointerException: ...` or `com.example.CustomException: ...`
  /(?:java\.\w+\.\w+Exception|javax?\.\w+\.\w+Exception|[\w.]+Exception|[\w.]+Error):\s*.+/,
  // .NET: `System.NullReferenceException: ...`
  /(?:System\.[\w.]+Exception|Microsoft\.[\w.]+Exception|[\w.]+Exception):\s*.+/,
  // Go: `panic: runtime error: ...` or `panic: ...` or `http: panic serving ...: message`
  /panic:\s*.+/,
  /panic serving\s+\S+:\s*(.+)/,
  // Ruby: `NoMethodError`, `NameError`, etc.
  /(?:NoMethodError|NameError|ArgumentError|RuntimeError|StandardError|LoadError|SyntaxError|SystemCallError|Errno::\w+|ZeroDivisionError|RegexpError|RangeError|IOError|EOFError|TypeError|FloatDomainError|FrozenError):\s*.+/,
  // PHP: `Fatal error:` or `Uncaught ...`
  /(?:Fatal error|Uncaught\s+\w+(?:Exception|Error)):\s*.+/,
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

const generateFingerprint = (errorMessage: string, stackTrace: ParsedStackFrame[]): string => {
  const normalizedMessage = errorMessage
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/\b\d{4,}\b/g, '<num>')
    .replace(/https?:\/\/[^\s)]+/g, '<url>')
    .replace(/0x[0-9a-f]+/gi, '<addr>')
    .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/g, '<ip>');

  const frameKeys = stackTrace
    .slice(0, 3)
    .map((f) => `${f.file}:${f.line}`)
    .join('|');

  const fingerprintSource = `${normalizedMessage}||${frameKeys}`;
  return createHash('sha256').update(fingerprintSource).digest('hex').slice(0, 16);
};

// ─── Main parser ─────────────────────────────────────────────────────────────

const parseLogEventForErrors = (logEvent: CloudWatchLogEvent): ParsedError | null => {
  const { message } = logEvent;

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
      fingerprint: generateFingerprint(errorMessage, stackTrace),
      requestId: extractRequestId(message),
      rawLog: message.length > 4000 ? `${message.slice(0, 4000)}...` : message
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
    fingerprint: generateFingerprint(errorMessage, stackTrace),
    requestId: extractRequestId(message),
    rawLog: message.length > 4000 ? `${message.slice(0, 4000)}...` : message
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

    for (const error of errors) {
      try {
        await client.reportIssueEvent.mutate({
          fingerprint: error.fingerprint,
          errorMessage: error.errorMessage,
          errorType: error.errorType,
          stackTrace: error.stackTrace,
          functionName: extractResourceNameFromLogGroup(logGroup),
          logGroup,
          requestId: error.requestId,
          project,
          stage,
          region,
          rawLog: error.rawLog
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
  try {
    const response = await cwLogsClient.send(
      new GetLogEventsCommand({
        logGroupName: logGroup,
        logStreamName: logStream,
        startTime: timestamp - 5000,
        endTime: timestamp + 5000,
        startFromHead: true,
        limit: 30
      })
    );
    return (response.events || []).map((e) => e.message?.trimEnd() || '');
  } catch {
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
  if (error.stackTrace.length > 0) return error;

  const contextLines = await fetchSurroundingLogContext(logGroup, logStream, timestamp);
  if (contextLines.length === 0) return error;

  const stackTrace = parseStackTraceMultiLang(contextLines);
  if (stackTrace.length === 0) return error;

  const rawLog = contextLines.join('\n');
  return {
    ...error,
    stackTrace,
    fingerprint: generateFingerprint(error.errorMessage, stackTrace),
    rawLog: rawLog.length > 4000 ? `${rawLog.slice(0, 4000)}...` : rawLog
  };
};

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async (event: CloudWatchLogsEvent) => {
  const decodedData = decodeCloudWatchLogsData(event.awslogs.data);

  if (decodedData.messageType === 'CONTROL_MESSAGE') return;

  const errors: ParsedError[] = [];
  for (const logEvent of decodedData.logEvents) {
    const parsed = parseLogEventForErrors(logEvent);
    if (parsed) errors.push(parsed);
  }

  // For errors without stack frames, fetch surrounding context from CloudWatch
  const enrichedErrors: ParsedError[] = [];
  for (const error of errors) {
    const matchingLogEvent = decodedData.logEvents.find(
      (e) => error.rawLog.startsWith(e.message.slice(0, 50)) || e.message.includes(error.errorMessage.slice(0, 50))
    );
    if (matchingLogEvent && error.stackTrace.length === 0) {
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
