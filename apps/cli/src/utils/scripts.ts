import type { AnyFunction } from '@utils/type-helpers';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { stpErrors } from '@errors';
import { parseLiteralMigrationCommand } from '@stacktape/config-inference/compose/migrations';
import { checkExecutableInPath } from '@utils/bin-executable';
import { exec } from '@utils/exec';
import { getFileExtension } from '@utils/fs-utils';
import { CliError, ExpectedError } from './errors';
import { getPythonExecutable } from './file-loaders';
import type { EnvironmentVar } from '@stacktape/config/shared';

export const getScriptEnv = ({
  userDefinedEnv = [],
  connectToEnv = [],
  assumedRoleAWSEnvVars = [],
  errorData,
  command,
  fullHookTrigger,
  hookType
}: {
  errorData?: Record<string, any>;
  userDefinedEnv: EnvironmentVar[];
  connectToEnv: EnvironmentVar[];
  assumedRoleAWSEnvVars?: EnvironmentVar[];
  command: string;
  hookType?: HookType;
  fullHookTrigger: string;
}) => {
  const finalEnv = {
    ...(hookType && {
      STP_HOOK_TYPE: hookType,
      STP_HOOK_TRIGGER: fullHookTrigger,
      STP_COMMAND: command
    }),
    ...(errorData && { STP_ERROR: JSON.stringify(errorData) }),
    ...[...userDefinedEnv, ...connectToEnv, ...assumedRoleAWSEnvVars].reduce((curr, next) => {
      return { ...curr, [next.name]: next.value };
    }, {})
  };

  // remove all env variables with non-standardized name
  Object.keys(finalEnv).forEach((envName) => {
    if (!/^[a-z_]\w*$/i.test(envName)) {
      delete finalEnv[envName];
    }
  });

  return finalEnv;
};

export type HookType = 'before' | 'after' | 'onError';
export type ScriptFn = {
  errorData?: Record<string, any>;
  hookType?: HookType;
};

export const executeCommandHook = async ({
  command,
  env,
  cwd,
  pipeStdio,
  onOutputLine
}: {
  command: string;
  env: Record<string, any>;
  cwd: string;
  pipeStdio: boolean;
  onOutputLine?: (line: string) => void;
}) => {
  // When using onOutputLine callback, don't use prefix transformer
  // When piping directly to stdout (no callback), use prefix for visual hierarchy
  const usePrefix = pipeStdio && !onOutputLine;
  const literalArgv = parseLiteralMigrationCommand(command);
  let executable = literalArgv?.[0] ?? command;
  const args = literalArgv?.slice(1) ?? [];
  if (literalArgv !== undefined && process.platform === 'win32') {
    const configuredPath: unknown = Object.entries(env).find(([key]) => key.toLowerCase() === 'path')?.[1];
    const resolved = Bun.which(executable, {
      cwd,
      PATH: typeof configuredPath === 'string' ? configuredPath : (process.env.PATH ?? process.env.Path)
    });
    // Execa's Windows adapter may invoke cmd.exe for .cmd/.bat and other wrappers even when
    // shell:false. Do not send quoted or special arguments through that second interpreter.
    if (!/\.(?:exe|com)$/i.test(resolved ?? '') && args.some((argument) => !/^[A-Za-z0-9_.:=@/-]+$/.test(argument))) {
      throw new CliError({
        category: 'SCRIPT',
        code: 'WINDOWS_LITERAL_SCRIPT_REQUIRES_EXECUTABLE',
        message: `Cannot preserve the literal arguments for "${executable}" through a Windows command wrapper.`,
        hints:
          'Use a native executable runner, such as node or bun, with the migration entryfile as an argument. Verify that the executable is available on PATH.'
      });
    }
    executable = resolved ?? executable;
  }
  return exec(executable, args, {
    cwd,
    env,
    // Keep arbitrary authored shell commands on their existing path. Recognized literal commands
    // use argv directly, so their values do not depend on cmd.exe, Bash or PowerShell quoting.
    rawOptions: { shell: literalArgv === undefined ? (process.platform === 'win32' ? undefined : '/bin/bash') : false },
    pipeStdio,
    disableStderr: !pipeStdio,
    disableStdout: !pipeStdio,
    transformStderrLine: usePrefix ? getStdioPrefixTransformer('  └ ') : undefined,
    transformStdoutLine: usePrefix ? getStdioPrefixTransformer('  └ ') : undefined,
    onOutputLine: onOutputLine ? (line) => onOutputLine(line) : undefined
  }).then((execResult) => {
    if (execResult.failed) {
      throw new Error(execResult.stderr);
    }
  });
};

export const executeScriptHook = ({
  filePath,
  cwd,
  env,
  pipeStdio,
  onOutputLine
}: {
  filePath: string;
  cwd: string;
  env: Record<string, any>;
  pipeStdio: boolean;
  onOutputLine?: (line: string) => void;
}) => {
  // When using onOutputLine callback, don't use prefix transformer
  const usePrefix = pipeStdio && !onOutputLine;
  return execScriptInNewProcess({
    absoluteScriptPath: join(globalStateManager.workingDir, filePath),
    scriptCwd: cwd,
    env,
    pipeStdio,
    transformStderrLine: usePrefix ? getStdioPrefixTransformer('  └ ') : undefined,
    transformStdoutLine: usePrefix ? getStdioPrefixTransformer('  └ ') : undefined,
    onOutputLine
  });
};

// Get the Bun executable path - use the bundled Bun runtime or system Bun
const getBunExecutable = (): string => {
  // When running from compiled binary, process.execPath is the Stacktape binary itself
  // which is a Bun compiled binary and can run JS/TS files directly
  // When running in dev mode, use system bun
  return checkExecutableInPath('bun') || process.execPath;
};

const execScriptInNewProcess = async ({
  absoluteScriptPath,
  scriptCwd,
  env,
  pipeStdio,
  transformStderrLine,
  transformStdoutLine,
  onOutputLine
}: {
  absoluteScriptPath: string;
  scriptCwd: string;
  env?: {
    [key: string]: any;
  };
  pipeStdio?: boolean;
  transformStderrLine: AnyFunction;
  transformStdoutLine: AnyFunction;
  onOutputLine?: (line: string) => void;
}) => {
  const ext = getFileExtension(absoluteScriptPath);
  const stdioOpts = pipeStdio ? { pipeStdio: true } : { disableStderr: true, disableStdout: true };
  const outputCallback = onOutputLine ? { onOutputLine: (line: string) => onOutputLine(line) } : {};
  if (!existsSync(absoluteScriptPath)) {
    throw stpErrors.e18({ absoluteScriptPath });
  }
  switch (ext) {
    case 'js':
    case 'ts': {
      // Use Bun to run JS/TS files - Bun has native TypeScript support
      const bunExec = getBunExecutable();
      await exec(bunExec, ['run', absoluteScriptPath], {
        env,
        ...stdioOpts,
        ...outputCallback,
        cwd: scriptCwd,
        transformStderrLine,
        transformStdoutLine
      });
      break;
    }
    case 'py': {
      await exec(getPythonExecutable(), [absoluteScriptPath], {
        env,
        ...stdioOpts,
        ...outputCallback,
        cwd: scriptCwd,
        transformStderrLine,
        transformStdoutLine
      });
      break;
    }
    default: {
      throw new ExpectedError(
        'SCRIPT',
        `Failed to execute script at ${absoluteScriptPath}. Executing script files with extension ${ext} is not supported.`
      );
    }
  }
};

const getStdioPrefixTransformer = (prefix: string) => (line: string) => {
  return `${prefix} ${line}`;
};
