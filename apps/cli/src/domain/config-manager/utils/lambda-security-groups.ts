import type { ConfigManager } from '../index';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { shortHash } from '@stacktape/naming/short-hash';

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
 */
export const getVpcLambdaSecurityGroup = ({
  lambda,
  activeConfig
}: {
  lambda: Pick<StpLambdaFunction, 'connectTo' | 'volumeMounts'>;
  activeConfig: Pick<
    ConfigManager,
    'databases' | 'redisClusters' | 'openSearchDomains' | 'kafkaClusters' | 'atlasMongoClusters'
  >;
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
  return { connectedTo, scopeId, cfLogicalName: cfLogicalNames.vpcFunctionsSecurityGroup(scopeId) };
};
