import { GetAtt, Ref, Sub } from '@cloudform/functions';
import { DeletionPolicy } from '@cloudform/resource';
import Secret from '@cloudform/secretsManager/secret';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { getConvexSecretName } from '@domain-services/config-manager/utils/convex';
import { domainManager } from '@domain-services/domain-manager';
import { templateManager } from '@domain-services/template-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { pascalCase } from 'change-case';
import { filterResourcesForDevMode } from '../../../../commands/dev/dev-resource-filter';

const getConvexRuntimeSecretLogicalName = (convexName: string) => `${pascalCase(convexName)}RuntimeSecret`;

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
    const convexSecretName = getConvexSecretName({ nameChain });
    const runtimeSecretLogicalName = getConvexRuntimeSecretLogicalName(convex.name);

    const defaultDomain = domainManager.getDefaultDomainForResource({ stpResourceName: lb.name });
    const cloudUrl = customDomains?.cloud?.domainName
      ? `https://${customDomains.cloud.domainName}`
      : `https://${defaultDomain}:3210`;
    const siteUrl = customDomains?.site?.domainName
      ? `https://${customDomains.site.domainName}`
      : `https://${defaultDomain}:3211`;
    const dashboardUrl = customDomains?.dashboard?.domainName
      ? `https://${customDomains.dashboard.domainName}`
      : `https://${defaultDomain}:6791`;

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
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'adminKey',
      paramValue: '__pending_post_deploy_generation__',
      sensitive: true,
      showDuringPrint: false
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'instanceSecret',
      paramValue: '__pending_post_deploy_generation__',
      sensitive: true,
      showDuringPrint: false
    });

    const dbInstanceLogicalName = cfLogicalNames.dbInstance(database.name);
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: runtimeSecretLogicalName,
      nameChain,
      resource: new Secret({
        Description: `Runtime secrets for Convex resource ${convex.name}`,
        SecretString: Sub(
          [
            '{"instanceSecret":"{{resolve:secretsmanager:',
            convexSecretName,
            ':SecretString:instanceSecret}}","postgresUrl":"postgresql://convex:{{resolve:secretsmanager:',
            convexSecretName,
            ':SecretString:dbPassword}}@',
            '$',
            '{dbHost}:',
            '$',
            '{dbPort}?sslmode=disable"}'
          ].join(''),
          {
            dbHost: GetAtt(dbInstanceLogicalName, 'Endpoint.Address'),
            dbPort: GetAtt(dbInstanceLogicalName, 'Endpoint.Port')
          }
        )
      })
    });

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

      const dbInstance = template.Resources[dbInstanceLogicalName];
      if (!dbInstance) return;

      const containers = taskDef.Properties.ContainerDefinitions as any[];
      const backendContainer = containers.find((c) => c.Name === 'convex-backend');
      if (!backendContainer) return;
      const env = backendContainer.Environment as Array<{ Name: string; Value: any }>;
      const setEnv = (name: string, value: any) => {
        const idx = env.findIndex((e) => e.Name === name);
        if (idx >= 0) {
          env[idx].Value = value;
        } else {
          env.push({ Name: name, Value: value });
        }
      };

      setEnv('CONVEX_CLOUD_ORIGIN', cloudUrl);
      setEnv('CONVEX_SITE_ORIGIN', siteUrl);
      ['INSTANCE_SECRET', 'POSTGRES_URL'].forEach((n) => {
        const idx = env.findIndex((e) => e.Name === n);
        if (idx >= 0) env.splice(idx, 1);
      });
      backendContainer.Secrets = [
        ...(backendContainer.Secrets || []).filter(
          (secret: any) => !['INSTANCE_SECRET', 'POSTGRES_URL'].includes(secret.Name)
        ),
        {
          Name: 'INSTANCE_SECRET',
          ValueFrom: Sub(`${'$'}{runtimeSecretArn}:instanceSecret::`, {
            runtimeSecretArn: Ref(runtimeSecretLogicalName)
          })
        },
        {
          Name: 'POSTGRES_URL',
          ValueFrom: Sub(`${'$'}{runtimeSecretArn}:postgresUrl::`, {
            runtimeSecretArn: Ref(runtimeSecretLogicalName)
          })
        }
      ];

      // Also clean up the redundant placeholders we set in the config-manager
      // (they had directive strings that won't compose inline — kept as a hint to
      // any user inspecting CloudFormation, now overwritten here).
      ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_PASSWORD', 'POSTGRES_USER'].forEach((n) => {
        const idx = env.findIndex((e) => e.Name === n);
        if (idx >= 0) env.splice(idx, 1);
      });

      const ecsExecutionRole: any = template.Resources[cfLogicalNames.ecsExecutionRole()];
      if (ecsExecutionRole) {
        ecsExecutionRole.Properties.Policies = [
          ...(ecsExecutionRole.Properties.Policies || []),
          {
            PolicyName: `${runtimeSecretLogicalName}-access`,
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: ['secretsmanager:GetSecretValue'],
                  Resource: [Ref(runtimeSecretLogicalName)]
                }
              ]
            }
          }
        ];
      }

      const dashboard = convex._nestedResources.dashboardContainerWorkload;
      if (dashboard) {
        const dashboardTaskDefLogicalName = cfLogicalNames.ecsTaskDefinition(dashboard.name);
        const dashboardTaskDef: any = template.Resources[dashboardTaskDefLogicalName];
        const dashboardContainer = dashboardTaskDef?.Properties?.ContainerDefinitions?.find(
          (c: any) => c.Name === 'convex-dashboard'
        );
        const dashboardEnv = dashboardContainer?.Environment as Array<{ Name: string; Value: any }> | undefined;
        const deploymentUrl = dashboardEnv?.find((e) => e.Name === 'NEXT_PUBLIC_DEPLOYMENT_URL');
        if (deploymentUrl) {
          deploymentUrl.Value = cloudUrl;
        }
      }

      if (convex.deletionProtection) {
        [
          convex._nestedResources.modulesBucket,
          convex._nestedResources.filesBucket,
          convex._nestedResources.searchBucket,
          convex._nestedResources.exportsBucket,
          convex._nestedResources.snapshotImportsBucket
        ].forEach((bucket) => {
          const bucketResource: any = template.Resources[cfLogicalNames.bucket(bucket.name)];
          if (bucketResource) {
            bucketResource.DeletionPolicy = DeletionPolicy.Retain;
            bucketResource.UpdateReplacePolicy = DeletionPolicy.Retain;
          }
        });
      }
    });
  });
};
