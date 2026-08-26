import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';

import type { StpDeploymentScript } from '@domain-services/config-manager/resolved-types/deployment-script';
import type {
  StpEdgeLambdaFunction,
  StpHelperEdgeLambdaFunction
} from '@domain-services/config-manager/resolved-types/edge-lambda-functions';
import type { OutputValue } from '@domain-services/stack-info/types';
import type { S3IntegrationProps } from '@stacktape/config/events';
import type { OpenSearchDomainProps } from '@stacktape/config/open-search';
import type { WebAppFirewallProps } from '@stacktape/config/web-app-firewall';

/**
 * A resolver for one Stacktape custom-resource kind.
 *
 * The wire envelope keeps every resolver key optional because exactly one of them belongs in a given resource, but
 * the dispatcher selects that one key and refuses to invoke a resolver without it — so a resolver is entitled to its
 * current properties. Previous properties are genuinely absent on Create and Delete, where CloudFormation sends no
 * `OldResourceProperties`, so they stay optional. Both statements are shallow: whatever is optional *inside* the
 * payload is as optional as it was authored.
 */
export type ServiceLambdaResolver<T> = (
  currentProps: NonNullable<T>,
  previousProps: T | undefined,
  operationType: 'Create' | 'Update' | 'Delete',
  physicalResourceId?: string,
  lambdaContext?: import('aws-lambda').Context
) => Promise<ServiceLambdaResolverReturnValue>;

export type ServiceLambdaResolverReturnValue = {
  data: { [dataKey: string]: string };
  physicalResourceId?: string;
  // chainInvocation is a optional property
  // you can use this property to tell the CustomResource not to respond to Cloudformation, but instead to run the "function" again with the same payload
  // this can be helpful when polling for resource operation which takes more than 15 minutes
  // new payload(event) will contain (in addition to previous properties) resourcePhysicalId and attemptNumber
  // repeated attempts are limited to 4 - it is expected that you are polling as long as possible within lambda (~15 min) - after fourth attempt you must return anyways since (see below)
  // note that there is 1 hour timeout during which Cloudformation expects the response from CustomResource
  chainInvocation?: boolean;
};

export type StpServiceCustomResourceEventProps<Event> = {
  lambdaArn: any; // @note can be intrinsic function or string;
  workloadName: string;
  eventConf: Event;
};

export type StpServiceCustomResourceEdgeFunctionProps = {
  artifactBucketName: string;
  globallyUniqueStackHash: string;
  artifactS3Key: string;
  lambdaRoleResourceName: string;
  lambdaLogGroupName: string;
  preprocessedRolePolicies: import('@stacktape/cloudformation/resources/aws-iam-role').Policy[];
} & (StpEdgeLambdaFunction | StpHelperEdgeLambdaFunction);

export type StpServiceCustomResourceAcceptVpcPeeringProps = {
  vpcPeeringConnectionId: string;
};

export type StpServiceCustomResourceDatabaseDeletionProtectionProps = {
  clusterId?: string;
  instanceId?: string;
};

export type StpServiceCustomResourceScriptFunctionProps = {
  functionName: string | Intrinsic;
  triggerType: StpDeploymentScript['trigger'];
  parameters?: Record<string, any>;
};

export type StpServiceCustomResourceSensitiveDataProps = {
  ssmParameterName: string;
  value: OutputValue;
};

export type StpServiceCustomResourcePublishLambdaVersionProps = {
  functionName: string | Intrinsic;
};

export type StpServiceCustomResourceFirewallProps = WebAppFirewallProps & {
  name: string;
};

export type StpServiceCustomResourceOpenSearchProps = OpenSearchDomainProps & { name: string };

export type StpServiceCustomResourceForceDeleteAsgProps = {
  asgName: string | Intrinsic;
};

export type StpServiceCustomResourceDisableEcsManagedTerminationProtectionProps = {
  capacityProviderName: string | Intrinsic;
};

export type StpServiceCustomResourceDeregisterTargetsProps = {
  targetGroupArns: (string | Intrinsic)[];
};

