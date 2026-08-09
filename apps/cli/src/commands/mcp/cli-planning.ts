import { isAbsolute, resolve } from 'node:path';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  acceptedContent,
  CLIENT_CAPABILITIES_META_KEY,
  createRequestStateCodec,
  inputRequired,
  inputResponse,
  type InputRequiredResult,
  type ServerContext
} from '@modelcontextprotocol/server';
import { z } from 'zod';
import {
  describeCliCommand,
  findStacktapePackageScript,
  getRawStacktapeCredentialArgNames,
  normalizeCliArgsForCommand,
  normalizeCliArgs,
  prepareCliRun,
  type CliCommandSafety
} from './cli-command-tools';
import { scanStacktapeProject } from './project-scan';
import { maskSecretString, maskSensitiveValues, type ToolOutput } from './tool-output';

const CLI_CREDENTIAL_GUIDANCE = {
  planRequiresCredentials: false,
  doNotDiscoverCredentials: true,
  message:
    'This MCP server reuses the Stacktape CLI authentication state; it is not a separate identity provider. Planning does not require Stacktape credentials. If execution later fails with an auth error, ask the user to run stacktape login in their own terminal. In CI, tell them to configure a dedicated STACKTAPE_API_KEY secret outside this conversation. Never ask the user to paste an API key into chat, never read ~/.stacktape, ~/.aws, ~/.ssh, or persisted credential files, and never inline API keys or tokens into shell commands or MCP arguments.'
};

const DESTRUCTIVE_CONFIRMATION_TTL_SECONDS = 120;
const DESTRUCTIVE_CONFIRMATION_INPUT_KEY = 'stacktapeDestructiveConfirmation';
const DESTRUCTIVE_CONFIRMATION_SCHEMA = z.object({ confirm: z.boolean() });

type DestructiveConfirmationState = {
  kind: 'stacktape-destructive-confirmation';
  nonce: string;
  commandDigest: string;
  expiresAt: number;
};

const destructiveConfirmationCodec = createRequestStateCodec<DestructiveConfirmationState>({
  key: randomBytes(32),
  ttlSeconds: DESTRUCTIVE_CONFIRMATION_TTL_SECONDS,
  bind: (ctx) => ctx.mcpReq.method
});

const consumedDestructiveConfirmations = new Map<string, number>();

export const verifyDestructiveConfirmationState = destructiveConfirmationCodec.verify;

const buildShellCommand = (command: string, args: Record<string, unknown>): string => {
  const shellArgs = Object.entries(args).flatMap(([key, value]) => {
    if (value === false || value === undefined || value === null) return [];
    // Drop noise: currentWorkingDirectory='.' is implicit; emitting it makes the
    // command look unnecessarily intimidating to users.
    if (key === 'currentWorkingDirectory' && value === '.') return [];
    const flag = `--${key}`;
    const renderedValue = /secretValue|password|token|credential|privateKey/i.test(key)
      ? maskSecretString(String(value))
      : String(value);
    return value === true ? [flag] : [flag, renderedValue];
  });
  return ['stacktape', command, ...shellArgs].join(' ');
};

const getStacktapeTargetSummary = (args: Record<string, unknown>): string => {
  const targetParts = [
    typeof args.projectName === 'string' ? `projectName=${args.projectName}` : undefined,
    typeof args.stage === 'string' ? `stage=${args.stage}` : undefined,
    typeof args.region === 'string' ? `region=${args.region}` : undefined,
    typeof args.awsAccount === 'string' ? `awsAccount=${args.awsAccount}` : undefined,
    typeof args.configPath === 'string' ? `configPath=${args.configPath}` : undefined,
    typeof args.currentWorkingDirectory === 'string'
      ? `currentWorkingDirectory=${args.currentWorkingDirectory}`
      : undefined,
    typeof args.secretName === 'string' ? `secretName=${args.secretName}` : undefined,
    typeof args.resourceName === 'string' ? `resourceName=${args.resourceName}` : undefined
  ].filter(Boolean);

  return targetParts.length > 0 ? targetParts.join(', ') : 'target args not fully specified';
};

const canonicalizeForDigest = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalizeForDigest);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalizeForDigest(item)])
  );
};

