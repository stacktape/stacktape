import { EXTERNAL_TOOL_MANIFEST } from '@utils/external-tools';

/**
 * The Railpack release the CLI builds with. The binary plans (`railpack prepare`) and the frontend image builds the
 * plan inside BuildKit; both come from one release because the plan format is not versioned upstream. The builder and
 * runtime images a plan names are pinned by the binary itself. Bump all of them together through
 * `scripts/pin-external-tools.ts`.
 */
export const RAILPACK_VERSION = EXTERNAL_TOOL_MANIFEST.railpack.version;

export const RAILPACK_FRONTEND_IMAGE = `ghcr.io/railwayapp/railpack-frontend:v${RAILPACK_VERSION}`;

/**
 * The image the planner runs in where the host binary is not supported (Windows). It is Railpack's own builder image,
 * which has the tools the planner's version resolution needs (bash, git), with the release binary copied in from the
 * frontend image. Built locally on first use and kept per release.
 */
export const RAILPACK_PLANNER_IMAGE = `stacktape-railpack-planner:v${RAILPACK_VERSION}`;
