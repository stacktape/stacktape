import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import type { StpDsqlDatabase } from '@domain-services/config-manager/resolved-types/dsql-databases';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { consoleLinks } from '@stacktape/naming/console-links';
import { AURORA_DSQL_REGIONS } from '@stacktape/config/dsql-databases';
import { CliError } from '@utils/errors';

const DSQL_PORT = 5432;
const DSQL_DATABASE_NAME = 'postgres';
const DSQL_ADMIN_USERNAME = 'admin';

export const resolveDsqlDatabases = () => {
  const resources = configManager.dsqlDatabases;
  if (resources.length) {
    assertDsqlRegionSupported(calculatedStackOverviewManager.context.region);
  }
  resources.forEach((resource) => resolveDsqlDatabase({ resource }));
};

export const assertDsqlRegionSupported = (region: string) => {
  if (AURORA_DSQL_REGIONS.includes(region as never)) {
    return;
  }
  throw new CliError({
    category: 'CONFIG_VALIDATION',
    code: 'CONFIG_DSQL_REGION_UNSUPPORTED',
    message: `Amazon Aurora DSQL is not available in region \`${region}\`.`,
    hints: `Choose one of: ${AURORA_DSQL_REGIONS.join(', ')}.`
  });
};

export const getDsqlCluster = ({
  resource,
  tags
}: {
  resource: StpDsqlDatabase;
  tags: ReturnType<typeof stackManager.getTags>;
}) =>
  cfnResource('AWS::DSQL::Cluster', {
    DeletionProtectionEnabled: resource.deletionProtection ?? false,
    KmsEncryptionKey: resource.kmsKeyArn,
    Tags: tags
  });

export const getDsqlEndpoint = (clusterLogicalName: string) => getAtt(clusterLogicalName, 'Endpoint');

export const resolveDsqlDatabase = ({ resource }: { resource: StpDsqlDatabase }) => {
  const clusterLogicalName = cfLogicalNames.dsqlCluster(resource.name);
  const clusterId = ref(clusterLogicalName);

  calculatedStackOverviewManager.addCfChildResource({
    nameChain: resource.nameChain,
    cfLogicalName: clusterLogicalName,
    resource: getDsqlCluster({ resource, tags: stackManager.getTags() })
  });

  calculatedStackOverviewManager.addStacktapeResourceLink({
    nameChain: resource.nameChain,
    linkName: 'console',
    linkValue: consoleLinks.dsqlClusters(calculatedStackOverviewManager.context.region)
  });

  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain: resource.nameChain,
    paramName: 'endpoint',
    paramValue: getDsqlEndpoint(clusterLogicalName)
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain: resource.nameChain,
    paramName: 'port',
    paramValue: DSQL_PORT
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain: resource.nameChain,
    paramName: 'databaseName',
    paramValue: DSQL_DATABASE_NAME
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain: resource.nameChain,
    paramName: 'username',
    paramValue: DSQL_ADMIN_USERNAME
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain: resource.nameChain,
    paramName: 'region',
    paramValue: ref('AWS::Region')
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain: resource.nameChain,
    paramName: 'id',
    paramValue: clusterId
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain: resource.nameChain,
    paramName: 'arn',
    paramValue: getAtt(clusterLogicalName, 'ResourceArn')
  });
};
