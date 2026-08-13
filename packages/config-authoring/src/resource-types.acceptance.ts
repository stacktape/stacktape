import {
  AgentCoreBrowser,
  AgentCoreCodeInterpreter,
  AgentCoreGateway,
  AgentCoreMemory,
  AgentCoreRuntime,
  Bucket,
  CustomResourceDefinition,
  CustomResourceInstance,
  defineConfig,
  DsqlDatabase,
  KafkaCluster,
  EmailSender,
  EdgeLambdaFunction,
  HostingBucket,
  HttpApiGateway,
  LambdaFunction,
  RelationalDatabase,
  WebSocketApiGateway,
  WebSocketApiIntegration,
  WebAppFirewall
} from './index.js';

const database = new RelationalDatabase({
  credentials: { masterUserName: 'app', masterUserPassword: 'secret' },
  engine: { type: 'postgres', properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t4g.micro' } } }
});
const dsqlDatabase = new DsqlDatabase({});
const kafkaCluster = new KafkaCluster({});
const emailSender = new EmailSender({ identity: 'example.com' });
const worker = new LambdaFunction({
  packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/worker.ts' } },
  connectTo: [database, dsqlDatabase, emailSender],
  environment: { DATABASE_URL: database.connectionString, RETRIES: 3 }
});
const uploads = new Bucket({ versioning: true });
const edgeFunction = new EdgeLambdaFunction({
  packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/edge.ts' } }
});
const api = new HttpApiGateway({ cdn: { enabled: true, edgeFunctions: { onRequest: edgeFunction } } });
const apiHandler = new LambdaFunction({
  packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/api.ts' } },
  events: [{ type: 'http-api-gateway', properties: { httpApiGatewayName: api, method: 'GET', path: '/' } }]
});
const realtime = new WebSocketApiGateway({});
const realtimeHandler = new LambdaFunction({
  packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/realtime.ts' } },
  events: [new WebSocketApiIntegration({ websocketApiGatewayName: realtime, routeKey: '$default' })]
});
const firewall = new WebAppFirewall({ scope: 'cdn' });
const website = new HostingBucket({ uploadDirectoryPath: './dist', useFirewall: firewall });
const provisioner = new CustomResourceDefinition({
  packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/provisioner.ts' } }
});
const provisionedThing = new CustomResourceInstance({ definitionName: provisioner, resourceProperties: {} });
const gateway = new AgentCoreGateway({
  tools: [{ name: 'lookup', description: 'Lookup', function: worker, toolSchema: [] }]
});
const browser = new AgentCoreBrowser({ recording: { bucketName: 'literal-aws-bucket' } });
const memory = new AgentCoreMemory({});
const codeInterpreter = new AgentCoreCodeInterpreter({});
const runtime = new AgentCoreRuntime({
  packaging: { type: 'prebuilt-image', properties: { image: 'example.invalid/agent:latest' } },
  endpoints: ['default']
});
const agentConsumer = new LambdaFunction({
  packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/agent-consumer.ts' } },
  connectTo: [runtime, memory, gateway, browser, codeInterpreter]
});

const invalidBrowser = new AgentCoreBrowser({
  // @ts-expect-error AgentCore recording takes a physical S3 bucket name, not a Stacktape bucket resource
  recording: { bucketName: uploads }
});

// @ts-expect-error resource identity comes from the key in defineConfig's resources object
void api.resourceName;

const databaseConnectionString: string = database.connectionString;
const dsqlEndpoint: string = dsqlDatabase.endpoint;
const functionArn: string = worker.arn;

// @ts-expect-error unknown resource properties must not pass through an `any` constructor
const invalidBucket = new Bucket({ propertyThatDoesNotExist: true });
const invalidLambda = new LambdaFunction({
  // @ts-expect-error packaging remains a discriminated union from @stacktape/config
  packaging: { type: 'not-a-packaging-type', properties: {} }
});

const config = defineConfig(() => ({
  resources: {
    kafkaCluster,
    agentConsumer,
    api,
    apiHandler,
    browser,
    database,
    dsqlDatabase,
    edgeFunction,
    firewall,
    gateway,
    memory,
    provisionedThing,
    provisioner,
    realtime,
    realtimeHandler,
    runtime,
    codeInterpreter,
    uploads,
    website,
    worker
  }
}));
void [config, databaseConnectionString, dsqlEndpoint, functionArn, invalidBrowser, invalidBucket, invalidLambda];
