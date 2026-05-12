/**
 * Helper utilities for the Convex resource resolver.
 *
 * ====================================================================================
 * IMPLEMENTATION STATUS: SKELETON ONLY.
 * ====================================================================================
 *
 * Functions intended to live here (per the design in `types/stacktape-config/convex.d.ts`):
 *
 *  - `buildConvexBackendTaskDefinition(stpConvex)` — produces the ECS task definition
 *    with the convex-backend container, env vars (CONVEX_CLOUD_ORIGIN, CONVEX_SITE_ORIGIN,
 *    five S3 bucket envs, DATABASE_URL from Postgres connection string, INSTANCE_SECRET
 *    from Secrets Manager).
 *
 *  - `buildConvexDashboardTaskDefinition(stpConvex)` — task def for the dashboard
 *    container with NEXT_PUBLIC_DEPLOYMENT_URL pointed at the backend's cloud origin.
 *
 *  - `buildAdminKeyCustomResource(stpConvex)` — CloudFormation custom resource that
 *    invokes the convexAdminKeyLambda on first deploy, stores the generated
 *    INSTANCE_SECRET and ADMIN_KEY in Secrets Manager.
 *
 *  - `buildWarmStandbySwapLambda(stpConvex)` — only emitted when
 *    `backend.highAvailability === true`. Subscribes to ECS task-state-change events
 *    and swaps the ALB target group registration on primary failure.
 *
 *  - `buildAlbListenerRules(stpConvex)` — three listener rules on the ALB:
 *      * port 443 with host `customDomains.cloud` → backend cloud target group
 *      * port 443 with host `customDomains.site` → backend site target group (port 3211)
 *      * port 443 with host `customDomains.dashboard` (or port 6791) → dashboard TG
 *    Plus optional `allowedIpRanges` source-IP condition on the dashboard rule.
 *
 *  - `getConvexBackendImageTag()` — resolves the pinned default image tag. Bumped
 *    deliberately and tested before each Stacktape release.
 *
 *  - `getConvexDashboardImageTag()` — same, for the dashboard image.
 *
 *  - `pickPostgresDefaults()` — default RDS engine config: postgres 16,
 *    db.t4g.micro, 20 GB gp3, single-AZ, scoping-workloads-in-vpc accessibility,
 *    1-day backup retention.
 *
 *  - `pickBucketDefaults(stpConvex.storage)` — applies `storage` overrides to each
 *    of the five Convex buckets.
 */

// Default pinned Convex backend image. Bumped per Stacktape release after verification
// against Convex's upgrade-guide migration paths.
export const DEFAULT_CONVEX_BACKEND_IMAGE = 'ghcr.io/get-convex/convex-backend:e80f7eafe3470b69b6b9b6b9b6b9b6b9';

export const DEFAULT_CONVEX_DASHBOARD_IMAGE = 'ghcr.io/get-convex/convex-dashboard:e80f7eafe3470b69b6b9b6b9b6b9b6b9';

export const CONVEX_BACKEND_CLOUD_PORT = 3210;
export const CONVEX_BACKEND_SITE_PORT = 3211;
export const CONVEX_DASHBOARD_PORT = 6791;

export const CONVEX_BUCKET_PURPOSES = ['modules', 'files', 'search', 'exports', 'snapshotImports'] as const;
export type ConvexBucketPurpose = (typeof CONVEX_BUCKET_PURPOSES)[number];

// Env var names the convex-backend container expects. Reference:
// https://github.com/get-convex/convex-backend/blob/main/self-hosted/README.md
export const CONVEX_BUCKET_ENV_VARS: Record<ConvexBucketPurpose, string> = {
  modules: 'S3_STORAGE_MODULES_BUCKET',
  files: 'S3_STORAGE_FILES_BUCKET',
  search: 'S3_STORAGE_SEARCH_BUCKET',
  exports: 'S3_STORAGE_EXPORTS_BUCKET',
  snapshotImports: 'S3_STORAGE_SNAPSHOT_IMPORTS_BUCKET'
};
