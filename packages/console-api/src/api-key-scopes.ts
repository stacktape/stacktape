import { z } from 'zod';
import type { ApiKeyTrpcClient } from './api-key.js';
import { type ConsoleRole, roleHasPermission } from './permissions.js';

/**
 * What an API key may do inside its role. A key without scopes (every key made before scopes existed, every CLI
 * session) does everything its role allows; a key with scopes reaches only the procedures its areas cover. Scopes only
 * narrow: the API checks the role and the scopes, and a request passes only when both allow it.
 *
 * The areas are what an API key can reach at all. Logs, metrics, secrets and parameters live in the customer's AWS
 * account and are read with the AWS credentials a deploy gets; members and billing have no API-key procedure.
 */
export const API_KEY_SCOPE_AREAS = ['deploys', 'incidents', 'organization'] as const;
export type ApiKeyScopeArea = (typeof API_KEY_SCOPE_AREAS)[number];

export const API_KEY_SCOPE_LEVELS = ['NONE', 'READ', 'WRITE'] as const;
export type ApiKeyScopeLevel = (typeof API_KEY_SCOPE_LEVELS)[number];

const levelSchema = z.enum(API_KEY_SCOPE_LEVELS);
export const apiKeyScopesSchema = z
  .object({ deploys: levelSchema, incidents: levelSchema, organization: levelSchema })
  .strict();
export type ApiKeyScopes = z.infer<typeof apiKeyScopesSchema>;

/** Each area as the dialog, the key tables and the API's refusals name it. */
export const API_KEY_SCOPE_AREA_INFO: Record<
  ApiKeyScopeArea,
  { label: string; read: string; write: string; canRead: string; canWrite: string; noun: string }
> = {
  deploys: {
    label: 'Deploys and stages',
    noun: 'deploys and stages',
    read: 'Projects, stages, deploy history and stack details.',
    write: 'Deploy and delete stages, create and delete projects, set up Git deploys.',
    canRead: 'read deploys',
    canWrite: 'deploy and delete stages'
  },
  incidents: {
    label: 'Incidents and errors',
    noun: 'incidents and errors',
    read: 'Incidents, errors and their details.',
    write: 'Acknowledge and resolve incidents; resolve, ignore and reopen errors.',
    canRead: 'read incidents and errors',
    canWrite: 'resolve incidents and errors'
  },
  organization: {
    label: 'Organization and AWS accounts',
    noun: 'the organization and AWS accounts',
    read: 'Your organizations and the state of AWS account connections.',
    write: 'Connect AWS accounts, create and delete organizations, connect AI subscriptions.',
    canRead: 'read the organization',
    canWrite: 'manage the organization'
  }
};

/** What one API-key procedure needs. `identity` procedures (who am I, sign out, the config a deploy reads) need none. */
export type ApiKeyProcedureScope = { area: ApiKeyScopeArea; level: Exclude<ApiKeyScopeLevel, 'NONE'> } | 'identity';

const deploysRead = { area: 'deploys', level: 'READ' } as const;
const deploysWrite = { area: 'deploys', level: 'WRITE' } as const;
const incidentsRead = { area: 'incidents', level: 'READ' } as const;
const incidentsWrite = { area: 'incidents', level: 'WRITE' } as const;
const organizationRead = { area: 'organization', level: 'READ' } as const;
const organizationWrite = { area: 'organization', level: 'WRITE' } as const;

/**
 * Every procedure of the API-key contract and the scope it needs. Typed against the contract, so a new procedure does
 * not compile until it is placed here. What a deploy reports while it runs (security findings, alarm events, uptime
 * checks, Slack channels, the runner's completion) belongs to Deploys, so a CI key needs only that area.
 */