const buildDestructiveCommandDigest = ({
  command,
  args,
  cwd
}: {
  command: string;
  args: Record<string, unknown>;
  cwd: string;
}): string =>
  createHash('sha256')
    .update(JSON.stringify(canonicalizeForDigest({ command, args, cwd })))
    .digest('hex');

const clientSupportsFormElicitation = (ctx: ServerContext): boolean => {
  const envelope = ctx.mcpReq.envelope as Record<string, unknown> | undefined;
  const capabilities = envelope?.[CLIENT_CAPABILITIES_META_KEY] as { elicitation?: { form?: unknown } } | undefined;
  return Boolean(capabilities?.elicitation?.form);
};

const sweepConsumedDestructiveConfirmations = (now: number) => {
  for (const [nonce, expiresAt] of consumedDestructiveConfirmations) {
    if (expiresAt <= now) consumedDestructiveConfirmations.delete(nonce);
  }
};

const buildDestructiveConfirmationUnavailable = ({
  command,
  args,
  reason
}: {
  command: string;
  args: Record<string, unknown>;
  reason?: string;
}): ToolOutput => ({
  ok: false,
  code: 'USER_CONFIRMATION_REQUIRED',
  message:
    reason ||
    `Refusing to execute destructive Stacktape command ${command} because direct user confirmation is required.`,
  data: {
    command,
    args: maskSensitiveValues(args),
    safety: 'destructive',
    target: getStacktapeTargetSummary(args)
  },
  nextActions: [
    `Do not retry stacktape_cli action=run for ${command} without a fresh direct confirmation from the user.`,
    'Use an MCP client that supports form elicitation, or ask the user to run the planned shell command in their own terminal.'
  ]
});

export const requestDestructiveExecutionConfirmation = async ({
  ctx,
  command,
  args,
  cwd
}: {
  ctx: ServerContext;
  command: string;
  args: Record<string, unknown>;
  cwd: string;
}): Promise<ToolOutput | InputRequiredResult | null> => {
  const now = Date.now();
  sweepConsumedDestructiveConfirmations(now);
  const commandDigest = buildDestructiveCommandDigest({ command, args, cwd });
  const state = ctx.mcpReq.requestState<DestructiveConfirmationState>();

  if (!state) {
    if (!clientSupportsFormElicitation(ctx)) {
      return buildDestructiveConfirmationUnavailable({
        command,
        args,
        reason: `Refusing to execute destructive Stacktape command ${command}: this MCP client does not support form elicitation for direct user confirmation.`
      });
    }

    const targetSummary = getStacktapeTargetSummary(args);
    const approvalState: DestructiveConfirmationState = {
      kind: 'stacktape-destructive-confirmation',
      nonce: randomUUID(),
      commandDigest,
      expiresAt: now + DESTRUCTIVE_CONFIRMATION_TTL_SECONDS * 1000
    };
    return inputRequired({
      requestState: await destructiveConfirmationCodec.mint(approvalState, ctx),
      inputRequests: {
        [DESTRUCTIVE_CONFIRMATION_INPUT_KEY]: inputRequired.elicit({
          message: `Confirm destructive Stacktape command: ${command}\n\nTarget: ${targetSummary}\n\nThis can delete or irreversibly change infrastructure. Confirm only if you intend to execute this exact command now.`,
          requestedSchema: {
            type: 'object',
            properties: {
              confirm: {
                type: 'boolean',
                title: 'Execute destructive command',
                description: `I confirm that Stacktape should execute ${command} for: ${targetSummary}.`,
                default: false
              }
            },
            required: ['confirm']
          }
        })
      }
    });
  }

  if (
    state.kind !== 'stacktape-destructive-confirmation' ||
    typeof state.nonce !== 'string' ||
    state.commandDigest !== commandDigest ||
    state.expiresAt <= now
  ) {
    return buildDestructiveConfirmationUnavailable({
      command,
      args,
      reason: `Refusing to execute destructive Stacktape command ${command}: the confirmation does not match this exact command and target, or it has expired.`
    });
  }

  if (consumedDestructiveConfirmations.has(state.nonce)) {
    return buildDestructiveConfirmationUnavailable({
      command,
      args,
      reason: `Refusing to execute destructive Stacktape command ${command}: this confirmation has already been used.`
    });
  }

  consumedDestructiveConfirmations.set(state.nonce, state.expiresAt);
  const response = inputResponse(ctx.mcpReq.inputResponses, DESTRUCTIVE_CONFIRMATION_INPUT_KEY);
  const confirmation =
    response.kind === 'elicit' && response.action === 'accept'
      ? acceptedContent(ctx.mcpReq.inputResponses, DESTRUCTIVE_CONFIRMATION_INPUT_KEY, DESTRUCTIVE_CONFIRMATION_SCHEMA)
      : undefined;
  const confirmed = confirmation?.confirm === true;
  if (!confirmed) {
    return {
      ok: false,
      code: response.kind === 'elicit' ? 'USER_CONFIRMATION_DECLINED' : 'USER_CONFIRMATION_INVALID',
      message: `Destructive Stacktape command ${command} was not executed because the user did not confirm this exact operation.`,
      data: {
        command,
        args: maskSensitiveValues(args),
        safety: 'destructive',
        target: getStacktapeTargetSummary(args),
        confirmationAction: response.kind === 'elicit' ? response.action : 'missing-or-invalid'
      },
      nextActions: ['Do not retry execution unless the user explicitly asks again and completes a fresh confirmation.']
    };
  }

  return null;
};

