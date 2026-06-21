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
