export const IS_DEV = process.env.STP_DEV_MODE === 'true';

export const VALID_CONFIG_PATHS = ['stacktape.yaml', 'stacktape.yml', 'stacktape.js', 'stacktape.ts'];
export const ANNOUNCEMENTS_ENDPOINT = 'https://announcements.stacktape-dev.com';
export const SENTRY_DSN = 'https://93ed0b30b9b743bcbef5745266e8a30b@sentry.io/2119088';
export const SCHEMAS_BUCKET_NAME =
  process.env.SCHEMAS_BUCKET_NAME || 'internal-services-production-schemasbucket-eb6fca19';
export const AI_DOCS_BUCKET_NAME = process.env.AI_DOCS_BUCKET_NAME || 'console-app-dev-mcpdocsbucket-743a732';
export const INSTALL_SCRIPTS_BUCKET_NAME =
  process.env.INSTALL_SCRIPTS_BUCKET_NAME || 'internal-services-production-installscriptsbucket-eb6fca19';
export const INSTALL_SCRIPTS_PREVIEW_BUCKET_NAME =
  process.env.INSTALL_SCRIPTS_PREVIEW_BUCKET_NAME || 'internal-services-production-installscriptsbucketpreview-7b7a41';

export const STACKTAPE_TRPC_API_ENDPOINT =
  process.env.STP_CUSTOM_TRPC_API_ENDPOINT || (IS_DEV ? 'https://dev-api.stacktape.com' : 'https://api.stacktape.com');

export const MIXPANEL_TOKEN = '5f4ad0b60610c9b0398528c77e5459da';

export const DEFAULT_STARTER_PROJECT_TARGET_DIRECTORY = 'stacktape-project';

export const IS_TELEMETRY_DISABLED = process.env.STP_DISABLE_TELEMETRY === '1';
export const possiblySupportedLangExtensions = [
  'js',
  'ts',
  'mjs',
  'mts',
  'py',
  'java',
  'rb',
  'go',
  'cs',
  'jsx',
  'tsx'
] as const;

export const NODE_RUNTIME_VERSIONS_WITH_SKIPPED_SDK_V3_PACKAGING = [24, 22, 20, 18];

export const lambdaRuntimesForFileExtension: {
  [_ext in (typeof possiblySupportedLangExtensions)[number]]: string[];
} = {
  js: ['nodejs24.x', 'nodejs22.x', 'nodejs20.x', 'nodejs18.x'],
  ts: ['nodejs24.x', 'nodejs22.x', 'nodejs20.x', 'nodejs18.x'],
  mjs: ['nodejs24.x', 'nodejs22.x', 'nodejs20.x', 'nodejs18.x'],
  mts: ['nodejs24.x', 'nodejs22.x', 'nodejs20.x', 'nodejs18.x'],
  jsx: ['nodejs24.x', 'nodejs22.x', 'nodejs20.x', 'nodejs18.x'],
  tsx: ['nodejs24.x', 'nodejs22.x', 'nodejs20.x', 'nodejs18.x'],
  py: ['python3.13', 'python3.12', 'python3.11', 'python3.10'],
  java: ['java21', 'java17', 'java11'],
  rb: ['ruby3.3'],
  go: ['provided.al2', 'provided.al2023'],
  cs: ['dotnet8', 'dotnet6']
};
export const supportedWorkloadExtensions: (typeof possiblySupportedLangExtensions)[number][] = [
  'js',
  'ts',
  'mjs',
  'jsx',
  'tsx',
  'py',
  'java',
  'go'
];
export const supportedAwsCdkConstructExtensions: (typeof possiblySupportedLangExtensions)[number][] = ['js', 'ts'];
export const supportedCodeConfigLanguages: (typeof possiblySupportedLangExtensions)[number][] = ['js', 'ts', 'py'];

export const DEFAULT_CLOUDFORMATION_REGISTRY_BUCKET_NAME = 'stacktape-infrastructure-modules';
export const DEFAULT_CLOUDFORMATION_REGISTRY_BUCKET_REGION = 'eu-west-1' as const;

export const DEFAULT_KEEP_PREVIOUS_DEPLOYMENT_ARTIFACTS_COUNT = 25;

