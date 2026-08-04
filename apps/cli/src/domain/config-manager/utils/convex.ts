import type { StpApplicationLoadBalancer } from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type { StpConvex } from '@domain-services/config-manager/resolved-types/convex';
import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { StpRelationalDatabase } from '@domain-services/config-manager/resolved-types/relational-databases';
import type { StackContext } from '@domain-services/stack-context';
import type { DomainConfiguration } from '@stacktape/config/shared';
/**
 * Convex config preprocessing.
 *
 * Validation and nested-resource materialization for the synthesized self-hosted Convex resource.
 */

import { isAbsolute, join } from 'node:path';
import { tuiManager } from '@application-services/tui-manager';
import { getStpNameForResource } from '@stacktape/naming/stacktape-resource-names';
import { dirExists, isFileAccessible } from '@utils/fs-utils';
import { CliError } from '@utils/errors';
import type { DefaultedResource } from '../normalized-resource';

// Default pinned Convex images. Bump deliberately after testing Convex's
// self-hosted migration path against a real Stacktape deployment.
export const DEFAULT_CONVEX_BACKEND_IMAGE =
  'ghcr.io/get-convex/convex-backend@sha256:122da352b12b216a017a1fb45c6a467f41a5b746158b47aecd1fe12f9f74edb0';

export const DEFAULT_CONVEX_DASHBOARD_IMAGE =
  'ghcr.io/get-convex/convex-dashboard@sha256:26bd4a89b097c5dd89e78d194a6b79c5c1b8cb1d02801b9946a9eb7b716e18dd';

export const getConvexSecretName = ({
  nameChain,
  region,
  stackName
}: {
  nameChain: string[];
  region: string;
  stackName: string;
}) => `stp/${region}/${stackName}/${nameChain.join('.')}`;

export const validateConvexConfig = ({ resource, workingDir }: { resource: StpConvex; workingDir: string }) => {
  const absoluteAppDirectory = isAbsolute(resource.appDirectory)
    ? resource.appDirectory
    : join(workingDir, resource.appDirectory);

  if (!dirExists(absoluteAppDirectory)) {
    throw new CliError({
      category: 'CONFIG',
      code: 'CONFIG_CONVEX_APP_DIRECTORY_MISSING',
      message: `Convex resource \`${resource.name}\` uses missing app directory \`${resource.appDirectory}\` (resolved to \`${absoluteAppDirectory}\`).`,
      hints: 'Create a `convex/` directory containing your Convex functions, or update `appDirectory`.'
    });
  }

  if (!isFileAccessible(join(absoluteAppDirectory, 'schema.ts'))) {
    tuiManager.warn(
      `Convex resource '${resource.name}' has no schema.ts in '${resource.appDirectory}'. This is valid for schema-less apps, but make sure the directory contains your Convex functions.`
    );
  }

  const customDomains = resource.customDomains;
  if (customDomains) {
    const missingRequiredOrigins = [
      !customDomains.cloud && 'customDomains.cloud',
      !customDomains.site && 'customDomains.site',
      resource.dashboard?.enabled !== false && !customDomains.dashboard && 'customDomains.dashboard'
    ].filter(Boolean);
    if (missingRequiredOrigins.length) {
      throw new CliError({
        category: 'CONFIG',
        code: 'CONFIG_CONVEX_CUSTOM_DOMAIN_MISSING',
        message: `Convex resource \`${resource.name}\` is missing ${missingRequiredOrigins.map((name) => `\`${name}\``).join(', ')}.`,
        hints: 'Provide separate cloud and site domains, plus a dashboard domain when the Convex dashboard is enabled.'
      });
    }
    if (resource.dashboard?.enabled === false && customDomains.dashboard) {
      throw new CliError({
        category: 'CONFIG',
        code: 'CONFIG_CONVEX_DASHBOARD_DOMAIN_UNUSED',
        message: `Convex resource \`${resource.name}\` sets \`customDomains.dashboard\` while \`dashboard.enabled\` is false.`,
        hints: 'Remove `customDomains.dashboard` or enable the Convex dashboard.'
      });
    }
  }

  if (resource.functionsDeployment?.workingDirectory) {
    const absoluteWorkingDirectory = isAbsolute(resource.functionsDeployment.workingDirectory)
      ? resource.functionsDeployment.workingDirectory
      : join(workingDir, resource.functionsDeployment.workingDirectory);
    if (!dirExists(absoluteWorkingDirectory)) {
      throw new CliError({
        category: 'CONFIG',
        code: 'CONFIG_CONVEX_FUNCTIONS_DIRECTORY_MISSING',
        message: `Convex resource \`${resource.name}\` uses missing functions directory \`${resource.functionsDeployment.workingDirectory}\` (resolved to \`${absoluteWorkingDirectory}\`).`,
        hints: 'Create the directory or remove `functionsDeployment.workingDirectory`.'
      });
    }
  }

  if (resource.dashboard?.enabled !== false && !resource.dashboard?.allowedIpRanges?.length) {
    tuiManager.warn(
      `Convex dashboard for '${resource.name}' is internet-reachable. Set dashboard.allowedIpRanges to restrict access in production.`
    );
  }
};

