/* eslint-disable ts/no-this-alias */
import { sdkCommands } from '@cli-config';
import { INVOKED_FROM_ENV_VAR_NAME } from '@config';
import { getInstallationScript, isStacktapeInstalledOnSystem } from '@shared/utils/bin-executable';
import { isFileAccessible } from '@shared/utils/fs-utils';
import { transformToCliArgs } from '@utils/cli';
import { camelCase } from 'change-case';
import execa from 'execa';
import PQueue from 'p-queue';

type StacktapeClientOptions = {
  region?: AWSRegion;
  stage?: string;
  profile?: string;
  printProgress?: boolean;
  executablePath?: string;
  concurrency?: number;
  env?: { [envVarName: string]: string };
  onEvent?: (...args: any[]) => any;
};

const getExecutable = ({ presetExecutablePath }: { presetExecutablePath?: string }) => {
  if (presetExecutablePath) {
    if (!isFileAccessible(presetExecutablePath)) {
      throw new Error(`Pre-configured stacktape executable path ${presetExecutablePath} is not accessible.`);
    }
    return presetExecutablePath;
  }
  if (!isStacktapeInstalledOnSystem()) {
    throw new Error(`Stacktape is not installed on the system.\nTo install it, run:\n${getInstallationScript()}`);
  }
  return 'stacktape';
};

export class Stacktape {
  #globalArgs: { region?: AWSRegion; stage?: string; profile?: string };
  #globalPrintProgress = false;
  #globalEnv: { [envVarName: string]: string };
  #globalOnEvent: (...args: any[]) => any;
  #executable: string;
  #promiseQueue: PQueue;

  constructor(options?: StacktapeClientOptions) {
    if (options && typeof options !== 'object') {
      const err = new Error('Invalid arguments passed to the Stacktape constructor.');
      err.name = 'CONFIG_ERROR';
      throw err;
    }
    const {
      printProgress: presetPrintProgress,
      onEvent: globalOnEvent,
      executablePath,
      concurrency,
      env,
      ...globalArgs
    } = options || {};
    this.#globalPrintProgress = presetPrintProgress;
    this.#globalArgs = globalArgs || {};
    this.#globalOnEvent = globalOnEvent;
    this.#globalEnv = env || {};
    this.#executable = getExecutable({ presetExecutablePath: executablePath });
    this.#promiseQueue = new PQueue({ concurrency: concurrency || 1 });
    sdkCommands.forEach((command) => {
      this[camelCase(command.replaceAll(':', '-'))] = this.#getCommand(command);
    });
  }

  #getCommand = (command: StacktapeCommand) => {
    return ({ onEvent, printProgress, ...args } = {} as any): Promise<StacktapeCommandResult> => {
      const error = new Error('Error executing command');
      const self = this;
      return self.#promiseQueue.add(async () => {
        return new Promise(function executeCommand(resolve, reject) {
          const { config, ...restArgs } = args;
          // Transform config with resource instances to plain config
          const childProcess = execa(
            self.#executable,
            [
              command,
              ...transformToCliArgs({ ...self.#globalArgs, ...restArgs }),
              ...(config ? ['--config', JSON.stringify(config)] : [])
            ],
            {
              serialization: 'json',
              stdin: 'ipc',
              env: { [INVOKED_FROM_ENV_VAR_NAME]: 'sdk', ...self.#globalEnv }
            }
          );
          childProcess.on('message', (message: StacktapeLog) => {
            if (message.type === 'ERROR') {
              const { errorType, message: msg } = message.data;
              error.message = `${errorType}: ${msg}`;
              return reject(error);
            }
            if (message.type === 'FINISH') {
              return resolve(message.data);
            }
            if (message.type === 'MESSAGE') {
              if (self.#globalPrintProgress || printProgress) {
                console.info(`[${message.data.printType}] ${message.data.message}`);
              }
              const onEventFn = onEvent || self.#globalOnEvent;
              if (onEventFn) {
                onEventFn(message);
              }
            }
          });
        });
      });
    };
  };
}
