type ExpectedError = import('../src/utils/errors').ExpectedError;
type UnexpectedError = import('../src/utils/errors').UnexpectedError;
type WorkerName = 'es-lambda' | 'es-container' | 'custom-dockerfile';
type SupportedFileExt = keyof (typeof import('../src/config/random'))['lambdaRuntimesForFileExtension'];
type AwsCallerIdentity = import('@aws-sdk/client-sts').GetCallerIdentityResponse;
type ImageBasedWorkerOutput = { message?: string };

type LoadableFileExtensions = SupportedFileExt | 'ini' | 'json' | 'yml' | 'yaml';

type DeploymentMode = 'development' | 'production';

type PackageJson = import('read-pkg-up').PackageJson & {
  peerDependenciesMeta: { [name: string]: { optional?: boolean } };
  gypfile: any;
  binary: any;
};

type StackActionType =
  | 'delete'
  | 'update'
  | 'create'
  | 'rollback'
  | 'dev' // `dev-${DevModeCapableResourceType}`
  | 'deployment-script:run';

type AWSRegion = (typeof import('../src/config/random'))['SUPPORTED_AWS_REGIONS'][number];

type StackOperationRecord = {
  id: string;
  createdAt: string;
  command: StacktapeRecordedCommand;
  stackName: string;
  startTime: string;
  endTime: string;
  gitShortSha: string;
  gitBranch: string;
  awsAccessKeyId: string;
  success: boolean;
  description: string;
  userId: string;
};

// type ImageArtifactProps = {
//   type: 'image-based-container';
//   image: string;
// };

// type DockerfileArtifactProps = BatchJobDockerfileBasedImage & {
//   type: 'dockerfile-based-container';
// };

// type FilepathArtifactProps = ConfigurablePackageConfig & {
//   type: 'filepath-based-container';
//   requiresGlibcBinaries?: boolean;
//   nodeTarget: string;
//   extension: SupportedFileExt;
//   languageSpecificConfig: ContainerLanguageSpecificConfig;
// };

// type LambdaArtifactProps = ConfigurablePackageConfig & {
//   type: 'lambda-based';
//   runtime?: LambdaRuntime;
//   extension: SupportedFileExt;
//   languageSpecificConfig: LambdaLanguageSpecificConfig;
// };

// type ArtifactProps = ImageArtifactProps | DockerfileArtifactProps | FilepathArtifactProps | LambdaArtifactProps;

type WorkloadJob = PackageWorkloadInput & {
  workloadType: StpWorkloadType;
  stage: string;
  jobDefinition: StpLambdaFunction | BatchJobContainer | ContainerWorkloadContainer;
  isMultiContainerWorkload?: boolean;
};

type CloudformationResource = import('../@generated/cloudform/resource').default;
// { type: import('@cloudform/resource-types').CloudformationResourceType }

type CfOutput = {
  Value: string; // import('../cloudform/dataTypes').IntrinsicFunction;
  Description?: string;
  Export?: string;
};
type CloudformationTemplate = import('../@generated/cloudform/template').default & {
  Resources: { [resourceName: string]: CloudformationResource };
};

type LambdaRuntime =
  | 'nodejs24.x'
  | 'nodejs22.x'
  | 'nodejs20.x'
  | 'nodejs18.x'
  | 'python3.13'
  | 'python3.12'
  | 'python3.11'
  | 'python3.10'
  | 'python3.9'
  | 'python3.8'
  | 'ruby3.2'
  | 'java17'
  | 'java11'
  | 'java8.al2'
  | 'java8'
  | 'provided.al2'
  | 'provided.al2023'
  | 'dotnet7'
  | 'dotnet6';

// this is a cloudformation specification.
// I.e this is is how it MUST look like when we are inserting the statement into Cloudformation config.
interface CloudformationIamRoleStatement {
  Sid?: string;
  Resource: string | string[];
  Effect: string;
  Action: string | string[];
  Principal?: Record<string, any>; // principal parameter is only applicable for policies that are directly attached to resources (i.e bucketPolicy)
  Condition?: Record<string, any>;
}

