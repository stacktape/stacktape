import { publicCommandName, resolveCommandName } from '../../config/cli/public-names';
import { parseCliInput, resolveFlagName } from '../../utils/cli';
import type { StacktapeCommand } from '../../config/cli/commands';
import { cliCommands } from '../../config/cli/commands';
import { dirname, resolve } from 'node:path';
import {
  getAllowedArgs,
  getCommandDescription,
  getCommandInfo,
  getRequiredArgs,
  validateCommandArgs
} from '../../config/cli/utils';
import {
  AWS_READ_ONLY_OPERATIONS,
  getReadOnlyAwsOperations,
  isReadOnlyAwsCommand
} from '@stacktape/aws-read-only/operations';
import { isDefinitelyReadOnlySql } from '@domain-services/debug-services/sql-statements';

export type CliCommandSafety = 'readOnly' | 'diagnostic' | 'local' | 'mutating' | 'destructive' | 'interactive';

export type CliCommandCategory =
  | 'account'
  | 'config'
  | 'deployment'
  | 'dev'
  | 'diagnostics'
  | 'docs'
  | 'errors'
  | 'local'
  | 'project'
  | 'secrets'
  | 'utility';

export type CliCommandPolicy = {
  category: CliCommandCategory;
  safety: CliCommandSafety;
  requiresConfirmation: boolean;
  sensitiveOutput?: boolean;
  unsupportedReason?: string;
};

export type CliCommandSummary = {
  command: string;
  canonicalCommand: StacktapeCommand;
  description: string;
  category: CliCommandCategory;
  safety: CliCommandSafety;
  requiresConfirmation: boolean;
  requiredArgs: readonly string[];
};

export type PreparedCliRun =
  | {
      ok: true;
      command: StacktapeCommand;
      args: Record<string, unknown>;
      policy: CliCommandPolicy;
    }
  | {
      ok: false;
      code: 'UNKNOWN_COMMAND' | 'UNSUPPORTED_COMMAND' | 'CONFIRMATION_REQUIRED' | 'VALIDATION_ERROR';
      message: string;
      data?: Record<string, unknown>;
      nextActions?: string[];
    };

export type ParsedStacktapeScriptCommand = {
  command: StacktapeCommand;
  args: Record<string, unknown>;
};

export type MatchedStacktapePackageScript = {
  packageJsonPath: string;
  scriptName: string;
  scriptCommand: string;
  parsedCommand: StacktapeCommand;
  parsedArgs: Record<string, unknown>;
};

const cliCommandSet = new Set<string>(cliCommands);

const ARG_ALIASES: Record<string, string> = {
  aa: 'awsAccount',
  agent_port: 'agentPort',
  auto_confirm_operation: 'autoConfirmOperation',
  auto_rollback: 'autoRollback',
  aws_account: 'awsAccount',
  bastion_resource: 'bastionResource',
  config_path: 'configPath',
  disable_docker_remote_cache: 'disableDockerRemoteCache',
  disable_emulation: 'disableEmulation',
  disable_layer_optimization: 'disableLayerOptimization',
  docker_args: 'dockerArgs',
  end_time: 'endTime',
  fresh_db: 'freshDb',
  full_deploy: 'fullDeploy',
  fd: 'fullDeploy',
  local_tunneling_port: 'localTunnelingPort',
  log_level: 'logLevel',
  no_cache: 'noCache',
  no_tunnel: 'noTunnel',
  out_file: 'outFile',
  out_format: 'outFormat',
  output_format: 'outputFormat',
  param_name: 'paramName',
  preserve_temp_files: 'preserveTempFiles',
  project_directory: 'projectDirectory',
  project_name: 'projectName',
  query_timeout: 'queryTimeout',
  remote_resources: 'remoteResources',
  resource_name: 'resourceName',
  rollback_steps: 'rollbackSteps',
  rollback_version: 'rollbackVersion',
  script_name: 'scriptName',
  secret_file: 'secretFile',
  secret_name: 'secretName',
  secret_value: 'secretValue',
  show_sensitive_values: 'showSensitiveValues',
  source_path: 'sourcePath',
  start_time: 'startTime',
  take_over: 'takeOver',
  task_arn: 'taskArn'
};

