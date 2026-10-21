import type { StacktapeArgs, StacktapeCliArgs, StacktapeCommand } from 'src/config/cli/types';
import { argAliases, allCliArgsSchema } from '../config/cli/options';
import { cliCommands, commandDefinitions } from '../config/cli/commands';
import { getArgInfo } from '../config/cli/utils';
import {
  commandPositionals,
  globalArgs,
  publicCommandName,
  publicFlag,
  resolveCommandName,
  shortFlags
} from '../config/cli/public-names';
import { CliError } from './errors';

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

export const resolveFlagName = (name: string, command?: StacktapeCommand): string => {
  const allowed = command ? Object.keys(commandDefinitions[command].args) : Object.keys(allCliArgsSchema.shape);
  const names = [...new Set([...allowed, ...globalArgs])];
  // Exact internal names take precedence over aliases. Legacy collisions are resolved by this command's schema.
  if (command === 'metrics' && name === 'st') return 'stat';
  return (
    names.find((arg) => arg === name) ??
    names.find((arg) => publicFlag(arg) === name) ??
    names.find((arg) => {
      const aliases = argAliases[arg as keyof typeof argAliases];
      return shortFlags[arg] === name || (Array.isArray(aliases) ? aliases.includes(name as never) : aliases === name);
    }) ??
    name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
  );
};

const parseError = (code: string, message: string, hints?: string) =>
  new CliError({ category: 'CLI', code, message, hints });
const isOption = (token: string) => /^-/.test(token) && !/^-(?:\d|\.\d)/.test(token);

/** Bootstrap output settings must survive a later parse error. Last output flag wins; quiet beats debug/logLevel. */
export const getBootstrapOptions = (argv: string[]): StacktapeCliArgs => {
  const options: StacktapeCliArgs = {};
  const end = argv.indexOf('--');
  const tokens = end < 0 ? argv : argv.slice(0, end);
  for (let i = 0; i < tokens.length; i++) {
    const [flag, inline] = tokens[i].split('=', 2);
    if (flag === '--json') options.outputFormat = 'jsonl';
    if (['--output-format', '--outputFormat', '--ofmt'].includes(flag))
      options.outputFormat = (inline ??
        (tokens[i + 1] && !isOption(tokens[i + 1]) ? tokens[++i] : undefined)) as StacktapeCliArgs['outputFormat'];
    if (['--agent', '--ag'].includes(flag)) options.agent = inline !== 'false';
    if (flag === '--debug') options.logLevel = 'debug';
    if (['--log-level', '--logLevel', '--ll'].includes(flag))
      options.logLevel = (inline ??
        (tokens[i + 1] && !isOption(tokens[i + 1]) ? tokens[++i] : undefined)) as StacktapeCliArgs['logLevel'];
  }
  if (tokens.includes('--quiet')) options.logLevel = 'error';
  return options;
};

const leadingGlobalFlagNames = new Set(['help', 'h', 'version', 'v', 'json', 'debug', 'quiet']);
const findCommandStart = (tokens: string[]): number => {
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (!isOption(token)) return index;
    const name = token.replace(/^-+/, '').split('=')[0];
    if (token.includes('=') || leadingGlobalFlagNames.has(name)) continue;
    const arg = resolveFlagName(name);
    const schema = allCliArgsSchema.shape[arg];
    const unwrapped = schema?.unwrap();
    if (unwrapped?.type !== 'boolean' && index + 1 < tokens.length && !isOption(tokens[index + 1])) index++;
  }
  return tokens.length;
};