// this is stacktape specification.
// it is extension of StpIamRoleStatement that should be used for resource-based policies (i.e bucketPolicy)
interface BucketPolicyIamRoleStatement extends StpIamRoleStatement {
  Principal: any;
}

// type EnvironmentVars = { [varName: string]: string | number | boolean };

type Arn = string; // string | { Ref: string } | { 'Fn::GetAtt': string[] };
// @todo https://trello.com/c/qCTVeZ8o/196-improve-iam-role-statement-type
type IamRoleStatement = {
  Action: string | string[];
  Effect: string;
  Principal: string;
  Resource: any[];
  Condition?: Record<string, any>;
};

type StackDetails = import('@aws-sdk/client-cloudformation').Stack & {
  stackOutput: {
    [outputName: string]: string;
  };
};

type InvokeLambdaReturnValue = Omit<import('@aws-sdk/client-lambda').InvokeCommandOutput, 'Payload'> & {
  Payload: string;
};

type EnrichedStackResourceInfo = import('@aws-sdk/client-cloudformation').StackResourceSummary & {
  tags?: { key?: string; value?: string }[]; // applicable to and AWS::Lambda::Function
  ecsServiceTaskDefinition?: import('@aws-sdk/client-ecs').TaskDefinition; // applicable to AWS::ECS::Service and Stacktape::ECSBlueGreen::Service
  ecsServiceTaskDefinitionTags?: { key?: string; value?: string }[]; // applicable to AWS::ECS::Service and Stacktape::ECSBlueGreen::Service
  ecsService?: import('@aws-sdk/client-ecs').Service; // applicable to AWS::ECS::Service and Stacktape::ECSBlueGreen::Service
  asgDetail?: import('@aws-sdk/client-auto-scaling').AutoScalingGroup; // applicable to AWS::AutoScaling::AutoScalingGroup
  rdsInstanceDetail?: import('@aws-sdk/client-rds').DBInstance; // applicable to AWS::RDS::DBInstance
  auroraClusterDetail?: import('@aws-sdk/client-rds').DBCluster; // applicable to AWS::RDS::DBCluster
};

type NotificationEmailInformation = {
  email: string;
  role: 'sender' | 'recipient';
};

type GitInformation = {
  hasUncommitedChanges: boolean;
  username: string;
  branch: string;
  commit: string;
  gitUrl: string;
};

type LFP = Omit<LambdaFunctionProps, 'packaging'> & {
  packaging: LambdaPackaging | HelperLambdaPackaging;
};

// type StpLambdaFunction = LambdaFunctionProps & {
//   configParentResourceType:
//     | BatchJob['type']
//     | LambdaFunction['type']
//     | CustomResourceDefinition['type']
//     | DeploymentScript['type']
//     | EdgeLambdaFunction['type'];
//   nameChain: string[];
//   type: LambdaFunction['type'];
//   name: string;
//   handler: string;
//   cfLogicalName: string;
//   artifactPath: string;
//   artifactName: string;
//   resourceName: string;
//   aliasLogicalName?: string;
// };

// type StpHelperLambdaFunction = Omit<StpLambdaFunction, 'packaging'> & {
//   packaging: HelperLambdaPackaging;
//   runtime: LambdaRuntime;
// };

type EdgeLambdaReferencedUsingArn = {
  edgeLambdaVersionArn: string | IntrinsicFunction;
};

type CloudfrontFunctionReferencedUsingArn = {
  cloudfrontFunctionArn: string | IntrinsicFunction;
};

type CustomResourceProps = StpCustomResource & {
  nameChain: string[];
  cfLogicalName: string;
};

type StpDomainStatus = {
  registered: boolean;
  ownershipVerified: boolean;
  regionalCert: CertificateDetail;
  usEast1Cert: CertificateDetail;
  hostedZoneInfo: HostedZoneInfo;
  // currentNameServers?: string[];
};

type ResourceWithPhysicalId = {
  nameChain: string[];
  parentType: StackInfoMapResource['resourceType'];
  resourcePhysicalId: string;
  cfType: import('@cloudform/resource-types').CloudformationResourceType | SupportedPrivateCfResourceType;
};

