import { Bucket, defineConfig, LambdaFunction, RelationalDatabase } from './index.js';

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

const databaseConnectionString: string = database.connectionString;
const functionArn: string = worker.arn;

// @ts-expect-error unknown resource properties must not pass through an `any` constructor
const invalidBucket = new Bucket({ propertyThatDoesNotExist: true });
const invalidLambda = new LambdaFunction({
  // @ts-expect-error packaging remains a discriminated union from @stacktape/config
  packaging: { type: 'not-a-packaging-type', properties: {} }
});

const config = defineConfig(() => ({ resources: { database, worker, uploads } }));
void [config, databaseConnectionString, functionArn, invalidBucket, invalidLambda];
