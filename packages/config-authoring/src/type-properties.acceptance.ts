import {
  Alarm,
  Bucket,
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
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from './index.js';

const database = new RelationalDatabase({
  credentials: { masterUserPassword: 'secret' },
  engine: new RdsEnginePostgres({
    version: '16.6',
    primaryInstance: { instanceSize: 'db.t4g.micro' }
  })
});
const api = new HttpApiGateway({});
const packaging = new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/handler.ts' });
const integration = new HttpApiIntegration({ httpApiGatewayName: api, method: 'GET', path: '/' });
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
const worker = new LambdaFunction({ packaging, events: [integration], volumeMounts: [mount], alarms: [highErrorRate] });
const uploads = new Bucket({});
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
  connectTo: [database, uploads],
  environment: { RETRIES: 3 }
});

const integrationType: 'http-api-gateway' = integration.type;
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

const config = defineConfig(() => ({ resources: { api, database, uploads, worker }, scripts: { seed } }));
void [
  alarmThreshold,
  config,
  integrationType,
  invalidIntegration,
  invalidMount,
  invalidPackaging,
  networkIntegration,
  triggerType,
  wrongIntegrationTarget,
  wrongLoadBalancerTarget
];