type ErrorType =
  | 'API_KEY'
  | 'CLI'
  | 'MISSING_PREREQUISITE'
  | 'EXISTING_STACK'
  | 'NON_EXISTING_STACK'
  | 'NON_EXISTING_RESOURCE'
  | 'MISSING_OUTPUT'
  | 'CONFIG_VALIDATION'
  | 'CONFIG_GENERATION'
  | 'PACKAGING'
  | 'PACKAGING_CONFIG'
  | 'DOCKER'
  | 'CONFIG'
  | 'SOURCE_CODE'
  | 'LOGIN'
  | 'QUOTA'
  | 'DIRECTIVE'
  | 'PARAMETER'
  | 'HOOK'
  | 'FILE_ACCESS'
  | 'CREDENTIALS'
  | 'NOT_YET_IMPLEMENTED'
  | 'STACK'
  | 'DEPLOYMENT'
  | 'BUDGET'
  | 'AWS'
  | 'DOMAIN_MANAGEMENT'
  | 'CLOUDFORMATION'
  | 'STACK_MONITORING'
  | 'SYNC_BUCKET'
  | 'USERPOOL'
  | 'INPUT'
  | 'UNEXPECTED'
  | 'BUILD_CODE'
  | 'API_SERVER'
  | 'SCRIPT'
  | 'PACK'
  | 'NIXPACKS'
  | 'CODEBUILD'
  | 'AWS_ACCOUNT'
  | 'LIMIT_EXCEEDED'
  | 'GUARDRAIL'
  | 'SUBSCRIPTION_REQUIRED'
  | 'SESSION_MANAGER'
  | 'UNSUPPORTED_RESOURCE'
  | 'INSTALL_DEPENDENCIES'
  | 'CONFIRMATION_REQUIRED'
  | 'DEVICE';

type HelperLambdaData = {
  digest: string;
  artifactPath: string;
  handler: string;
  size: number;
};

type HelperLambdaDetails = {
  [name in HelperLambdaName]: HelperLambdaData;
};

declare module '*.proto' {
  const content: any;
  export default content;
}

type DriftDetail = {
  resourceLogicalName: string;
  resourceType: string;
  differences: import('@aws-sdk/client-cloudformation').PropertyDifference[];
};

type ConfigResolver = import('../src/domain/config-manager/config-resolver').ConfigResolver;

type Directive = {
  name: string;
  resolveFunction: (configResolver: ConfigResolver) => (...args: any) => any;
  localResolveFunction?: (configResolver: ConfigResolver) => (...args: any) => any;
  requiredParams: RequiredDirectivePrimitiveParams;
  lazyLoad?: boolean;
  isRuntime: boolean;
};
type CustomDirective = Pick<Directive, 'name' | 'resolveFunction'>;

type RequiredDirectivePrimitiveParams = { [propertyName: string]: 'boolean' | 'number' | 'string' };

type SupportedConsoleColor = 'cyan' | 'blue' | 'gray' | 'yellow' | 'green' | 'red' | 'magenta';

// @WARNING: this has to be consistent with lambda names in directory
type HelperLambdaName = (typeof import('../src/config/random'))['HELPER_LAMBDA_NAMES'][number];

type DeploymentBucketObjectType = 'cf-template' | 'stp-template' | 'helper-lambda' | 'user-lambda';

type EventResolverProps = {
  allLambdaResources: (StpLambdaFunction | StpHelperLambdaFunction)[];
  policyStatementsFromEvents: { [workloadName: string]: StpIamRoleStatement[] };
};

type StdTransformer = (line: string) => string | null;

type SchemaUnionMember = {
  schemaDefinitionName: string;
  schemaDefinition: any;
  reachableSchemas: object[];
  // below properties are only valid if union is well defined - i.e each member is in shape {type, properties}; otherwise empty
  matchingTypes?: string[];
  internalPropertiesSchemaDefinitionName?: string;
  internalPropertiesSchemaDefinition?: any;
};

