import type { CanonicalStacktapeCommand, StacktapeCommand } from '../../config/cli/commands';
import { cliCommands, getCanonicalCommand } from '../../config/cli/commands';
import {
  getAllowedArgs,
  getCommandDescription,
  getCommandInfo,
  getRequiredArgs,
  validateCommandArgs
} from '../../config/cli/utils';

export type CliCommandSafety = 'readOnly' | 'diagnostic' | 'local' | 'mutating' | 'destructive' | 'interactive';

export type CliCommandCategory =
  | 'account'
  | 'config'
  | 'deployment'
  | 'dev'
  | 'diagnostics'
  | 'docs'
  | 'issues'
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
  command: StacktapeCommand;
  canonicalCommand: CanonicalStacktapeCommand;
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
  aws_account: 'awsAccount',
  bastion_resource: 'bastionResource',
  config_path: 'configPath',
  disable_auto_rollback: 'disableAutoRollback',
  disable_docker_remote_cache: 'disableDockerRemoteCache',
  disable_drift_detection: 'disableDriftDetection',
  disable_emulation: 'disableEmulation',
  disable_layer_optimization: 'disableLayerOptimization',
  docker_args: 'dockerArgs',
  end_time: 'endTime',
  fresh_db: 'freshDb',
  hot_swap: 'hotSwap',
  hs: 'hotSwap',
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
  task_arn: 'taskArn'
};

const policyOverrides: Partial<Record<StacktapeCommand, Partial<CliCommandPolicy>>> = {
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
  'aws:call': { category: 'diagnostics', safety: 'mutating' },
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
  'project:list': { category: 'project', safety: 'readOnly' },
  init: { category: 'project', safety: 'interactive' },

  'defaults:configure': { category: 'config', safety: 'mutating' },
  'defaults:list': { category: 'config', safety: 'readOnly' },
  'domain:add': { category: 'config', safety: 'mutating' },
  'cf-module:update': { category: 'config', safety: 'mutating' },

  'issues:list': { category: 'issues', safety: 'readOnly' },
  'issues:resolve': { category: 'issues', safety: 'mutating' },
  'issues:ignore': { category: 'issues', safety: 'mutating' },
  'issues:reopen': { category: 'issues', safety: 'mutating' },

  mcp: {
    category: 'docs',
    safety: 'interactive',
    unsupportedReason: 'Running an MCP server from inside MCP is unsupported.'
  },
  'mcp:add': { category: 'docs', safety: 'mutating' },
  help: { category: 'utility', safety: 'readOnly' },
  version: { category: 'utility', safety: 'readOnly' },
  upgrade: { category: 'utility', safety: 'mutating' },
  'bucket:sync': { category: 'deployment', safety: 'mutating' }
};

const toCamelCase = (value: string): string => value.replace(/[_-]([a-z])/g, (_, char: string) => char.toUpperCase());

export const normalizeCliArgs = (args?: Record<string, unknown>): Record<string, unknown> => {
  if (!args) return {};
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    normalized[ARG_ALIASES[key] || toCamelCase(key)] = value;
  }
  return normalized;
};

const isStacktapeCommand = (command: string): command is StacktapeCommand => cliCommandSet.has(command);

export const normalizeCliArgsForCommand = (
  command: string,
  args?: Record<string, unknown>
): Record<string, unknown> => {
  const normalized = normalizeCliArgs(args);
  if (command === 'query:sql' && normalized.query !== undefined && normalized.sql === undefined) {
    normalized.sql = normalized.query;
    delete normalized.query;
  }
  return normalized;
};

