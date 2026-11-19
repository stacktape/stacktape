import type { StageType } from './stages.js';
import { z } from 'zod';
import type { GuardrailDefinition } from './guardrails.js';
import type { RecordSecurityReportParams, RecordSecurityReportResponse, SecurityScanningLevel } from './security.js';
import { sourceMapManifestSchema } from './source-maps.js';

/**
 * The Console API's API-key surface: procedures a Stacktape API key authorizes, scoped to the organization
 * the key belongs to.
 *
 * Deployment tokens authenticate against this same surface but reach only the subset of procedures a
 * deployment needs; the server decides that, and it is deliberately not described here.
 */

const recordStackOperationFieldsSchema = z.object({
  invocationId: z.string(),
  command: z.string().optional().nullable(),
  stackName: z.string().optional().nullable(),
  projectName: z.string().optional().nullable(),
  awsAccessKeyId: z.string().optional().nullable(),
  awsAccountId: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  startTime: z.number().optional().nullable(),
  endTime: z.number().optional().nullable(),
  gitUrl: z.string().optional().nullable(),
  gitCommit: z.string().optional().nullable(),
  gitBranch: z.string().optional().nullable(),
  success: z.boolean().optional().nullable(),
  description: z.string().optional().nullable(),
  /**
   * Why an `afterDeploy` hook failed after this deploy finished. `success` stays true, because the new release is live
   * and the Console reads `success` to know that. The command itself failed, which is what a Git provider status and a
   * runner job report.
   */
  hookFailure: z.string().optional().nullable(),
  /**
   * The operation's command-line flags. Only the flags in {@link recordedCommandArgs} are kept; the parser strips
   * the rest, including those sent by older CLIs. The Console reads `stage` out of it.
   */
  commandArgs: z.record(z.string(), z.unknown()).optional().nullable(),
  logStreamName: z.string().optional().nullable(),
  inProgress: z.boolean().optional().nullable(),
  interrupted: z.boolean().optional().nullable(),
  pullRequestNumber: z.string().optional().nullable(),
  stacktapeVersion: z.string().optional().nullable(),
  accountConnectionId: z.string().optional().nullable(),
  ciProvider: z.string().optional().nullable(),
  /** Whether this deployment wired Issues (runtime errors read from logs) for its stack; the Console shows coverage from it. */
  issuesEnabled: z.boolean().optional().nullable(),
  /**
   * Which source maps in the stack's deployment bucket describe each function this operation deploys. Sent before the
   * code switches and again with each function's `activeSince` once it has.
   */
  sourceMaps: sourceMapManifestSchema.optional().nullable(),
  /**
   * @deprecated Stacktape 3 CLIs send the project name in this field. The Console reads it as `projectName`, so their
   * deployments still belong to the project. Send `projectName`.
   */
  serviceName: z.string().optional().nullable()
});

/**
 * Flags an operation record keeps. They name the target and how the command ran. Flags whose value is free-form input,
 * such as `--dockerArgs` (which can carry build credentials), script `--env`, command bodies and SDK inputs, never
 * leave the CLI. Each kept value must be a string, number or boolean.
 */
const RECORDED_COMMAND_ARG_NAMES = new Set([
  'stage',
  'region',
  'projectName',
  'awsAccount',
  'configPath',
  'autoConfirmOperation',
  'autoRollback',
  'fullDeploy',
  'skipReleaseCommand',
  'runner',
  'noCache',
  'disableDockerRemoteCache',
  'disableLayerOptimization',
  'preserveTempFiles',
  'targetVersion',
  'rollbackSteps',
  'scriptName',
  'resourceName',
  'bucketId',
  'invalidateCdnCache',
  'headersPreset',
  'logLevel',
  'agent'
]);

/** How the CLI was invoked (for example by a coding agent's MCP tool). The CLI adds it under this key. */
const INVOCATION_CONTEXT_ARG_NAME = '__stacktapeInvocation';
const INVOCATION_CONTEXT_FIELDS = ['initiator', 'interface', 'client', 'tool'] as const;
const MAX_INVOCATION_CONTEXT_VALUE_LENGTH = 80;