type StacktapeProgrammaticOptions = {
  commands: StacktapeCommand[];
  args: StacktapeArgs;
  config?: StacktapeConfig;
  invokedFrom: InvokedFrom;
  additionalArgs?: Record<string, string | boolean>;
};

type StacktapeLogType = 'FINISH' | 'MESSAGE' | 'DATA' | 'ERROR';

type StacktapeLog = {
  commandInvocationId: string;
  type: StacktapeLogType;
  data: any;
  timestamp: number;
};

type InvokedFrom = 'cli' | 'server';

// @note this should be consistent with generated typings for SDK (../scripts/generate-prog-api-declaration.ts)
type SubscribeToLogStream = (
  { commandInvocationId }: { commandInvocationId: string },
  {
    onData,
    onError,
    onEnd
  }: {
    onData?: (response: StacktapeLog) => any;
    onError?: (err: Error) => any;
    onEnd?: () => any;
  }
) => void;

type CfChildResourceOverview = {
  cloudformationResourceType:
    | import('@cloudform/resource-types').CloudformationResourceType
    | SupportedPrivateCfResourceType;
  status: import('@aws-cdk/cloudformation-diff').ResourceImpact;
  referenceableParams: string[];
  afterUpdateResourceType?:
    | import('@cloudform/resource-types').CloudformationResourceType
    | SupportedPrivateCfResourceType;
};

type StackMetadataName = keyof typeof import('@shared/naming/metadata-names').stackMetadataNames;
type StackInfoMap = {
  metadata: {
    [metadataName in Partial<StackMetadataName>]?: { showDuringPrint: boolean; value: OutputValue | Date };
  };
  resources: {
    [resourceName: string]: StackInfoMapResource;
  };
  customOutputs: {
    [cfOutputName: string]: OutputValue;
  };
};

type IntrinsicFunction = import('@cloudform/dataTypes').IntrinsicFunction;

type OutputValue = string | number | boolean | IntrinsicFunction; // number | boolean |

type StackInfoMapResource = {
  resourceType: StpResourceType | 'SHARED_GLOBAL' | 'CUSTOM_CLOUDFORMATION';
  referencableParams: {
    [paramName in StacktapeResourceReferenceableParam]?: {
      showDuringPrint: boolean;
      value: OutputValue;
      ssmParameterName?: string;
    };
  };
  cloudformationChildResources: {
    [cfLogicalName: string]: Omit<CfChildResourceOverview, 'status' | 'referenceableParams'>;
  };
  links: {
    [name: string]: OutputValue;
  };
  // outputs are meant for arbitrary non-referencable information about resource such as http-api-gateway paths
  // output can be primitive but also complex (array or object)
  // they are not meant for sensitive values
  outputs: {
    [name: string]: any;
  };
  // some of the resources such as web-service, private-service, nextjs-web (etc) are made of lower level stacktape resources (function, multi-container-workload, bucket...)
  _nestedResources?: {
    [nestedResourceIdentifier: string]: StackInfoMapResource;
  };
};

type StacktapeResourceOutput<T extends StpResourceType> = T extends 'http-api-gateway'
  ? HttpApiGatewayOutputs
  : T extends 'application-load-balancer'
    ? ApplicationLoadBalancerOutputs
    : T extends 'web-app-firewall'
      ? IntrinsicFunction
      : never;

type StackMetadata = {
  name: string;
  createdTime: Date;
  lastUpdatedTime: Date;
  [metaName: string]: OutputValue | Date;
};

type DetailedStackResourceInfo = Omit<StackInfoMapResource, 'referencableParams' | '_nestedResources'> & {
  status: 'DEPLOYED' | 'TO_BE_CREATED' | 'TO_BE_DELETED' | 'TO_BE_REPLACED';
  afterUpdateResourceType?: StpResourceType | 'SHARED_GLOBAL' | 'CUSTOM_CLOUDFORMATION';
  referenceableParams: {
    [paramName in StacktapeResourceReferenceableParam]?: OutputValue;
  };
  cloudformationChildResources: {
    [cfLogicalName: string]: CfChildResourceOverview;
  };
  _nestedResources?: {
    [nestedResourceIdentifier: string]: DetailedStackResourceInfo;
  };
};

