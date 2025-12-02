import { cliArgsAliases } from '@cli-config';
import { camelCase } from 'change-case';
import yargsParser from 'yargs-parser';

export const transformToCliArgs = (args: StacktapeArgs) => {
  const res = [];
  for (const argName in args) {
    if (typeof args[argName] === 'boolean') {
      if (args[argName] === true) {
        res.push(`--${argName}`);
      }
    } else {
      res.push(`--${argName}`);
      res.push(args[argName]);
    }
  }
  return res;
};

const parseAdditionalArgs = (additionalArgsRaw: string[]): Record<string, string | boolean> => {
  const parsedArgs: Record<string, string | boolean> = {};
  let i = 0;
  while (i < additionalArgsRaw.length) {
    const currentArg = additionalArgsRaw[i];
    if (currentArg.startsWith('--')) {
      const key = currentArg.substring(2);
      const nextArg = additionalArgsRaw[i + 1];
      if (i + 1 < additionalArgsRaw.length && !nextArg.startsWith('--')) {
        parsedArgs[key] = nextArg;
        i += 2; // Consumed key and value
      } else {
        parsedArgs[key] = true; // Boolean flag
        i += 1; // Consumed key only
      }
    } else {
      // This case should ideally not happen if arguments are well-formed,
      // but we can choose to ignore, error, or handle them as positional arguments if needed.
      // For now, we'll ignore arguments that don't start with '--'.
      console.warn(`Warning: Ignoring additional argument that does not start with '--': ${currentArg}`);
      i += 1;
    }
  }
  return parsedArgs;
};

export const getCliInput = (): {
  commands: StacktapeCommand[];
  options: StacktapeCliArgs;
  additionalArgs?: Record<string, string | boolean>;
} => {
  const allArgs = process.argv.slice(2);
  const doubleDashIndex = allArgs.indexOf('--');

  let primaryArgs: string[];
  let additionalArgsRaw: string[] = [];

  if (doubleDashIndex === -1) {
    primaryArgs = allArgs;
  } else {
    primaryArgs = allArgs.slice(0, doubleDashIndex);
    additionalArgsRaw = allArgs.slice(doubleDashIndex + 1);
  }

  const { _: rawCommands, ...rawArgs } = yargsParser(
    primaryArgs.map((arg) => {
      if (['-h', '--h', '-help'].includes(arg)) {
        return '--help';
      }
      if (arg === '-version') {
        return '--version';
      }
      return arg;
    })
  );

  const commands: string[] = rawCommands as string[];
  const options: { [argName: string]: any } = rawArgs;

  Object.entries(options).forEach(([optName, value]) => {
    if (!cliArgsAliases[optName]) {
      for (const validArg in cliArgsAliases) {
        const alias = cliArgsAliases[validArg];
        if (alias === optName) {
          delete options[alias];
          options[validArg] = value;
        }
      }
    }
  });
  if (options.help) {
    return { commands: ['help'], options: commands.length ? { command: commands[0] } : {} };
  }
  if (options.version || options.v) {
    return { commands: ['version'], options: {} };
  }

  const parsedAdditionalArgs = parseAdditionalArgs(additionalArgsRaw);

  return {
    commands: commands as StacktapeCommand[],
    options,
    additionalArgs: Object.keys(parsedAdditionalArgs).length > 0 ? parsedAdditionalArgs : {}
  };
};

export const getCommandForCurrentEnvironment = (command: StacktapeCommand, invokedFrom: InvokedFrom) => {
  if (invokedFrom === 'cli') {
    return command;
  }
  return camelCase(command.replaceAll(':', '-'));
};
