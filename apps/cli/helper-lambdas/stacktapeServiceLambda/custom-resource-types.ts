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

type ServiceLambdaResolverReturnValue = {
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

type StpServiceCustomResourceAcceptVpcPeeringProps = {
  vpcPeeringConnectionId: string;
};

type StpServiceCustomResourceDatabaseDeletionProtectionProps = {
  clusterId?: string;
  instanceId?: string;
};

type StpServiceCustomResourceScriptFunctionProps = {
  functionName: string | Intrinsic;
  triggerType: StpDeploymentScript['trigger'];
  parameters?: Record<string, any>;
};

export type StpServiceCustomResourceSensitiveDataProps = {
  ssmParameterName: string;
  value: OutputValue;
};

type StpServiceCustomResourcePublishLambdaVersionProps = {
  functionName: string | Intrinsic;
};

export type StpServiceCustomResourceFirewallProps = WebAppFirewallProps & {
  name: string;
};

export type StpServiceCustomResourceOpenSearchProps = OpenSearchDomainProps & { name: string };

type StpServiceCustomResourceForceDeleteAsgProps = {
  asgName: string | Intrinsic;
};

type StpServiceCustomResourceDisableEcsManagedTerminationProtectionProps = {
  capacityProviderName: string | Intrinsic;
};

type StpServiceCustomResourceDeregisterTargetsProps = {
  targetGroupArns: (string | Intrinsic)[];
};

type StpServiceCustomResourceDefaultDomainCertProps = { certDomainSuffix: string; version: number };

type StpServiceCustomResourceEdgeLambdaBucketProps = { globallyUniqueStackHash: string };

type StpServiceCustomResourceDefaultDomainProps = {
  domainName: string;
  targetInfo: {
    hostedZoneId: string | Intrinsic;
    domainName: string | Intrinsic;
  };
  version: number;
};

type StpServiceCustomResourceAssetReplacerProps = {
  bucketName: string | Intrinsic;
  zipFileS3Key: string;
  replacements: { includeFilesPattern: string; searchString: string; replaceString: string }[];
};

type StpServiceCustomResourceUserPoolDetailsProps = {
  userPoolId: string | Intrinsic;
  userPoolClientId: string | Intrinsic;
};

type StpServiceCustomResourceSsmParameterRetrieveProps = {
  parameterName: string;
  region: string;
  parseAsJson?: boolean;
};

type StpServiceCustomResourceKafkaBootstrapBrokersProps = {
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

type StpServiceCustomResourceTransactionSearchProps = {
  /** Bumped only when the enablement behavior itself changes; forces the resolver to re-run. */
  version: number;
};

/**
 * The home default-route target of each private route table. `launchTemplateVersions` only reruns the check after a
 * deploy that replaced NAT instances; the handler does not read it.
 */
export type StpServiceCustomResourceNatRoutesProps = {
  routes: { routeTableId: string | Intrinsic; networkInterfaceId: string | Intrinsic }[];
  launchTemplateVersions: (string | Intrinsic)[];
};

/**
 * An instance profile created by the service Lambda instead of `AWS::IAM::InstanceProfile`, whose CloudFormation
 * handler always waits about 2 minutes. `probeImageId` is any image EC2 accepts in the region; the handler only uses
 * it, with `probeSubnetId`, in dry-run launches that tell when EC2 sees the new profile.
 */
export type StpServiceCustomResourceInstanceProfileProps = {
  instanceProfileName: string;
  roleName: string | Intrinsic;
  probeImageId: string;
  /** Any subnet of the stack's VPC, for the same dry-run launches. */
  probeSubnetId: string | Intrinsic;
};

/**
 * An SQS queue created by the service Lambda instead of `AWS::SQS::Queue`, whose CloudFormation handler waits about
 * 60 s after every create. The properties are the queue's final `AWS::SQS::Queue` properties, so overrides and transforms
 * apply to them as before. CloudFormation passes every scalar to a custom resource as a string.
 */
export type StpServiceCustomResourceSqsQueueProps = { [property: string]: unknown };

/**
 * An EventBridge rule created by the service Lambda instead of `AWS::Events::Rule`, whose CloudFormation handler waits
 * about 30 s after `PutRule` and 30 s after `PutTargets`. The properties are the rule's final `AWS::Events::Rule`
 * properties plus the generated `Name` and the stack's `Tags`; `EventPattern` is a JSON string, so CloudFormation does
 * not turn its numbers and booleans into strings.
 */
export type StpServiceCustomResourceEventsRuleProps = { [property: string]: unknown };

/**
 * An SQS queue policy set by the service Lambda instead of `AWS::SQS::QueuePolicy`, whose CloudFormation handler waits
 * about 30 s. `PolicyDocument` is JSON text, so CloudFormation does not turn its values into strings.
 */
export type StpServiceCustomResourceSqsQueuePolicyProps = { PolicyDocument: unknown; Queues: unknown[] };

export type StpServiceCustomResourceProperties = {
  sqsQueue?: StpServiceCustomResourceSqsQueueProps;
  sqsQueuePolicy?: StpServiceCustomResourceSqsQueuePolicyProps;
  eventsRule?: StpServiceCustomResourceEventsRuleProps;
  instanceProfile?: StpServiceCustomResourceInstanceProfileProps;
  natRoutes?: StpServiceCustomResourceNatRoutesProps;
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
