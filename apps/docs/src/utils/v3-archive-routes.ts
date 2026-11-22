/**
 * Browser-safe routing data for the frozen Stacktape v3 documentation served under `/v3/`: the
 * v3 ↔ v4 page map used by the banner and the version switcher, and the redirects from old v3 URLs.
 */

export const V3_BASE = '/v3';
export const V3_RELEASE = '3.7.1';
export const UPGRADE_GUIDE_URL = '/getting-started/upgrading-from-v3/';

/** `/compute-resources/functions` → `/v3/compute-resources/functions/`. */
export const v3Url = (v3Path: string) => (v3Path === '/' ? `${V3_BASE}/` : `${V3_BASE}${v3Path.replace(/\/$/, '')}/`);

/** True for a URL path inside the archive. */
export const isV3Path = (pathname: string) => pathname === V3_BASE || pathname.startsWith(`${V3_BASE}/`);

/**
 * The v4 page that covers the same topic as a v3 page, keyed by v3 path. The banner and the version
 * switcher use it; pages without an entry point to the v4 home page instead.
 */
export const V3_TO_V4: Record<string, string> = {
  '/': '/',
  '/3rd-party-resources/mongo-db-atlas-clusters': '/resources/databases/mongodb-atlas/',
  '/3rd-party-resources/upstash-redises': '/resources/databases/upstash-redis/',
  '/cli/commands/aws-profile-create': '/cli/aws-profile-create/',
  '/cli/commands/aws-profile-delete': '/cli/aws-profile-delete/',
  '/cli/commands/aws-profile-list': '/cli/aws-profile-list/',
  '/cli/commands/aws-profile-update': '/cli/aws-profile-update/',
  '/cli/commands/bastion-session': '/cli/bastion-session/',
  '/cli/commands/bastion-tunnel': '/cli/bastion-tunnel/',
  '/cli/commands/bucket-sync': '/cli/bucket-sync/',
  '/cli/commands/cf-module-update': '/cli/cf-module-update/',
  '/cli/commands/compile-template': '/cli/synth/',
  '/cli/commands/container-session': '/cli/container-session/',
  '/cli/commands/defaults-configure': '/cli/defaults-configure/',
  '/cli/commands/defaults-list': '/cli/defaults-list/',
  '/cli/commands/delete': '/cli/delete/',
  '/cli/commands/deploy': '/cli/deploy/',
  '/cli/commands/deployment-script-run': '/cli/deployment-script-run/',
  '/cli/commands/dev': '/cli/dev/',
  '/cli/commands/domain-add': '/cli/domain-add/',
  '/cli/commands/help': '/cli/help/',
  '/cli/commands/init': '/cli/init/',
  '/cli/commands/login': '/cli/login/',
  '/cli/commands/logout': '/cli/logout/',
  '/cli/commands/logs': '/cli/logs/',
  '/cli/commands/package-workloads': '/cli/package/',
  '/cli/commands/param-get': '/cli/param-get/',
  '/cli/commands/preview-changes': '/cli/diff/',
  '/cli/commands/rollback': '/cli/rollback/',
  '/cli/commands/script-run': '/cli/script-run/',
  '/cli/commands/secret-create': '/cli/secret-set/',
  '/cli/commands/secret-delete': '/cli/secret-delete/',
  '/cli/commands/secret-get': '/cli/secret-get/',
  '/cli/commands/stack-info': '/cli/info-stack/',
  '/cli/commands/stack-list': '/cli/info-stacks/',
  '/cli/commands/version': '/cli/version/',
  '/compute-resources/batch-jobs': '/resources/compute/batch-job/',
  '/compute-resources/edge-lambda-functions': '/resources/compute/edge-function/',
  '/compute-resources/functions': '/resources/compute/lambda-function/',
  '/compute-resources/multi-container-workloads': '/resources/compute/multi-container-workload/',
  '/compute-resources/nextjs-website': '/resources/frontend/nextjs/',
  '/compute-resources/private-services': '/resources/compute/private-service/',
  '/compute-resources/web-services': '/resources/compute/web-service/',
  '/compute-resources/worker-services': '/resources/compute/worker-service/',
  '/configuration/alarms': '/observability/alarms/',
  '/configuration/budget-control': '/managing-costs/budgets/',
  '/configuration/directives': '/configuration/directives/',
  '/configuration/hooks': '/configuration/hooks-and-scripts/',
  '/configuration/log-forwarding': '/observability/log-forwarding/',
  '/configuration/overrides': '/configuration/overrides-and-escape-hatches/',
  '/configuration/packaging': '/packaging/overview/',
  '/configuration/progress-notifications': '/observability/notifications/',
  '/configuration/referencing-parameters': '/configuration/referenceable-parameters/',
  '/configuration/scripts': '/configuration/hooks-and-scripts/',
  '/database-resources/dynamo-db-tables': '/resources/databases/dynamodb/',
  '/database-resources/open-search-domains': '/resources/databases/opensearch/',
  '/database-resources/redis-clusters': '/resources/databases/redis/',
  '/database-resources/relational-databases': '/resources/databases/relational-database/',
  '/extending/aws-cdk-constructs': '/resources/advanced/aws-cdk-constructs/',
  '/extending/aws-cloudformation-resources': '/resources/advanced/raw-cloudformation-resources/',
  '/extending/custom-resources': '/resources/advanced/custom-resources/',
  '/getting-started/configuration': '/getting-started/',
  '/getting-started/deployment': '/getting-started/deploy-an-existing-app/',
  '/getting-started/development-mode': '/local-development/dev-mode-overview/',
  '/getting-started/quick-start': '/getting-started/',
  '/other-resources/application-load-balancers': '/resources/networking/application-load-balancer/',
  '/other-resources/buckets': '/resources/storage/s3-bucket/',
  '/other-resources/cdns': '/resources/networking/cdn/',
  '/other-resources/deployment-scripts': '/resources/advanced/deployment-scripts/',
  '/other-resources/domains-and-certificates': '/resources/networking/custom-domains/',
  '/other-resources/efs-filesystems': '/resources/storage/efs-filesystem/',
  '/other-resources/event-buses': '/resources/messaging/event-bus/',
  '/other-resources/hosting-buckets': '/resources/frontend/static-hosting/',
  '/other-resources/http-api-gateways': '/resources/networking/http-api-gateway/',
  '/other-resources/network-load-balancers': '/resources/networking/network-load-balancer/',
  '/other-resources/sns-topics': '/resources/messaging/sns-topic/',
  '/other-resources/sqs-queues': '/resources/messaging/sqs-queue/',
  '/other-resources/state-machines': '/resources/orchestration/state-machine/',
  '/security-resources/bastions': '/resources/security/bastion-host/',
  '/security-resources/secrets': '/configuration/secrets/',
  '/security-resources/user-auth-pools': '/resources/security/user-auth-pool/',
  '/security-resources/web-app-firewalls': '/resources/security/web-application-firewall/',
  '/user-guides/connect-aws-account': '/stacktape-console/connecting-your-aws-account/',
  '/user-guides/development-mode': '/local-development/dev-mode-overview/',
  '/user-guides/vpcs': '/configuration/connecting-resources/',
  '/user-guides/writing-config-in-typescript': '/configuration/configuration-files/'
};

