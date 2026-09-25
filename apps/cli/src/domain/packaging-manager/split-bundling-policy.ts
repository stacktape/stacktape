import type { EsLanguageSpecificConfig, LambdaPackaging } from '@stacktape/config/deployment-artifacts';
import type { LambdaRuntime } from '@stacktape/config/primitives';
import { resolveNodeVersion } from '@stacktape/packaging/bundlers/node-version';

export type SplitBundlingCandidate = {
  packaging: LambdaPackaging;
  architecture?: 'x86_64' | 'arm64' | undefined;
  runtime?: LambdaRuntime | undefined;
  /**
   * Whether this function's handler must be wrapped in Stacktape's OTel runtime.
   *
   * Only the per-Lambda buildpack generates that wrapper entry; a split build bundles the user's entry
   * file directly. A traced function must therefore stay off the split path, or it deploys with tracing
   * silently missing rather than failing.
   */
  tracingEnabled?: boolean | undefined;
};

/** Lambda Node runtimes the split path's ESM output runs on. */
const SUPPORTED_NODE_VERSIONS = [18, 20, 22, 24];

/**
 * Code-unit order. `localeCompare` follows the machine's collation, so two machines with different locales could
 * choose different groups — and therefore produce different layers and digests — from the same configuration.
 */
const compareCodeUnits = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

/**
 * The build consults these dependency lists as sets, so their authored order and repetition must not decide which
 * functions share it. The copy leaves the authored configuration untouched.
 */
const normalizeDependencyNames = (names: string[] | undefined): string[] =>
  [...new Set(names ?? [])].toSorted(compareCodeUnits);

/**
 * What one split build can honor for a Lambda, or `null` when it cannot serve that Lambda at all.
 *
 * Two Lambdas share a build only when their keys match, so every property the single `Bun.build`
 * call is configured with has to appear in the key. A property that only changes the Lambda's
 * CloudFormation — `handlerFunction`, which names an export the bundle already carries — does not
 * belong here: it is not something the build decides.
 */
const getCompatibilityKey = ({
  packaging,
  architecture,
  runtime,
  tracingEnabled
}: SplitBundlingCandidate): string | null => {
  if (packaging.type !== 'stacktape-lambda-buildpack' || tracingEnabled) {
    return null;
  }

  const { excludeDependencies, excludeFiles, includeFiles, languageSpecificConfig } = packaging.properties;
  const esConfig = languageSpecificConfig as EsLanguageSpecificConfig | undefined;
  const nodeVersion = resolveNodeVersion({ nodeVersion: esConfig?.nodeVersion, runtime, target: 'lambda' });

  // Options the split path does not implement. Such a Lambda keeps the ordinary per-Lambda path
  // rather than being packaged by a build that would silently ignore them.
  if (
    !SUPPORTED_NODE_VERSIONS.includes(nodeVersion) ||
    esConfig?.outputModuleFormat === 'cjs' ||
    esConfig?.emitTsDecoratorMetadata ||
    esConfig?.outputSourceMapsTo ||
    esConfig?.dependenciesToExcludeFromDeploymentPackage?.length ||
    includeFiles?.length ||
    excludeFiles?.length
  ) {
    return null;
  }

  return JSON.stringify({
    architecture: architecture ?? 'x86_64',
    nodeVersion,
    tsConfigPath: esConfig?.tsConfigPath ?? 'tsconfig.json',
    disableSourceMaps: esConfig?.disableSourceMaps ?? false,
    minify: esConfig?.minify ?? true,
    minifyIdentifiers: esConfig?.minifyIdentifiers ?? false,
    bundleAwsSdk: esConfig?.bundleAwsSdk ?? false,
    dependenciesToExcludeFromBundle: normalizeDependencyNames(esConfig?.dependenciesToExcludeFromBundle),
    excludeDependencies: normalizeDependencyNames(excludeDependencies)
  });
};

/**
 * Split the Lambdas into the largest set one build can serve, and the rest.
 *
 * A single incompatible function used to cost every other function its shared layer. It now costs
 * only itself: it is packaged on its own while its compatible siblings are still bundled together.
 * Sharing needs at least two functions, so a group of one falls back as well.
 *
 * The chosen group decides what ends up in a shared layer and therefore what each artifact's digest
 * is, so the choice is deterministic: largest group first, then by the key's code-unit order. Two runs
 * over the same configuration package the same functions together on any machine.
 */
export const selectSplitBundlingGroup = <Candidate extends SplitBundlingCandidate>(
  candidates: Candidate[]
): { split: Candidate[]; perFunction: Candidate[] } => {
  const groups = new Map<string, Candidate[]>();
  const perFunction: Candidate[] = [];

  for (const candidate of candidates) {
    const key = getCompatibilityKey(candidate);
    if (key === null) {
      perFunction.push(candidate);
      continue;
    }
    const group = groups.get(key);
    if (group) {
      group.push(candidate);
    } else {
      groups.set(key, [candidate]);
    }
  }

  const [chosenKey] =
    [...groups.entries()]
      .filter(([, group]) => group.length >= 2)
      .toSorted(
        ([leftKey, left], [rightKey, right]) => right.length - left.length || compareCodeUnits(leftKey, rightKey)
      )[0] ?? [];

  for (const [key, group] of groups) {
    if (key !== chosenKey) perFunction.push(...group);
  }

  return { split: chosenKey === undefined ? [] : (groups.get(chosenKey) ?? []), perFunction };
};

/** Native split-bundle dependencies can only be materialized while Docker is available. */
export const canBuildSplitNativeDependencies = ({
  dependencyCount,
  dockerIsRunning
}: {
  dependencyCount: number;
  dockerIsRunning: boolean;
}): boolean => dependencyCount === 0 || dockerIsRunning;
