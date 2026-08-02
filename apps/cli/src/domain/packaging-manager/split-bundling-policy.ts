import type { EsLanguageSpecificConfig, LambdaPackaging } from '@stacktape/config/deployment-artifacts';
import type { LambdaRuntime } from '@stacktape/config/primitives';
import { resolveNodeVersion } from '@stacktape/packaging/bundlers/node-version';

export type SplitBundlingCandidate = {
  packaging: LambdaPackaging;
  architecture?: 'x86_64' | 'arm64' | undefined;
  runtime?: LambdaRuntime | undefined;
};

const getCompatibilityKey = ({ packaging, architecture, runtime }: SplitBundlingCandidate): string | null => {
  if (packaging.type !== 'stacktape-lambda-buildpack') {
    return null;
  }

  const { excludeDependencies, excludeFiles, handlerFunction, includeFiles, languageSpecificConfig } =
    packaging.properties;
  const esConfig = languageSpecificConfig as EsLanguageSpecificConfig | undefined;
  const nodeVersion = resolveNodeVersion({ nodeVersion: esConfig?.nodeVersion, runtime, target: 'lambda' });

  // Split output is ESM and currently supports only the default v4 Node runtime. Unsupported options retain the
  // ordinary per-Lambda path instead of being silently ignored by the split path.
  if (
    nodeVersion !== 24 ||
    esConfig?.outputModuleFormat === 'cjs' ||
    esConfig?.emitTsDecoratorMetadata ||
    esConfig?.outputSourceMapsTo ||
    esConfig?.dependenciesToExcludeFromDeploymentPackage?.length ||
    includeFiles?.length ||
    excludeFiles?.length ||
    excludeDependencies?.length ||
    handlerFunction
  ) {
    return null;
  }

  return JSON.stringify({
    architecture: architecture ?? 'x86_64',
    tsConfigPath: esConfig?.tsConfigPath ?? 'tsconfig.json',
    disableSourceMaps: esConfig?.disableSourceMaps ?? false,
    dependenciesToExcludeFromBundle: esConfig?.dependenciesToExcludeFromBundle ?? []
  });
};

/** Split bundling is safe only when one build can honor every candidate's artifact contract. */
export const canUseSplitBundling = (candidates: SplitBundlingCandidate[]): boolean => {
  if (candidates.length < 2) {
    return false;
  }
  const firstKey = getCompatibilityKey(candidates[0]!);
  return firstKey !== null && candidates.every((candidate) => getCompatibilityKey(candidate) === firstKey);
};

/** Native split-bundle dependencies can only be materialized while Docker is available. */
export const canBuildSplitNativeDependencies = ({
  dependencyCount,
  dockerIsRunning
}: {
  dependencyCount: number;
  dockerIsRunning: boolean;
}): boolean => dependencyCount === 0 || dockerIsRunning;
