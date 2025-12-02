import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { IS_DEV } from '@config';
import { stpErrors } from '@errors';
import { checkExecutableInPath } from '@shared/utils/bin-executable';
import { exec } from '@shared/utils/exec';
import { getFileExtension } from '@shared/utils/fs-utils';
import { ExpectedError } from './errors';
import { getPythonExecutable } from './file-loaders';
import { INSTALLATION_DIR } from './versioning';

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

export const executeCommandHook = ({
  command,
  env,
  cwd,
  pipeStdio
}: {
  command: string;
  env: Record<string, any>;
  cwd: string;
  pipeStdio: boolean;
}) => {
  return exec(command, [], {
    cwd,
    env,
    // maybe use powershell.exe for windows? Originally cmd.exe was used so it could be a breaking change
    rawOptions: { shell: process.platform === 'win32' ? undefined : '/bin/bash' },
    inheritEnvVarsExcept: ['ESBUILD_BINARY_PATH'],
    pipeStdio,
    disableStderr: !pipeStdio,
    disableStdout: !pipeStdio,
    transformStderrLine: getStdioPrefixTransformer('  └ '),
    transformStdoutLine: getStdioPrefixTransformer('  └ ')
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
  pipeStdio
}: {
  filePath: string;
  cwd: string;
  env: Record<string, any>;
  pipeStdio: boolean;
}) => {
  return execScriptInNewProcess({
    absoluteScriptPath: join(globalStateManager.workingDir, filePath),
    scriptCwd: cwd,
    env,
    pipeStdio,
    transformStderrLine: getStdioPrefixTransformer('  └ '),
    transformStdoutLine: getStdioPrefixTransformer('  └ ')
  });
};

// @note pkg is monkey patching node spawn/exec... this is a workaround to use not-monkey-patched version
let absoluteNodeExecPath: string;

const execScriptInNewProcess = async ({
  absoluteScriptPath,
  scriptCwd,
  env,
  pipeStdio,
  transformStderrLine,
  transformStdoutLine
}: {
  absoluteScriptPath: string;
  scriptCwd: string;
  env?: {
    [key: string]: any;
  };
  pipeStdio?: boolean;
  transformStderrLine: AnyFunction;
  transformStdoutLine: AnyFunction;
}) => {
  const ext = getFileExtension(absoluteScriptPath);
  if ((ext === 'js' || ext === 'ts') && !absoluteNodeExecPath) {
    absoluteNodeExecPath = checkExecutableInPath('node') || checkExecutableInPath('nodejs');
  }
  const stdioOpts = pipeStdio ? { pipeStdio: true } : { disableStderr: true, disableStdout: true };
  if (!existsSync(absoluteScriptPath)) {
    throw stpErrors.e18({ absoluteScriptPath });
  }
  switch (ext) {
    case 'js': {
      await exec(absoluteNodeExecPath, [absoluteScriptPath], {
        env,
        ...stdioOpts,
        cwd: scriptCwd,
        inheritEnvVarsExcept: ['ESBUILD_BINARY_PATH'],
        transformStderrLine,
        transformStdoutLine
      });
      break;
    }
    case 'ts': {
      const absoluteEsbuildRegisterPath = IS_DEV
        ? join(process.cwd(), 'node_modules', 'esbuild-register', 'register')
        : join(INSTALLATION_DIR, 'esbuild', 'esbuild-register.js');
      await exec(absoluteNodeExecPath, ['-r', absoluteEsbuildRegisterPath, absoluteScriptPath], {
        env: { ...env, ESBUILD_BINARY_PATH: process.env.ESBUILD_BINARY_PATH },
        ...stdioOpts,
        inheritEnvVarsExcept: ['ESBUILD_BINARY_PATH'],
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
        cwd: scriptCwd,
        inheritEnvVarsExcept: ['ESBUILD_BINARY_PATH'],
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