export const MONITORING_FREQUENCY_SECONDS = 3.5;
export const SENTRY_CAPTURE_EXCEPTION_WAIT_TIME_MS = 1500;
export const DEFAULT_MAXIMUM_PARALLEL_ARTIFACT_UPLOADS = 10;
export const DEFAULT_MAXIMUM_PARALLEL_BUCKET_SYNCS = 10;
export const DEFAULT_CONTAINER_NODE_VERSION = 24;
export const DEFAULT_LAMBDA_NODE_VERSION = 24;

// @todo
export const linksMap = {
  docsCli: 'https://docs.stacktape.com/cli/using-cli/',
  pricingPage: 'https://stacktape.com#pricing',
  docs: 'https://docs.stacktape.com',
  javaWorkloadIssue: 'https://github.com/stacktape/stacktape/issues/5',
  pythonWorkloadIssue: 'https://github.com/stacktape/stacktape/issues/4',
  csharpWorkloadIssue: 'https://github.com/stacktape/stacktape/issues/3',
  rubyWorkloadIssue: 'https://github.com/stacktape/stacktape/issues/2',
  goWorkloadIssue: 'https://github.com/stacktape/stacktape/issues/1',
  newIssue: 'https://github.com/stacktape/stacktape/issues/new',
  prerequisites: 'https://docs.stacktape.com/getting-started/setup-stacktape/',
  signUp: 'https://console.stacktape.com/sign-up',
  console: 'https://console.stacktape.com/',
  apiKeys: 'https://console.stacktape.com/api-keys',
  connectedAwsAccounts: 'https://console.stacktape.com/aws-accounts',
  subscription: 'https://console.stacktape.com/subscription-plans'
};

export const SUPPORTED_AWS_REGIONS = [
  'us-east-2',
  'us-east-1',
  'us-west-1',
  'us-west-2',
  'ap-east-1',
  'ap-south-1',
  'ap-northeast-3',
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ca-central-1',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'me-south-1',
  'sa-east-1',
  'af-south-1',
  'eu-south-1'
] as const;

export const defaultLogRetentionDays = {
  httpApiGateway: 30,
  batchJob: 90,
  containerWorkload: 90,
  lambdaFunction: 90,
  redisCluster: 30,
  relationalDatabase: 90
};

export const RESOURCE_DEFAULTS: { [_resourceType in StpResourceType]: Partial<StpResource> } = {
  'batch-job': {
    resources: {
      memory: 1024
    }
  },
  'web-service': {
    scaling: {
      scalingPolicy: {
        keepAvgCpuUtilizationUnder: 80,
        keepAvgMemoryUtilizationUnder: 80
      },
      minInstances: 1,
      maxInstances: 1
    }
  },
  'private-service': {
    scaling: {
      scalingPolicy: {
        keepAvgCpuUtilizationUnder: 80,
        keepAvgMemoryUtilizationUnder: 80
      },
      minInstances: 1,
      maxInstances: 1
    }
  },
  'worker-service': {
    scaling: {
      scalingPolicy: {
        keepAvgCpuUtilizationUnder: 80,
        keepAvgMemoryUtilizationUnder: 80
      },
      minInstances: 1,
      maxInstances: 1
    }
  },
  'multi-container-workload': {
    scaling: {
      scalingPolicy: {
        keepAvgCpuUtilizationUnder: 80,
        keepAvgMemoryUtilizationUnder: 80
      },
      minInstances: 1,
      maxInstances: 1
    }
  },
  function: {
    memory: 1024,
    timeout: 20
  },
  'edge-lambda-function': {
    memory: 128,
    timeout: 3
  },
  'application-load-balancer': {},
  'custom-resource-instance': {},
  'custom-resource-definition': {},
  'event-bus': {},
  'http-api-gateway': {},
  'mongo-db-atlas-cluster': {},
  'relational-database': {},
  'state-machine': {},
  'user-auth-pool': {},
  'dynamo-db-table': {},
  'redis-cluster': {},
  'deployment-script': {},
  'upstash-redis': {},
  bucket: {},
  'hosting-bucket': {},
  'aws-cdk-construct': {},
  'sns-topic': {},
  'sqs-queue': {},
  'web-app-firewall': {},
  bastion: {
    instanceSize: 't3.micro'
  },
  'nextjs-web': {},
  'open-search-domain': {},
  'efs-filesystem': {},
  'network-load-balancer': {}
};

export const configurableGlobalDefaultCliArgs = {
  region: { description: 'AWS region', default: null, isSensitive: false },
  profile: { description: 'AWS profile', default: 'default', isSensitive: false },
  stage: { description: 'Stage', default: null, isSensitive: false },
  projectName: { description: 'Project name', default: null, isSensitive: false },
  awsAccount: { description: 'AWS Account name', default: null, isSensitive: false }
};

