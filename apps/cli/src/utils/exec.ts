import type { StdTransformer } from '@utils/streams';
import type { CommonOptions } from 'execa';
import { EventEmitter } from 'node:events';
import execa from 'execa';
import { jsonlEmitter } from '../app/tui-manager/output/jsonl';
import { logCollectorStream } from '../../src/utils/log-collector';
import { isDirAccessible } from './fs-utils';
import { serialize } from './misc';
import { CliError } from './errors';
import { StreamTransformer } from './streams';

EventEmitter.defaultMaxListeners = 0;

const shouldRedirectStdioToConsole = () => process.env.STP_REDIRECT_STDIO_TO_CONSOLE === 'true';

const emitCollectorLine = ({ line, stream }: { line: string; stream: 'stdout' | 'stderr' }) => {
  const serialized = jsonlEmitter.emitLog({
    level: stream === 'stderr' ? 'error' : 'info',
    source: stream === 'stderr' ? 'child-stderr' : 'child-stdout',
    message: line,
    stdout: false
  });
  if (serialized) {
    logCollectorStream.write(serialized);
  }
};

type ExecProps = {
  logFailedCommand?: boolean;
  transformStderrLine?: StdTransformer | StdTransformer[];
  transformStdoutLine?: StdTransformer | StdTransformer[];
  transformStderrPut?: StdTransformer | StdTransformer[];
  transformStdoutPut?: StdTransformer | StdTransformer[];
  disableStderr?: boolean;
  disableStdout?: boolean;
  env?: { [key: string]: any };
  cwd?: string;
  rawOptions?: CommonOptions<'string'>;
  logDetails?: boolean;
  stdioMode?: ChildStdioMode;
  prefixStdioOutput?: string;
  disableExtendEnv?: boolean;
  inheritEnvVarsExcept?: string[];
  /** Callback to receive output lines instead of piping to stdout/stderr. When set, output goes to callback only. */
  onOutputLine?: (line: string, stream: 'stdout' | 'stderr') => void;
  /**
   * Written to the child's standard input, which is then closed. Secrets belong here rather than in `args`: standard
   * input is not part of the command line, so it cannot reach `ps` output, Execa's error strings or any log.
   */
  stdinInput?: string;
  /**
   * Stand-in for the command line, used everywhere this runner would otherwise echo `args`: the inaccessible-working-
   * directory error, the `logDetails` line, and the command Execa embeds in the errors it creates. Set it whenever an
   * argument names something the CLI should not repeat back.
   */
  safeCommandDescription?: string;
  /**
   * Replaced with `[redacted]` in every string of a rejection this runner throws, the child's own captured output
   * included. This is a second line of defence for a value handed to the child on `stdinInput`: the value is not in
   * `args`, so nothing here constructs it, but a child that echoed its standard input back would have that echo
   * folded into Execa's `message` and from there into the CLI's error and its JSONL result.
   */
  redactedValues?: string[];
};

export type ChildStdioMode = 'capture' | 'inherit' | 'ignore';

const getChildProcess = (
  command: string,
  args: string[],
  {
    env = {},
    cwd,
    transformStderrLine = [],
    transformStdoutLine = [],
    transformStderrPut = [],
    transformStdoutPut = [],
    disableStderr,
    disableStdout,
    stdioMode = 'capture',
    disableExtendEnv,
    inheritEnvVarsExcept = [],
    rawOptions = {},
    onOutputLine,
    stdinInput
  }: ExecProps,
  useNodeExec?: boolean
) => {
  const inheritedEnv = serialize(process.env);
  inheritEnvVarsExcept.forEach((envName) => delete inheritedEnv[envName]);

  const stdio =
    stdinInput !== undefined
      ? (['pipe', 'pipe', 'pipe'] as const)
      : stdioMode === 'inherit'
        ? ('inherit' as const)
        : stdioMode === 'ignore'
          ? ('ignore' as const)
          : (['ignore', 'pipe', 'pipe'] as const);
  const cpOpts = {
    ...rawOptions,
    env: { FORCE_COLOR: '3', ...(inheritEnvVarsExcept?.length ? inheritedEnv : {}), ...env },
    cwd,
    extendEnv: !disableExtendEnv && !inheritEnvVarsExcept?.length,
    windowsHide: true,
    stdio,
    ...(stdinInput === undefined ? {} : { input: stdinInput })
  };
  const childProcess = useNodeExec ? execa.node(command, args, cpOpts) : execa(command, args, cpOpts);

  if (stdioMode === 'capture' && !disableStdout && childProcess.stdout) {
    let stdoutStream = childProcess.stdout;
    if (transformStdoutLine.length || transformStdoutPut.length) {
      const lineTransforms = Array.isArray(transformStdoutLine) ? transformStdoutLine : [transformStdoutLine];
      const putTransforms = Array.isArray(transformStdoutPut) ? transformStdoutPut : [transformStdoutPut];
      stdoutStream = childProcess.stdout.pipe(new StreamTransformer(lineTransforms, putTransforms));
    }
    if (onOutputLine) {
      // Capture output via callback instead of piping to stdout/logCollector.
      // The callback owner is responsible for routing output to the appropriate destinations
      // (e.g. jsonlEmitter which writes to both stdout and logCollectorStream).
      setupLineCallback(stdoutStream, (line) => onOutputLine(line, 'stdout'));
    } else if (shouldRedirectStdioToConsole()) {
      setupLineCallback(stdoutStream, (line) => console.info(line));
    } else {
      stdoutStream.pipe(process.stdout);
      setupLineCallback(stdoutStream, (line) => emitCollectorLine({ line, stream: 'stdout' }));
    }
  }
  if (stdioMode === 'capture' && !disableStderr && childProcess.stderr) {
    let stderrStream = childProcess.stderr;
    if (transformStderrLine.length || transformStderrPut.length) {
      const lineTransforms = Array.isArray(transformStderrLine) ? transformStderrLine : [transformStderrLine];
      const putTransforms = Array.isArray(transformStderrPut) ? transformStderrPut : [transformStderrPut];
      stderrStream = childProcess.stderr.pipe(new StreamTransformer(lineTransforms, putTransforms));
    }
    if (onOutputLine) {
      setupLineCallback(stderrStream, (line) => onOutputLine(line, 'stderr'));
    } else if (shouldRedirectStdioToConsole()) {
      setupLineCallback(stderrStream, (line) => console.error(line));
    } else {
      stderrStream.pipe(process.stderr);
      setupLineCallback(stderrStream, (line) => emitCollectorLine({ line, stream: 'stderr' }));
    }
  }
  return childProcess;
};