// Every command is classified here; the type rejects a new command until it is, so none defaults to read-only.
const commandPolicies: Record<StacktapeCommand, Omit<CliCommandPolicy, 'requiresConfirmation'>> = {
  deploy: { category: 'deployment', safety: 'mutating' },
  delete: { category: 'deployment', safety: 'destructive' },
  rollback: { category: 'deployment', safety: 'mutating' },
  'cf:rollback': { category: 'deployment', safety: 'mutating' },
  diff: { category: 'deployment', safety: 'readOnly' },
  'deployment-script:run': { category: 'deployment', safety: 'mutating' },
  'script:run': { category: 'deployment', safety: 'mutating' },
  synth: { category: 'local', safety: 'local' },
  validate: { category: 'local', safety: 'local' },
  package: { category: 'local', safety: 'local' },

  dev: {
    category: 'dev',
    safety: 'interactive',
    unsupportedReason: 'Use the stacktape_dev MCP tool for dev-mode lifecycle operations.'
  },
  'dev:stop': {
    category: 'dev',
    safety: 'interactive',
    unsupportedReason: 'Use the stacktape_dev MCP tool for dev-mode lifecycle operations.'
  },
  'dev:network': { category: 'dev', safety: 'readOnly' },
  'dev:network:delete': { category: 'dev', safety: 'destructive' },

  'secret:set': { category: 'secrets', safety: 'mutating', sensitiveOutput: true },
  'secret:get': { category: 'secrets', safety: 'readOnly', sensitiveOutput: true },
  'secret:delete': { category: 'secrets', safety: 'destructive', sensitiveOutput: true },
  'param:get': { category: 'secrets', safety: 'readOnly', sensitiveOutput: true },

  logs: { category: 'diagnostics', safety: 'readOnly' },
  metrics: { category: 'diagnostics', safety: 'readOnly' },
  alarms: { category: 'diagnostics', safety: 'readOnly' },
  'query:sql': { category: 'diagnostics', safety: 'diagnostic' },
  'query:dynamodb': { category: 'diagnostics', safety: 'diagnostic' },
  'query:redis': { category: 'diagnostics', safety: 'diagnostic' },
  'query:opensearch': { category: 'diagnostics', safety: 'diagnostic' },
  'container:exec': { category: 'diagnostics', safety: 'mutating' },
  // The shared AWS SDK executor sends only reviewed read-only operations, whoever calls it.
  'aws:call': { category: 'diagnostics', safety: 'diagnostic' },
  'bastion:session': { category: 'diagnostics', safety: 'interactive' },
  'bastion:tunnel': { category: 'diagnostics', safety: 'interactive' },
  'container:session': { category: 'diagnostics', safety: 'interactive' },

  'info:stack': { category: 'diagnostics', safety: 'readOnly' },
  'info:stacks': { category: 'diagnostics', safety: 'readOnly' },
  'info:operations': { category: 'diagnostics', safety: 'readOnly' },
  'info:whoami': { category: 'account', safety: 'readOnly' },

  'aws-profile:create': { category: 'account', safety: 'mutating' },
  'aws-profile:update': { category: 'account', safety: 'mutating' },
  'aws-profile:delete': { category: 'account', safety: 'destructive' },
  'aws-profile:list': { category: 'account', safety: 'readOnly' },
  login: { category: 'account', safety: 'interactive' },
  logout: { category: 'account', safety: 'mutating' },
  'org:create': { category: 'account', safety: 'mutating' },
  'org:list': { category: 'account', safety: 'readOnly' },
  'org:delete': { category: 'account', safety: 'destructive' },

  'project:create': { category: 'project', safety: 'mutating' },
  'project:delete': { category: 'project', safety: 'destructive' },
  'project:list': { category: 'project', safety: 'readOnly' },
  init: { category: 'project', safety: 'interactive' },

  'defaults:configure': { category: 'config', safety: 'mutating' },
  'defaults:list': { category: 'config', safety: 'readOnly' },
  'domain:add': { category: 'config', safety: 'mutating' },
  'cf-module:update': { category: 'config', safety: 'mutating' },

  incidents: { category: 'errors', safety: 'readOnly' },
  'incidents:show': { category: 'errors', safety: 'readOnly' },
  'incidents:watch': { category: 'errors', safety: 'readOnly' },
  'incidents:ack': { category: 'errors', safety: 'mutating' },
  'incidents:resolve': { category: 'errors', safety: 'mutating' },
  'errors:list': { category: 'errors', safety: 'readOnly' },
  'errors:resolve': { category: 'errors', safety: 'mutating' },
  'errors:ignore': { category: 'errors', safety: 'mutating' },
  'errors:reopen': { category: 'errors', safety: 'mutating' },
  'alarms:export': { category: 'errors', safety: 'readOnly' },
  // Uploads the local AI sign-in to Stacktape, or removes it.
  'ai:connect': { category: 'account', safety: 'mutating' },
  'ai:disconnect': { category: 'account', safety: 'mutating' },

  mcp: {
    category: 'docs',
    safety: 'interactive',
    unsupportedReason: 'Running an MCP server from inside MCP is unsupported.'
  },
  'mcp:add': { category: 'docs', safety: 'mutating' },
  'mcp:remove': { category: 'docs', safety: 'mutating' },
  help: { category: 'utility', safety: 'readOnly' },
  version: { category: 'utility', safety: 'readOnly' },
  upgrade: { category: 'utility', safety: 'mutating' },
  'bucket:sync': { category: 'deployment', safety: 'mutating' }
};