export const API_KEY_PROCEDURE_SCOPES = {
  currentUserAndOrgData: 'identity',
  revokeCurrentCliSession: 'identity',
  globalConfig: 'identity',

  projectsWithStages: deploysRead,
  recentStackOperations: deploysRead,
  organizationActivityFromCli: deploysRead,
  stackDetails: deploysRead,
  getGitProviderConnectionStatus: deploysRead,
  ec2DeployStatusFromCli: deploysRead,
  canDeploy: deploysWrite,
  awsAccountCredentials: deploysWrite,
  defaultDomainsInfo: deploysWrite,
  recordStackOperation: deploysWrite,
  recordSecurityReport: deploysWrite,
  reportEvent: deploysWrite,
  syncUptimeChecks: deploysWrite,
  resolveSlackChannels: deploysWrite,
  createDeploymentTokenFromCli: deploysWrite,
  ec2DeployFromCli: deploysWrite,
  exchangeGithubActionsToken: deploysWrite,
  runnerCommandFinished: deploysWrite,
  deleteUndeployedStageFromCli: deploysWrite,
  createProjectFromCli: deploysWrite,
  deleteProjectFromCli: deploysWrite,
  createGitDeploymentConfigFromCli: deploysWrite,

  issuesFromCli: incidentsRead,
  incidentsFromCli: incidentsRead,
  incidentHandoffFromCli: incidentsRead,
  incidentStatusFromCli: incidentsRead,
  acknowledgeIncidentFromCli: incidentsWrite,
  resolveIncidentFromCli: incidentsWrite,
  resolveIssueFromCli: incidentsWrite,
  ignoreIssueFromCli: incidentsWrite,
  reopenIssueFromCli: incidentsWrite,

  listOrganizationsFromCli: organizationRead,
  getAwsConnectionStatus: organizationRead,
  createOrganizationFromCli: organizationWrite,
  deleteOrganizationFromCli: organizationWrite,
  initAwsConnectionForCli: organizationWrite,
  createAwsConnectionPending: organizationWrite,
  findExistingStacksFromCli: organizationWrite,
  connectAiSubscriptionFromCli: organizationWrite,
  disconnectAiSubscriptionFromCli: organizationWrite
} as const satisfies Record<keyof ApiKeyTrpcClient, ApiKeyProcedureScope>;

const LEVEL_RANK: Record<ApiKeyScopeLevel, number> = { NONE: 0, READ: 1, WRITE: 2 };

export const levelIncludes = (granted: ApiKeyScopeLevel, needed: ApiKeyScopeLevel) =>
  LEVEL_RANK[granted] >= LEVEL_RANK[needed];

/** The scope a procedure needs; a name outside the contract needs more than any scope gives. */
export const apiKeyProcedureScope = (procedure: string): ApiKeyProcedureScope | undefined =>
  Object.hasOwn(API_KEY_PROCEDURE_SCOPES, procedure)
    ? API_KEY_PROCEDURE_SCOPES[procedure as keyof typeof API_KEY_PROCEDURE_SCOPES]
    : undefined;

/** Whether a key with `scopes` may call `procedure`. No scopes: every procedure, as before scopes existed. */
export const apiKeyScopesAllow = (scopes: ApiKeyScopes | null, procedure: string): boolean => {
  if (!scopes) return true;
  const needed = apiKeyProcedureScope(procedure);
  if (!needed) return false;
  return needed === 'identity' || levelIncludes(scopes[needed.area], needed.level);
};

/** The refusal reason the API sends with a scope refusal, so a client can say what to do. */
export const API_KEY_SCOPE_REFUSAL_REASON = 'API_KEY_SCOPE';

/**
 * The message of a scope refusal. Released CLIs print only the message after "Permission denied:", so it says what the
 * key has, what the request needs and where to make a key that can.
 */
export const apiKeyScopeRefusalMessage = (scopes: ApiKeyScopes, procedure: string): string => {
  const needed = apiKeyProcedureScope(procedure);
  if (!needed || needed === 'identity') {
    return 'This API key has scopes, and this request is not part of any of them. Use a key with full access.';
  }
  const { label, noun } = API_KEY_SCOPE_AREA_INFO[needed.area];
  const has = scopes[needed.area];
  const hasWords = has === 'NONE' ? `no access to ${noun}` : `${has === 'READ' ? 'read' : 'write'} access to ${noun}`;
  return (
    `This API key has ${hasWords}, and this request needs ${needed.level === 'READ' ? 'read' : 'write'} access. ` +
    `Create a key with ${needed.level === 'READ' ? 'Read' : 'Write'} for "${label}" on the API keys page of the Stacktape Console.`
  );
};

export type ApiKeyOwner = 'personal' | 'organization';

/**
 * The most a key may get in an area, from its role: scopes never offer what the role cannot do. A personal key may
 * create organizations and connect the person's AI subscriptions whatever their role; an organization key may do
 * neither, so its organization area writes only when its role connects AWS accounts.
 */
