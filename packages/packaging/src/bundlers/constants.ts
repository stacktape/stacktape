import type {
  SupportedDotnetVersion,
  SupportedJavaVersion,
  SupportedPhpVersion,
  SupportedPythonVersion,
  SupportedRubyVersion
} from '@stacktape/config/deployment-artifacts';

/**
 * Language runtime defaults applied when a user does not pin a version. Changing one changes what
 * every unpinned workload is built and deployed with, so they are compatibility-sensitive.
 */
export const DEFAULT_PYTHON_VERSION: SupportedPythonVersion = 3.12;
export const DEFAULT_RUBY_VERSION: SupportedRubyVersion = 3.3;
export const DEFAULT_PHP_VERSION: SupportedPhpVersion = 8.3;
export const DEFAULT_DOTNET_VERSION: SupportedDotnetVersion = 8;
export const DEFAULT_JAVA_VERSION: SupportedJavaVersion = 11;
export const DEFAULT_GRADLE_VERSION = '8.5';

/** Node.js defaults for workloads that do not pin `nodeVersion`. */
export const DEFAULT_CONTAINER_NODE_VERSION = 24;
export const DEFAULT_LAMBDA_NODE_VERSION = 24;

/** AWS Lambda Node runtimes that already include the modular AWS SDK v3 clients. */
export const NODE_RUNTIME_VERSIONS_WITH_SKIPPED_SDK_V3_PACKAGING = [24, 22, 20, 18];

/**
 * Cache format for artifacts produced by Stacktape-owned buildpacks.
 *
 * Increment this whenever implementation changes can alter the output without changing customer source or config.
 * This prevents an already uploaded artifact from silently bypassing buildpack fixes after a CLI upgrade.
 */
export const STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION = 3;