type RecordedCommandArgValue = string | number | boolean;
export type RecordedCommandArgs = Record<string, RecordedCommandArgValue | Record<string, string>>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** Keeps only the flags an operation record may store. See {@link RECORDED_COMMAND_ARG_NAMES}. */
export const recordedCommandArgs = (args: Record<string, unknown>): RecordedCommandArgs => {
  const recorded: RecordedCommandArgs = {};
  for (const [name, value] of Object.entries(args)) {
    if (name === INVOCATION_CONTEXT_ARG_NAME && isPlainObject(value)) {
      const context: Record<string, string> = {};
      for (const field of INVOCATION_CONTEXT_FIELDS) {
        const fieldValue = value[field];
        if (typeof fieldValue === 'string') context[field] = fieldValue.slice(0, MAX_INVOCATION_CONTEXT_VALUE_LENGTH);
      }
      recorded[name] = context;
    } else if (
      RECORDED_COMMAND_ARG_NAMES.has(name) &&
      (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    ) {
      recorded[name] = value;
    }
  }
  return recorded;
};

export const recordStackOperationInputSchema = recordStackOperationFieldsSchema.transform(
  ({ serviceName, commandArgs, ...operation }) => ({
    ...operation,
    commandArgs: commandArgs ? recordedCommandArgs(commandArgs) : commandArgs,
    projectName: operation.projectName ?? serviceName
  })
);

export const createDeploymentTokenFromCliInputSchema = z.object({
  projectName: z.string(),
  accountConnectionId: z.string(),
  awsAccountId: z.string(),
  invocationId: z.string().trim().min(1)
});

export const exchangeGithubActionsTokenInputSchema = z.object({ nonce: z.uuid() });
export type ExchangeGithubActionsTokenParams = z.infer<typeof exchangeGithubActionsTokenInputSchema>;
export type ExchangeGithubActionsTokenResponse = { apiKey: string; invocationId: string };

export const ec2DeployFromCliInputSchema = z.object({
  invocationId: z.string().optional(),
  projectName: z.string(),
  accountConnectionId: z.string(),
  awsAccountId: z.string(),
  region: z.string(),
  stage: z.string(),
  gitUrl: z.string(),
  gitBranch: z.string(),
  gitCommit: z.string(),
  gitCommitMessage: z.string().optional().nullable(),
  configPath: z.string().optional().nullable(),
  fullDeploy: z.boolean().optional()
});

export const ec2DeployStatusFromCliInputSchema = z.object({
  invocationId: z.string()
});

export const createOrganizationFromCliInputSchema = z.object({
  name: z.string().trim().min(1)
});

export const deleteOrganizationFromCliInputSchema = z.object({
  id: z.string().trim().min(1)
});

export const awsConnectionInputSchema = z.object({
  organizationId: z.string(),
  connectionName: z.string(),
  connectionMode: z.enum(['BASIC', 'PRIVILEGED'])
});

export const getAwsConnectionStatusInputSchema = z.object({
  connectionId: z.string()
});

/** `stacktape connect` on an account that is already connected: look for its Stacktape stacks again. */
export const findExistingStacksFromCliInputSchema = z.object({
  connectionId: z.string()
});

export const getGitProviderConnectionStatusInputSchema = z
  .object({
    organizationId: z.string(),
    provider: z.enum(['GITHUB', 'GITLAB', 'BITBUCKET']),
    owner: z
      .string()
      .trim()
      .min(1)
      .max(512)
      .regex(/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/u),
    repository: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[a-zA-Z0-9_.-]+$/u)
  })
  .superRefine((input, context) => {
    if (input.provider !== 'GITLAB' && input.owner.includes('/')) {
      context.addIssue({ code: 'custom', path: ['owner'], message: 'Only GitLab repository owners can be nested.' });
    }
  });

export const createGitDeploymentConfigFromCliInputSchema = z.object({
  organizationId: z.string(),
  projectId: z.string(),
  gitProviderInstallationId: z.string().min(1),
  gitProviderRepositoryId: z.string().min(1),
  awsAccountConnectionId: z.string(),
  branch: z.string(),
  targetRegion: z.string(),
  stage: z.string(),
  deployOnGitEvent: z.enum(['PUSHED_TO_BRANCH', 'PULL_REQUEST_OPENED']),
  configPath: z.string().nullable(),
  /** Links the selected repository to a project that has none yet, such as one created by a CLI deploy. */
  provider: z.enum(['GITHUB', 'GITLAB', 'BITBUCKET']).optional()
});

export const reportEventInputSchema = z.object({
  type: z.string(),
  severity: z.string().default('INFO'),
  project: z.string().optional(),
  stage: z.string().optional(),
  region: z.string().optional(),
  title: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  invocationId: z.string().optional(),
  // Release identity, reported with deploy outcomes: the CFN deployment version this operation
  // produced and the hash of the resolved config it deployed.
  deploymentVersion: z.string().optional(),
  configRevision: z.string().optional(),
  // Explicit stage classification from stack config. 'unset' means the config declares none (the
  // stored setting is removed and name inference takes over); an absent field means an older CLI
  // that cannot say either way, which changes nothing.
  stageType: z.enum(['production', 'non-production', 'unset']).optional(),
  // The CloudFormation stack status after a failed operation, so the Console can tell "the deploy
  // command failed" apart from "the stack itself is left unhealthy".
  stackStatus: z.string().optional()
});

