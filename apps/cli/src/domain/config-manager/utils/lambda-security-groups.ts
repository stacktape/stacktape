import type { ConfigManager } from '../index';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import { templateManager } from '@domain-services/template-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { shortHash } from '@stacktape/naming/short-hash';

type VpcLambda = Pick<
  StpLambdaFunction,
  'name' | 'connectTo' | 'volumeMounts' | 'joinDefaultVpc' | 'configParentResourceType'
>;
type VpcLambdaConfig = Pick<
  ConfigManager,
  'databases' | 'redisClusters' | 'openSearchDomains' | 'kafkaClusters' | 'atlasMongoClusters' | 'isInDevNetwork'
>;

/**
 * The security group of a function in the stack's VPC.
 *
 * A security group of a function only tells other security groups who is connecting: databases, Redis clusters,
 * OpenSearch domains, Kafka clusters, MongoDB Atlas and EFS filesystems admit the groups of the workloads that connect
 * to them, and nothing admits traffic to a function. Functions that connect to the same such resources therefore share
 * one group without reaching anything new, and functions that connect to none share the stack's plain function group.
 *
 * Sharing matters because Lambda creates network interfaces per subnet and security-group combination. A function that
 * joins a combination already in use is created in seconds; a new combination takes minutes to create and longer to
 * release on delete.
 *
 * `previousSecurityGroup` is the group the deployed function runs in when this deploy moves it to another one: a
 * function's own group from before groups were shared, or the group of its previous connections. Moving takes Lambda
 * about four minutes, while CloudFormation changes the ingress rules of databases and filesystems right away. The
 * deploy that moves the function therefore keeps the previous group, and the resources the function still connects
 * to keep admitting it (see {@link getAdmittedLambdaSecurityGroups}). The next deploy deletes it.
 */
export const getVpcLambdaSecurityGroup = ({
  lambda,
  activeConfig,
  deployedTemplate = templateManager.oldTemplate
}: {
  lambda: VpcLambda;
  activeConfig: VpcLambdaConfig;
  deployedTemplate?: CloudFormationTemplate;
}) => {
  const admittingResourceNames = new Set(
    [
      ...activeConfig.databases,
      ...activeConfig.redisClusters,
      ...activeConfig.openSearchDomains,
      ...activeConfig.kafkaClusters,
      ...activeConfig.atlasMongoClusters
    ].map(({ nameChain }) => nameChain.join('.'))
  );
  const connectedResourceNames = [
    ...(lambda.connectTo ?? []).filter((name) => admittingResourceNames.has(name)),
    ...(lambda.volumeMounts ?? []).flatMap((mount) =>
      mount.type === 'efs' && mount.properties?.efsFilesystemName ? [mount.properties.efsFilesystemName] : []
    )
  ];
  const connectedTo = [...new Set(connectedResourceNames)].sort();
  const scopeId = connectedTo.length ? shortHash(connectedTo.join(',')) : undefined;
  const cfLogicalName = cfLogicalNames.vpcFunctionsSecurityGroup(scopeId);
  const deployed =
    lambda.joinDefaultVpc && !activeConfig.isInDevNetwork(lambda)
      ? getDeployedLambdaSecurityGroup({ lambdaName: lambda.name, deployedTemplate })
      : undefined;
  return {
    connectedTo,
    scopeId,
    cfLogicalName,
    previousSecurityGroup: deployed && deployed.cfLogicalName !== cfLogicalName ? deployed : undefined
  };
};

/**
 * The security groups that `admittingCfLogicalName` (the security group of a database or filesystem, or the MongoDB
 * Atlas access list) admits for a function that connects to it: the function's group and, during the deploy that moves
 * the function, its previous group if the deployed template already admits it there. Nothing that was not admitted
 * before is admitted for the previous group, so its other members gain nothing.
 */
export const getAdmittedLambdaSecurityGroups = ({
  lambda,
  activeConfig,
  admittingCfLogicalName,
  deployedTemplate = templateManager.oldTemplate
}: {
  lambda: VpcLambda;
  activeConfig: VpcLambdaConfig;
  admittingCfLogicalName: string;
  deployedTemplate?: CloudFormationTemplate;
}) => {
  const { cfLogicalName, previousSecurityGroup } = getVpcLambdaSecurityGroup({
    lambda,
    activeConfig,
    deployedTemplate
  });
  const previousStillAdmitted =
    previousSecurityGroup &&
    JSON.stringify(deployedTemplate.Resources[admittingCfLogicalName] ?? null).includes(
      JSON.stringify({ Ref: previousSecurityGroup.cfLogicalName })
    );
  return previousStillAdmitted ? [cfLogicalName, previousSecurityGroup.cfLogicalName] : [cfLogicalName];
};

/** The security group the deployed function runs in, as the deployed template defines it. */
const getDeployedLambdaSecurityGroup = ({
  lambdaName,
  deployedTemplate
}: {
  lambdaName: string;
  deployedTemplate: CloudFormationTemplate;
}) => {
  const deployedFunction = deployedTemplate.Resources[cfLogicalNames.lambda(lambdaName)] as
    | { Properties?: { VpcConfig?: { SecurityGroupIds?: unknown[] } } }
    | undefined;
  const securityGroupIds = deployedFunction?.Properties?.VpcConfig?.SecurityGroupIds;
  const reference = securityGroupIds?.length === 1 ? (securityGroupIds[0] as { Ref?: unknown } | null) : undefined;
  const cfLogicalName = typeof reference?.Ref === 'string' ? reference.Ref : undefined;
  const resource = cfLogicalName ? deployedTemplate.Resources[cfLogicalName] : undefined;
  return cfLogicalName && resource?.Type === 'AWS::EC2::SecurityGroup' ? { cfLogicalName, resource } : undefined;
};
