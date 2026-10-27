import type { DevNetworkPlacement } from '@domain-services/dev-network/placement';
import { createHash } from 'node:crypto';

// v2 removes VPC infrastructure required only by locally running/emulated resources.
// v3 places functions in the shared dev network and deploys them with the relay addresses of local databases.
// v4 keeps source maps in dev function packages and runs the functions with `--enable-source-maps`.
// v5 records a digest of each input separately, so an update can name what changed.
// v6 leaves alarms out of dev stacks and lets schedule rules name their function by ARN.
const FINGERPRINT_VERSION = 6;

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

/** What the dev stack is synthesized from. Each part gets its own digest, so an update can say which one changed. */
const FINGERPRINT_PARTS = ['config', 'devNetwork', 'localDatabaseAddresses', 'localDatabases', 'devTrust'] as const;
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
  devTrustStatement
}: {
  config: unknown;
  /** The dev network placement: its subnets, leases and local passwords end up in the template too. */
  devNetwork?: DevNetworkPlacement;
  /** The trust in the developer that the roles of locally running containers get. */
  devTrustStatement?: unknown;
}): string => {
  const { localResources, ...network } = devNetwork ?? {};
  const parts: Record<DevStackFingerprintPart, unknown> = {
    config,
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
    devTrust: devTrustStatement
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
  devTrust: 'local containers now use the roles with other AWS credentials'
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