export const awsAccountCredentialsInputSchema = z.object({
  awsAccountName: z.string()
});

export const defaultDomainsInfoInputSchema = z.object({
  stackName: z.string(),
  region: z.string(),
  awsAccountId: z.string(),
  /**
   * The default-domain version of the deployed stack's existing default domains, read by the CLI from the deployed
   * template; `null` when the stack has none. CLIs that omit it get the version the Console reads from the stack.
   */
  deployedVersion: z.number().int().positive().nullable().optional()
});

export const createProjectFromCliInputSchema = z.object({
  name: z.string().trim().min(1),
  configPath: z.string().optional().nullable(),
  region: z.string().optional().nullable()
});

export const deleteUndeployedStageFromCliInputSchema = z.object({
  projectName: z.string(),
  stageName: z.string()
});

export const deleteProjectFromCliInputSchema = z.object({
  projectName: z.string().trim().min(1)
});

export const recentStackOperationsInputSchema = z.object({
  projectName: z.string().optional(),
  stage: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional()
});

export const organizationActivityFromCliInputSchema = z.object({
  commands: z.string().array().optional().nullable(),
  projectName: z.string().optional().nullable(),
  stage: z.string().optional().nullable(),
  currentUserOnly: z.boolean().optional(),
  search: z.string().trim().min(1).optional(),
  sortBy: z.enum(['createdAt', 'projectName', 'command', 'deploymentTrigger', 'gitCommit', 'userName']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().nonnegative().optional(),
  pageSize: z.number().int().positive().max(200).optional()
});

export const stackDetailsInputSchema = z.object({
  stackName: z.string(),
  region: z.string(),
  awsAccountName: z.string().optional()
});

export const listIssuesInputSchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED', 'IGNORED']).optional(),
  project: z.string().optional(),
  stage: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional()
});

export const issueActionInputSchema = z.object({ issueId: z.string() });

export const listIncidentsInputSchema = z.object({
  // 'ACTIVE' = OPEN + ACKNOWLEDGED, the queue's default view.
  status: z.enum(['ACTIVE', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'ALL']).optional(),
  project: z.string().optional(),
  stage: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional()
});

export const incidentActionInputSchema = z.object({ incidentId: z.string() });

/** The providers whose subscription a member can connect from the CLI, as the `ai connect` command names them. */
export const aiSubscriptionProviderSchema = z.enum(['claude', 'codex', 'grok', 'opencode']);

/**
 * `stacktape ai connect`: a member's own sign-in with one provider, as that provider's agent keeps it. Claude: the
 * token `claude setup-token` prints. Codex: the ChatGPT tokens `codex login` writes, never an API key. Grok and
 * OpenCode: the sign-in file `grok login` or `opencode auth login` writes.
 */
export const connectAiSubscriptionInputSchema = z.discriminatedUnion('provider', [
  z.object({ provider: z.literal('claude'), token: z.string().min(1).max(512) }).strict(),
  z
    .object({
      provider: z.literal('codex'),
      tokens: z
        .object({
          id_token: z.string().min(1).max(16_384),
          access_token: z.string().min(1).max(16_384),
          refresh_token: z.string().min(1).max(4_096),
          account_id: z.string().min(1).max(200)
        })
        .strict(),
      lastRefresh: z.string().max(64).nullable()
    })
    .strict(),
  z.object({ provider: z.literal('grok'), authFile: z.record(z.string().max(512), z.unknown()) }).strict(),
  z.object({ provider: z.literal('opencode'), authFile: z.record(z.string().max(200), z.unknown()) }).strict()
]);

/** `stacktape ai disconnect`: the provider whose sign-in to remove. */
export const disconnectAiSubscriptionInputSchema = z.object({ provider: aiSubscriptionProviderSchema }).strict();

/**
 * Deploy-time resolution of `slack-app` channels in the config: a channel name (with or without `#`) or ID in the
 * organization's connected Slack workspace becomes the stable ID delivery uses. Public channels are joined so
 * evidence uploads work; private ones must have the app invited first.
 */
export const resolveSlackChannelsInputSchema = z.object({
  channels: z.array(z.string().trim().min(1).max(200)).min(1).max(100)
});