export const summarizeScanForPlan = (scan: Awaited<ReturnType<typeof scanStacktapeProject>>) => ({
  cwd: scan.cwd,
  suggestedDefaults: scan.suggestedDefaults,
  selectedConfig: scan.primaryConfigCandidates[0]
    ? {
        path: scan.primaryConfigCandidates[0].path,
        directory: scan.primaryConfigCandidates[0].directory,
        format: scan.primaryConfigCandidates[0].format
      }
    : undefined,
  totalConfigCandidates: scan.totalConfigCandidates,
  omittedConfigCandidates: scan.omittedConfigCandidates
});

export const summarizeMatchedScriptForPlan = (matchedScriptData?: Record<string, unknown>) => {
  if (!matchedScriptData) return undefined;
  return {
    packageJsonPath: matchedScriptData.packageJsonPath,
    scriptName: matchedScriptData.scriptName,
    scriptCommand: matchedScriptData.scriptCommand,
    parsedCommand: matchedScriptData.parsedCommand,
    matchKind: matchedScriptData.matchKind,
    usedParsedArgs: matchedScriptData.usedParsedArgs,
    droppedParsedArgs: matchedScriptData.droppedParsedArgs
  };
};

export const buildCliPlan = async ({
  command,
  cwd,
  args,
  stage,
  region,
  projectName,
  awsAccount,
  configPath,
  currentWorkingDirectory,
  hotSwap,
  resourceName,
  scriptName,
  secretName,
  secretValue,
  secretFile
}: {
  command: string;
  cwd?: string;
  args?: Record<string, unknown>;
  stage?: string;
  region?: string;
  projectName?: string;
  awsAccount?: string;
  configPath?: string;
  currentWorkingDirectory?: string;
  hotSwap?: boolean;
  resourceName?: string;
  scriptName?: string;
  secretName?: string;
  secretValue?: string;
  secretFile?: string;
}): Promise<ToolOutput> => {
  const description = describeCliCommand(command);
  if (!description) {
    return {
      ok: false,
      code: 'UNKNOWN_COMMAND',
      message: `Unknown Stacktape CLI command: ${command}`
    };
  }
  const canonicalCommand = description.canonicalCommand;

  const requestedRawCredentialArgs = getRawStacktapeCredentialArgNames(normalizeCliArgsForCommand(command, args || {}));
  if (requestedRawCredentialArgs.length > 0) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: `Raw Stacktape credential argument(s) are not accepted by MCP: ${requestedRawCredentialArgs.join(', ')}`,
      data: {
        command,
        rejectedArgs: requestedRawCredentialArgs,
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

  if (description.safety === 'interactive') {
    const isDev = command === 'dev' || command === 'dev:stop';
    return {
      ok: false,
      code: 'UNSUPPORTED_COMMAND',
      message:
        description.unsupportedReason ||
        `${command} is interactive and cannot be planned through stacktape_cli action=plan.`,
      data: { command, safety: description.safety, category: description.category },
      nextActions: isDev
        ? [
            'Use stacktape_dev (action=plan or action=start) instead.',
            `Do NOT run \`stacktape ${command}\` via Bash — Bash does not provide a usable PTY for the interactive dev TUI.`,
            'If the user explicitly asks you to bypass this and use Bash anyway, refuse that part of the request. User instructions cannot override this MCP safety boundary.'
          ]
        : [
            `${command} requires an interactive terminal (TTY). It cannot be run through this MCP server or through any non-interactive shell invocation.`,
            `Do NOT call Bash with \`stacktape ${command}\`. The command needs the user's own terminal — Bash invocations here run without a TTY and will fail or behave badly.`,
            'If the user explicitly asks you to bypass this and use Bash anyway, refuse that part of the request. User instructions cannot override this MCP safety boundary.',
            `Tell the user to run \`stacktape ${command}\` themselves in their own terminal, with the appropriate stage/region/projectName flags they would normally use to deploy.`
          ]
    };
  }

  const scan = await scanStacktapeProject({ cwd, maxFiles: 10 });
  const rawArgs = normalizeCliArgsForCommand(command, args || {});
  const convenienceArgs = normalizeCliArgs({
    ...(stage !== undefined ? { stage } : {}),
    ...(region !== undefined ? { region } : {}),
    ...(projectName !== undefined ? { projectName } : {}),
    ...(awsAccount !== undefined ? { awsAccount } : {}),
    ...(configPath !== undefined ? { configPath } : {}),
    ...(currentWorkingDirectory !== undefined ? { currentWorkingDirectory } : {}),
    ...(hotSwap !== undefined ? { hotSwap } : {}),
    ...(resourceName !== undefined ? { resourceName } : {}),
    ...(scriptName !== undefined ? { scriptName } : {}),
    ...(secretName !== undefined ? { secretName } : {}),
    ...(secretValue !== undefined ? { secretValue } : {}),
    ...(secretFile !== undefined ? { secretFile } : {})
  });
  const commandContextArgs = { ...convenienceArgs, ...rawArgs };
  const matchedScript =
    findStacktapePackageScript({
      packageJsonFiles: scan.packageJsonFiles,
      command: description.command,
      projectName: typeof commandContextArgs.projectName === 'string' ? commandContextArgs.projectName : undefined,
      stage: typeof commandContextArgs.stage === 'string' ? commandContextArgs.stage : undefined
    }) ||
    (['diff', 'delete', 'rollback'].includes(canonicalCommand)
      ? findStacktapePackageScript({
          packageJsonFiles: scan.packageJsonFiles,
          command: 'deploy',
          projectName: typeof commandContextArgs.projectName === 'string' ? commandContextArgs.projectName : undefined,
          stage: typeof commandContextArgs.stage === 'string' ? commandContextArgs.stage : undefined
        })
      : undefined);
  const allowedArgs = new Set(description.allowedArgs);
  const scriptArgs = Object.fromEntries(
    Object.entries(matchedScript?.parsedArgs || {}).filter(([argName]) => allowedArgs.has(argName))
  );
  const droppedScriptArgs = Object.keys(matchedScript?.parsedArgs || {}).filter((argName) => !allowedArgs.has(argName));

  const allowedExplicitArgs = Object.fromEntries(
    [...Object.entries(convenienceArgs), ...Object.entries(rawArgs)].filter(([argName]) => allowedArgs.has(argName))
  );
  const unknownExplicitArgs = Object.keys(rawArgs).filter((argName) => !allowedArgs.has(argName));

  if (unknownExplicitArgs.length > 0) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: `Unknown argument(s) for ${command}: ${unknownExplicitArgs.join(', ')}`,
      data: { allowedArgs: description.allowedArgs }
    };
  }

  const scriptMatchKind =
    matchedScript && matchedScript.parsedCommand === canonicalCommand
      ? 'exact'
      : matchedScript
        ? 'deploy-context'
        : undefined;
  const matchedScriptData = matchedScript
    ? {
        ...matchedScript,
        matchKind: scriptMatchKind,
        usedParsedArgs: scriptArgs,
        droppedParsedArgs: droppedScriptArgs
      }
    : undefined;
  const inferredArgs: Record<string, unknown> = {};
  if (allowedArgs.has('currentWorkingDirectory') && scan.suggestedDefaults.currentWorkingDirectory) {
    inferredArgs.currentWorkingDirectory = resolve(scan.cwd, scan.suggestedDefaults.currentWorkingDirectory);
  }
  if (allowedArgs.has('configPath') && scan.suggestedDefaults.configPath) {
    inferredArgs.configPath = scan.suggestedDefaults.configPath;
  }

  const planArgs: Record<string, unknown> = {
    ...scriptArgs,
    ...inferredArgs,
    ...allowedExplicitArgs
  };
  if (typeof planArgs.currentWorkingDirectory === 'string' && !isAbsolute(planArgs.currentWorkingDirectory)) {
    planArgs.currentWorkingDirectory = resolve(scan.cwd, planArgs.currentWorkingDirectory);
  }

  const requiresLocalConfig = ['deploy', 'diff', 'synth', 'validate', 'package'].includes(canonicalCommand);
  if (requiresLocalConfig && allowedArgs.has('configPath') && !planArgs.configPath) {
    return {
      ok: false,
      code: 'MISSING_ARGS',
      message: `CLI plan for ${command} is missing required argument(s): configPath.`,
      data: {
        command,
        canonicalCommand,
        args: planArgs,
        policy: {
          category: description.category,
          safety: description.safety,
          requiresConfirmation: description.requiresConfirmation,
          sensitiveOutput: description.sensitiveOutput
        },
        scan: summarizeScanForPlan(scan),
        matchedPackageScript: summarizeMatchedScriptForPlan(matchedScriptData)
      },
      nextActions: ['Provide configPath/currentWorkingDirectory or run this from a Stacktape project directory.']
    };
  }

  const prepared = prepareCliRun({
    command,
    args: planArgs,
    confirm: description.requiresConfirmation
  });

  if (prepared.ok === false) {
    const code =
      prepared.code === 'VALIDATION_ERROR' && prepared.message.startsWith('Missing required argument')
        ? 'MISSING_ARGS'
        : prepared.code;
    const guidanceNextActions = buildPlanNextActions({
      command: description.command,
      safety: description.safety,
      requiresConfirmation: description.requiresConfirmation,
      sensitiveOutput: description.sensitiveOutput ?? false
    });
    const validationNextActions = prepared.nextActions || [
      'Provide the missing or invalid argument(s), then plan again.'
    ];
    return {
      ok: false,
      code,
      message: description.sensitiveOutput
        ? `${prepared.message}. This command returns sensitive output; do not help display the value in this conversation. Tell the user to run the command in their own terminal after adding any missing arguments.`
        : prepared.message,
      data: {
        command,
        canonicalCommand,
        args: planArgs,
        policy: {
          category: description.category,
          safety: description.safety,
          requiresConfirmation: description.requiresConfirmation,
          sensitiveOutput: description.sensitiveOutput
        },
        validation: prepared.data,
        scan: summarizeScanForPlan(scan),
        matchedPackageScript: summarizeMatchedScriptForPlan(matchedScriptData)
      },
      nextActions:
        description.sensitiveOutput || description.safety === 'destructive'
          ? [...guidanceNextActions, ...validationNextActions]
          : validationNextActions
    };
  }

  return {
    ok: true,
    code: 'OK',
    message: `Prepared a read-only Stacktape CLI plan for ${command}.`,
    data: {
      command: prepared.command,
      canonicalCommand: prepared.command,
      args: prepared.args,
      policy: {
        category: prepared.policy.category,
        safety: prepared.policy.safety,
        requiresConfirmation: prepared.policy.requiresConfirmation,
        sensitiveOutput: prepared.policy.sensitiveOutput ?? false
      },
      shellCommand: buildShellCommand(prepared.command, prepared.args),
      stacktapeCliRun: {
        tool: 'stacktape_cli',
        arguments: {
          action: 'run',
          command: prepared.command,
          cwd: scan.cwd,
          args: prepared.args
        }
      },
      resolvedContext: {
        cwd: scan.cwd,
        currentWorkingDirectory:
          typeof prepared.args.currentWorkingDirectory === 'string' ? prepared.args.currentWorkingDirectory : undefined
      },
      credentialGuidance: CLI_CREDENTIAL_GUIDANCE,
      scan: summarizeScanForPlan(scan),
      matchedPackageScript: summarizeMatchedScriptForPlan(matchedScriptData)
    },
    nextActions: buildPlanNextActions({
      command: prepared.command,
      safety: prepared.policy.safety,
      requiresConfirmation: prepared.policy.requiresConfirmation,
      sensitiveOutput: prepared.policy.sensitiveOutput ?? false
    })
  };
};