export const parseCliInput = (
  allArgs: string[]
): {
  commands: StacktapeCommand[];
  options: StacktapeCliArgs;
  additionalArgs: Record<string, string | boolean>;
} => {
  const separator = allArgs.indexOf('--');
  const primary = separator < 0 ? allArgs : allArgs.slice(0, separator);
  const additionalArgs = parseAdditionalArgs(separator < 0 ? [] : allArgs.slice(separator + 1));
  // The public command path consists of leading words. Global help/version also work without a command.
  const commandStart = findCommandStart(primary);
  const afterStart = primary.slice(commandStart);
  const firstOption = afterStart.findIndex(isOption);
  const words = afterStart.slice(0, firstOption < 0 ? afterStart.length : firstOption);
  let command: StacktapeCommand | undefined;
  let consumed = 0;
  for (let length = words.length; length > 0; length--) {
    const match = resolveCommandName(words.slice(0, length).join(' '), cliCommands);
    if (match) {
      command = match;
      consumed = length;
      break;
    }
  }
  for (const token of primary) {
    if (!isOption(token) || !/^-[^-].+/.test(token) || ['-help', '-version'].includes(token)) continue;
    const flag = token.split('=')[0];
    const arg = resolveFlagName(flag.slice(1), command);
    throw parseError(
      'CLI_SHORT_OPTION_INVALID',
      'One-dash options must use a single letter.',
      `Use --${publicFlag(arg)} instead of ${flag}.`
    );
  }
  const helpRequested = primary.some((t) => ['--help', '-help', '-h', '--h'].includes(t));
  const versionRequested = primary.some((t) => ['--version', '-version', '-v', '--v'].includes(t));
  if (helpRequested)
    return {
      commands: ['help'],
      options: {
        ...getBootstrapOptions(primary),
        ...(words.length ? { command: words.slice(0, consumed || words.length).join(' ') } : {})
      },
      additionalArgs
    };
  if (versionRequested) return { commands: ['version'], options: getBootstrapOptions(primary), additionalArgs };

  const options: Record<string, unknown> = {};
  const positionals: string[] = [];
  for (let i = 0; i < primary.length; i++) {
    if (i >= commandStart && i < commandStart + consumed) continue;
    const token = primary[i];
    if (!isOption(token)) {
      positionals.push(token);
      continue;
    }
    const equal = token.indexOf('=');
    const flag = equal < 0 ? token : token.slice(0, equal);
    const inline = equal < 0 ? undefined : token.slice(equal + 1);
    const name = flag.replace(/^-+/, '');
    const arg = resolveFlagName(name, command);
    if (name === 'json') {
      options.outputFormat = 'jsonl';
      continue;
    }
    if (name === 'debug') {
      options.logLevel = 'debug';
      continue;
    }
    if (name === 'quiet') {
      continue;
    }
    const types = command ? getArgInfo(command, arg).allowedTypes : ['string'];
    // Global output/log flags are accepted for every command.
    const allowedTypes = globalArgs.has(arg) ? (arg === 'help' ? ['boolean'] : ['string']) : types;
    if (allowedTypes.includes('boolean')) {
      if (inline !== undefined && !['true', 'false'].includes(inline))
        throw parseError('CLI_ARGUMENT_TYPE_INVALID', `--${publicFlag(arg)} expects true or false.`);
      options[arg] = inline !== 'false';
    } else if (allowedTypes.includes('array')) {
      const values: string[] = inline === undefined ? [] : [inline];
      while (i + 1 < primary.length && !isOption(primary[i + 1])) values.push(primary[++i]);
      options[arg] = [...(Array.isArray(options[arg]) ? (options[arg] as unknown[]) : []), ...values];
    } else {
      const value = inline ?? (i + 1 < primary.length && !isOption(primary[i + 1]) ? primary[++i] : undefined);
      // Preserve legacy missing-value behavior; validateArgs reports the missing/invalid value.
      options[arg] =
        value === undefined
          ? allowedTypes.includes('string')
            ? ''
            : true
          : allowedTypes.includes('number') && (!allowedTypes.includes('string') || /^-?\d+(\.\d+)?$/.test(value))
            ? Number(value)
            : value;
    }
  }
  if (!command)
    return {
      commands: positionals as StacktapeCommand[],
      options: { ...options, ...getBootstrapOptions(primary) } as StacktapeCliArgs,
      additionalArgs
    };
  const positionalNames = commandPositionals[command] ?? [];
  if (command === 'help' && positionals.length) positionals.splice(0, positionals.length, positionals.join(' '));
  if (positionals.length > positionalNames.length)
    throw parseError(
      'CLI_MULTIPLE_POSITIONAL_ARGUMENTS',
      `Too many positional arguments for ${publicCommandName(command)}.`,
      `Run stacktape ${publicCommandName(command)} --help.`
    );
  positionals.forEach((value, index) => {
    const arg = positionalNames[index];
    if (options[arg] !== undefined)
      throw parseError(
        'CLI_ARGUMENT_DUPLICATE',
        `Provide ${publicFlag(arg)} as a positional argument or a flag, only once.`
      );
    options[arg] = value;
  });
  if (options.onlyWorkloads !== undefined)
    options.onlyWorkloads = (options.onlyWorkloads as string[])
      .flatMap((v) => v.split(','))
      .map((v) => v.trim())
      .filter(Boolean);
  return {
    commands: [command],
    options: { ...options, ...getBootstrapOptions(primary) } as StacktapeCliArgs,
    additionalArgs
  };
};

export const getCliInput = () => parseCliInput(process.argv.slice(2));