export type ResolveSlackChannelsParams = z.input<typeof resolveSlackChannelsInputSchema>;

export type ResolvedSlackChannel = {
  /** The reference exactly as written in the config. */
  channel: string;
  connectionId: string;
  channelId: string;
  channelName: string;
};

export type ResolveSlackChannelsResponse = {
  /** Null when the organization has no active Slack workspace connection. */
  workspace: { teamName: string } | null;
  resolved: ResolvedSlackChannel[];
  /** References that could not be resolved, each with the reason to show the deployer. */
  unresolved: Array<{ channel: string; reason: string }>;
};

type UptimeCheckWireChannel = {
  name: string;
  type: 'slack' | 'slack_app' | 'ms_teams' | 'e_mail' | 'discord' | 'webhook' | 'console-channel';
  properties: unknown;
};

const stringProperties = (properties: unknown, names: readonly string[]): Record<string, string> => {
  const picked: Record<string, string> = {};
  if (!isPlainObject(properties)) return picked;
  for (const name of names) {
    const value = properties[name];
    if (typeof value === 'string') picked[name] = value;
  }
  return picked;
};

/**
 * The uptime-check channels the Console may store. The Console delivers uptime notifications, so a check refers only to
 * destinations that hold no credentials: a Console channel by name, a channel of the connected Slack app, or an email
 * address. Channels that carry a bot token or webhook URL (`slack`, `ms_teams`, `discord`, `webhook`) are dropped, and
 * every kept channel keeps only its named properties.
 */
export const uptimeCheckChannelsWithoutCredentials = (channels: UptimeCheckWireChannel[]) => {
  const kept: Array<{
    name: string;
    type: 'slack_app' | 'e_mail' | 'console-channel';
    properties: Record<string, string>;
  }> = [];
  for (const { name, type, properties } of channels) {
    if (type === 'console-channel') kept.push({ name, type, properties: {} });
    if (type === 'slack_app') {
      kept.push({
        name,
        type,
        properties: stringProperties(properties, ['channel', 'connectionId', 'channelId', 'channelName'])
      });
    }
    if (type === 'e_mail') kept.push({ name, type, properties: stringProperties(properties, ['sender', 'recipient']) });
  }
  return kept;
};

export const syncUptimeChecksInputSchema = z.object({
  project: z.string().min(1),
  stage: z.string().min(1),
  checks: z
    .array(
      z.object({
        name: z.string().min(1),
        /** Content hash of the check definition; probe results from other revisions are dropped. */
        revision: z.string().min(1),
        enabled: z.boolean(),
        url: z.string().min(1),
        method: z.enum(['GET', 'HEAD']),
        intervalSeconds: z.number().int().min(1),
        timeoutSeconds: z.number().int().min(1),
        followRedirects: z.boolean(),
        assertions: z.array(z.object({ type: z.string(), properties: z.record(z.string(), z.unknown()) })).optional(),
        regions: z.array(z.string().min(1)).min(1),
        consecutiveFailures: z.number().int().min(1),
        consecutiveSuccesses: z.number().int().min(1),
        notificationChannels: z
          .array(
            z.object({
              name: z.string().min(1),
              /**
               * `slack`, `ms_teams`, `discord` and `webhook` are accepted from Stacktape 4 previews, which sent their
               * credentials here, and then dropped. See {@link uptimeCheckChannelsWithoutCredentials}.
               */
              type: z.enum(['slack', 'slack_app', 'ms_teams', 'e_mail', 'discord', 'webhook', 'console-channel']),
              properties: z.unknown()
            })
          )
          .optional()
          .transform((channels) => channels && uptimeCheckChannelsWithoutCredentials(channels))
      })
    )
    .max(100)
});

export type SyncUptimeChecksResponse = {
  /** console-channel references whose name does not exist in the organization. */
  missingChannelNames: string[];
};