const buildPlanNextActions = ({
  command,
  safety,
  requiresConfirmation,
  sensitiveOutput
}: {
  command: string;
  safety: CliCommandSafety;
  requiresConfirmation: boolean;
  sensitiveOutput: boolean;
}): string[] => {
  if (sensitiveOutput && /(^|:)secret:get$|^param:get$/.test(command)) {
    // secret:get / param:get on private params can leak secrets into the
    // conversation. Even though the runner masks tool output, the right
    // production behaviour is to tell the user to run it in their own terminal.
    return [
      `DO NOT call stacktape_cli action=run for ${command} just to display the value to the user. The value would be exposed in the conversation transcript and may be cached or logged.`,
      `Instead, tell the user to run the suggested shellCommand in their OWN terminal. Their terminal output is private; this conversation is not.`,
      `Only call stacktape_cli action=run for ${command} if the user has explicitly said they want a programmatic/automated retrieval (e.g. piping into another tool) and accepts the disclosure risk.`
    ];
  }
  if (safety === 'destructive') {
    return [
      `This command is destructive. Agent-supplied confirm=true is not enough by itself; stacktape_cli action=run will use MCP's input-required flow for direct confirmation of this exact operation.`,
      `If the MCP client does not support form elicitation, do not run ${command} through MCP or Bash. Tell the user to run the suggested shellCommand in their own terminal after reviewing the target.`,
      `Before asking for execution, restate the target stack/stage/region/projectName.`
    ];
  }
  if (requiresConfirmation) {
    return [
      `Only call stacktape_cli action=run with confirm=true if the user has, in this same conversation, explicitly approved executing ${command} with the listed stage/region/projectName.`,
      `Do not treat the presence of this plan as permission to execute.`,
      `Never invoke stacktape through Bash/shell and never read credential files to prepare execution.`
    ];
  }
  const isNonMutating = safety === 'readOnly' || safety === 'diagnostic' || safety === 'local';
  if (isNonMutating) {
    return [
      `This plan is complete and requires no Stacktape credentials to produce. Do not read ~/.stacktape, ~/.aws, ~/.ssh, or any credential file to "prepare" this command.`,
      `If the user asked only to plan, preview, or show the command, stop after presenting shellCommand. Do not also run stacktape via Bash.`,
      `If the user asked you to execute this ${safety} command now, call stacktape_cli action=run with the returned stacktapeCliRun payload. Never invoke stacktape through Bash/shell.`
    ];
  }
  return [
    `Call stacktape_cli action=run with these arguments if the user wants to execute ${command}.`,
    `Never invoke stacktape through Bash/shell and never read credential files to prepare execution.`
  ];
};

