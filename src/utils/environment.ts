/* eslint-disable jsdoc/check-param-names */
type Language = 'javascript' | 'typescript' | 'python' | 'go' | 'java' | 'unknown';

const JS_TS_EXTENSIONS = ['js', 'ts', 'mjs', 'mts', 'cjs', 'cts', 'jsx', 'tsx'];

export const getLanguageFromExtension = (entryfilePath?: string): Language => {
  if (!entryfilePath) return 'unknown';
  const ext = entryfilePath.split('.').pop()?.toLowerCase();
  if (ext && JS_TS_EXTENSIONS.includes(ext)) return 'typescript'; // treat all JS/TS as typescript
  if (ext === 'py') return 'python';
  if (ext === 'go') return 'go';
  if (ext === 'java') return 'java';
  return 'unknown';
};

/**
 * Universal function to augment environment variables for any workload.
 * Adds NODE_OPTIONS flags for JS/TS workloads with Stacktape-managed packaging:
 * - --enable-source-maps (always)
 * - --experimental-require-module --experimental-detect-module (Node 22+)
 *
 * @param environment - Existing environment variables
 * @param workloadType - Type of workload (e.g. 'function', 'web-service')
 * @param packagingType - How the workload is packaged
 * @param language - Language of the workload (or infer from entryfilePath)
 * @param entryfilePath - Optional path to entryfile (used to infer language if not provided)
 * @param nodeVersion - Node.js version (used to add experimental flags for Node 22+)
 */
export const getAugmentedEnvironment = <T extends { name: string; value: string | number | boolean }>({
  environment = [] as T[],
  workloadType,
  packagingType,
  language,
  entryfilePath,
  nodeVersion
}: {
  environment?: T[];
  workloadType: StpWorkloadType;
  packagingType?: SupportedPackagingType;
  language?: Language;
  entryfilePath?: string;
  nodeVersion?: number;
}): T[] => {
  // @note edge lambdas don't support environment variables
  if (workloadType === 'edge-lambda-function') {
    return environment;
  }

  const userManagedPackaging: SupportedPackagingType[] = [
    'prebuilt-image',
    'custom-dockerfile',
    'nixpacks',
    'external-buildpack',
    'custom-artifact'
  ];
  if (packagingType && userManagedPackaging.includes(packagingType)) {
    return environment;
  }

  const resolvedLanguage = language || getLanguageFromExtension(entryfilePath);

  if (resolvedLanguage !== 'javascript' && resolvedLanguage !== 'typescript') {
    return environment;
  }

  return addNodeFlags(environment, nodeVersion);
};

/** Adds NODE_OPTIONS flags: --enable-source-maps and experimental CJS/ESM interop flags for Node 22+ */
const addNodeFlags = <T extends { name: string; value: string | number | boolean }>(
  environment: T[] = [],
  nodeVersion?: number
): T[] => {
  const existingNodeOptions = environment.find((e) => e.name === 'NODE_OPTIONS');
  const existingValue = existingNodeOptions ? String(existingNodeOptions.value) : '';

  const flagsToAdd: string[] = [];

  // Always add source maps
  if (!existingValue.includes('--enable-source-maps')) {
    flagsToAdd.push('--enable-source-maps');
  }

  // Add experimental CJS/ESM interop flags for Node 22+ (helps with dynamic require in ESM)
  if (nodeVersion && nodeVersion >= 22) {
    if (!existingValue.includes('--experimental-require-module')) {
      flagsToAdd.push('--experimental-require-module');
    }
    if (!existingValue.includes('--experimental-detect-module')) {
      flagsToAdd.push('--experimental-detect-module');
    }
  }

  if (!flagsToAdd.length) {
    return environment;
  }

  const newNodeOptionsValue = existingValue ? `${existingValue} ${flagsToAdd.join(' ')}` : flagsToAdd.join(' ');

  return [
    ...environment.filter((e) => e.name !== 'NODE_OPTIONS'),
    { name: 'NODE_OPTIONS', value: newNodeOptionsValue } as T
  ];
};
