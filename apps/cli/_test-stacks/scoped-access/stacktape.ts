/**
 * Disposable real-AWS fixture for `scripts/real-aws/scoped-access-canary.ts`: one Node.js function behind an HTTP API
 * that probes two DynamoDB tables, two buckets and a queue, and reads a secret through `$Secret()`.
 *
 * Variant `a` connects the function to `tableA`, `bucketA` and `queueA`; variant `b` connects it to `tableB` and
 * `bucketB` only and adds the `/extra` route. Every target's name reaches the function through `$ResourceParam()`, so
 * the probe can try the resources it is not connected to and show that IAM denies them.
 *
 * The canary sets the environment variables below; the defaults only keep the file loadable on its own.
 */
import {
  $ResourceParam,
  $Secret,
  Bucket,
  defineConfig,
  DynamoDbTable,
  HttpApiGateway,
  JsBundleLambdaPackaging,
  LambdaFunction,
  SqsQueue
} from '@stacktape/config-authoring';

export default defineConfig(() => {
  const canaryOwner = process.env.STP_AWS_SCOPED_CANARY_OWNER ?? 'local';
  const variant = process.env.STP_AWS_SCOPED_CANARY_VARIANT === 'b' ? 'b' : 'a';
  const secretName = process.env.STP_AWS_SCOPED_CANARY_SECRET_NAME ?? 'scoped-access-canary-local';

  const table = () => new DynamoDbTable({ primaryKey: { partitionKey: { name: 'id', type: 'string' } } });
  const tableA = table();
  const tableB = table();
  const bucketA = new Bucket({});
  const bucketB = new Bucket({});
  const queueA = new SqsQueue({});
  const api = new HttpApiGateway({});

  const route = (path: string) => ({
    type: 'http-api-gateway' as const,
    properties: { httpApiGatewayName: 'api', method: 'GET' as const, path }
  });
  const probe = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/probe.ts' }),
    environment: {
      CANARY_VARIANT: variant,
      TABLE_A: $ResourceParam('tableA', 'name'),
      TABLE_B: $ResourceParam('tableB', 'name'),
      BUCKET_A: $ResourceParam('bucketA', 'name'),
      BUCKET_B: $ResourceParam('bucketB', 'name'),
      QUEUE_A_URL: $ResourceParam('queueA', 'url'),
      CANARY_SECRET: $Secret(`${secretName}.token`)
    },
    connectTo: variant === 'a' ? [tableA, bucketA, queueA] : [tableB, bucketB],
    events: variant === 'a' ? [route('/probe')] : [route('/probe'), route('/extra')],
    memory: 256,
    timeout: 20
  });

  return {
    resources: { tableA, tableB, bucketA, bucketB, queueA, api, probe },
    stackConfig: { tags: [{ name: 'stacktape-canary-owner', value: canaryOwner }] }
  };
});
