import {
  Alarm,
  Bucket,
  DsqlDatabase,
  DeploymentScript,
  KafkaCluster,
  EmailSender,
  EfsFilesystem,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  LambdaErrorRateTrigger,
  LambdaS3FilesMount,
  LocalScript,
  MultiContainerWorkloadNetworkLoadBalancerIntegration,
  NetworkLoadBalancer,
  RdsEnginePostgres,
  RelationalDatabase,
  SqsQueueNotEmptyTrigger,
  StateMachine,
  StacktapeLambdaBuildpackPackaging,
  WebSocketApiGateway,
  WebSocketApiIntegration,
  defineConfig
} from './index.js';

const database = new RelationalDatabase({
  credentials: { masterUserPassword: 'secret' },
  engine: new RdsEnginePostgres({
    version: '16.6',
    primaryInstance: { instanceSize: 'db.t4g.micro' }
  })
});
const dsqlDatabase = new DsqlDatabase({});
const kafkaCluster = new KafkaCluster({});
const kafkaClusterWithUnsupportedOverride = new KafkaCluster({
  // @ts-expect-error Kafka networking, authentication, and naming invariants cannot be overridden in v1
  overrides: { cluster: { ClusterName: 'detached' } }
});
void kafkaClusterWithUnsupportedOverride;
const emailSender = new EmailSender({ identity: 'example.com' });
const filesystem = new EfsFilesystem({});
const api = new HttpApiGateway({});
const packaging = new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/handler.ts' });
const topicSetup = new DeploymentScript({
  trigger: 'after:deploy',
  packaging,
  joinDefaultVpc: true,
  connectTo: [kafkaCluster]
});
const integration = new HttpApiIntegration({ httpApiGatewayName: api, method: 'GET', path: '/' });
const realtime = new WebSocketApiGateway({});
const websocketIntegration = new WebSocketApiIntegration({
  websocketApiGatewayName: realtime,
  routeKey: '$connect',
  authorizer: { type: 'aws-iam' }
});
const mount = new LambdaS3FilesMount({
  accessPointArn: 'arn:aws:s3files:us-east-1:111111111111:fs/fs-abc/ap-abc',
  mountPath: '/mnt/data'
});
const highErrorRate = new Alarm({
  trigger: new LambdaErrorRateTrigger({ thresholdPercent: 5 }),
  evaluation: { period: 60, evaluationPeriods: 3, breachedPeriods: 2 },
  includeInHistory: false,
  description: 'Handler error rate is too high'
});
const worker = new LambdaFunction({
  packaging,
  events: [integration],
  volumeMounts: [mount],
  alarms: [highErrorRate],
  connectTo: [filesystem]
});
const uploads = new Bucket({});
const workerUsingNamedReference = new LambdaFunction({ packaging, connectTo: ['uploads'] });
const workerWithInvalidConnection = new LambdaFunction({
  packaging,
  connectTo: [
    // @ts-expect-error Lambda functions cannot connect to an HTTP API Gateway
    api
  ]
});
const workflow = new StateMachine({
  definition: { StartAt: 'Done', States: { Done: { Type: 'Succeed' } } },
  connectTo: [worker]
});
const workflowWithInvalidConnection = new StateMachine({
  definition: { StartAt: 'Done', States: { Done: { Type: 'Succeed' } } },
  connectTo: [
    // @ts-expect-error state machines can connect only to Lambda functions and batch jobs
    uploads
  ]
});
const networkLoadBalancer = new NetworkLoadBalancer({ listeners: [{ port: 5432, protocol: 'TCP' }] });
const networkIntegration = new MultiContainerWorkloadNetworkLoadBalancerIntegration({
  loadBalancerName: networkLoadBalancer,
  listenerPort: 5432,
  containerPort: 5432
});
const wrongLoadBalancerTarget = new MultiContainerWorkloadNetworkLoadBalancerIntegration({
  // @ts-expect-error unrelated resource objects are rejected for either load-balancer integration
  loadBalancerName: uploads,
  listenerPort: 5432,
  containerPort: 5432
});
const seed = new LocalScript({
  executeCommand: 'bun run seed.ts',
  connectTo: [database, dsqlDatabase, emailSender, uploads],
  environment: { RETRIES: 3 }
});

const integrationType: 'http-api-gateway' = integration.type;
const websocketIntegrationType: 'websocket-api-gateway' = websocketIntegration.type;
const triggerType: 'sqs-queue-not-empty' = new SqsQueueNotEmptyTrigger().type;
const alarmThreshold: number = highErrorRate.trigger.properties.thresholdPercent;

// @ts-expect-error alarm triggers retain their specific properties instead of exposing `any`
void highErrorRate.trigger.properties.propertyThatDoesNotExist;

const invalidIntegration = new HttpApiIntegration({
  httpApiGatewayName: api,
  // @ts-expect-error methods are checked by the workspace source, not only generated npm declarations
  method: 'TRACE',
  path: '/'
});

const wrongIntegrationTarget = new HttpApiIntegration({
  // @ts-expect-error a bucket cannot be used where an HTTP API Gateway resource is required
  httpApiGatewayName: uploads,
  method: 'GET',
  path: '/wrong-target'
});

const invalidPackaging = new StacktapeLambdaBuildpackPackaging({
  entryfilePath: './src/handler.ts',
  // @ts-expect-error packaging constructors reject unknown properties
  unknownOption: true
});

const invalidMount = new LambdaS3FilesMount({
  // @ts-expect-error volume-mount constructors take the inner properties, not a nested type/properties structure
  type: 's3files',
  properties: { accessPointArn: 'arn', mountPath: '/mnt/data' }
});

const config = defineConfig(() => ({
  resources: { api, database, dsqlDatabase, filesystem, uploads, worker },
  scripts: { seed }
}));
void [
  alarmThreshold,
  config,
  integrationType,
  kafkaCluster,
  invalidIntegration,
  invalidMount,
  invalidPackaging,
  networkIntegration,
  triggerType,
  topicSetup,
  workerUsingNamedReference,
  workerWithInvalidConnection,
  workflow,
  workflowWithInvalidConnection,
  websocketIntegration,
  websocketIntegrationType,
  wrongIntegrationTarget,
  wrongLoadBalancerTarget
];