export type RecordStackOperationParams = z.input<typeof recordStackOperationInputSchema>;
export type CreateDeploymentTokenFromCliParams = z.input<typeof createDeploymentTokenFromCliInputSchema>;
export type Ec2DeployFromCliParams = z.input<typeof ec2DeployFromCliInputSchema>;
export type Ec2DeployStatusFromCliParams = z.input<typeof ec2DeployStatusFromCliInputSchema>;
export type CreateOrganizationParams = z.input<typeof createOrganizationFromCliInputSchema>;
export type DeleteOrganizationParams = z.input<typeof deleteOrganizationFromCliInputSchema>;
export type CreateAwsConnectionPendingInput = z.input<typeof awsConnectionInputSchema>;
export type InitAwsConnectionForCliInput = z.input<typeof awsConnectionInputSchema>;
export type GetAwsConnectionStatusInput = z.input<typeof getAwsConnectionStatusInputSchema>;
export type FindExistingStacksFromCliInput = z.input<typeof findExistingStacksFromCliInputSchema>;
export type GetGitProviderConnectionStatusInput = z.input<typeof getGitProviderConnectionStatusInputSchema>;
export type CreateGitDeploymentConfigFromCliInput = z.input<typeof createGitDeploymentConfigFromCliInputSchema>;
export type ReportEventParams = z.input<typeof reportEventInputSchema>;
export type SyncUptimeChecksParams = z.input<typeof syncUptimeChecksInputSchema>;
export type AwsAccountCredentialsParams = z.input<typeof awsAccountCredentialsInputSchema>;
export type DefaultDomainsInfoParams = z.input<typeof defaultDomainsInfoInputSchema>;
export type CreateProjectParams = z.input<typeof createProjectFromCliInputSchema>;
export type DeleteUndeployedStageParams = z.input<typeof deleteUndeployedStageFromCliInputSchema>;
export type DeleteProjectParams = z.input<typeof deleteProjectFromCliInputSchema>;
export type RecentStackOperationsParams = z.input<typeof recentStackOperationsInputSchema>;
export type OrganizationActivityParams = z.input<typeof organizationActivityFromCliInputSchema>;
export type StackDetailsParams = z.input<typeof stackDetailsInputSchema>;
export type ListIssuesParams = z.input<typeof listIssuesInputSchema>;
export type IssueActionParams = z.input<typeof issueActionInputSchema>;
export type ListIncidentsParams = z.input<typeof listIncidentsInputSchema>;
export type IncidentActionParams = z.input<typeof incidentActionInputSchema>;

/**
 * Organization-wide configuration a deployment has to honour.
 *
 * Guardrails use the shared Console/CLI contract. Deployment notifications remain opaque because their
 * configuration schema is still owned by the CLI.
 */
export type GlobalConfigResponse = {
  alarms: {
    name: string;
    forServices: string[];
    forStages: string[];
    evaluation: unknown;
    trigger: unknown;
    notificationTargets: Array<{
      name: string;
      type: string;
      properties: unknown;
    }>;
  }[];
  guardrails: GuardrailDefinition[];
  deploymentNotifications: unknown[];
};

export type ListIssuesResponse = Array<{
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  fingerprint: string;
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  errorMessage: string;
  errorType: string;
  firstStackFrame: unknown;
  lastOccurrence: string | Date;
  occurrenceCount: number;
  project: string | null;
  stage: string | null;
  region: string | null;
  functionName: string | null;
  organizationId: string;
  resolvedAt: string | Date | null;
  resolvedBy: string | null;
  ignoredAt: string | Date | null;
  ignoredBy: string | null;
}>;

export type IssueActionResponse = {
  success: boolean;
};

export type ListIncidentsResponse = Array<{
  id: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  project: string | null;
  stage: string | null;
  region: string | null;
  isProduction: boolean;
  openedAt: string | Date;
  acknowledgedAt: string | Date | null;
  resolvedAt: string | Date | null;
  resolveReason: string | null;
  deploymentVersion: string | null;
  gitCommit: string | null;
  signals: Array<{ kind: string; state: string; title: string }>;
}>;

export type IncidentActionResponse = {
  success: boolean;
};

/** The current incident state used by long-running CLI verification. */
export type IncidentStatusResponse = ListIncidentsResponse[number];

/**
 * The incident handoff: a self-contained markdown document with what a coding agent (or a person)
 * needs to diagnose the incident and watch its recovery read-only. It asks for a diagnosis, not a
 * deploy or a resolve.
 */
export type IncidentHandoffResponse = {
  markdown: string;
};

export type AiSubscriptionProvider = z.infer<typeof aiSubscriptionProviderSchema>;
export type ConnectAiSubscriptionParams = z.input<typeof connectAiSubscriptionInputSchema>;
export type DisconnectAiSubscriptionParams = z.input<typeof disconnectAiSubscriptionInputSchema>;

/** What a member learns of their own connection with one provider: whether it is configured, since when, and for whom. */
export type AiSubscriptionConnectionResponse = {
  provider: AiSubscriptionProvider;
  configured: boolean;
  configuredAt: string | null;
  organization: { id: string; name: string };
  member: { email: string | null };
};

/**
 * Everything a CLI session needs to know about who it is acting as. The named properties are the ones
 * clients read; the index signatures leave room for the Console to add fields without a breaking change.
 */
export type CurrentUserAndOrgDataResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    [otherProperties: string]: unknown;
  };
  organization: {
    id: string;
    name: string;
    role: string;
    /** The organization-wide Issues switch; the Console enforces it when error events arrive. */
    issuesEnabled?: boolean;
    [otherProperties: string]: unknown;
  };
  connectedAwsAccounts: Array<{
    id: string;
    organizationId: string;
    name: string;
    awsAccountId: string | null;
    state: 'PENDING' | 'ACTIVE' | 'BLOCKED';
    primaryRegions: string[];
    defaultRegion: string | null;
    connectionMode: 'PRIVILEGED' | 'BASIC' | null;
    deleted?: boolean | null;
    /** What a deploy into this account is checked for; an older Console omits it and scanning follows the config. */
    securityScanning?: SecurityScanningLevel;
    [otherProperties: string]: unknown;
  }>;
  projects: Array<{
    id: string;
    organizationId: string;
    name: string;
    configPath: string | null;
    defaultRegion: string | null;
    /**
     * Stage types chosen when stages were created in the Console, by stage name. The CLI classifies a stage with it
     * when the config declares no `stackConfig.stageType`; an older Console omits it.
     */
    consoleStageTypes?: Record<string, StageType>;
    [otherProperties: string]: unknown;
  }>;
  permissions: string[];
  isProjectScoped: boolean;
  /** The member reaches only the AWS accounts assigned to them; `connectedAwsAccounts` lists only those. */
  isAwsAccountScoped?: boolean;
};

export type Ec2DeployFromCliResponse = {
  invocationId: string;
};

export type Ec2DeployStatusFromCliResponse = {
  id: string;
  runnerCleanupPending: boolean;
  projectName?: string | null;
  inProgress?: boolean | null;
  success?: boolean | null;
  description?: string | null;
  ec2InstanceId?: string | null;
  ssmCommandId?: string | null;
  logGroupName?: string | null;
  logStreamName?: string | null;
};

export type CreateDeploymentTokenFromCliResponse = {
  apiKey: string;
};

export type AwsAccountCredentialsResponse = {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    accountId?: string;
    /** Absent when the Console hands back credentials that do not expire on their own. */
    expiration?: string;
    [otherProperties: string]: unknown;
  };
};

export type CanDeployResponse = {
  canDeploy: boolean;
  message?: string;
  /** Present when a Free organization's managed AWS costs this calendar month (UTC) passed the plan's limit. */
  freePlanLimit?: {
    monthToDateCostsUsd: number;
    limitUsd: number;
    /** `2026-10` */
    month: string;
    upgradeUrl: string;
  };
  /**
   * One plain sentence the CLI prints after a successful deploy: the Free plan's grace countdown with the estimated
   * Flexible fee, or how close the organization is to the Free limit. Absent when there is nothing to say; paid plans
   * never get one.
   */
  notice?: string;
};

export type DefaultDomainsInfoResponse = {
  /** Both suffixes are absent for domain scheme versions that no longer publish a default domain. */
  suffix?: string;
  certDomainSuffix?: string;
  version: number;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  role: string;
  isPersonal: boolean;
  createdAt: string | Date;
  connectedAccountsCount: number;
  isCurrent: boolean;
};

export type CreateOrganizationResponse = {
  organization: {
    id: string;
    name: string;
    [otherProperties: string]: unknown;
  };
  apiKey: string;
};

export type ListOrganizationsResponse = OrganizationSummary[];

export type DeleteOrganizationResponse = {
  id?: string;
  userId?: string;
  organizationId?: string;
  [otherProperties: string]: unknown;
};

export type CreateProjectResponse = {
  id: string;
  name: string;
  gitUrl?: string | null;
  organizationId: string;
  configPath?: string | null;
  [otherProperties: string]: unknown;
};

export type DeleteUndeployedStageResponse = {
  id?: string;
  name?: string;
  projectId?: string;
  success?: boolean;
  message?: string;
  [otherProperties: string]: unknown;
};

/**
 * `stacktape project delete`. A project that still has deployed stages in a connected AWS account is kept and the
 * stages are listed: their stacks are deleted with `stacktape delete`, never by deleting the project.
 */
export type DeleteProjectResponse =
  | { deleted: true; id: string; name: string }
  | { deleted: false; deployedStages: Array<{ stage: string; region: string; awsAccountName: string }> };

export type InitAwsConnectionForCliResponse = {
  connectionId: string;
  stackName: string;
  templateUrl: string;
  parameters: {
    StacktapeConnectionId: string;
    StacktapeConnectionMode: string;
    StacktapeReportNotificationLambda: string;
    StacktapeHandleConnectionLambda: string;
  };
};