const tokenizeCommand = (command: string): string[] =>
  command.match(/"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|\S+/g)?.map((token) => token.replace(/^['"]|['"]$/g, '')) || [];

const isStacktapeExecutableToken = (token: string): boolean => /(?:^|[\\/])stacktape(?:\.(?:cmd|exe))?$/.test(token);

export const parseStacktapeScriptCommand = (scriptCommand: string): ParsedStacktapeScriptCommand | undefined => {
  const tokens = tokenizeCommand(scriptCommand);
  const stacktapeIndex = tokens.findIndex(isStacktapeExecutableToken);
  const command = stacktapeIndex === -1 ? undefined : tokens[stacktapeIndex + 1];
  if (!command || !isStacktapeCommand(command)) return undefined;

  const args: Record<string, unknown> = {};
  for (let index = stacktapeIndex + 2; index < tokens.length; index++) {
    const token = tokens[index];
    if (!token.startsWith('--')) continue;

    const [rawName, inlineValue] = token.slice(2).split('=', 2);
    const nextToken = tokens[index + 1];
    const hasSeparateValue = nextToken && !nextToken.startsWith('-');
    args[rawName] = inlineValue ?? (hasSeparateValue ? nextToken : true);
    if (hasSeparateValue && inlineValue === undefined) index++;
  }

  return {
    command,
    args: normalizeCliArgs(args)
  };
};

const commandMatchesScriptName = (command: StacktapeCommand, scriptName: string): boolean => {
  const canonicalCommand = getCanonicalCommand(command);
  const normalizedCommand = command.replace(':', '-');
  const normalizedCanonicalCommand = canonicalCommand.replace(':', '-');
  const normalizedScript = scriptName.replace(':', '-');
  if (normalizedScript === normalizedCommand) return true;
  if (normalizedScript === normalizedCanonicalCommand) return true;
  if (normalizedScript.includes(normalizedCommand)) return true;
  if (normalizedScript.includes(normalizedCanonicalCommand)) return true;
  if (canonicalCommand === 'diff' && /\b(preview|diff)\b/.test(normalizedScript)) return true;
  if (canonicalCommand === 'deploy' && /\bdeploy\b/.test(normalizedScript)) return true;
  if (canonicalCommand.startsWith('query:') && normalizedScript.includes(canonicalCommand.split(':')[1])) return true;
  if (canonicalCommand.startsWith('secret:') && normalizedScript.includes(canonicalCommand.split(':')[1])) return true;
  return false;
};

export const findStacktapePackageScript = ({
  packageJsonFiles,
  command,
  projectName,
  stage
}: {
  packageJsonFiles: { path: string; name?: string; relevantScripts: Record<string, string> }[];
  command: StacktapeCommand;
  projectName?: string;
  stage?: string;
}): MatchedStacktapePackageScript | undefined => {
  const candidates: Array<MatchedStacktapePackageScript & { score: number }> = [];

  for (const packageJson of packageJsonFiles) {
    for (const [scriptName, scriptCommand] of Object.entries(packageJson.relevantScripts)) {
      const parsed = parseStacktapeScriptCommand(scriptCommand);
      if (!parsed || getCanonicalCommand(parsed.command) !== getCanonicalCommand(command)) continue;

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
  return candidates[0];
};

const getDefaultPolicy = (command: StacktapeCommand): CliCommandPolicy => ({
  category: command.includes(':') ? 'utility' : 'local',
  safety: 'readOnly',
  requiresConfirmation: false
});

const requiresConfirmationForSafety = (safety: CliCommandSafety): boolean =>
  safety === 'mutating' || safety === 'destructive';

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
        message: `Missing required argument(s) for ${command}: secretName`,
        data: { requiredArgs: ['region', 'secretName', 'secretValue or secretFile'] }
      };
    }
    const hasSecretValue = hasValue(args.secretValue);
    const hasSecretFile = hasValue(args.secretFile);
    if (!hasSecretValue && !hasSecretFile) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Missing required argument for ${command}. Provide one of: secretValue, secretFile`,
        data: { requiredAny: ['secretValue', 'secretFile'] }
      };
    }
    if (hasSecretValue && hasSecretFile) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Invalid argument(s) for ${command}. Provide only one of: secretValue, secretFile`,
        data: { exclusiveArgs: ['secretValue', 'secretFile'] }
      };
    }
  }

  if ((command === 'secret:get' || command === 'secret:delete') && !hasValue(args.secretName)) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: `Missing required argument(s) for ${command}: secretName`,
      data: { requiredArgs: ['region', 'secretName'] }
    };
  }

  return undefined;
};

const getMcpRequiredArgs = (command: StacktapeCommand): readonly string[] => {
  const baseRequiredArgs = getRequiredArgs(command);
  if (command === 'secret:set') return ['region', 'secretName', 'secretValue or secretFile'];
  if (command === 'secret:get' || command === 'secret:delete') return ['region', 'secretName'];
  if (command === 'package') return [...new Set([...baseRequiredArgs, 'projectName'])];
  return baseRequiredArgs;
};

