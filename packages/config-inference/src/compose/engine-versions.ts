/**
 * Choosing a database engine version the deploy will actually accept.
 *
 * PostgreSQL, MySQL and MariaDB get their release line (`17`, `8.4`): RDS runs a current minor version of the line and
 * upgrades it itself, so the generated config never names a minor version that AWS retired since this CLI was built.
 * The CLI passes in its bundled list of versions, which says which lines exist. Engines without release lines get the
 * newest full version of the list. The list is not semver-sorted (`16.9` sits before `16.11`), so ordering is computed
 * here rather than trusted.
 */

/** Accepted versions per engine, as the CLI's generated dataset records them. */
export type EngineVersionCatalogue = Readonly<Record<string, readonly string[]>>;

/**
 * Pins for callers with no catalogue, full versions from the same dataset's era. Only tests and
 * package-external consumers land here; the wizard always has the real list.
 */
const FALLBACK_VERSIONS: Record<string, string> = {
  postgres: '18',
  mysql: '8.4',
  mariadb: '11.8',
  'sqlserver-ex': '16.00.4225.2.v1'
};

/** How many leading parts of a version name its release line, for the engines whose line RDS accepts as a version. */
const RELEASE_LINE_PARTS: Record<string, number> = { postgres: 1, mysql: 2, mariadb: 2 };

const releaseLineOf = (engine: string, version: string): string => {
  const parts = RELEASE_LINE_PARTS[engine];
  return parts === undefined ? version : version.split('.').slice(0, parts).join('.');
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
 * A pin keeps its release line: `16`, `16.10` and a stale `16.2` all become `16`. A pin whose line is gone, or no pin
 * at all, becomes the newest line; only the former is worth telling the user about. Engines without release lines keep
 * an accepted pin and otherwise get the newest accepted version of the pin's line.
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
    return {
      version: releaseLineOf(engine, pin ?? FALLBACK_VERSIONS[engine] ?? FALLBACK_VERSIONS.postgres!),
      movedOffPin: false
    };
  }
  if (pin !== undefined) {
    if (accepted.includes(pin)) return { version: releaseLineOf(engine, pin), movedOffPin: false };
    // Widening one segment at a time: a stale `16.2` finds the newest `16.x` rather than jumping
    // majors, and a stale mysql `8.0.99` stays in the `8.0` train instead of drifting to `8.4`.
    const pinParts = pin.split('.');
    for (let depth = pinParts.length; depth >= 1; depth -= 1) {
      const prefix = pinParts.slice(0, depth).join('.');
      const line = accepted.filter((version) => inReleaseLine(version, prefix));
      if (line.length > 0) return { version: releaseLineOf(engine, newest(line)), movedOffPin: false };
    }
  }
  return { version: releaseLineOf(engine, newest(accepted)), movedOffPin: pin !== undefined };
};

/**
 * The release lines an engine offers, newest first: `['18', '17', '16', …]` for Postgres. Engines without release
 * lines list their full versions. What the wizard offers when someone picks another version.
 */
export const engineReleaseLines = (engine: string, catalogue: EngineVersionCatalogue | undefined): string[] => {
  const accepted = catalogue?.[engine] ?? [];
  const lines = new Set(accepted.map((version) => releaseLineOf(engine, version)));
  return [...lines].toSorted((a, b) => compareVersions(b, a));
};