export const maxApiKeyScopeLevel = ({
  area,
  role,
  owner
}: {
  area: ApiKeyScopeArea;
  role: ConsoleRole;
  owner: ApiKeyOwner;
}): ApiKeyScopeLevel => {
  if (area === 'deploys') return roleHasPermission(role, 'deployments:deploy') ? 'WRITE' : 'READ';
  if (area === 'incidents') {
    return roleHasPermission(role, 'incidents:manage') || roleHasPermission(role, 'issues:manage') ? 'WRITE' : 'READ';
  }
  if (owner === 'personal') return 'WRITE';
  return roleHasPermission(role, 'org:manage-aws-accounts') ? 'WRITE' : 'READ';
};

/** The scopes a role allows at most; what "Full access" means for that key in the dialog's rows. */
export const fullApiKeyScopes = ({ role, owner }: { role: ConsoleRole; owner: ApiKeyOwner }): ApiKeyScopes => ({
  deploys: maxApiKeyScopeLevel({ area: 'deploys', role, owner }),
  incidents: maxApiKeyScopeLevel({ area: 'incidents', role, owner }),
  organization: maxApiKeyScopeLevel({ area: 'organization', role, owner })
});

/** Scopes lowered to what the role allows, so a key never records more than it can use. */
export const capApiKeyScopes = (
  scopes: ApiKeyScopes,
  { role, owner }: { role: ConsoleRole; owner: ApiKeyOwner }
): ApiKeyScopes => {
  const max = fullApiKeyScopes({ role, owner });
  const cap = (area: ApiKeyScopeArea) => (levelIncludes(max[area], scopes[area]) ? scopes[area] : max[area]);
  return { deploys: cap('deploys'), incidents: cap('incidents'), organization: cap('organization') };
};

export type ApiKeyScopePresetId = 'full' | 'ci-deploys' | 'on-call' | 'read-only';

/** The common jobs a key is made for. Full access stores no scopes, so the key behaves exactly as keys always have. */
export const API_KEY_SCOPE_PRESETS: ReadonlyArray<{
  id: ApiKeyScopePresetId;
  label: string;
  description: string;
  scopes: ApiKeyScopes | null;
}> = [
  { id: 'full', label: 'Full access', description: 'Everything the role allows.', scopes: null },
  {
    id: 'ci-deploys',
    label: 'CI deploys',
    description: 'Deploy and delete stages from a pipeline.',
    scopes: { deploys: 'WRITE', incidents: 'NONE', organization: 'NONE' }
  },
  {
    id: 'on-call',
    label: 'On-call',
    description: 'Read deploys; acknowledge and resolve incidents and errors.',
    scopes: { deploys: 'READ', incidents: 'WRITE', organization: 'NONE' }
  },
  {
    id: 'read-only',
    label: 'Read only',
    description: 'Read deploys, incidents, errors and the organization.',
    scopes: { deploys: 'READ', incidents: 'READ', organization: 'READ' }
  }
];

const sameScopes = (a: ApiKeyScopes, b: ApiKeyScopes) => API_KEY_SCOPE_AREAS.every((area) => a[area] === b[area]);

/** The preset a key's scopes match, or `custom`. */
export const apiKeyScopePresetOf = (scopes: ApiKeyScopes | null): ApiKeyScopePresetId | 'custom' => {
  if (!scopes) return 'full';
  return API_KEY_SCOPE_PRESETS.find((preset) => preset.scopes && sameScopes(preset.scopes, scopes))?.id ?? 'custom';
};

// The phrases hold "and" themselves ("deploy and delete stages"), so the last one is set apart by a comma.
const joinWords = (words: string[]) =>
  words.length < 2 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')}, and ${words.at(-1)}`;

/**
 * One sentence on what a key can do, for the dialog's live summary and a key's row. A full-access key does what its
 * role does; a scoped key lists what it can do and names what it cannot reach.
 */
export const summarizeApiKeyScopes = (scopes: ApiKeyScopes | null): string => {
  if (!scopes) return 'Can do everything its role allows.';
  const can = API_KEY_SCOPE_AREAS.flatMap((area) =>
    scopes[area] === 'WRITE'
      ? [API_KEY_SCOPE_AREA_INFO[area].canWrite]
      : scopes[area] === 'READ'
        ? [API_KEY_SCOPE_AREA_INFO[area].canRead]
        : []
  );
  const cannot = API_KEY_SCOPE_AREAS.filter((area) => scopes[area] === 'NONE').map(
    (area) => API_KEY_SCOPE_AREA_INFO[area].noun
  );
  if (!can.length) return 'Can only check who it is. It reaches no area.';
  const canSentence = `Can ${joinWords(can)}.`;
  return cannot.length ? `${canSentence} No access to ${joinWords(cannot)}.` : canSentence;
};