export type CreateAwsConnectionPendingResponse = {
  connectionId: string;
  quickCreateUrl: string;
};

export type GetAwsConnectionStatusResponse = {
  state: 'PENDING' | 'ACTIVE' | 'FAILED';
  awsAccountId?: string;
  name?: string;
};

/**
 * The Stacktape stacks found in a connected AWS account. Each project is reused by name or created; its stages then
 * appear in the Console without a deploy. Running it again changes nothing.
 */
export type FindExistingStacksFromCliResponse = {
  projects: Array<{ name: string; created: boolean; stages: Array<{ stage: string; region: string }> }>;
  /** Regions whose stacks could not be read (for example, CloudFormation denied there); stacks there are not found. */
  skippedRegions: string[];
};

export type GetGitProviderConnectionStatusResponse = {
  isConnected: boolean;
  installationId?: string;
  providerRepositoryId?: string;
};

export type CreateGitDeploymentConfigFromCliResponse = {
  success: boolean;
  id?: string;
};

export type ProjectsWithStagesResponse = Array<{
  id: string;
  name: string;
  stages: Array<{
    stage: string;
    status: string;
    deploymentIsInProgress: boolean;
    isErrored: boolean;
    lastUpdateTime: number;
    thisMonthCosts: {
      currencyCode: string;
      total: number;
    };
    previousMonthCosts: {
      currencyCode: string;
      total: number;
    };
  }>;
  undeployedStages: Array<{
    id?: string;
    name?: string;
    [otherProperties: string]: unknown;
  }>;
  [otherProperties: string]: unknown;
}>;

export type RecentStackOperationsResponse = Array<{
  id: string;
  command?: string | null;
  projectName?: string | null;
  stackName?: string | null;
  stage?: string | null;
  region?: string | null;
  createdAt?: Date | string;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  success?: boolean | null;
  inProgress?: boolean | null;
  description?: string | null;
}>;