export const getCliCommandPolicy = (command: StacktapeCommand): CliCommandPolicy => {
  const override = policyOverrides[command] || {};
  const policy = {
    ...getDefaultPolicy(command),
    ...override
  };

  return {
    ...policy,
    requiresConfirmation: override.requiresConfirmation ?? requiresConfirmationForSafety(policy.safety)
  };
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
        command,
        canonicalCommand: getCanonicalCommand(command),
        description: getCommandDescription(command).split('\n')[0],
        category: policy.category,
        safety: policy.safety,
        requiresConfirmation: policy.requiresConfirmation,
        requiredArgs: getMcpRequiredArgs(command)
      };
    })
    .filter((summary) => (!category || summary.category === category) && (!safety || summary.safety === safety));

export const describeCliCommand = (command: string) => {
  if (!isStacktapeCommand(command)) {
    return undefined;
  }

  const policy = getCliCommandPolicy(command);
  const canonicalCommand = getCanonicalCommand(command);
  return {
    command,
    canonicalCommand,
    description: getCommandDescription(command),
    category: policy.category,
    safety: policy.safety,
    requiresConfirmation: policy.requiresConfirmation,
    sensitiveOutput: policy.sensitiveOutput ?? false,
    unsupportedReason: policy.unsupportedReason,
    requiredArgs: getMcpRequiredArgs(command),
    allowedArgs: getAllowedArgs(command),
    args: getCommandInfo(command).args
  };
};

export const prepareCliRun = ({
  command,
  args,
  confirm
}: {
  command: string;
  args?: Record<string, unknown>;
  confirm?: boolean;
}): PreparedCliRun => {
  if (!isStacktapeCommand(command)) {
    return {
      ok: false,
      code: 'UNKNOWN_COMMAND',
      message: `Unknown Stacktape CLI command: ${command}`,
      data: { availableCommands: cliCommands }
    };
  }

  const policy = getCliCommandPolicy(command);
  const normalizedArgs = normalizeCliArgsForCommand(command, args);
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
      message: policy.unsupportedReason || `${command} is interactive and cannot be run through this MCP tool.`,
      nextActions:
        command === 'dev' || command === 'dev:stop'
          ? [
              'Use stacktape_dev instead.',
              `Do not run stacktape ${command} through Bash; dev-mode lifecycle is handled by the stacktape_dev MCP tool.`,
              'If the user asks you to bypass this and use Bash anyway, refuse that part of the request.'
            ]
          : [
              `${command} requires the user's own interactive terminal.`,
              `Do not run stacktape ${command} through Bash or any non-interactive shell.`,
              'If the user asks you to bypass this and use Bash anyway, refuse that part of the request.',
              'Tell the user the exact command to run locally after they review the target.'
            ]
    };
  }

  if (policy.requiresConfirmation && confirm !== true) {
    return {
      ok: false,
      code: 'CONFIRMATION_REQUIRED',
      message: `${command} is classified as ${policy.safety}. Re-run with confirm=true to allow execution.`,
      data: { command, args: normalizedArgs, safety: policy.safety, category: policy.category },
      nextActions: ['Review the command and arguments, then set confirm=true if this operation is intended.']
    };
  }

  const allowedArgs = new Set(getAllowedArgs(command));
  const unknownArgs = Object.keys(normalizedArgs).filter((argName) => !allowedArgs.has(argName));
  if (unknownArgs.length > 0) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: `Unknown argument(s) for ${command}: ${unknownArgs.join(', ')}`,
      data: { allowedArgs: [...allowedArgs] }
    };
  }

  const operationArgs = { ...normalizedArgs };
  const mcpSpecificValidation = validateMcpSpecificArgs({ command, args: operationArgs });
  if (mcpSpecificValidation) {
    return mcpSpecificValidation;
  }

  const requiredArgs = getMcpRequiredArgs(command).filter((argName) => argName !== 'secretValue or secretFile');
  const missingRequiredArgs = requiredArgs.filter((argName) => !hasValue(operationArgs[argName]));
  if (missingRequiredArgs.length > 0) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: `Missing required argument(s) for ${command}: ${missingRequiredArgs.join(', ')}`,
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
      message: `Invalid argument(s) for ${command}.`,
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