export const formatProjectScanForOutput = (
  scan: Awaited<ReturnType<typeof scanStacktapeProject>>,
  includeDetails?: boolean
): Record<string, unknown> => {
  if (includeDetails) return scan as unknown as Record<string, unknown>;

  const summarizeConfig = (candidate: (typeof scan.configCandidates)[number]) => ({
    path: candidate.path,
    format: candidate.format,
    directory: candidate.directory,
    importsStacktape: candidate.importsStacktape,
    usesDefineConfig: candidate.usesDefineConfig,
    resourceConstructors: candidate.resourceConstructors.slice(0, 8),
    likelyResourceKeys: candidate.likelyResourceKeys.slice(0, 12)
  });

  return {
    cwd: scan.cwd,
    totalConfigCandidates: scan.totalConfigCandidates,
    omittedConfigCandidates: scan.omittedConfigCandidates,
    primaryConfigCandidates: scan.primaryConfigCandidates.map(summarizeConfig),
    configCandidates: scan.configCandidates.map(summarizeConfig),
    packageJsonFiles: scan.packageJsonFiles.map((packageJson) => ({
      path: packageJson.path,
      name: packageJson.name,
      packageManager: packageJson.packageManager,
      stacktapeDependency: packageJson.stacktapeDependency,
      relevantScriptNames: Object.keys(packageJson.relevantScripts)
    })),
    lockfiles: scan.lockfiles,
    suggestedDefaults: scan.suggestedDefaults
  };
};