export type OrganizationActivityResponse = {
  items: Array<{
    id: string;
    startTime: Date | string | null;
    endTime: Date | string | null;
    stackName: string | null;
    githubAvatarUrl: string | null;
    success: boolean | null;
    deploymentTrigger: string;
    createdAt: Date | string;
    projectName: string | null;
    stage: string | null;
    region: string | null;
    command: string | null;
    gitCommit: string | null;
    inProgress: boolean | null;
    description: string | null;
    user: { name: string | null; email: string } | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

export type StackDetailsResponse = {
  stackOutput?: {
    [outputName: string]: string;
  };
  stackInfoMap?: unknown;
  resources?: unknown[];
  description?: string | null;
};

export type RevokeCurrentCliSessionResponse = { revoked: boolean };

/** The procedures a Stacktape API key may call, and nothing else. */
export type ApiKeyTrpcClient = {
  /** A job-scoped completion hint; the server verifies AWS completion before releasing the runner. */
  runnerCommandFinished: { mutate: (args?: void) => Promise<{ accepted: boolean }> };
  exchangeGithubActionsToken: {
    mutate: (args: ExchangeGithubActionsTokenParams) => Promise<ExchangeGithubActionsTokenResponse>;
  };
  recordStackOperation: {
    /** Responds with the stored operation. Clients record and move on, so the shape is not part of the contract. */
    mutate: (args: RecordStackOperationParams) => Promise<unknown>;
  };
  recordSecurityReport: {
    mutate: (args: RecordSecurityReportParams) => Promise<RecordSecurityReportResponse>;
  };
  globalConfig: {
    query: (args?: void) => Promise<GlobalConfigResponse>;
  };
  currentUserAndOrgData: {
    query: () => Promise<CurrentUserAndOrgDataResponse>;
  };
  /**
   * Revokes the key making the request when it is a CLI session (`stacktape logout`). Any other key is left as it is
   * and the response says so: a Console-made or CI key is managed in the Console.
   */
  revokeCurrentCliSession: {
    mutate: (args?: void) => Promise<RevokeCurrentCliSessionResponse>;
  };
  ec2DeployFromCli: {
    mutate: (args: Ec2DeployFromCliParams) => Promise<Ec2DeployFromCliResponse>;
  };
  ec2DeployStatusFromCli: {
    query: (args: Ec2DeployStatusFromCliParams) => Promise<Ec2DeployStatusFromCliResponse>;
  };
  createDeploymentTokenFromCli: {
    mutate: (args: CreateDeploymentTokenFromCliParams) => Promise<CreateDeploymentTokenFromCliResponse>;
  };
  awsAccountCredentials: {
    query: (args: AwsAccountCredentialsParams) => Promise<AwsAccountCredentialsResponse>;
  };
  canDeploy: {
    query: () => Promise<CanDeployResponse>;
  };
  defaultDomainsInfo: {
    query: (args: DefaultDomainsInfoParams) => Promise<DefaultDomainsInfoResponse>;
  };
  createProjectFromCli: {
    mutate: (args: CreateProjectParams) => Promise<CreateProjectResponse>;
  };
  createOrganizationFromCli: {
    mutate: (args: CreateOrganizationParams) => Promise<CreateOrganizationResponse>;
  };
  listOrganizationsFromCli: {
    query: () => Promise<ListOrganizationsResponse>;
  };
  deleteOrganizationFromCli: {
    mutate: (args: DeleteOrganizationParams) => Promise<DeleteOrganizationResponse>;
  };
  deleteUndeployedStageFromCli: {
    mutate: (args: DeleteUndeployedStageParams) => Promise<DeleteUndeployedStageResponse>;
  };
  deleteProjectFromCli: {
    mutate: (args: DeleteProjectParams) => Promise<DeleteProjectResponse>;
  };
  initAwsConnectionForCli: {
    mutate: (args: InitAwsConnectionForCliInput) => Promise<InitAwsConnectionForCliResponse>;
  };
  createAwsConnectionPending: {
    mutate: (args: CreateAwsConnectionPendingInput) => Promise<CreateAwsConnectionPendingResponse>;
  };
  getAwsConnectionStatus: {
    query: (args: GetAwsConnectionStatusInput) => Promise<GetAwsConnectionStatusResponse>;
  };
  findExistingStacksFromCli: {
    mutate: (args: FindExistingStacksFromCliInput) => Promise<FindExistingStacksFromCliResponse>;
  };
  getGitProviderConnectionStatus: {
    query: (args: GetGitProviderConnectionStatusInput) => Promise<GetGitProviderConnectionStatusResponse>;
  };
  createGitDeploymentConfigFromCli: {
    mutate: (args: CreateGitDeploymentConfigFromCliInput) => Promise<CreateGitDeploymentConfigFromCliResponse>;
  };
  projectsWithStages: {
    query: () => Promise<ProjectsWithStagesResponse>;
  };
  recentStackOperations: {
    query: (args: RecentStackOperationsParams) => Promise<RecentStackOperationsResponse>;
  };
  organizationActivityFromCli: {
    query: (args: OrganizationActivityParams) => Promise<OrganizationActivityResponse>;
  };
  stackDetails: {
    query: (args: StackDetailsParams) => Promise<StackDetailsResponse>;
  };
  reportEvent: {
    mutate: (args: ReportEventParams) => Promise<string>;
  };
  syncUptimeChecks: {
    mutate: (args: SyncUptimeChecksParams) => Promise<SyncUptimeChecksResponse>;
  };
  resolveSlackChannels: {
    mutate: (args: ResolveSlackChannelsParams) => Promise<ResolveSlackChannelsResponse>;
  };
  issuesFromCli: {
    query: (args: ListIssuesParams) => Promise<ListIssuesResponse>;
  };
  incidentsFromCli: {
    query: (args: ListIncidentsParams) => Promise<ListIncidentsResponse>;
  };
  incidentHandoffFromCli: {
    query: (args: IncidentActionParams) => Promise<IncidentHandoffResponse>;
  };
  incidentStatusFromCli: {
    query: (args: IncidentActionParams) => Promise<IncidentStatusResponse>;
  };
  acknowledgeIncidentFromCli: {
    mutate: (args: IncidentActionParams) => Promise<IncidentActionResponse>;
  };
  resolveIncidentFromCli: {
    mutate: (args: IncidentActionParams) => Promise<IncidentActionResponse>;
  };
  resolveIssueFromCli: {
    mutate: (args: IssueActionParams) => Promise<IssueActionResponse>;
  };
  ignoreIssueFromCli: {
    mutate: (args: IssueActionParams) => Promise<IssueActionResponse>;
  };
  reopenIssueFromCli: {
    mutate: (args: IssueActionParams) => Promise<IssueActionResponse>;
  };
  connectAiSubscriptionFromCli: {
    mutate: (args: ConnectAiSubscriptionParams) => Promise<AiSubscriptionConnectionResponse>;
  };
  disconnectAiSubscriptionFromCli: {
    mutate: (args: DisconnectAiSubscriptionParams) => Promise<AiSubscriptionConnectionResponse>;
  };
};
