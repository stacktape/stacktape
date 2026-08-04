import {
  AgentCoreBrowser,
  AgentCoreGateway,
  Bucket,
  CustomResourceDefinition,
  CustomResourceInstance,
  defineConfig,
  EdgeLambdaFunction,
  HostingBucket,
  HttpApiGateway,
  LambdaFunction,
  RelationalDatabase,
  WebAppFirewall
} from './index.js';

const database = new RelationalDatabase({
  credentials: { masterUserName: 'app', masterUserPassword: 'secret' },
  engine: { type: 'postgres', properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t4g.micro' } } }
});
const worker = new LambdaFunction({
  packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: './src/worker.ts' } },
  connectTo: [database],
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

const invalidBrowser = new AgentCoreBrowser({
  // @ts-expect-error AgentCore recording takes a physical S3 bucket name, not a Stacktape bucket resource
  recording: { bucketName: uploads }
});

// @ts-expect-error resource identity comes from the key in defineConfig's resources object
void api.resourceName;

const databaseConnectionString: string = database.connectionString;
const functionArn: string = worker.arn;

// @ts-expect-error unknown resource properties must not pass through an `any` constructor
const invalidBucket = new Bucket({ propertyThatDoesNotExist: true });
const invalidLambda = new LambdaFunction({
  // @ts-expect-error packaging remains a discriminated union from @stacktape/config
  packaging: { type: 'not-a-packaging-type', properties: {} }
});

const config = defineConfig(() => ({
  resources: {
    api,
    apiHandler,
    browser,
    database,
    edgeFunction,
    firewall,
    gateway,
    provisionedThing,
    provisioner,
    uploads,
    website,
    worker
  }
}));
void [config, databaseConnectionString, functionArn, invalidBrowser, invalidBucket, invalidLambda];