export const normalizeCliArgs = (args?: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(args ?? {}).map(([key, value]) => [
      ARG_ALIASES[key] ?? key.replace(/[_-]([a-z])/g, (_, c: string) => c.toUpperCase()),
      value
    ])
  );

const isStacktapeCommand = (command: string): command is StacktapeCommand => cliCommandSet.has(command);

/** One pure normalization boundary for scripts, plans, runs and dev. JSON output keeps internal camelCase. */
export const normalizeCliInvocation = (command: string, args?: Record<string, unknown>) => {
  const id = resolveCommandName(command, cliCommands);
  const normalized: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(args ?? {})) {
    const key = resolveFlagName(ARG_ALIASES[name] ?? name.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), id);
    normalized[key] = value;
  }
  if (id === 'query:sql' && normalized.query !== undefined && normalized.sql === undefined) {
    normalized.sql = normalized.query;
    delete normalized.query;
  }
  return { command: id, args: normalized };
};
export const normalizeCliArgsForCommand = (command: string, args?: Record<string, unknown>) =>
  normalizeCliInvocation(command, args).args;

// Shell tokenization is only for discovering simple package scripts, never for executing them.
const tokenizeCommand = (command: string): string[] => {
  const tokens: string[] = [];
  let value = '';
  let quote: string | undefined;
  let started = false;
  for (let index = 0; index < command.length; index++) {
    const char = command[index];
    if (char === quote) {
      quote = undefined;
      continue;
    }
    if (quote === "'") {
      value += char;
      continue;
    }
    if (
      char === '\\' &&
      index + 1 < command.length &&
      (command[index + 1] === quote || command[index + 1] === '\\' || (!quote && /[\s'"]/.test(command[index + 1])))
    ) {
      value += command[++index];
      started = true;
      continue;
    }
    if (quote) {
      value += char;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      started = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (started) tokens.push(value);
      value = '';
      started = false;
      continue;
    }
    value += char;
    started = true;
  }
  if (quote) return [];
  if (started) tokens.push(value);
  return tokens;
};
const isStacktapeExecutableToken = (token: string): boolean => /(?:^|[\\/])stacktape(?:\.(?:cmd|exe))?$/.test(token);

export const parseStacktapeScriptCommand = (scriptCommand: string): ParsedStacktapeScriptCommand | undefined => {
  const tokens = tokenizeCommand(scriptCommand);
  const index = tokens.findIndex(isStacktapeExecutableToken);
  if (index < 0) return undefined;
  // Shell operators delimit the invocation; never discover flags in a following command.
  const suffix = tokens.slice(index + 1);
  const end = suffix.findIndex((token) => ['&&', '||', ';', '|'].includes(token));
  try {
    const parsed = parseCliInput(end < 0 ? suffix : suffix.slice(0, end));
    const normalized = normalizeCliInvocation(parsed.commands[0], parsed.options);
    if (!normalized.command) return undefined;
    return { command: normalized.command, args: normalized.args };
  } catch {
    return undefined;
  }
};

const commandMatchesScriptName = (command: StacktapeCommand, scriptName: string): boolean => {
  const normalizedCommand = command.replace(':', '-');
  const normalizedScript = scriptName.replace(':', '-');
  if (normalizedScript === normalizedCommand) return true;
  if (normalizedScript.includes(normalizedCommand)) return true;
  if (command === 'diff' && /\b(preview|diff)\b/.test(normalizedScript)) return true;
  if (command === 'deploy' && /\bdeploy\b/.test(normalizedScript)) return true;
  if (command.startsWith('query:') && normalizedScript.includes(command.split(':')[1])) return true;
  if (command.startsWith('secret:') && normalizedScript.includes(command.split(':')[1])) return true;
  return false;
};

/**
 * Where a package script runs its command: the directory (its package's, or its --current-working-directory) and the
 * config it names, both absolute. `scanDirectory` is what the package.json path is relative to.
 */
export const getPackageScriptLocation = (
  script: Pick<MatchedStacktapePackageScript, 'packageJsonPath' | 'parsedArgs'>,
  scanDirectory: string
): { directory: string; configPath?: string } => {
  const packageDirectory = resolve(scanDirectory, dirname(script.packageJsonPath));
  const { currentWorkingDirectory, configPath } = script.parsedArgs;
  const directory =
    typeof currentWorkingDirectory === 'string' ? resolve(packageDirectory, currentWorkingDirectory) : packageDirectory;
  return { directory, ...(typeof configPath === 'string' ? { configPath: resolve(directory, configPath) } : {}) };
};

/** The arguments of a script that pick what it deploys and where. */
const TARGET_ARGS = [
  'stage',
  'region',
  'projectName',
  'awsAccount',
  'profile',
  'configPath',
  'currentWorkingDirectory'
] as const;

/**
 * The package script that runs `command` for the project a request selects, used to fill in its target. With a config
 * path or directory in `location` (absolute), only scripts that run that config, or run in that directory, count. When
 * the best scripts tie and would deploy different targets, none is returned: guessing between them is worse than
 * asking.
 */
export const findStacktapePackageScript = ({
  packageJsonFiles,
  command,
  projectName,
  stage,
  scanDirectory,
  location
}: {
  packageJsonFiles: { path: string; name?: string; relevantScripts: Record<string, string> }[];
  command: StacktapeCommand;
  projectName?: string;
  stage?: string;
  /** The directory the package.json paths are relative to; required with `location`. */
  scanDirectory?: string;
  location?: { configPath?: string; directory?: string };
}): MatchedStacktapePackageScript | undefined => {
  const candidates: Array<MatchedStacktapePackageScript & { score: number }> = [];

  for (const packageJson of packageJsonFiles) {
    for (const [scriptName, scriptCommand] of Object.entries(packageJson.relevantScripts)) {
      const parsed = parseStacktapeScriptCommand(scriptCommand);
      if (!parsed || parsed.command !== command) continue;
      if (scanDirectory && (location?.configPath || location?.directory)) {
        const runs = getPackageScriptLocation(
          { packageJsonPath: packageJson.path, parsedArgs: parsed.args },
          scanDirectory
        );
        const matches = location.configPath
          ? runs.configPath
            ? runs.configPath === location.configPath
            : runs.directory === dirname(location.configPath)
          : runs.directory === location.directory ||
            (runs.configPath !== undefined && dirname(runs.configPath) === location.directory);
        if (!matches) continue;
      }

      let score = 0;
      if (commandMatchesScriptName(command, scriptName)) score += 30;
      if (
        stage &&
        (parsed.args.stage === stage || scriptName.includes(stage) || scriptCommand.includes(`--stage ${stage}`))
      )
        score += 30;
      if (
        projectName &&
        (parsed.args.projectName === projectName ||
          packageJson.name === projectName ||
          packageJson.path.includes(`/${projectName}/`) ||
          packageJson.path.includes(`\\${projectName}\\`))
      ) {
        score += 40;
      }

      candidates.push({
        packageJsonPath: packageJson.path,
        scriptName,
        scriptCommand,
        parsedCommand: parsed.command,
        parsedArgs: parsed.args,
        score
      });
    }
  }

  candidates.sort((left, right) => right.score - left.score);
  const [best, ...others] = candidates;
  const targetOf = (candidate: MatchedStacktapePackageScript) =>
    JSON.stringify([
      ...TARGET_ARGS.map((name) => candidate.parsedArgs[name]),
      scanDirectory ? getPackageScriptLocation(candidate, scanDirectory) : candidate.packageJsonPath
    ]);
  if (best && others.some((other) => other.score === best.score && targetOf(other) !== targetOf(best))) {
    return undefined;
  }
  return best;
};

const requiresConfirmationForSafety = (safety: CliCommandSafety): boolean =>
  safety === 'mutating' || safety === 'destructive';

const READ_ONLY_DIAGNOSTIC_OPERATIONS: Partial<Record<StacktapeCommand, ReadonlySet<string>>> = {
  'query:dynamodb': new Set(['scan', 'query', 'get', 'schema', 'sample']),
  'query:redis': new Set(['keys', 'get', 'ttl', 'info', 'type']),
  'query:opensearch': new Set(['search', 'get', 'indices', 'mapping', 'count'])
};

const hasValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

const RAW_STACKTAPE_CREDENTIAL_ARG_NAMES = new Set([
  'apiKey',
  'stacktapeApiKey',
  'stpApiKey',
  'STACKTAPE_API_KEY',
  'STP_API_KEY'
]);

export const getRawStacktapeCredentialArgNames = (args: Record<string, unknown>): string[] =>
  Object.keys(args).filter((argName) => RAW_STACKTAPE_CREDENTIAL_ARG_NAMES.has(argName));

const validateReadOnlyDiagnosticArgs = ({
  command,
  args
}: {
  command: StacktapeCommand;
  args: Record<string, unknown>;
}): PreparedCliRun | undefined => {
  if (command === 'query:sql' && args.sql !== undefined) {
    if (typeof args.sql !== 'string' || !isDefinitelyReadOnlySql(args.sql)) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: '`query sql` only supports read-only SQL; write-like or ambiguous statements cannot be executed.',
        data: { supportedReadOnlyStatements: ['SELECT', 'WITH', 'VALUES', 'SHOW', 'DESCRIBE', 'EXPLAIN'] },
        nextActions: [
          'Use a single read-only `SELECT`, `WITH`, `VALUES`, `SHOW`, `DESCRIBE`, or `EXPLAIN` statement.',
          'If a database write is intended, use a dedicated database migration or administration workflow outside this read-only diagnostic command.'
        ]
      };
    }
    return undefined;
  }

  // The executor refuses these anyway; refusing here keeps the CLI from starting and names what is accepted.
  if (command === 'aws:call' && typeof args.service === 'string' && typeof args.command === 'string') {
    if (isReadOnlyAwsCommand(args.service, args.command)) return undefined;
    const acceptedOperations = getReadOnlyAwsOperations(args.service);
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: `\`aws call\` sends only reviewed read-only operations, and \`${args.service}\` \`${args.command}\` is not one of them.`,
      data: acceptedOperations.length
        ? { acceptedOperations }
        : { supportedServices: Object.keys(AWS_READ_ONLY_OPERATIONS) },
      nextActions: [
        'Choose an accepted operation; stacktape_cli action=describe command=aws call lists them for every service.',
        'Writes and the Secrets Manager and SSM value reads are not available through aws call.'
      ]
    };
  }

  const supportedOperations = READ_ONLY_DIAGNOSTIC_OPERATIONS[command];
  if (!supportedOperations || args.operation === undefined) return undefined;
  if (typeof args.operation === 'string' && supportedOperations.has(args.operation.toLowerCase())) return undefined;

  const alternatives = [...supportedOperations];
  return {
    ok: false,
    code: 'VALIDATION_ERROR',
    message: `Unsupported read-only operation \`${String(args.operation)}\` for \`${publicCommandName(command)}\`.`,
    data: { supportedReadOnlyOperations: alternatives },
    nextActions: [
      `Choose one of the supported read-only operations: ${alternatives.map((operation) => `\`${operation}\``).join(', ')}.`,
      'If a write is intended, use the service-specific application, migration, or administration workflow; Stacktape diagnostic query commands do not execute writes.'
    ]
  };
};

const validateMcpSpecificArgs = ({
  command,
  args
}: {
  command: StacktapeCommand;
  args: Record<string, unknown>;
}): PreparedCliRun | undefined => {
  const rawCredentialArgs = getRawStacktapeCredentialArgNames(args);
  if (rawCredentialArgs.length > 0) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: `Raw Stacktape credential argument(s) are not accepted by MCP: ${rawCredentialArgs.join(', ')}`,
      data: {
        rejectedArgs: rawCredentialArgs,
        authModel:
          'Stacktape MCP reuses the local Stacktape CLI authentication state. Ask the user to run stacktape login in their own terminal, or configure STACKTAPE_API_KEY as a CI secret outside this conversation.'
      },
      nextActions: [
        'Do not ask the user to paste an API key into chat.',
        'Do not read ~/.stacktape, ~/.aws, ~/.ssh, or persisted credential files.',
        'For local use, tell the user to run stacktape login in their own terminal. For CI, tell them to configure a dedicated STACKTAPE_API_KEY secret outside this conversation.'
      ]
    };
  }

  if (command === 'secret:set') {
    if (!hasValue(args.secretName)) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Missing required argument(s) for ${publicCommandName(command)}: secretName`,
        data: { requiredArgs: ['region', 'secretName', 'secretValue or secretFile'] }
      };
    }
    const hasSecretValue = hasValue(args.secretValue);
    const hasSecretFile = hasValue(args.secretFile);
    if (!hasSecretValue && !hasSecretFile) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Missing required argument for ${publicCommandName(command)}. Provide one of: secretValue, secretFile`,
        data: { requiredAny: ['secretValue', 'secretFile'] }
      };
    }
    if (hasSecretValue && hasSecretFile) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Invalid argument(s) for ${publicCommandName(command)}. Provide only one of: secretValue, secretFile`,
        data: { exclusiveArgs: ['secretValue', 'secretFile'] }
      };
    }
  }

  if ((command === 'secret:get' || command === 'secret:delete') && !hasValue(args.secretName)) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: `Missing required argument(s) for ${publicCommandName(command)}: secretName`,
      data: { requiredArgs: ['region', 'secretName'] }
    };
  }

  return undefined;
};

