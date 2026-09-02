import { createHash } from 'node:crypto';

const FINGERPRINT_VERSION = 1;

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

/**
 * Identifies the resolved configuration used to synthesize the minimal dev support stack.
 * Increment the version when synthesis changes without a corresponding resolved-config change.
 */
export const getDevStackConfigFingerprint = (config: unknown): string => {
  const canonicalConfig = JSON.stringify(canonicalize(config));
  const digest = createHash('sha256').update(canonicalConfig, 'utf8').digest('hex').slice(0, 24);
  return `v${FINGERPRINT_VERSION}:${digest}`;
};

export const devStackConfigNeedsUpdate = ({
  deployedFingerprint,
  desiredFingerprint
}: {
  deployedFingerprint: unknown;
  desiredFingerprint: string;
}): boolean => deployedFingerprint !== desiredFingerprint;