export type StpServiceCustomResourceDefaultDomainCertProps = { certDomainSuffix: string; version: number };

export type StpServiceCustomResourceEdgeLambdaBucketProps = { globallyUniqueStackHash: string };

export type StpServiceCustomResourceDefaultDomainProps = {
  domainName: string;
  targetInfo: {
    hostedZoneId: string | Intrinsic;
    domainName: string | Intrinsic;
  };
  version: number;
};

export type StpServiceCustomResourceAssetReplacerProps = {
  bucketName: string | Intrinsic;
  zipFileS3Key: string;
  replacements: { includeFilesPattern: string; searchString: string; replaceString: string }[];
};

export type StpServiceCustomResourceUserPoolDetailsProps = {
  userPoolId: string | Intrinsic;
  userPoolClientId: string | Intrinsic;
};

export type StpServiceCustomResourceSsmParameterRetrieveProps = {
  parameterName: string;
  region: string;
  parseAsJson?: boolean;
};

export type StpServiceCustomResourceKafkaBootstrapBrokersProps = {
  clusterArn: string | Intrinsic;
};

export type StpServiceCustomResourceUptimeMonitoringProps = {
  /** Per-region check lists; a check is probed only from the regions it is assigned to. */
  regionAssignments: import('@helper-lambdas/uptimeProber/manifest').UptimeRegionAssignment[];
  /** Prober code in the stack's deployment bucket; copied into each probe region's staging bucket. */
  proberArtifact: { bucketName: string; s3Key: string; digest: string };
  apiUrl: string;
  stackName: string;
};

export type StpServiceCustomResourceTransactionSearchProps = {
  /** Bumped only when the enablement behavior itself changes; forces the resolver to re-run. */
  version: number;
};

export type StpServiceCustomResourceProperties = {
  s3Events?: StpServiceCustomResourceEventProps<S3IntegrationProps>[];
  // @deprecated - use edgeLambda instead
  edgeFunctions?: StpServiceCustomResourceEdgeFunctionProps[];
  edgeLambda?: StpServiceCustomResourceEdgeFunctionProps;
  edgeLambdaBucket?: StpServiceCustomResourceEdgeLambdaBucketProps;
  acceptVpcPeeringConnections?: StpServiceCustomResourceAcceptVpcPeeringProps[];
  sensitiveData?: StpServiceCustomResourceSensitiveDataProps[];
  setDatabaseDeletionProtection?: StpServiceCustomResourceDatabaseDeletionProtectionProps;
  scriptFunction?: StpServiceCustomResourceScriptFunctionProps;
  publishLambdaVersion?: StpServiceCustomResourcePublishLambdaVersionProps;
  webAppFirewall?: StpServiceCustomResourceFirewallProps;
  openSearch?: StpServiceCustomResourceOpenSearchProps;
  forceDeleteAsg?: StpServiceCustomResourceForceDeleteAsgProps;
  deregisterTargets?: StpServiceCustomResourceDeregisterTargetsProps;
  disableEcsManagedTerminationProtection?: StpServiceCustomResourceDisableEcsManagedTerminationProtectionProps;
  defaultDomainCert?: StpServiceCustomResourceDefaultDomainCertProps;
  defaultDomain?: StpServiceCustomResourceDefaultDomainProps;
  assetReplacer?: StpServiceCustomResourceAssetReplacerProps;
  userPoolDetails?: StpServiceCustomResourceUserPoolDetailsProps;
  ssmParameterRetrieve?: StpServiceCustomResourceSsmParameterRetrieveProps;
  kafkaBootstrapBrokers?: StpServiceCustomResourceKafkaBootstrapBrokersProps;
  uptimeMonitoring?: StpServiceCustomResourceUptimeMonitoringProps;
  transactionSearch?: StpServiceCustomResourceTransactionSearchProps;
};

export type StpServiceSharedCustomResourceProperties = Omit<
  StpServiceCustomResourceProperties,
  'setDatabaseDeletionProtection' | 'scriptFunction'
>;
