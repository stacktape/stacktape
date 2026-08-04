import { describe, expect, test } from 'bun:test';
import { ConfigManager } from '@domain-services/config-manager';
import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { StackContext } from '@domain-services/stack-context';
import type { ContainerWorkloadLoadBalancerIntegration } from '@stacktape/config/events';
import { getConvexSecretName } from '@domain-services/config-manager/utils/convex';
import type { StacktapeConfig } from '@stacktape/config';
import type { RdsEngine } from '@stacktape/config/relational-databases';

/**
 * A `convex` resource is a whole self-hosted deployment written as one entry: a backend container, an optional
 * dashboard container, a Postgres database, five S3 buckets and the load balancer that fronts them.
 *
 * These tests state the contracts that materialization owns — the topology, the deployed names, the ports the two
 * Convex origins listen on, the Secrets Manager references the containers boot from, and the defaults a user did not
 * author. The literal values matter: Convex's own runtime reads these environment variables and ports by name, and the
 * convex resolver patches specific entries afterwards.
 */

const materializationStackContext: StackContext = {
  accountId: '123456789999',
  command: 'synth',
  globallyUniqueStackHash: 'xxxxxxxx',
  invocationId: 'materialization-invocation',
  projectName: 'materialization',
  region: 'eu-west-1',
  stackName: 'materialization-test',
  stage: 'test',
  workingDir: process.cwd()
};

const managerFor = (resources: StacktapeConfig['resources']) => {
  const manager = new ConfigManager();
  manager.setStackContext(materializationStackContext);
  manager.config = { resources };
  return manager;
};

