import {
  Alarm,
  Bucket,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  LambdaErrorRateTrigger,
  LambdaS3FilesMount,
  LocalScript,
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
void [alarmThreshold, config, integrationType, invalidIntegration, invalidMount, invalidPackaging, triggerType];
