import type { CommonOptions } from 'execa';
import { EventEmitter } from 'node:events';
import execa from 'execa';
import { logCollectorStream } from '../../src/utils/log-collector';
import { serialize } from './misc';
import { StreamTransformer } from './streams';

EventEmitter.defaultMaxListeners = 0;

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
  pipeStdio?: boolean;
  prefixStdioOutput?: string;
  disableExtendEnv?: boolean;
  inheritEnvVarsExcept?: string[];
  /** Callback to receive output lines instead of piping to stdout/stderr. When set, output goes to callback only. */
  onOutputLine?: (line: string, stream: 'stdout' | 'stderr') => void;
};

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
    pipeStdio,
    disableExtendEnv,
    inheritEnvVarsExcept = [],
    rawOptions = {},
    onOutputLine
  }: ExecProps,
  useNodeExec?: boolean
) => {
  const inheritedEnv = serialize(process.env);
  inheritEnvVarsExcept.forEach((envName) => delete inheritedEnv[envName]);

  const cpOpts = {
    ...rawOptions,
    env: { FORCE_COLOR: '3', ...(inheritEnvVarsExcept?.length ? inheritedEnv : {}), ...env },
    cwd,
    extendEnv: !disableExtendEnv && !inheritEnvVarsExcept?.length,
    ...(pipeStdio && { stdin: 'inherit' as const, stdout: 'pipe' as const, stderr: 'pipe' as const })
  };
  const childProcess = useNodeExec ? execa.node(command, args, cpOpts) : execa(command, args, cpOpts);

  if (!disableStdout) {
    let stdoutStream = childProcess.stdout;
    if (transformStdoutLine.length || transformStdoutPut.length) {
      const lineTransforms = Array.isArray(transformStdoutLine) ? transformStdoutLine : [transformStdoutLine];
      const putTransforms = Array.isArray(transformStdoutPut) ? transformStdoutPut : [transformStdoutPut];
      stdoutStream = childProcess.stdout.pipe(new StreamTransformer(lineTransforms, putTransforms));
    }
    if (onOutputLine) {
      // Capture output via callback instead of piping to stdout
      setupLineCallback(stdoutStream, (line) => onOutputLine(line, 'stdout'));
    } else {
      stdoutStream.pipe(process.stdout);
    }
    stdoutStream.pipe(logCollectorStream, { end: false });
  }
  if (!disableStderr) {
    let stderrStream = childProcess.stderr;
    if (transformStderrLine.length || transformStderrPut.length) {
      const lineTransforms = Array.isArray(transformStderrLine) ? transformStderrLine : [transformStderrLine];
      const putTransforms = Array.isArray(transformStderrPut) ? transformStderrPut : [transformStderrPut];
      stderrStream = childProcess.stderr.pipe(new StreamTransformer(lineTransforms, putTransforms));
    }
    if (onOutputLine) {
      // Capture output via callback instead of piping to stderr
      setupLineCallback(stderrStream, (line) => onOutputLine(line, 'stderr'));
    } else {
      stderrStream.pipe(process.stderr);
    }
    stderrStream.pipe(logCollectorStream, { end: false });
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

export const exec = async (command: string, args: string[], params: ExecProps) => {
  const start = Date.now();

  const childProcess = getChildProcess(command, args, params);

  const logDetailsFn = () => {
    if (params.logDetails) {
      console.info(`[STP_DEBUG] Command '${command}' with args ${args.join(' ')} took ${Date.now() - start}ms.`);
    }
  };

  return childProcess
    .then((res) => {
      logDetailsFn();
      return res;
    })
    .catch((err) => {
      logDetailsFn();
      throw err;
    });
};

export const executeGit = (command: string, opts: CommonOptions<'string'> = {}) => {
  return execa(`git ${command}`, { shell: true, ...opts }).catch((err) => {
    throw err;
  });
};