/** Redirects from the old v3 URLs of pages with a v4 equivalent to that v4 page. */
export const V3_REDIRECTS_TO_V4: Record<string, string> = Object.fromEntries(
  Object.entries(V3_TO_V4)
    .filter(([v3Path, v4Url]) => `${v3Path.replace(/\/$/, '')}/` !== v4Url)
    .map(([v3Path, v4Url]) => [`${v3Path}/`, v4Url])
);

/** The v4 page for a v3 page, or `undefined` when v4 has no page on the same topic. */
export const v4EquivalentOf = (v3Path: string): string | undefined => V3_TO_V4[v3Path.replace(/\/$/, '') || '/'];

/** The v3 page for a v4 URL, for the switcher on v4 pages. The first v3 page listed wins. */
export const v3EquivalentOf = (v4Url: string): string | undefined => {
  const normalized = `${v4Url.replace(/\/$/, '')}/`;
  const match = Object.entries(V3_TO_V4).find(([, v4]) => v4 === normalized);
  return match ? v3Url(match[0]) : undefined;
};

/**
 * Redirects from old v3 URLs into the archive (served from the site root before v4).
 *
 * Covers the v3 pages for which v4 has no page on the same topic, and the URLs printed by the 3.7.1
 * CLI that never were v3 pages. v3 pages with a v4 equivalent go to v4 (`V3_REDIRECTS_TO_V4`). 3.7.1
 * commands documented under an older name go to that v3 page; the rest, which v3 never documented, go to
 * the v4 page of the same command.
 */
