import type {
  SupportedDotnetVersion,
  SupportedJavaVersion,
  SupportedPhpVersion,
  SupportedPythonPackageManager,
  SupportedPythonVersion,
  SupportedRubyVersion
} from '@stacktape/config/deployment-artifacts';

export type SupportedEsPackageManager = 'yarn' | 'npm' | 'pnpm' | 'deno' | 'bun';

export type DockerBuildOutputArchitecture = 'linux/amd64' | 'linux/arm64';

/**
 * A package resolved while analysing an ECMAScript dependency graph.
 *
 * This is deliberately distinct from the split bundler's dependency contract:
 * callers of the regular bundler also use the resolved path and dependency
 * relationship when deciding what Docker must install.
 */
export type ResolvedPackageDependency = {
  name: string;
  path: string;
  version: string;
  parentModulePath?: string;
  dependencyType: 'root' | 'standard' | 'optional-peer' | 'peer';
  note?: string;
};

export type LanguageSpecificBundleOutput = {
  es?: {
    dependenciesToInstallInDocker?: ResolvedPackageDependency[];
    packageManager?: SupportedEsPackageManager;
    dynamicallyImportedModules?: string[];
  };
  py?: {
    packageManager: SupportedPythonPackageManager;
    pythonVersion: SupportedPythonVersion;
  };
  java?: {
    useMaven: boolean;
    javaVersion: SupportedJavaVersion;
  };
  ruby?: {
    rubyVersion: SupportedRubyVersion;
  };
  php?: {
    phpVersion: SupportedPhpVersion;
  };
  dotnet?: {
    dotnetVersion: SupportedDotnetVersion;
  };
};

export type CreateBundleOutput = {
  digest: string;
  outcome: 'skipped' | 'bundled';
  distIndexFilePath: string;
  distFolderPath: string;
  sourceFiles: { path: string }[];
  languageSpecificBundleOutput: LanguageSpecificBundleOutput;
};

export type PackagingOutput = {
  /**
   * A number when the artifact was measured; `null` for cached/skipped results and for bundled ES image development
   * builds. Pre-zipped custom artifacts return an own `size` property whose value is `undefined`, which JSON
   * serialization then omits.
   */
  size: number | null | undefined;
  zippedSize?: number;
  imageName?: string;
  digest: string;
  outcome: 'skipped' | 'bundled';
  sourceFiles?: { path: string }[];
  artifactPath?: string;
  distFolderPath?: string;
  details?: Record<string, unknown>;
  jobName: string;
  /** All npm modules resolved during bundling (for Lambda functions). */
  resolvedModules?: string[];
};
