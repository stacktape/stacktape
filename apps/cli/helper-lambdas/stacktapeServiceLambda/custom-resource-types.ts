import type { StpDeploymentScript } from '@domain-services/config-manager/resolved-types/deployment-script';
import type {
  StpEdgeLambdaFunction,
  StpHelperEdgeLambdaFunction
} from '@domain-services/config-manager/resolved-types/edge-lambda-functions';
import type { OutputValue } from '@domain-services/stack-info/types';
import type { IntrinsicFunction } from '@stacktape/config/cloudformation';
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
  preprocessedRolePolicies: import('@cloudform/iam/role').Policy[];
} & (StpEdgeLambdaFunction | StpHelperEdgeLambdaFunction);

export type StpServiceCustomResourceAcceptVpcPeeringProps = {
  vpcPeeringConnectionId: string;
};

export type StpServiceCustomResourceDatabaseDeletionProtectionProps = {
  clusterId?: string;
  instanceId?: string;
};

export type StpServiceCustomResourceScriptFunctionProps = {
  functionName: string | IntrinsicFunction;
  triggerType: StpDeploymentScript['trigger'];
  parameters?: Record<string, any>;
};

export type StpServiceCustomResourceSensitiveDataProps = {
  ssmParameterName: string;
  value: OutputValue;
};

export type StpServiceCustomResourcePublishLambdaVersionProps = {
  functionName: string | IntrinsicFunction;
};

export type StpServiceCustomResourceFirewallProps = WebAppFirewallProps & {
  name: string;
};

export type StpServiceCustomResourceOpenSearchProps = OpenSearchDomainProps & { name: string };

export type StpServiceCustomResourceForceDeleteAsgProps = {
  asgName: string | IntrinsicFunction;
};

export type StpServiceCustomResourceDisableEcsManagedTerminationProtectionProps = {
  capacityProviderName: string | IntrinsicFunction;
};

export type StpServiceCustomResourceDeregisterTargetsProps = {
  targetGroupArns: (string | IntrinsicFunction)[];
};

export type StpServiceCustomResourceDefaultDomainCertProps = { certDomainSuffix: string; version: number };

export type StpServiceCustomResourceEdgeLambdaBucketProps = { globallyUniqueStackHash: string };

export type StpServiceCustomResourceDefaultDomainProps = {
  domainName: string;
  targetInfo: {
    hostedZoneId: string | IntrinsicFunction;
    domainName: string | IntrinsicFunction;
  };
  version: number;
};

export type StpServiceCustomResourceAssetReplacerProps = {
  bucketName: string | IntrinsicFunction;
  zipFileS3Key: string;
  replacements: { includeFilesPattern: string; searchString: string; replaceString: string }[];
};

export type StpServiceCustomResourceUserPoolDetailsProps = {
  userPoolId: string | IntrinsicFunction;
  userPoolClientId: string | IntrinsicFunction;
};

export type StpServiceCustomResourceSsmParameterRetrieveProps = {
  parameterName: string;
  region: string;
  parseAsJson?: boolean;
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
};

export type StpServiceSharedCustomResourceProperties = Omit<
  StpServiceCustomResourceProperties,
  'setDatabaseDeletionProtection' | 'scriptFunction'
>;