export const V3_ARCHIVE_REDIRECTS: Record<string, string> = {
  '/cli/commands/': '/v3/cli/commands/',
  '/cli/commands/codebuild-deploy/': '/v3/cli/commands/codebuild-deploy/',
  '/cli/using-cli/': '/v3/cli/using-cli/',
  '/user-guides/configure-aws-profile/': '/v3/user-guides/configure-aws-profile/',
  '/user-guides/enabling-budgeting/': '/v3/user-guides/enabling-budgeting/',
  '/user-guides/installing-and-versioning/': '/v3/user-guides/installing-and-versioning/',
  '/user-guides/migrating-from-heroku/': '/v3/user-guides/migrating-from-heroku/',
  '/user-guides/mongo-db-atlas-credentials/': '/v3/user-guides/mongo-db-atlas-credentials/',
  // Printed by the 3.7.1 CLI (error hints, pricing info, help) but never v3 pages.
  '/compute-resources/lambda-functions/': '/v3/compute-resources/functions/',
  '/3rd-party-resources/upstash-redis/': '/v3/3rd-party-resources/upstash-redises/',
  '/bastion-servers/': '/v3/security-resources/bastions/',
  '/resources/bastion-servers/': '/v3/security-resources/bastions/',
  '/getting-started/setup-stacktape/': '/v3/getting-started/quick-start/',
  '/cli/commands/dev-stop/': '/cli/dev-stop/',
  '/cli/commands/cf-rollback/': '/cli/cf-rollback/',
  '/cli/commands/debug-logs/': '/v3/cli/commands/logs/',
  '/cli/commands/debug-alarms/': '/cli/alarms/',
  '/cli/commands/debug-metrics/': '/cli/metrics/',
  '/cli/commands/debug-container-exec/': '/cli/container-exec/',
  '/cli/commands/debug-sql/': '/cli/query-sql/',
  '/cli/commands/debug-aws-sdk/': '/cli/aws-call/',
  '/cli/commands/debug-dynamodb/': '/cli/query-dynamodb/',
  '/cli/commands/debug-redis/': '/cli/query-redis/',
  '/cli/commands/debug-opensearch/': '/cli/query-opensearch/',
  '/cli/commands/info-stacks/': '/v3/cli/commands/stack-list/',
  '/cli/commands/info-stack/': '/v3/cli/commands/stack-info/',
  '/cli/commands/info-whoami/': '/cli/info-whoami/',
  '/cli/commands/info-operations/': '/cli/info-operations/',
  '/cli/commands/upgrade/': '/cli/upgrade/',
  '/cli/commands/org-create/': '/cli/org-create/',
  '/cli/commands/org-list/': '/cli/org-list/',
  '/cli/commands/org-delete/': '/cli/org-delete/',
  '/cli/commands/project-create/': '/cli/project-create/',
  '/cli/commands/projects-list/': '/cli/project-list/',
  '/cli/commands/mcp/': '/cli/mcp/',
  '/cli/commands/mcp-add/': '/cli/mcp-add/'
};