// The MCP server runs every command with --agent and reads its JSON output, so these output-mode arguments are not the
// agent's to set; listing them only invites calls that break the run.
const MCP_MANAGED_ARGS = new Set(['agent', 'outputFormat', 'ui', 'help']);

const SHOW_SECRETS_REFUSAL =
  '`showSensitiveValues` would print secret values into this conversation. MCP never returns them: without it, a sensitive value comes back as <<OMITTED>>. Tell the user to run the command with --show-secrets in their own terminal.';

/**
 * Arguments MCP does not pass on, with what to use instead: ones that would keep a command running past what one MCP
 * call can wait for, and ones that would print secret values into the conversation.
 */
const MCP_REFUSED_ARGS: Partial<Record<StacktapeCommand, Record<string, string>>> = {
  logs: {
    follow:
      '`follow` keeps `stacktape logs` running until it is stopped, so an MCP call would not return. To watch a dev session\'s logs, use the stacktape_dev tool with action "logs"; for a deployed stack, run logs again with a later startTime.'
  },
  'param:get': { showSensitiveValues: SHOW_SECRETS_REFUSAL },
  deploy: { showSensitiveValues: SHOW_SECRETS_REFUSAL }
};

const isMcpExcludedArg = (command: StacktapeCommand, argName: string) =>
  MCP_MANAGED_ARGS.has(argName) || Boolean(MCP_REFUSED_ARGS[command]?.[argName]);

