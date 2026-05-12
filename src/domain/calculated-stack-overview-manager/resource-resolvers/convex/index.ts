import { GetAtt, Sub } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { domainManager } from '@domain-services/domain-manager';
import { templateManager } from '@domain-services/template-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { filterResourcesForDevMode } from '../../../../commands/dev/dev-resource-filter';

/**
 * Convex resource resolver.
 *
 * The 5 buckets, RDS database, ALB, and backend/dashboard container workloads are
 * aggregated into the primitive collections (`configManager.buckets/databases/etc.`)
 * by the `configManager.convexes` getter, so the existing primitive resolvers emit
 * their CF resources automatically.
 *
 * This resolver does the two convex-specific things:
 *   1. Surfaces the parent resource's referenceable params (url, siteUrl, dashboardUrl).
 *   2. Patches the convex-backend task definition's POSTGRES_URL env var with a
 *      properly-formed connection string (no database-name path — convex rejects URLs
 *      that include one with "cluster url already contains db name").
 */
export const resolveConvexes = async () => {
  const convexes = filterResourcesForDevMode(configManager.convexes);

  convexes.forEach((convex) => {
    const { nameChain, customDomains } = convex;
    const lb = convex._nestedResources.loadBalancer;
    const backend = convex._nestedResources.backendContainerWorkload;
    const database = convex._nestedResources.database;

    const cloudUrl = customDomains?.cloud?.domainName
      ? `https://${customDomains.cloud.domainName}`
      : `https://${domainManager.getDefaultDomainForResource({ stpResourceName: lb.name })}`;
    const siteUrl = customDomains?.site?.domainName
      ? `https://${customDomains.site.domainName}`
      : cloudUrl;
    const dashboardUrl = customDomains?.dashboard?.domainName
      ? `https://${customDomains.dashboard.domainName}`
      : cloudUrl;

    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'url',
      paramValue: cloudUrl,
      showDuringPrint: true
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'siteUrl',
      paramValue: siteUrl,
      showDuringPrint: true
    });
    if (convex._nestedResources.dashboardContainerWorkload) {
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        nameChain,
        paramName: 'dashboardUrl',
        paramValue: dashboardUrl,
        showDuringPrint: true
      });
    }

    // Patch POSTGRES_URL on the convex-backend task definition. Convex's URL parser
    // rejects connection strings with a database name path; Stacktape's standard
    // `connectionString` includes one. Rebuild from host/port + Secrets Manager.
    //
    // Also disable RDS's `rds.force_ssl` so plaintext connections are accepted —
    // the convex-backend container's rustls-based postgres client cannot validate
    // AWS's RDS CA chain and `sslmode=require` semantics aren't honored as in
    // libpq. The DB is reachable only from inside the VPC.
    templateManager.addFinalTemplateOverrideFn(async (template) => {
      // 1) Turn off rds.force_ssl on the parameter group
      const paramGroupLogicalName = cfLogicalNames.dbInstanceParameterGroup(database.name);
      const paramGroup: any = template.Resources[paramGroupLogicalName];
      if (paramGroup) {
        paramGroup.Properties.Parameters = {
          ...(paramGroup.Properties.Parameters || {}),
          'rds.force_ssl': '0'
        };
      }

      // 2) Permissive matcher on the backend's two ALB target groups. Convex's
      // site port (3211) responds 404 on `/` because that origin only routes
      // user-defined HTTP actions — but the process is alive. Accepting 200-499
      // lets the ALB treat 404 as healthy while still failing on 5xx / timeouts.
      for (const port of [3210, 3211]) {
        const tgLogicalName = cfLogicalNames.targetGroup({
          loadBalancerName: lb.name,
          stpResourceName: backend.name,
          targetContainerPort: port
        });
        const tg: any = template.Resources[tgLogicalName];
        if (tg) {
          tg.Properties.Matcher = { HttpCode: '200-499' };
        }
      }

      const taskDefLogicalName = cfLogicalNames.ecsTaskDefinition(backend.name);
      const taskDef: any = template.Resources[taskDefLogicalName];
      if (!taskDef) return;

      const dbInstanceLogicalName = cfLogicalNames.dbInstance(database.name);
      const dbInstance = template.Resources[dbInstanceLogicalName];
      if (!dbInstance) return;

      const containers = taskDef.Properties.ContainerDefinitions as any[];
      const backendContainer = containers.find((c) => c.Name === 'convex-backend');
      if (!backendContainer) return;
      const env = backendContainer.Environment as Array<{ Name: string; Value: any }>;

      // {{resolve:secretsmanager:<secretName>:SecretString:dbPassword}}
      const secretRef = `{{resolve:secretsmanager:${convex.name}:SecretString:dbPassword}}`;

      // Plaintext connection — RDS is in private subnets, force_ssl is disabled
      // above. Convex's rustls-based pg client doesn't trust AWS's RDS CA chain so
      // TLS-enabled paths fail with `UnknownIssuer`.
      const postgresUrl = Sub(
        `postgresql://convex:${secretRef}@\${dbHost}:\${dbPort}?sslmode=disable`,
        {
          dbHost: GetAtt(dbInstanceLogicalName, 'Endpoint.Address'),
          dbPort: GetAtt(dbInstanceLogicalName, 'Endpoint.Port')
        }
      );

      const postgresUrlIdx = env.findIndex((e) => e.Name === 'POSTGRES_URL');
      if (postgresUrlIdx >= 0) {
        env[postgresUrlIdx].Value = postgresUrl;
      } else {
        env.push({ Name: 'POSTGRES_URL', Value: postgresUrl });
      }

      // Also clean up the redundant placeholders we set in the config-manager
      // (they had directive strings that won't compose inline — kept as a hint to
      // any user inspecting CloudFormation, now overwritten here).
      ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_PASSWORD', 'POSTGRES_USER'].forEach((n) => {
        const idx = env.findIndex((e) => e.Name === n);
        if (idx >= 0) env.splice(idx, 1);
      });
    });
  });
};