type DetailedStackInfoMap = {
  metadata: StackMetadata;
  resources: { [key: string]: DetailedStackResourceInfo };
  customOutputs: StackInfoMap['customOutputs'];
};

type ListStackSummary = {
  stackName: string;
  stackId: string;
  stackStatus: import('@aws-sdk/client-cloudformation').StackStatus;
  stackStatusReason: string;
  creationTime: number; // unix utc time
  lastUpdateTime: number; // unix utc time
  isStacktapeStack: boolean;
  serviceName?: string;
  globallyUniqueStackHash?: string;
  stage?: string;
  actualSpend?: string;
  forecastedSpend?: string;
};

type ListStacksInfo = ListStackSummary[];

type CostExplorerTagsError = 'USER_NOT_ENABLED_FOR_COST_EXPLORER' | 'DATA_UNAVAILABLE';

type BudgetInfo = {
  actualSpend?: import('@aws-sdk/client-budgets').Spend;
  forecastedSpend?: import('@aws-sdk/client-budgets').Spend;
};

type ResourcePropsFromConfig<T extends StpResourceType> = T extends 'application-load-balancer'
  ? StpApplicationLoadBalancer // []
  : T extends 'network-load-balancer'
    ? StpNetworkLoadBalancer // []
    : T extends 'batch-job'
      ? StpBatchJob // []
      : T extends 'bucket'
        ? StpBucket // []
        : T extends 'edge-lambda-function'
          ? StpEdgeLambdaFunction // []
          : T extends 'multi-container-workload'
            ? StpContainerWorkload // []
            : T extends 'custom-resource-definition'
              ? StpCustomResourceDefinition // []
              : T extends 'custom-resource-instance'
                ? StpCustomResource // []
                : T extends 'deployment-script'
                  ? StpDeploymentScript // []
                  : T extends 'dynamo-db-table'
                    ? StpDynamoTable // []
                    : T extends 'event-bus'
                      ? StpEventBus // []
                      : T extends 'bastion'
                        ? StpBastion
                        : T extends 'function'
                          ? StpLambdaFunction // []
                          : T extends 'http-api-gateway'
                            ? StpHttpApiGateway // []
                            : T extends 'mongo-db-atlas-cluster'
                              ? StpMongoDbAtlasCluster // []
                              : T extends 'redis-cluster'
                                ? StpRedisCluster // []
                                : T extends 'relational-database'
                                  ? StpRelationalDatabase // []
                                  : T extends 'state-machine'
                                    ? StpStateMachine // []
                                    : T extends 'upstash-redis'
                                      ? StpUpstashRedis // []
                                      : T extends 'user-auth-pool'
                                        ? StpUserAuthPool // []
                                        : T extends 'web-service'
                                          ? StpWebService // []
                                          : T extends 'worker-service'
                                            ? StpWorkerService // []
                                            : T extends 'private-service'
                                              ? StpPrivateService // []
                                              : T extends 'aws-cdk-construct'
                                                ? StpAwsCdkConstruct // []
                                                : T extends 'sqs-queue'
                                                  ? StpSqsQueue // []
                                                  : T extends 'sns-topic'
                                                    ? StpSnsTopic // []
                                                    : T extends 'hosting-bucket'
                                                      ? StpHostingBucket // []
                                                      : T extends 'web-app-firewall'
                                                        ? StpWebAppFirewall // []
                                                        : T extends 'nextjs-web'
                                                          ? StpNextjsWeb // []
                                                          : T extends 'open-search-domain'
                                                            ? StpOpenSearchDomain // []
                                                            : T extends 'efs-filesystem'
                                                              ? StpEfsFilesystem
                                                              : never;

type StarterProjectDeploymentType = 'local-machine' | 'github' | 'gitlab';
type StarterProjectInstallDepsType = SupportedEsPackageManager | 'bundler' | 'poetry' | 'none';

type Printer = import('@application-services/tui-manager').TuiManager;
