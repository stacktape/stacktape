import type { DevNetworkPlacement } from '@domain-services/dev-network/placement';
import { createHash } from 'node:crypto';
import { LOCALLY_RUN_RESOURCE_TYPES } from '@domain-services/config-manager/dev-mode';

// v2 removes VPC infrastructure required only by locally running/emulated resources.
// v3 places functions in the shared dev network and deploys them with the relay addresses of local databases.
// v4 keeps source maps in dev function packages and runs the functions with `--enable-source-maps`.
// v5 records a digest of each input separately, so an update can name what changed.
// v6 leaves alarms out of dev stacks and lets schedule rules name their function by ARN.
// v7 grants connectTo access to remote resources and records the remote resources and the functions without triggers.
// v8 leaves out what only the local session uses: container packaging, frontend dev commands and local scripts.
// v9 pushes the images of batch jobs and AgentCore runtimes and runs batch jobs in the dev network.
// v10 lets the dev agent read Batch jobs and outputs what local workloads read of raw CloudFormation resources.
// v11 limits the dev agent role to reads of this stack's own resources in its region.
const FINGERPRINT_VERSION = 11;

const canonicalize = (value: unknown, ancestors = new Set<object>()): unknown => {
  if (value === null || ['boolean', 'number', 'string'].includes(typeof value)) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new Error('Cannot fingerprint a circular Stacktape configuration.');
    ancestors.add(value);
    const result = value.map((item) => canonicalize(item, ancestors));
    ancestors.delete(value);
    return result;
  }
  if (typeof value === 'object') {
    if (ancestors.has(value)) throw new Error('Cannot fingerprint a circular Stacktape configuration.');
    ancestors.add(value);
    const record = value as Record<string, unknown>;
    const result = Object.fromEntries(
      Object.keys(record)
        .sort()
        .filter((key) => record[key] !== undefined)
        .map((key) => [key, canonicalize(record[key], ancestors)])
    );
    ancestors.delete(value);
    return result;
  }
  throw new Error(`Cannot fingerprint Stacktape configuration value of type ${typeof value}.`);
};

/** Container workloads run locally; the dev stack deploys only their roles (see `resolveDevContainerWorkloadRoles`). */
const LOCAL_CONTAINER_TYPES = new Set(['web-service', 'private-service', 'worker-service', 'multi-container-workload']);
/** Scripts that run on this machine or through a bastion; a `deployment-script` is a function in the stack. */
export const LOCAL_SCRIPT_TYPES = new Set(['local-script', 'local-script-with-bastion-tunneling', 'bastion-script']);

type ConfigResource = { type?: unknown; properties?: Record<string, unknown> };

const withoutPackaging = (container: unknown) =>
  container && typeof container === 'object' ? { ...container, packaging: undefined } : container;

/**
 * The configuration without what only the local session uses, so changing it restarts the session without updating
 * the dev stack. Only properties that never reach the dev stack's template are left out: how local containers are built
 * and started (their roles stay: connectTo, IAM statements, mounts), a frontend's `dev` settings (frontends run only
 * locally, and the dev stack cannot reference them) and scripts that run on this machine. A database's `dev.remote`
 * decides what the dev stack deploys, so `dev` of other resources stays.
 */
export const getDevStackConfig = (config: unknown): unknown => {
  if (!config || typeof config !== 'object') return config;
  const { resources, scripts, ...rest } = config as {
    resources?: Record<string, ConfigResource>;
    scripts?: Record<string, { type?: unknown }>;
  };
  const deployedScripts = Object.entries(scripts ?? {}).filter(
    ([, script]) => !LOCAL_SCRIPT_TYPES.has(String(script?.type))
  );
  return {
    ...rest,
    resources:
      resources &&
      Object.fromEntries(
        Object.entries(resources).map(([name, resource]) => {
          const type = String(resource?.type);
          const properties = resource?.properties;
          if (!properties) return [name, resource];
          if (LOCAL_CONTAINER_TYPES.has(type)) {
            return [
              name,
              {
                ...resource,
                properties: {
                  ...properties,
                  packaging: undefined,
                  containers: Array.isArray(properties.containers)
                    ? properties.containers.map(withoutPackaging)
                    : properties.containers
                }
              }
            ];
          }
          if ((LOCALLY_RUN_RESOURCE_TYPES as string[]).includes(type)) {
            return [name, { ...resource, properties: { ...properties, dev: undefined } }];
          }
          return [name, resource];
        })
      ),
    scripts: deployedScripts.length ? Object.fromEntries(deployedScripts) : undefined
  };
};

/** What the dev stack is synthesized from. Each part gets its own digest, so an update can say which one changed. */
const FINGERPRINT_PARTS = [
  'config',
  'devNetwork',
  'localDatabaseAddresses',
  'localDatabases',
  'devTrust',
  'remoteResources',
  'skippedFunctions'
] as const;
export type DevStackFingerprintPart = (typeof FINGERPRINT_PARTS)[number];