describe('Convex materialization', () => {
  // Authored properties are passed loosely on purpose: several of these tests state what materialization does with a
  // partially authored block, which the schema types as all-or-nothing.
  const convexFor = (properties: Record<string, unknown> = { appDirectory: './convex' }) =>
    managerFor({ backend: { type: 'convex', properties } } as unknown as StacktapeConfig['resources']).convexes[0];

  const childrenOf = (properties?: Record<string, unknown>) => convexFor(properties)._nestedResources;

  /** Throws rather than narrowing: the dashboard is genuinely absent for some configurations. */
  const requireChild = <TChild>(child: TChild | undefined, description: string): TChild => {
    if (!child) {
      throw new Error(`Expected this configuration to synthesize ${description}, but it was absent.`);
    }
    return child;
  };

  const containerOf = (workload: StpContainerWorkload, description: string) =>
    requireChild(workload.containers?.[0], description);

  const backendContainerOf = (properties?: Record<string, unknown>) =>
    containerOf(childrenOf(properties).backendContainerWorkload, 'a backend container');

  const dashboardContainerOf = (properties?: Record<string, unknown>) =>
    containerOf(
      requireChild(childrenOf(properties).dashboardContainerWorkload, 'a dashboard workload'),
      'a dashboard container'
    );

  const environmentOf = (container: StpContainerWorkload['containers'][number]) =>
    Object.fromEntries((container.environment || []).map(({ name, value }) => [name, value]));

  /** Convex only ever gives a container load-balancer events; narrowing the union is what makes their props readable. */
  const albEventsOf = (container: StpContainerWorkload['containers'][number]) =>
    (container.events || []).filter(
      (event): event is ContainerWorkloadLoadBalancerIntegration => event.type === 'application-load-balancer'
    );

  /**
   * A few values materialization emits are wider than the resolved type admits — the bucket CORS block is written
   * through an `unknown` cast in the production code — so those are compared as the plain data they become.
   */
  const asPlainData = (value: unknown) => JSON.parse(JSON.stringify(value));

  const STORAGE_BUCKETS = [
    'modulesBucket',
    'filesBucket',
    'searchBucket',
    'exportsBucket',
    'snapshotImportsBucket'
  ] as const;

  const CUSTOM_DOMAINS = {
    cloud: { domainName: 'api.example.com' },
    site: { domainName: 'site.example.com' },
    dashboard: { domainName: 'admin.example.com' }
  };

  test('synthesizes the whole deployment as nine children, in a fixed order', () => {
    // Every key is always present — disabling the dashboard decides which children are built, not which slots exist.
    expect(Object.keys(childrenOf())).toEqual([
      'backendContainerWorkload',
      'dashboardContainerWorkload',
      'database',
      'modulesBucket',
      'filesBucket',
      'searchBucket',
      'exportsBucket',
      'snapshotImportsBucket',
      'loadBalancer'
    ]);
  });

  test('names every child after the parent and the key it is filed under', () => {
    // The nested key doubles as the name segment: `findResourceInConfig` walks the `_nestedResources` map by it, so a
    // rename here would both move a deployed resource and break reference resolution.
    const children = childrenOf();

    expect(
      Object.entries(children).map(([key, child]) => [
        key,
        child?.type,
        child?.name,
        child?.nameChain,
        child?.configParentResourceType
      ])
    ).toEqual([
      [
        'backendContainerWorkload',
        'multi-container-workload',
        'backendBackendContainerWorkload',
        ['backend', 'backendContainerWorkload'],
        'convex'
      ],
      [
        'dashboardContainerWorkload',
        'multi-container-workload',
        'backendDashboardContainerWorkload',
        ['backend', 'dashboardContainerWorkload'],
        'convex'
      ],
      ['database', 'relational-database', 'backendDatabase', ['backend', 'database'], 'convex'],
      ['modulesBucket', 'bucket', 'backendModulesBucket', ['backend', 'modulesBucket'], 'convex'],
      ['filesBucket', 'bucket', 'backendFilesBucket', ['backend', 'filesBucket'], 'convex'],
      ['searchBucket', 'bucket', 'backendSearchBucket', ['backend', 'searchBucket'], 'convex'],
      ['exportsBucket', 'bucket', 'backendExportsBucket', ['backend', 'exportsBucket'], 'convex'],
      [
        'snapshotImportsBucket',
        'bucket',
        'backendSnapshotImportsBucket',
        ['backend', 'snapshotImportsBucket'],
        'convex'
      ],
      ['loadBalancer', 'application-load-balancer', 'backendLoadBalancer', ['backend', 'loadBalancer'], 'convex']
    ]);
  });

  test('connects the backend to its database and all five storage buckets, by resource parameter', () => {
    const children = childrenOf();

    // Convex addresses each bucket by its deployed name, which is only known at deploy time — hence a directive rather
    // than a literal. `connectTo` is what grants the container the IAM access to use them.
    expect(children.backendContainerWorkload.connectTo).toEqual([
      'backend.database',
      'backend.modulesBucket',
      'backend.filesBucket',
      'backend.searchBucket',
      'backend.exportsBucket',
      'backend.snapshotImportsBucket'
    ]);

    const environment = environmentOf(backendContainerOf());

    expect([
      environment.S3_STORAGE_MODULES_BUCKET,
      environment.S3_STORAGE_FILES_BUCKET,
      environment.S3_STORAGE_SEARCH_BUCKET,
      environment.S3_STORAGE_EXPORTS_BUCKET,
      environment.S3_STORAGE_SNAPSHOT_IMPORTS_BUCKET
    ]).toEqual([
      "$ResourceParam('backend.modulesBucket', 'name')",
      "$ResourceParam('backend.filesBucket', 'name')",
      "$ResourceParam('backend.searchBucket', 'name')",
      "$ResourceParam('backend.exportsBucket', 'name')",
      "$ResourceParam('backend.snapshotImportsBucket', 'name')"
    ]);
  });

  test('boots both containers from pinned images and never scales past one instance', () => {
    const children = childrenOf();
    const logging = { disabled: true };
    const withLogging = childrenOf({
      appDirectory: './convex',
      backend: { logging },
      dashboard: { logging }
    });

    // convex-backend OSS does not support horizontal scaling, so both workloads are hard-pinned to a single instance.
    expect(children.backendContainerWorkload.scaling).toEqual({ minInstances: 1, maxInstances: 1 });
    expect(requireChild(children.dashboardContainerWorkload, 'a dashboard workload').scaling).toEqual({
      minInstances: 1,
      maxInstances: 1
    });
    // Remote sessions are what Stacktape's post-deploy admin-key generation runs through.
    expect(children.backendContainerWorkload.enableRemoteSessions).toBe(true);
    expect(children.backendContainerWorkload.usePrivateSubnetsWithNAT).toBe(false);

    // The images are digest-pinned rather than tagged: a floating tag would silently migrate the deployment's data.
    expect(backendContainerOf().packaging).toEqual({
      type: 'prebuilt-image',
      properties: {
        image:
          'ghcr.io/get-convex/convex-backend@sha256:122da352b12b216a017a1fb45c6a467f41a5b746158b47aecd1fe12f9f74edb0'
      }
    });
    expect(dashboardContainerOf().packaging).toEqual({
      type: 'prebuilt-image',
      properties: {
        image:
          'ghcr.io/get-convex/convex-dashboard@sha256:26bd4a89b097c5dd89e78d194a6b79c5c1b8cb1d02801b9946a9eb7b716e18dd'
      }
    });

    // An authored image and container logging reach the container they belong to.
    expect(
      containerOf(
        childrenOf({ appDirectory: './convex', backend: { image: 'my/backend:1' } }).backendContainerWorkload,
        'a backend container'
      ).packaging
    ).toEqual({ type: 'prebuilt-image', properties: { image: 'my/backend:1' } });
    expect(containerOf(withLogging.backendContainerWorkload, 'a backend container').logging).toEqual(logging);
    expect(
      containerOf(requireChild(withLogging.dashboardContainerWorkload, 'a dashboard workload'), 'a dashboard container')
        .logging
    ).toEqual(logging);

    // Sizing defaults differ per role, and yield to an authored block.
    expect(children.backendContainerWorkload.resources).toEqual({ cpu: 0.5, memory: 1024 });
    expect(requireChild(children.dashboardContainerWorkload, 'a dashboard workload').resources).toEqual({
      cpu: 0.25,
      memory: 512
    });
    expect(
      childrenOf({ appDirectory: './convex', backend: { resources: { cpu: 2, memory: 4096 } } })
        .backendContainerWorkload.resources
    ).toEqual({ cpu: 2, memory: 4096 });
  });

  test('publishes the cloud and site origins as two load-balancer routes on one container', () => {
    const backendContainer = backendContainerOf();
    const environment = environmentOf(backendContainer);

    // Both Convex origins run in the same Fargate process: cloud on 3210, HTTP actions on 3211.
    expect([environment.PORT, environment.SITE_PROXY_PORT]).toEqual([3210, 3211]);
    expect(backendContainer.events).toEqual([
      {
        type: 'application-load-balancer',
        properties: {
          priority: 10,
          containerPort: 3210,
          listenerPort: 3210,
          loadBalancerName: 'backend.loadBalancer',
          paths: ['*'],
          hosts: undefined
        }
      },
      {
        type: 'application-load-balancer',
        properties: {
          priority: 20,
          containerPort: 3211,
          listenerPort: 3211,
          loadBalancerName: 'backend.loadBalancer',
          paths: ['*'],
          hosts: undefined
        }
      }
    ]);
    // Only the cloud port answers 200 on `/`; the resolver widens the target-group matcher so 3211's 404 still counts
    // as healthy, which is why both share one health check path.
    expect(backendContainer.loadBalancerHealthCheck).toEqual({ healthcheckPath: '/' });
    expect(backendContainer.essential).toBe(true);
    expect(backendContainer.stopTimeout).toBe(30);
  });

  test('resolves the instance secret and the database password from one Secrets Manager entry', () => {
    const children = childrenOf();
    const secretName = getConvexSecretName({
      nameChain: ['backend'],
      region: materializationStackContext.region,
      stackName: materializationStackContext.stackName
    });

    expect(secretName).toBe('stp/eu-west-1/materialization-test/backend');
    // Both are CloudFormation dynamic references, not Stacktape directives: they are resolved by CloudFormation at
    // deploy time so the plaintext never enters the template.
    expect(environmentOf(backendContainerOf()).INSTANCE_SECRET).toBe(
      `{{resolve:secretsmanager:${secretName}:SecretString:instanceSecret}}`
    );
    expect(children.database.credentials).toEqual({
      masterUserName: 'convex',
      masterUserPassword: `{{resolve:secretsmanager:${secretName}:SecretString:dbPassword}}`
    });
    expect(environmentOf(backendContainerOf()).INSTANCE_NAME).toBe('backend');
  });

  test('leaves the origins and the database URL for the resolver to patch', () => {
    // These three are placeholders by design: the origins are only known once the load balancer exists, and the
    // Postgres URL has to be built from CloudFormation intrinsics because Convex rejects both the `/defdb` path
    // Stacktape's connection-string parameter carries and a directive composed mid-string.
    const environment = environmentOf(backendContainerOf());

    expect([environment.CONVEX_CLOUD_ORIGIN, environment.CONVEX_SITE_ORIGIN, environment.POSTGRES_URL]).toEqual([
      '__resolver_overrides_this__',
      '__resolver_overrides_this__',
      '__resolver_overrides_this__'
    ]);
    // Convex skips its own TLS setup, and the resolver turns off `rds.force_ssl` to match.
    expect(environment.DO_NOT_REQUIRE_SSL).toBe('true');
    expect(environment.AWS_REGION).toBe(materializationStackContext.region);
  });

  test('defaults the database to a single-AZ Postgres reachable only from the VPC', () => {
    const { database } = childrenOf();

    expect(database.engine).toEqual({
      type: 'postgres',
      properties: {
        version: '16.6',
        // Convex connects with a path-less URL, so Postgres falls back to the user name; naming the database `convex`
        // makes that resolve.
        dbName: 'convex',
        primaryInstance: { instanceSize: 'db.t4g.micro', multiAz: false }
      }
    });
    expect(database.accessibility).toEqual({ accessibilityMode: 'scoping-workloads-in-vpc' });
    expect(database.automatedBackupRetentionDays).toBe(1);
    expect(database.deletionProtection).toBe(false);
  });

  test('yields to an authored database block and deletion protection', () => {
    const engine: RdsEngine = {
      type: 'postgres',
      properties: { version: '17.2', primaryInstance: { instanceSize: 'db.t4g.small', multiAz: true } }
    };
    const logging = { logTypes: ['postgresql'] };
    const { database } = childrenOf({
      appDirectory: './convex',
      deletionProtection: true,
      database: {
        engine,
        accessibility: { accessibilityMode: 'internet' },
        automatedBackupRetentionDays: 14,
        preferredMaintenanceWindow: 'Mon:00:00-Mon:03:00',
        logging
      }
    });

    expect(database.engine).toEqual(engine);
    expect(database.accessibility).toEqual({ accessibilityMode: 'internet' });
    expect(database.automatedBackupRetentionDays).toBe(14);
    expect(database.preferredMaintenanceWindow).toBe('Mon:00:00-Mon:03:00');
    expect(database.logging).toEqual(logging);
    expect(database.deletionProtection).toBe(true);
  });

  test('serves the dashboard on its own port, restricted to the authored address ranges', () => {
    const allowedIpRanges = ['10.0.0.0/8'];
    const dashboardContainer = dashboardContainerOf({ appDirectory: './convex', dashboard: { allowedIpRanges } });

    expect(environmentOf(dashboardContainer).PORT).toBe(6791);
    expect(dashboardContainer.events).toEqual([
      {
        type: 'application-load-balancer',
        properties: {
          priority: 30,
          containerPort: 6791,
          listenerPort: 6791,
          loadBalancerName: 'backend.loadBalancer',
          paths: ['*'],
          hosts: undefined,
          sourceIps: allowedIpRanges
        }
      }
    ]);
    expect(dashboardContainer.stopTimeout).toBe(5);
    // The dashboard points at the cloud origin, which the resolver patches alongside the backend's own copy.
    expect(environmentOf(dashboardContainerOf()).NEXT_PUBLIC_DEPLOYMENT_URL).toBe('__resolver_overrides_this__');
    // Left open when no ranges are authored — the config validator warns about that rather than materialization
    // closing it.
    expect(albEventsOf(dashboardContainerOf())[0].properties.sourceIps).toBeUndefined();
  });

  test('drops the dashboard workload and its listener when the dashboard is disabled', () => {
    const disabled = childrenOf({ appDirectory: './convex', dashboard: { enabled: false } });

    expect(disabled.dashboardContainerWorkload).toBeUndefined();
    expect('dashboardContainerWorkload' in disabled).toBe(true);
    // Only `enabled: false` removes it — an authored dashboard block on its own keeps it.
    expect(
      dashboardContainerOf({ appDirectory: './convex', dashboard: { image: 'my/dashboard:1' } }).packaging
    ).toEqual({
      type: 'prebuilt-image',
      properties: { image: 'my/dashboard:1' }
    });
    expect(disabled.loadBalancer.listeners).toEqual([
      { protocol: 'HTTPS', port: 3210 },
      { protocol: 'HTTPS', port: 3211 }
    ]);
  });

  test('gives every origin its own HTTPS listener when no custom domain is authored', () => {
    const { loadBalancer } = childrenOf();

    expect(loadBalancer.listeners).toEqual([
      { protocol: 'HTTPS', port: 3210 },
      { protocol: 'HTTPS', port: 3211 },
      { protocol: 'HTTPS', port: 6791 }
    ]);
    expect(loadBalancer.customDomains).toBeUndefined();
  });

  test('routes by host instead of by port once custom domains are authored', () => {
    const children = childrenOf({ appDirectory: './convex', customDomains: CUSTOM_DOMAINS });

    // Cloud, site and dashboard are collected in that order and become the load balancer's domains; the fixed
    // listeners are dropped, so all three origins share 443 and are told apart by host.
    expect(children.loadBalancer.customDomains).toEqual([
      CUSTOM_DOMAINS.cloud,
      CUSTOM_DOMAINS.site,
      CUSTOM_DOMAINS.dashboard
    ]);
    expect(children.loadBalancer.listeners).toBeUndefined();

    const routingOf = (container: StpContainerWorkload['containers'][number]) =>
      albEventsOf(container).map(({ properties }) => [properties.listenerPort, properties.hosts]);

    expect(routingOf(containerOf(children.backendContainerWorkload, 'a backend container'))).toEqual([
      [undefined, ['api.example.com']],
      [undefined, ['site.example.com']]
    ]);
    expect(
      routingOf(
        containerOf(requireChild(children.dashboardContainerWorkload, 'a dashboard workload'), 'a dashboard container')
      )
    ).toEqual([[undefined, ['admin.example.com']]]);

    // With a domain known up front the origins no longer need patching by the resolver.
    const backendEnvironment = environmentOf(containerOf(children.backendContainerWorkload, 'a backend container'));
    expect([backendEnvironment.CONVEX_CLOUD_ORIGIN, backendEnvironment.CONVEX_SITE_ORIGIN]).toEqual([
      'https://api.example.com',
      'https://site.example.com'
    ]);
    expect(
      environmentOf(
        containerOf(requireChild(children.dashboardContainerWorkload, 'a dashboard workload'), 'a dashboard container')
      ).NEXT_PUBLIC_DEPLOYMENT_URL
    ).toBe('https://api.example.com');
  });

  test('gives all five buckets the same storage settings and browser access', () => {
    const children = childrenOf();

    STORAGE_BUCKETS.forEach((bucket) => {
      expect(children[bucket].encryption).toBe(true);
      expect(children[bucket].versioning).toBe(false);
      expect(children[bucket].lifecycleRules).toBeUndefined();
      // Convex serves user files straight from S3 to the browser, so the buckets carry CORS rules. The block is
      // emitted without the `enabled` flag `BucketCorsConfig` requires, which is why the production code writes it
      // through a cast — and the bucket resolver returns early on a falsy `enabled`, so these rules do not currently
      // reach CloudFormation. Pinned as emitted: changing it here would alter deployed buckets.
      expect(asPlainData(children[bucket].cors)).toEqual({
        corsRules: [
          {
            allowedOrigins: ['*'],
            allowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            allowedHeaders: ['*']
          }
        ]
      });
    });

    const lifecycleRules = [{ type: 'expiration' as const, properties: { daysAfterUpload: 30 } }];
    const authored = childrenOf({
      appDirectory: './convex',
      storage: { encryption: false, versioning: true, lifecycleRules }
    });

    // Authored `false` survives, because the defaults are applied with `??` rather than `||`.
    STORAGE_BUCKETS.forEach((bucket) => {
      expect(authored[bucket].encryption).toBe(false);
      expect(authored[bucket].versioning).toBe(true);
      expect(authored[bucket].lifecycleRules).toEqual(lifecycleRules);
    });
  });

  test('hands each alarm to the child it monitors, and disables global alarms on both', () => {
    const databaseAlarm = {
      trigger: { type: 'database-cpu-utilization', properties: { thresholdPercent: 80 } }
    } as const;
    const loadBalancerAlarm = {
      trigger: { type: 'application-load-balancer-error-rate', properties: { thresholdPercent: 5 } }
    } as const;
    const disabledGlobalAlarms = ['global-database'];
    const children = childrenOf({
      appDirectory: './convex',
      alarms: [databaseAlarm, loadBalancerAlarm],
      disabledGlobalAlarms
    });

    // The parent authors one alarm list; each child takes the alarms whose trigger names its own resource type.
    expect(children.database.alarms).toEqual([databaseAlarm]);
    expect(children.loadBalancer.alarms).toEqual([loadBalancerAlarm]);
    expect(children.database.disabledGlobalAlarms).toEqual(disabledGlobalAlarms);
    expect(children.loadBalancer.disabledGlobalAlarms).toEqual(disabledGlobalAlarms);
  });

  test('exposes each nested resource and its alarms once in the flattened resource graph', () => {
    const manager = managerFor({
      backend: {
        type: 'convex',
        properties: {
          appDirectory: './convex',
          alarms: [{ trigger: { type: 'database-cpu-utilization', properties: { thresholdPercent: 80 } } }]
        }
      }
    });

    const flattenedNameChains = manager.allResourcesIncludingNested.map(({ nameChain }) => nameChain.join('.'));

    expect(flattenedNameChains).toHaveLength(new Set(flattenedNameChains).size);
    expect(
      manager.allAlarms.filter(({ nameChain }) => nameChain.join('.') === 'backend.database.alarms.0')
    ).toHaveLength(1);
  });

  test('keeps the authored properties beside the children, for every authored resource', () => {
    const convex = convexFor({ appDirectory: './convex', deletionProtection: true });

    expect(convex.name).toBe('backend');
    expect(convex.type).toBe('convex');
    expect(convex.nameChain).toEqual(['backend']);
    expect(convex.appDirectory).toBe('./convex');
    expect(convex.deletionProtection).toBe(true);

    const manager = managerFor({
      primary: { type: 'convex', properties: { appDirectory: './convex' } },
      secondary: { type: 'convex', properties: { appDirectory: './convex-2' } }
    });

    expect(manager.convexes.map(({ name }) => name)).toEqual(['primary', 'secondary']);
    expect(manager.convexes.map(({ _nestedResources }) => _nestedResources.database.name)).toEqual([
      'primaryDatabase',
      'secondaryDatabase'
    ]);
  });
});
