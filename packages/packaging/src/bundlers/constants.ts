// Python, Java, Ruby and .NET Lambda builds have no default version here. They build for the function's Lambda runtime,
// which the CLI resolves once (an unpinned function gets the first runtime its language lists) for both the template
// and the build.

export const DEFAULT_GRADLE_VERSION = '8.5';

/** Node.js defaults for workloads that do not pin `nodeVersion`. */
export const DEFAULT_CONTAINER_NODE_VERSION = 24;
export const DEFAULT_LAMBDA_NODE_VERSION = 24;

/**
 * Cache format for artifacts produced by Stacktape-owned buildpacks.
 *
 * Increment this whenever implementation changes can alter the output without changing customer source or config.
 * This prevents an already uploaded artifact from silently bypassing buildpack fixes after a CLI upgrade.
 */
export const STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION = 5;