const getMcpAllowedArgs = (command: StacktapeCommand) =>
  getAllowedArgs(command).filter((argName) => !isMcpExcludedArg(command, argName));

const getMcpRequiredArgs = (command: StacktapeCommand): readonly string[] => {
  const baseRequiredArgs = getRequiredArgs(command);
  if (command === 'secret:set') return ['region', 'secretName', 'secretValue or secretFile'];
  if (command === 'secret:get' || command === 'secret:delete') return ['region', 'secretName'];
  if (command === 'package') return [...new Set([...baseRequiredArgs, 'projectName'])];
  return baseRequiredArgs;
};

export const getCliCommandPolicy = (command: StacktapeCommand, _args?: Record<string, unknown>): CliCommandPolicy => {
  const policy = commandPolicies[command];
  return { ...policy, requiresConfirmation: requiresConfirmationForSafety(policy.safety) };
};

export const listCliCommandSummaries = ({
  category,
  safety
}: {
  category?: CliCommandCategory;
  safety?: CliCommandSafety;
} = {}): CliCommandSummary[] =>
  cliCommands
    .map((command) => {
      const policy = getCliCommandPolicy(command);
      return {
        command: publicCommandName(command),
        canonicalCommand: command,
        description: getCommandDescription(command).split('\n')[0],
        category: policy.category,
        safety: policy.safety,
        requiresConfirmation: policy.requiresConfirmation,
        requiredArgs: getMcpRequiredArgs(command)
      };
    })
    .filter((summary) => (!category || summary.category === category) && (!safety || summary.safety === safety));