const digest = (value: unknown) =>
  createHash('sha256')
    .update(value === undefined ? 'undefined' : JSON.stringify(canonicalize(value)), 'utf8')
    .digest('hex')
    .slice(0, 16);

/**
 * Identifies the resolved configuration used to synthesize the minimal dev support stack.
 * Increment the version when synthesis changes without a corresponding resolved-config change.
 */
export const getDevStackConfigFingerprint = ({
  config,
  devNetwork,
  devTrustStatement,
  remoteResourceNames = [],
  skippedFunctionNames = []
}: {
  config: unknown;
  /** The dev network placement: its subnets, leases and local passwords end up in the template too. */
  devNetwork?: DevNetworkPlacement;
  /** The trust in the developer that the roles of locally running containers get. */
  devTrustStatement?: unknown;
  /** The resources the dev stack deploys instead of emulating them locally. */
  remoteResourceNames?: Iterable<string>;
  /** The functions left out of the session, which the dev stack keeps without their triggers. */
  skippedFunctionNames?: Iterable<string>;
}): string => {
  const { localResources, ...network } = devNetwork ?? {};
  const parts: Record<DevStackFingerprintPart, unknown> = {
    config: getDevStackConfig(config),
    devNetwork: devNetwork && network,
    // Connection strings carry the password; without them, what remains says where the databases are.
    localDatabaseAddresses:
      localResources &&
      Object.fromEntries(
        Object.entries(localResources).map(([name, { params, environment }]) => [
          name,
          {
            params: Object.fromEntries(Object.entries(params).filter(([key]) => !/connectionstring/i.test(key))),
            environment
          }
        ])
      ),
    localDatabases: localResources,
    devTrust: devTrustStatement,
    remoteResources: [...remoteResourceNames].sort(),
    skippedFunctions: [...skippedFunctionNames].sort()
  };
  return `v${FINGERPRINT_VERSION}:${FINGERPRINT_PARTS.map((part) => digest(parts[part])).join('.')}`;
};

/**
 * Why the deployed dev stack must be updated, or `undefined` when it matches. `parts` lists the inputs that changed;
 * a stack without a fingerprint, or with one of another version, gives `unknown` or `version` instead.
 */
export const getDevStackUpdateCause = ({
  deployedFingerprint,
  desiredFingerprint
}: {
  deployedFingerprint: unknown;
  desiredFingerprint: string;
}): { kind: 'unknown' } | { kind: 'version' } | { kind: 'parts'; parts: DevStackFingerprintPart[] } | undefined => {
  if (deployedFingerprint === desiredFingerprint) return undefined;
  if (typeof deployedFingerprint !== 'string') return { kind: 'unknown' };
  const [deployedVersion, deployedDigests] = deployedFingerprint.split(':');
  const [desiredVersion, desiredDigests] = desiredFingerprint.split(':');
  if (deployedVersion !== desiredVersion) return { kind: 'version' };
  const deployed = deployedDigests?.split('.') ?? [];
  const desired = desiredDigests!.split('.');
  return { kind: 'parts', parts: FINGERPRINT_PARTS.filter((_, index) => deployed[index] !== desired[index]) };
};

const PART_REASONS: Record<DevStackFingerprintPart, string> = {
  config: 'the configuration changed',
  devNetwork: 'its functions move to other subnets of the dev network',
  localDatabaseAddresses: 'the dev box address or relay ports of the local databases changed',
  localDatabases: 'the local databases have another password',
  devTrust: 'local containers now use the roles with other AWS credentials',
  remoteResources: 'other resources run in AWS instead of locally',
  skippedFunctions:
    'the session runs other functions than before, and the dev stack keeps those it leaves out on their deployed code, without triggers'
};

/**
 * The reason an update of the dev stack names. After a take-over, a changed password means that this directory's
 * databases were created before passwords were shared by the worktrees of a stage.
 */
export const describeDevStackUpdateCause = (
  cause: NonNullable<ReturnType<typeof getDevStackUpdateCause>>,
  { takeOver = false }: { takeOver?: boolean } = {}
): string => {
  if (cause.kind === 'unknown') return 'it was deployed without a record of its configuration';
  if (cause.kind === 'version') return 'this Stacktape version deploys dev stacks differently';
  // An address change already updates the connection strings, which carry the password.
  const parts = cause.parts.includes('localDatabaseAddresses')
    ? cause.parts.filter((part) => part !== 'localDatabases')
    : cause.parts;
  if (takeOver && parts.length === 1 && parts[0] === 'localDatabases') {
    return "this session took the stage over, and the local databases in this directory have another password than the previous session's";
  }
  return parts.map((part) => PART_REASONS[part]).join(', and ');
};