export const configurableGlobalDefaultOtherProps = {
  apiKey: { description: 'Stacktape API Key', default: null, isSensitive: true },
  executablePython: { description: 'Python executable', default: 'python', isSensitive: false },
  executableJavascript: { description: 'Node.js executable', default: 'node', isSensitive: false }
  // { name: 'logLevel', description: 'Default log level', default: 'info' },
  // { name: 'logType', description: 'Default log type', default: 'fancy' }
};

export const INITIAL_CF_TEMPLATE_FILE_NAME = 'initial-template.yml';
export const CF_TEMPLATE_FILE_NAME_WITHOUT_EXT = 'cf-template';
export const STP_TEMPLATE_FILE_NAME_WITHOUT_EXT = 'stp-template';
export const CF_TEMPLATE_FILE_NAME = `${CF_TEMPLATE_FILE_NAME_WITHOUT_EXT}.yml`;
export const STP_TEMPLATE_FILE_NAME = `${STP_TEMPLATE_FILE_NAME_WITHOUT_EXT}.yml`;
export const IDENTIFIER_FOR_MISSING_OUTPUT = '<<missing_output>>';

export const INVOKED_FROM_ENV_VAR_NAME = '_STP_INVOKED_FROM';

export const HELPER_LAMBDA_NAMES = [
  'batchJobTriggerLambda',
  'stacktapeServiceLambda',
  'cdnOriginRequestLambda',
  'cdnOriginResponseLambda'
] as const;

export const SUPPORTED_CF_INFRASTRUCTURE_MODULES: {
  [_infrastructureModuleType in StpCfInfrastructureModuleType]: CfInfrastructureModuleData;
} = {
  // WARNING: before editing anything in this section please read info about CfInfrastructureModuleData interface
  atlasMongo: {
    type: 'atlasMongo',
    privateTypesMajorVersionUsed: 'V1',
    privateTypesMinimalRequiredSubversion: '0000010',
    privateTypesSpecs: {
      'MongoDB::StpAtlasV1::Project': {
        packagePrefix: 'mongodb-stpatlasv1-project'
      },
      'MongoDB::StpAtlasV1::NetworkPeering': {
        packagePrefix: 'mongodb-stpatlasv1-networkpeering'
      },
      'MongoDB::StpAtlasV1::NetworkContainer': {
        packagePrefix: 'mongodb-stpatlasv1-networkcontainer'
      },
      'MongoDB::StpAtlasV1::ProjectIpAccessList': {
        packagePrefix: 'mongodb-stpatlasv1-projectipaccesslist'
      },
      'MongoDB::StpAtlasV1::EncryptionAtRest': {
        packagePrefix: 'mongodb-stpatlasv1-encryptionatrest'
      },
      'MongoDB::StpAtlasV1::DatabaseUser': {
        packagePrefix: 'mongodb-stpatlasv1-databaseuser'
      },
      'MongoDB::StpAtlasV1::Cluster': {
        packagePrefix: 'mongodb-stpatlasv1-cluster'
      }
    }
  },
  upstashRedis: {
    type: 'upstashRedis',
    privateTypesMajorVersionUsed: 'V1',
    privateTypesMinimalRequiredSubversion: '0000014',
    privateTypesSpecs: {
      'Upstash::DatabasesV1::Database': {
        packagePrefix: 'upstash-databasesv1-database'
      }
    }
  },
  ecsBlueGreen: {
    type: 'ecsBlueGreen',
    privateTypesMajorVersionUsed: 'V1',
    privateTypesMinimalRequiredSubversion: '0000008',
    privateTypesSpecs: {
      'Stacktape::ECSBlueGreenV1::Service': {
        packagePrefix: 'stacktape-ecsbluegreenv1-service'
      }
    }
  }
} as const;

export const PRINT_LOGS_INTERVAL = 500;

export const HELPER_LAMBDAS: HelperLambdaName[] = [
  'batchJobTriggerLambda',
  'cdnOriginRequestLambda',
  'cdnOriginResponseLambda',
  'stacktapeServiceLambda'
];

export const RECORDED_STACKTAPE_COMMANDS: StacktapeRecordedCommand[] = [
  'deploy',
  'codebuild:deploy',
  'delete',
  'deployment-script:run',
  'bucket:sync',
  'script:run',
  'rollback'
];