/**
 * Builds the nine resources a self-hosted Convex deployment brings with it: the backend and (optionally) dashboard
 * container workloads, the Postgres database they share, the five S3 buckets convex-backend stores its data in, and
 * the load balancer that fronts all of them.
 *
 * The topology is fixed rather than configurable. convex-backend OSS runs as a single instance, serves its cloud and
 * site origins from two ports of the same process, and addresses its own infrastructure through Stacktape resource
 * references, so the shape below is what the Convex resolver and the post-deploy admin-key step both expect to find.
 */
export const buildConvexNestedResources = ({
  convex,
  stackContext
}: {
  convex: DefaultedResource<'convex'>;
  stackContext: StackContext;
}): StpConvex['_nestedResources'] => {
  const { name, nameChain, type } = convex;

  // helper: build a child name chain + resolved Stp name
  const child = (suffix: string) => {
    const childNameChain = [...nameChain, suffix];
    return {
      nameChain: childNameChain,
      name: getStpNameForResource({ nameChain: childNameChain, parentResourceType: type })
    };
  };

  const childRef = (suffix: string) => [...nameChain, suffix].join('.');

  // suffix MUST match the _nestedResources key — findResourceInConfig walks via that map
  const backendChild = child('backendContainerWorkload');
  const dashboardChild = child('dashboardContainerWorkload');
  const databaseChild = child('database');
  const albChild = child('loadBalancer');
  const albRef = childRef('loadBalancer');
  const modulesBucketChild = child('modulesBucket');
  const modulesBucketRef = childRef('modulesBucket');
  const filesBucketChild = child('filesBucket');
  const filesBucketRef = childRef('filesBucket');
  const searchBucketChild = child('searchBucket');
  const searchBucketRef = childRef('searchBucket');
  const exportsBucketChild = child('exportsBucket');
  const exportsBucketRef = childRef('exportsBucket');
  const snapshotImportsBucketChild = child('snapshotImportsBucket');
  const snapshotImportsBucketRef = childRef('snapshotImportsBucket');
  const databaseRef = childRef('database');
  const convexSecretName = getConvexSecretName({
    nameChain,
    region: stackContext.region,
    stackName: stackContext.stackName
  });

  const mkBucket = (c: { nameChain: string[]; name: string }): StpBucket => ({
    type: 'bucket',
    name: c.name,
    nameChain: c.nameChain,
    configParentResourceType: type,
    encryption: convex.storage?.encryption ?? true,
    versioning: convex.storage?.versioning ?? false,
    lifecycleRules: convex.storage?.lifecycleRules,
    cors: {
      corsRules: [
        {
          allowedOrigins: ['*'],
          allowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
          allowedHeaders: ['*']
        }
      ]
    } as unknown as StpBucket['cors']
  });

  const backendImage = convex.backend?.image || DEFAULT_CONVEX_BACKEND_IMAGE;
  const dashboardImage = convex.dashboard?.image || DEFAULT_CONVEX_DASHBOARD_IMAGE;
  const usesCustomDomains = Boolean(
    convex.customDomains?.cloud || convex.customDomains?.site || convex.customDomains?.dashboard
  );

  // Build the backend container workload. Convex exposes 3210 (cloud) + 3211 (site)
  // — both routed through the same ALB on different listener ports.
  const backendContainerWorkload = {
    type: 'multi-container-workload' as const,
    name: backendChild.name,
    nameChain: backendChild.nameChain,
    configParentResourceType: type,
    resources: convex.backend?.resources ?? { cpu: 0.5 as const, memory: 1024 },
    // Single-instance correctness invariant: convex-backend OSS does not support
    // horizontal scaling. Hard-coded to 1/1.
    scaling: { minInstances: 1, maxInstances: 1 },
    // Required for Stacktape's post-deploy admin-key generation. The generated
    // key is used to run `npx convex deploy` against the new self-hosted backend.
    enableRemoteSessions: true,
    usePrivateSubnetsWithNAT: false,
    connectTo: [
      databaseRef,
      modulesBucketRef,
      filesBucketRef,
      searchBucketRef,
      exportsBucketRef,
      snapshotImportsBucketRef
    ],
    containers: [
      {
        name: 'convex-backend',
        essential: true,
        packaging: {
          type: 'prebuilt-image' as const,
          properties: { image: backendImage }
        },
        logging: convex.backend?.logging,
        // Both convex ports listen but only the cloud port (3210) returns
        // 200 on `/`. The site port (3211) returns 404 because that origin
        // only serves user-defined HTTP actions. The convex resolver patches
        // each ALB target group's HttpCode matcher to accept 200-499 so the
        // 404 on port 3211's `/` counts as healthy — both ports run in the
        // same Fargate process so liveness is identical.
        loadBalancerHealthCheck: {
          healthcheckPath: '/'
        },
        environment: [
          { name: 'INSTANCE_NAME', value: name },
          {
            name: 'INSTANCE_SECRET',
            value: `{{resolve:secretsmanager:${convexSecretName}:SecretString:instanceSecret}}`
          },
          {
            name: 'CONVEX_CLOUD_ORIGIN',
            value:
              (convex.customDomains?.cloud?.domainName && `https://${convex.customDomains.cloud.domainName}`) ||
              '__resolver_overrides_this__'
          },
          {
            name: 'CONVEX_SITE_ORIGIN',
            value:
              (convex.customDomains?.site?.domainName && `https://${convex.customDomains.site.domainName}`) ||
              '__resolver_overrides_this__'
          },
          { name: 'AWS_REGION', value: stackContext.region },
          // Convex skips its own TLS init when this is set. Combined with the
          // `rds.force_ssl=0` parameter-group override the convex resolver
          // injects, the connection goes plaintext over the VPC's internal
          // network.
          { name: 'DO_NOT_REQUIRE_SSL', value: 'true' },
          { name: 'PORT', value: 3210 },
          { name: 'SITE_PROXY_PORT', value: 3211 },
          {
            name: 'S3_STORAGE_MODULES_BUCKET',
            value: `$ResourceParam('${modulesBucketRef}', 'name')` as unknown as string
          },
          {
            name: 'S3_STORAGE_FILES_BUCKET',
            value: `$ResourceParam('${filesBucketRef}', 'name')` as unknown as string
          },
          {
            name: 'S3_STORAGE_SEARCH_BUCKET',
            value: `$ResourceParam('${searchBucketRef}', 'name')` as unknown as string
          },
          {
            name: 'S3_STORAGE_EXPORTS_BUCKET',
            value: `$ResourceParam('${exportsBucketRef}', 'name')` as unknown as string
          },
          {
            name: 'S3_STORAGE_SNAPSHOT_IMPORTS_BUCKET',
            value: `$ResourceParam('${snapshotImportsBucketRef}', 'name')` as unknown as string
          },
          // Placeholder POSTGRES_URL — the convex resolver patches this with a
          // properly-formed Fn::Sub at template-override time. Stacktape's normal
          // `connectionString` resource param includes a `/defdb` path that convex
          // rejects, and directive composition (`$Secret(...)` mid-string) is not
          // supported, so the URL has to be built directly against CF intrinsics.
          { name: 'POSTGRES_URL', value: '__resolver_overrides_this__' }
        ],
        events: [
          {
            type: 'application-load-balancer' as const,
            properties: {
              priority: 10,
              containerPort: 3210,
              listenerPort: usesCustomDomains ? undefined : 3210,
              loadBalancerName: albRef,
              paths: ['*'],
              hosts: convex.customDomains?.cloud?.domainName ? [convex.customDomains.cloud.domainName] : undefined
            }
          },
          {
            type: 'application-load-balancer' as const,
            properties: {
              priority: 20,
              containerPort: 3211,
              listenerPort: usesCustomDomains ? undefined : 3211,
              loadBalancerName: albRef,
              paths: ['*'],
              hosts: convex.customDomains?.site?.domainName ? [convex.customDomains.site.domainName] : undefined
            }
          }
        ],
        stopTimeout: 30
      }
    ]
  } as unknown as StpContainerWorkload;

  const dashboardEnabled = convex.dashboard?.enabled !== false;
  const dashboardContainerWorkload = dashboardEnabled
    ? ({
        type: 'multi-container-workload' as const,
        name: dashboardChild.name,
        nameChain: dashboardChild.nameChain,
        configParentResourceType: type,
        resources: convex.dashboard?.resources ?? { cpu: 0.25 as const, memory: 512 },
        scaling: { minInstances: 1, maxInstances: 1 },
        usePrivateSubnetsWithNAT: false,
        containers: [
          {
            name: 'convex-dashboard',
            essential: true,
            packaging: {
              type: 'prebuilt-image' as const,
              properties: { image: dashboardImage }
            },
            logging: convex.dashboard?.logging,
            environment: [
              {
                name: 'NEXT_PUBLIC_DEPLOYMENT_URL',
                value:
                  (convex.customDomains?.cloud?.domainName && `https://${convex.customDomains.cloud.domainName}`) ||
                  '__resolver_overrides_this__'
              },
              { name: 'PORT', value: 6791 }
            ],
            events: [
              {
                type: 'application-load-balancer' as const,
                properties: {
                  priority: 30,
                  containerPort: 6791,
                  listenerPort: usesCustomDomains ? undefined : 6791,
                  loadBalancerName: albRef,
                  paths: ['*'],
                  hosts: convex.customDomains?.dashboard?.domainName
                    ? [convex.customDomains.dashboard.domainName]
                    : undefined,
                  sourceIps: convex.dashboard?.allowedIpRanges
                }
              }
            ],
            stopTimeout: 5
          }
        ]
      } as unknown as StpContainerWorkload)
    : undefined;

  // Database default: smallest single-AZ Postgres 16, scoping-workloads-in-vpc.
  const database = {
    type: 'relational-database' as const,
    name: databaseChild.name,
    nameChain: databaseChild.nameChain,
    configParentResourceType: type,
    credentials: {
      masterUserName: 'convex',
      masterUserPassword: `{{resolve:secretsmanager:${convexSecretName}:SecretString:dbPassword}}`
    },
    engine: convex.database?.engine ?? {
      type: 'postgres',
      properties: {
        version: '16.6',
        // Postgres defaults the database name to the connecting user when the
        // URL has no path. Convex rejects URLs with a path. Naming the RDS
        // default db `convex` keeps both sides happy.
        dbName: 'convex',
        primaryInstance: { instanceSize: 'db.t4g.micro', multiAz: false }
      }
    },
    accessibility: convex.database?.accessibility ?? { accessibilityMode: 'scoping-workloads-in-vpc' as const },
    automatedBackupRetentionDays: convex.database?.automatedBackupRetentionDays ?? 1,
    preferredMaintenanceWindow: convex.database?.preferredMaintenanceWindow,
    logging: convex.database?.logging,
    deletionProtection: convex.deletionProtection ?? false,
    alarms: convex.alarms?.filter((alarm) => alarm.trigger.type.startsWith('database-')),
    disabledGlobalAlarms: convex.disabledGlobalAlarms
  } as unknown as StpRelationalDatabase;

  const collectedCustomDomains: DomainConfiguration[] = [];
  if (convex.customDomains?.cloud) collectedCustomDomains.push(convex.customDomains.cloud);
  if (convex.customDomains?.site) collectedCustomDomains.push(convex.customDomains.site);
  if (convex.customDomains?.dashboard) collectedCustomDomains.push(convex.customDomains.dashboard);

  const loadBalancer = {
    type: 'application-load-balancer' as const,
    name: albChild.name,
    nameChain: albChild.nameChain,
    configParentResourceType: type,
    customDomains: collectedCustomDomains.length ? collectedCustomDomains : undefined,
    listeners: collectedCustomDomains.length
      ? undefined
      : [
          { protocol: 'HTTPS' as const, port: 3210 },
          { protocol: 'HTTPS' as const, port: 3211 },
          ...(dashboardEnabled ? [{ protocol: 'HTTPS' as const, port: 6791 }] : [])
        ],
    alarms: convex.alarms?.filter((alarm) => alarm.trigger.type.startsWith('application-load-balancer-')),
    disabledGlobalAlarms: convex.disabledGlobalAlarms
  } as unknown as StpApplicationLoadBalancer;

  return {
    backendContainerWorkload,
    dashboardContainerWorkload,
    database,
    modulesBucket: mkBucket(modulesBucketChild),
    filesBucket: mkBucket(filesBucketChild),
    searchBucket: mkBucket(searchBucketChild),
    exportsBucket: mkBucket(exportsBucketChild),
    snapshotImportsBucket: mkBucket(snapshotImportsBucketChild),
    loadBalancer
  };
};
