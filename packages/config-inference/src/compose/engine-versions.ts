/**
 * Choosing a database engine version the deploy will actually accept.
 *
 * Stacktape validates `engine.properties.version` against its own accepted list, so a major-only or
 * out-of-date version fails before CloudFormation is even contacted — the first real deploy out of
 * this wizard did exactly that, with a `16` that RDS wanted as `16.11`. The composer therefore
 * resolves every version through the accepted list, which the CLI passes in from its bundled
 * dataset. The list is not semver-sorted (`16.9` sits before `16.11`), so ordering is computed here
 * rather than trusted.
 */

/** Accepted versions per engine, as the CLI's generated dataset records them. */
export type EngineVersionCatalogue = Readonly<Record<string, readonly string[]>>;

/**
 * Pins for callers with no catalogue, full versions from the same dataset's era. Only tests and
 * package-external consumers land here; the wizard always has the real list.
 */
const FALLBACK_VERSIONS: Record<string, string> = {
  postgres: '18.1',
  mysql: '8.4.8',
  'sqlserver-ex': '16.00.4225.2.v1'
};

/** Numeric segment-wise comparison, so `16.11` beats `16.9` and `8.0.46-rds…` beats `8.0.46`. */
const compareVersions = (a: string, b: string): number => {
  const aParts = a.split('.');
  const bParts = b.split('.');
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i += 1) {
    const aPart = aParts[i] ?? '';
    const bPart = bParts[i] ?? '';
    if (aPart === bPart) continue;
    const aNumber = Number.parseInt(aPart, 10);
    const bNumber = Number.parseInt(bPart, 10);
    if (Number.isNaN(aNumber) || Number.isNaN(bNumber)) return aPart.localeCompare(bPart);
    if (aNumber !== bNumber) return aNumber - bNumber;
    // Same leading number with different suffixes (`46` vs `46-rds`): the longer, stamped build is
    // the patched one, and the next loop turn settles it by the segment that follows.
  }
  return 0;
};

const newest = (versions: readonly string[]): string =>
  versions.reduce((best, candidate) => (compareVersions(candidate, best) > 0 ? candidate : best));

/**
 * Whether an accepted version belongs to a pin's release line: `16` covers `16.11`, and `8.0`
 * covers `8.0.46` without leaking into the separate `8.4` train.
 */
const inReleaseLine = (version: string, pin: string): boolean => {
  const pinParts = pin.split('.');
  const versionParts = version.split('.');
  return pinParts.every((pinPart, i) => {
    const versionPart = versionParts[i] ?? '';
    if (versionPart === pinPart) return true;
    const pinNumber = Number.parseInt(pinPart, 10);
    const versionNumber = Number.parseInt(versionPart, 10);
    return !Number.isNaN(pinNumber) && pinNumber === versionNumber;
  });
};

export type ResolvedEngineVersion = {
  version: string;
  /** True when the pinned release line is not offered at all and a different one was chosen. */
  movedOffPin: boolean;
};

/**
 * The version to put in the configuration.
 *
 * An accepted pin is kept as-is. A pin naming a release line (`16`, or a minor the list has moved
 * past) becomes the newest accepted version of that line — RDS upgrades minors on its own, so the
 * line is the real contract. A pin whose line is gone, or no pin at all, becomes the newest
 * accepted version outright; only the former is worth telling the user about.
 */
export const resolveEngineVersion = ({
  engine,
  pin,
  catalogue
}: {
  engine: string;
  pin?: string;
  catalogue?: EngineVersionCatalogue;
}): ResolvedEngineVersion => {
  const accepted = catalogue?.[engine] ?? [];
  if (accepted.length === 0) {
    return { version: pin ?? FALLBACK_VERSIONS[engine] ?? FALLBACK_VERSIONS.postgres!, movedOffPin: false };
  }
  if (pin !== undefined) {
    if (accepted.includes(pin)) return { version: pin, movedOffPin: false };
    // Widening one segment at a time: a stale `16.2` finds the newest `16.x` rather than jumping
    // majors, and a stale mysql `8.0.99` stays in the `8.0` train instead of drifting to `8.4`.
    const pinParts = pin.split('.');
    for (let depth = pinParts.length; depth >= 1; depth -= 1) {
      const prefix = pinParts.slice(0, depth).join('.');
      const line = accepted.filter((version) => inReleaseLine(version, prefix));
      if (line.length > 0) return { version: newest(line), movedOffPin: false };
    }
  }
  return { version: newest(accepted), movedOffPin: pin !== undefined };
};