/**
 * Set up a line-by-line callback for a readable stream.
 */
const setupLineCallback = (stream: NodeJS.ReadableStream, callback: (line: string) => void) => {
  let buffer = '';
  stream.on('data', (chunk: Buffer | string) => {
    buffer += String(chunk);
    const lines = buffer.split('\n');
    // Keep the last incomplete line in buffer
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim()) {
        callback(line);
      }
    }
  });
  stream.on('end', () => {
    // Flush remaining buffer
    if (buffer.trim()) {
      callback(buffer);
    }
  });
};

/**
 * Execa builds `command`, `escapedCommand`, `shortMessage`, `message` and the stack of the error it throws out of the
 * full argument list, so a secret passed as an argument is reproduced by every consumer of that error: the message
 * the CLI prints, the stack it attaches, the JSONL result it writes. Replacing those echoes with the caller's
 * description is what keeps the secret out of all of them at once. The child's own stdout and stderr are left
 * untouched, so the reason the command failed is still there.
 */
const redactCommandEcho = (err: any, safeCommandDescription: string) => {
  if (!err || typeof err !== 'object') {
    return err;
  }
  const echoedCommands = [err.command, err.escapedCommand].filter((echo) => typeof echo === 'string' && echo !== '');
  if (echoedCommands.length === 0) {
    return err;
  }
  const redact = (value: string) =>
    echoedCommands.reduce((redacted, echo) => redacted.split(echo).join(safeCommandDescription), value);
  for (const property of ['message', 'shortMessage', 'stack']) {
    if (typeof err[property] === 'string') {
      err[property] = redact(err[property]);
    }
  }
  err.command = safeCommandDescription;
  err.escapedCommand = safeCommandDescription;
  return err;
};

/** Strings a rejection can carry, in the order a consumer is likely to read them. */
const ERROR_TEXT_PROPERTIES = ['message', 'shortMessage', 'stack', 'stdout', 'stderr', 'all'];

const redactValuesInError = (err: any, values: string[]) => {
  const secrets = values.filter((value) => typeof value === 'string' && value !== '');
  if (!err || typeof err !== 'object' || !secrets.length) {
    return err;
  }
  for (const property of ERROR_TEXT_PROPERTIES) {
    if (typeof err[property] === 'string') {
      err[property] = secrets.reduce((text, secret) => text.split(secret).join('[redacted]'), err[property]);
    }
  }
  return err;
};

export const exec = async (command: string, args: string[], params: ExecProps) => {
  const commandDescription = params.safeCommandDescription || [command, ...args].join(' ');

  if (params.cwd && !isDirAccessible(params.cwd)) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_WORKING_DIRECTORY_INACCESSIBLE',
      message: `Cannot run \`${commandDescription}\` because working directory \`${params.cwd}\` does not exist or is not accessible.`,
      hints:
        'Check configured paths such as `appDirectory` and `build.workingDirectory`. Relative paths resolve from the directory containing the Stacktape config.'
    });
  }

  const start = Date.now();

  const childProcess = getChildProcess(command, args, params);

  const logDetailsFn = () => {
    if (params.logDetails) {
      console.info(`[STP_DEBUG] Command '${commandDescription}' took ${Date.now() - start}ms.`);
    }
  };

  return childProcess
    .then((res) => {
      logDetailsFn();
      return res;
    })
    .catch((err) => {
      logDetailsFn();
      if (params.safeCommandDescription) {
        redactCommandEcho(err, params.safeCommandDescription);
      }
      if (params.redactedValues?.length) {
        redactValuesInError(err, params.redactedValues);
      }
      throw err;
    });
};

export const executeGit = (command: string, opts: CommonOptions<'string'> = {}) => {
  return execa(`git ${command}`, { shell: true, ...opts }).catch((err) => {
    throw err;
  });
};
