type ServiceLambdaResolver<T> = (
  currentProps: T,
  previousProps: T,
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

type StpServiceCustomResourceEventProps<Event> = {
  lambdaArn: any; // @note can be intrinsic function or string;
  workloadName: string;
  eventConf: Event;
};

type SupportedPlatform = 'win' | 'linux' | 'macos' | 'macos-arm' | 'alpine' | 'linux-arm' | 'linux-ci';

type StpServiceCustomResourceEdgeFunctionProps = {
  artifactBucketName: string;
  globallyUniqueStackHash: string;
  artifactS3Key: string;
  lambdaRoleResourceName: string;
  lambdaLogGroupName: string;
  preprocessedRolePolicies: import('@cloudform/iam/role').Policy[];
} & (StpEdgeLambdaFunction | StpHelperEdgeLambdaFunction);

type StpServiceCustomResourceAcceptVpcPeeringProps = {
  vpcPeeringConnectionId: string;
};

type StpServiceCustomResourceDatabaseDeletionProtectionProps = {
  clusterId?: string;
  instanceId?: string;
};

type StpServiceCustomResourceScriptFunctionProps = {
  functionName: string | IntrinsicFunction;
  triggerType: StpDeploymentScript['trigger'];
  parameters?: Record<string, any>;
};

type StpServiceCustomResourceSensitiveDataProps = {
  ssmParameterName: string;
  value: OutputValue;
};

type StpServiceCustomResourcePublishLambdaVersionProps = {
  functionName: string | IntrinsicFunction;
};

type StpServiceCustomResourceFirewallProps = WebAppFirewallProps & {
  name: string;
};

type StpServiceCustomResourceOpenSearchProps = OpenSearchDomainProps & { name: string };

type StpServiceCustomResourceForceDeleteAsgProps = {
  asgName: string | IntrinsicFunction;
};

type StpServiceCustomResourceDisableEcsManagedTerminationProtectionProps = {
  capacityProviderName: string | IntrinsicFunction;
};

type StpServiceCustomResourceDeregisterTargetsProps = {
  targetGroupArns: (string | IntrinsicFunction)[];
};

type StpServiceCustomResourceDefaultDomainCertProps = { certDomainSuffix: string; version: number };

type StpServiceCustomResourceEdgeLambdaBucketProps = { globallyUniqueStackHash: string };

type StpServiceCustomResourceDefaultDomainProps = {
  domainName: string;
  targetInfo: {
    hostedZoneId: string | IntrinsicFunction;
    domainName: string | IntrinsicFunction;
  };
  version: number;
};

type StpServiceCustomResourceAssetReplacerProps = {
  bucketName: string | IntrinsicFunction;
  zipFileS3Key: string;
  replacements: { includeFilesPattern: string; searchString: string; replaceString: string }[];
};

type StpServiceCustomResourceUserPoolDetailsProps = {
  userPoolId: string | IntrinsicFunction;
  userPoolClientId: string | IntrinsicFunction;
};

type StpServiceCustomResourceSsmParameterRetrieveProps = {
  parameterName: string;
  region: string;
  parseAsJson?: boolean;
};

type StpServiceCustomResourceProperties = {
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

type StpServiceSharedCustomResourceProperties = Omit<
  StpServiceCustomResourceProperties,
  'setDatabaseDeletionProtection' | 'scriptFunction'
>;

type AwsCallerIdentityMap = { [awsAccessKeyId: string]: AwsCallerIdentity };

type ConfigurableCliArgsDefaults = {
  [propName in Partial<keyof (typeof import('../src/config/random'))['configurableGlobalDefaultCliArgs']>]: string;
};

type ConfigurableOtherDefaults = {
  [propName in Partial<keyof (typeof import('../src/config/random'))['configurableGlobalDefaultOtherProps']>]: string;
};

type GlobalStateOrganization = import('../console-app/trpc-api-client').CurrentUserAndOrgDataType['organization'];
// & {
//   role: import('../console-app/node_modules/@prisma/client').Role;
// };
type GlobalStateConnectedAwsAccount =
  import('../console-app/trpc-api-client').CurrentUserAndOrgDataType['connectedAwsAccounts'][number];

type GlobalStateProject = import('../console-app/trpc-api-client').CurrentUserAndOrgDataType['projects'][number];

type GlobalStateUser = import('../console-app/trpc-api-client').CurrentUserAndOrgDataType['user'];

type AwsCredentials = Mutable<import('@aws-sdk/types').Credentials>;

type LoadedAwsCredentials = AwsCredentials & {
  source: 'envVar' | 'credentialsFile' | 'api' | 'assumeRole';
};

type ValidatedAwsCredentials = LoadedAwsCredentials & { identity: { account: string; arn: string } };

type PersistedState = {
  systemId: string;
  cliArgsDefaults: ConfigurableCliArgsDefaults;
  otherDefaults: ConfigurableOtherDefaults;
};

type StacktapeCommandOutcome = 'SUCCESS' | 'USER_INTERRUPTION' | import('../src/config/error-messages').ErrorCode;

type StacktapeError = Error & {
  type: ErrorType;
  code?: string;
  hint?: string | string[];
  data?: any;
  isExpected: boolean;
  isNewApproachError: boolean;
};

type StacktapeCommandResult = {
  result: any;
  eventLog: EventLogEntry[];
};

type StacktapeApi = {
  result: any;
  eventLog: EventLogEntry[];
};

type StacktapeRecordedCommand = Subtype<
  StacktapeCommand,
  'deploy' | 'delete' | 'dev' | 'deployment-script:run' | 'bucket:sync' | 'script:run' | 'rollback' | 'codebuild:deploy'
>;