export const describeCliCommand = (name: string) => {
  const command = normalizeCliInvocation(name).command;
  if (!command) {
    return undefined;
  }

  const policy = getCliCommandPolicy(command);
  return {
    command: publicCommandName(command),
    canonicalCommand: command,
    description: getCommandDescription(command),
    category: policy.category,
    safety: policy.safety,
    requiresConfirmation: policy.requiresConfirmation,
    sensitiveOutput: policy.sensitiveOutput ?? false,
    unsupportedReason: policy.unsupportedReason,
    requiredArgs: getMcpRequiredArgs(command),
    allowedArgs: getMcpAllowedArgs(command),
    args: Object.fromEntries(
      Object.entries(getCommandInfo(command).args).filter(([argName]) => !isMcpExcludedArg(command, argName))
    ),
    // The SDK operation names aws:call accepts per service; inputs are the SDK command's own input shape as JSON.
    ...(command === 'aws:call' ? { acceptedOperations: AWS_READ_ONLY_OPERATIONS } : {})
  };
};

export const prepareCliRun = ({
  command,
  args,
  confirm,
  configSettings
}: {
  command: string;
  args?: Record<string, unknown>;
  confirm?: boolean;
  /** Project settings the command will read from its config; they satisfy the matching required arguments. */
  configSettings?: Readonly<Partial<Record<'projectName' | 'region', string>>>;
}): PreparedCliRun => {
  const invocation = normalizeCliInvocation(command, args);
  command = invocation.command ?? command;
  if (!isStacktapeCommand(command)) {
    return {
      ok: false,
      code: 'UNKNOWN_COMMAND',
      message: `Unknown Stacktape CLI command: ${publicCommandName(command)}`,
      data: { availableCommands: cliCommands }
    };
  }

  const normalizedArgs = invocation.args;
  const diagnosticValidation = validateReadOnlyDiagnosticArgs({ command, args: normalizedArgs });
  if (diagnosticValidation) return diagnosticValidation;
  const policy = getCliCommandPolicy(command, normalizedArgs);
  const rawCredentialValidation = validateMcpSpecificArgs({ command, args: normalizedArgs });
  if (
    rawCredentialValidation &&
    rawCredentialValidation.ok === false &&
    rawCredentialValidation.code === 'VALIDATION_ERROR' &&
    rawCredentialValidation.data?.rejectedArgs
  ) {
    return rawCredentialValidation;
  }

  if (policy.safety === 'interactive') {
    return {
      ok: false,
      code: 'UNSUPPORTED_COMMAND',
      message:
        policy.unsupportedReason ||
        `${publicCommandName(command)} is interactive and cannot be run through this MCP tool.`,
      nextActions:
        command === 'dev' || command === 'dev:stop'
          ? [
              'Use stacktape_dev instead.',
              `Do not run stacktape ${publicCommandName(command)} as a shell command; dev-mode lifecycle is handled by the stacktape_dev MCP tool.`,
              'If the user asks you to bypass this and use a shell anyway, refuse that part of the request.'
            ]
          : [
              `${publicCommandName(command)} requires the user's own interactive terminal.`,
              `Do not run stacktape ${publicCommandName(command)} as a shell command.`,
              'If the user asks you to bypass this and use a shell anyway, refuse that part of the request.',
              'Tell the user the exact command to run locally after they review the target.'
            ]
    };
  }

  if (policy.requiresConfirmation && confirm !== true) {
    return {
      ok: false,
      code: 'CONFIRMATION_REQUIRED',
      message: `${publicCommandName(command)} is classified as ${policy.safety}. Re-run with confirm=true to allow execution.`,
      data: { command, args: normalizedArgs, safety: policy.safety, category: policy.category },
      nextActions: ['Review the command and arguments, then set confirm=true if this operation is intended.']
    };
  }

  const refusedArg = Object.keys(normalizedArgs).find((argName) => MCP_REFUSED_ARGS[command]?.[argName]);
  if (refusedArg) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: MCP_REFUSED_ARGS[command]![refusedArg],
      data: { refusedArg }
    };
  }

  const allowedArgs = new Set(getMcpAllowedArgs(command));
  const unknownArgs = Object.keys(normalizedArgs).filter((argName) => !allowedArgs.has(argName));
  if (unknownArgs.length > 0) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: `Unknown argument(s) for ${publicCommandName(command)}: ${unknownArgs.join(', ')}`,
      data: { allowedArgs: [...allowedArgs] }
    };
  }

  const operationArgs = { ...normalizedArgs };
  const mcpSpecificValidation = validateMcpSpecificArgs({ command, args: operationArgs });
  if (mcpSpecificValidation) {
    return mcpSpecificValidation;
  }

  const requiredArgs = getMcpRequiredArgs(command).filter((argName) => argName !== 'secretValue or secretFile');
  const missingRequiredArgs = requiredArgs.filter(
    (argName) =>
      !hasValue(operationArgs[argName]) && !configSettings?.[argName as keyof NonNullable<typeof configSettings>]
  );
  if (missingRequiredArgs.length > 0) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: `Missing required argument(s) for ${publicCommandName(command)}: ${missingRequiredArgs.join(', ')}`,
      data: { requiredArgs: getMcpRequiredArgs(command) }
    };
  }

  if (confirm === true && allowedArgs.has('autoConfirmOperation')) {
    operationArgs.autoConfirmOperation = true;
  }

  const validation = validateCommandArgs(command, operationArgs);
  if (!validation.success) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: `Invalid argument(s) for ${publicCommandName(command)}.`,
      data: { issues: validation.error.issues }
    };
  }

  return {
    ok: true,
    command,
    args: validation.data as Record<string, unknown>,
    policy
  };
};
