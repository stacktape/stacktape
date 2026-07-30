import {
  CloudFormationClient,
  CreateStackCommand,
  DeleteStackCommand,
  DescribeStacksCommand,
  ListStackResourcesCommand,
  UpdateStackCommand
} from '@aws-sdk/client-cloudformation';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import {
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient
} from '@aws-sdk/client-sqs';
import resourceManifest from './resource-manifest.json';

const image = 'docker.io/floci/floci:1.5.34@sha256:b3b3a70a294b8ba8095385b8571ea1e4d44d494950d98de5e812cd9de02f506b';
const nameSuffix = `${process.pid}-${Date.now()}`;
const containerName = `stacktape-floci-spike-${nameSuffix}`;
const volumeName = `stacktape-floci-spike-${nameSuffix}`;
const stackName = `stacktape-floci-spike-${nameSuffix}`;
const region = 'us-east-1';
const credentials = {
  accessKeyId: 'stacktape-floci-only',
  secretAccessKey: 'stacktape-floci-only'
};

type Template = {
  AWSTemplateFormatVersion: string;
  Resources: Record<string, { Type: string; Properties: Record<string, unknown> }>;
  Outputs: Record<string, { Value: unknown }>;
};

const template = (visibilityTimeout: number): Template => ({
  AWSTemplateFormatVersion: '2010-09-09',
  Resources: {
    ArtifactBucket: {
      Type: 'AWS::S3::Bucket',
      Properties: {
        Tags: [{ Key: 'test', Value: 'floci-feasibility' }]
      }
    },
    WorkQueue: {
      Type: 'AWS::SQS::Queue',
      Properties: {
        VisibilityTimeout: visibilityTimeout
      }
    }
  },
  Outputs: {
    BucketName: { Value: { Ref: 'ArtifactBucket' } },
    QueueUrl: { Value: { Ref: 'WorkQueue' } }
  }
});

const runDocker = (
  args: string[],
  { allowFailure = false, timeoutMs = 30_000 }: { allowFailure?: boolean; timeoutMs?: number } = {}
) => {
  const result = Bun.spawnSync(['docker', ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: timeoutMs
  });
  const stdout = result.stdout.toString().trim();
  const stderr = result.stderr.toString().trim();

  if (result.exitCode !== 0 && !allowFailure) {
    throw new Error(`docker ${args[0]} failed (${result.exitCode}): ${stderr || stdout}`);
  }
  return { exitCode: result.exitCode, stdout, stderr };
};

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const waitFor = async (description: string, operation: () => Promise<boolean>, timeoutMs = 30_000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      if (await operation()) return;
    } catch (error) {
      lastError = error;
    }
    await Bun.sleep(250);
  }

  throw new Error(`Timed out waiting for ${description}`, { cause: lastError });
};

const startFloci = async () => {
  runDocker([
    'run',
    '--detach',
    '--name',
    containerName,
    '--publish',
    '127.0.0.1::4566',
    '--env',
    'FLOCI_STORAGE_MODE=persistent',
    '--env',
    'FLOCI_STORAGE_PERSISTENT_PATH=/app/data',
    '--volume',
    `${volumeName}:/app/data`,
    image
  ]);

  const portOutput = runDocker(['port', containerName, '4566/tcp']).stdout;
  const portMatch = portOutput.match(/127\.0\.0\.1:(\d+)/);
  assert(portMatch, `Could not parse Floci port from: ${portOutput}`);
  const endpoint = `http://127.0.0.1:${portMatch[1]}`;

  await waitFor('Floci health', async () => {
    const response = await fetch(`${endpoint}/_floci/health`);
    return response.ok;
  });

  return endpoint;
};

const stopFloci = () => {
  runDocker(['rm', '--force', containerName], { allowFailure: true });
};

const makeClients = (endpoint: string) => ({
  cloudFormation: new CloudFormationClient({ endpoint, region, credentials }),
  s3: new S3Client({ endpoint, region, credentials, forcePathStyle: true }),
  sqs: new SQSClient({ endpoint, region, credentials })
});

type AwsError = Error & {
  $metadata?: { httpStatusCode?: number };
};

const isStackNotFoundError = (error: unknown) =>
  error instanceof Error &&
  error.name === 'ValidationError' &&
  /^Stack (?:with id )?.+ does not exist$/i.test(error.message);

const isNoUpdatesError = (error: unknown) =>
  error instanceof Error &&
  error.name === 'ValidationError' &&
  /^(?:No updates are to be performed|The submitted information didn't contain changes)\.?$/i.test(error.message);

const isMissingBucketError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const awsError = error as AwsError;
  return awsError.$metadata?.httpStatusCode === 404 && ['NotFound', 'NoSuchBucket'].includes(error.name);
};

const isMissingQueueError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const awsError = error as AwsError;
  return (
    awsError.$metadata?.httpStatusCode === 400 &&
    ['QueueDoesNotExist', 'AWS.SimpleQueueService.NonExistentQueue'].includes(error.name)
  );
};

const stackStatus = async (client: CloudFormationClient) => {
  try {
    const response = await client.send(new DescribeStacksCommand({ StackName: stackName }));
    return response.Stacks?.[0]?.StackStatus;
  } catch (error) {
    if (isStackNotFoundError(error)) return undefined;
    throw error;
  }
};

const waitForStackStatus = async (client: CloudFormationClient, expectedStatus: string) => {
  await waitFor(`stack status ${expectedStatus}`, async () => {
    const status = await stackStatus(client);
    if (status?.endsWith('_FAILED') || status?.includes('ROLLBACK')) {
      throw new Error(`Stack entered failure status ${status}`);
    }
    return status === expectedStatus;
  });
};

const getOutputs = async (client: CloudFormationClient) => {
  const response = await client.send(new DescribeStacksCommand({ StackName: stackName }));
  return Object.fromEntries(
    (response.Stacks?.[0]?.Outputs ?? []).map(({ OutputKey, OutputValue }) => [OutputKey, OutputValue])
  );
};

const assertNoStubResources = async (client: CloudFormationClient) => {
  const response = await client.send(new ListStackResourcesCommand({ StackName: stackName }));
  const resources = response.StackResourceSummaries ?? [];
  assert(resources.length === 2, `Expected two stack resources, received ${resources.length}`);

  for (const resource of resources) {
    const physicalId = resource.PhysicalResourceId;
    assert(physicalId && !physicalId.includes('arn:aws:stub'), `Resource ${resource.LogicalResourceId} has a stub ID`);
  }
};

const assertManifestCoversTemplate = () => {
  const classifiedTypes = new Set(Object.keys(resourceManifest.resourceTypes));
  const templateTypes = new Set(Object.values(template(30).Resources).map(({ Type }) => Type));
  const unclassifiedTypes = [...templateTypes].filter((type) => !classifiedTypes.has(type));
  assert(unclassifiedTypes.length === 0, `Unclassified CloudFormation types: ${unclassifiedTypes.join(', ')}`);
};

type CapabilityResult = 'pass' | 'known-failure';

const assertManifestMatchesResults = (results: Map<string, CapabilityResult>) => {
  const expectedResults = new Map(
    resourceManifest.capabilities.map(({ id, expectedResult }) => [id, expectedResult as CapabilityResult])
  );
  assert(
    results.size === expectedResults.size,
    `Capability inventory has ${expectedResults.size} entries, but the probe recorded ${results.size}`
  );
  for (const [id, expectedResult] of expectedResults) {
    const actualResult = results.get(id);
    assert(actualResult, `Probe did not record the inventoried capability ${id}`);
    assert(
      actualResult === expectedResult,
      `${id} changed from ${expectedResult} to ${actualResult}; update the inventory`
    );
  }
};

const bodyToString = async (body: unknown) => {
  const stream = body as { transformToString?: () => Promise<string> } | undefined;
  assert(stream?.transformToString, 'S3 GetObject did not return a readable body');
  return stream.transformToString();
};

const exerciseDataPlane = async (
  clients: ReturnType<typeof makeClients>,
  bucketName: string,
  queueUrl: string,
  objectBody: string,
  queueBody: string
) => {
  await clients.s3.send(new PutObjectCommand({ Bucket: bucketName, Key: 'probe.txt', Body: objectBody }));
  const object = await clients.s3.send(new GetObjectCommand({ Bucket: bucketName, Key: 'probe.txt' }));
  assert((await bodyToString(object.Body)) === objectBody, 'S3 round trip returned different content');

  await clients.sqs.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: queueBody }));
  let receivedMessage: { Body?: string; ReceiptHandle?: string } | undefined;
  await waitFor('SQS message delivery', async () => {
    const response = await clients.sqs.send(
      new ReceiveMessageCommand({ QueueUrl: queueUrl, MaxNumberOfMessages: 1, WaitTimeSeconds: 1 })
    );
    receivedMessage = response.Messages?.[0];
    return Boolean(receivedMessage);
  });

  const message = receivedMessage;
  assert(message.Body === queueBody, 'SQS round trip returned different content');
  assert(message.ReceiptHandle, 'SQS response did not include a receipt handle');
  await clients.sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle }));
};

const main = async () => {
  assertManifestCoversTemplate();
  runDocker(['version']);
  runDocker(['pull', image]);

  let cleanupCloudFormationClient: CloudFormationClient | undefined;
  let stackCreated = false;
  const limitations: string[] = [];
  const capabilityResults = new Map<string, CapabilityResult>();

  try {
    let endpoint = await startFloci();
    let clients = makeClients(endpoint);
    cleanupCloudFormationClient = clients.cloudFormation;

    await clients.cloudFormation.send(
      new CreateStackCommand({ StackName: stackName, TemplateBody: JSON.stringify(template(30)) })
    );
    stackCreated = true;
    await waitForStackStatus(clients.cloudFormation, 'CREATE_COMPLETE');
    await assertNoStubResources(clients.cloudFormation);
    capabilityResults.set('cloudformation-create', 'pass');

    const outputs = await getOutputs(clients.cloudFormation);
    const bucketName = outputs.BucketName;
    const queueUrl = outputs.QueueUrl;
    assert(bucketName, 'CloudFormation did not output the bucket name');
    assert(queueUrl, 'CloudFormation did not output the queue URL');
    await exerciseDataPlane(clients, bucketName, queueUrl, 'before-restart', 'before-update');
    capabilityResults.set('s3-data-plane', 'pass');
    capabilityResults.set('sqs-data-plane', 'pass');

    let noOpRejected = false;
    try {
      await clients.cloudFormation.send(
        new UpdateStackCommand({ StackName: stackName, TemplateBody: JSON.stringify(template(30)) })
      );
    } catch (error) {
      if (!isNoUpdatesError(error)) throw error;
      noOpRejected = true;
    }
    if (!noOpRejected) {
      limitations.push('Floci accepted an identical UpdateStack instead of reporting a no-op');
      await waitForStackStatus(clients.cloudFormation, 'UPDATE_COMPLETE');
      capabilityResults.set('cloudformation-identical-update', 'known-failure');
    } else {
      capabilityResults.set('cloudformation-identical-update', 'pass');
    }

    await clients.cloudFormation.send(
      new UpdateStackCommand({ StackName: stackName, TemplateBody: JSON.stringify(template(45)) })
    );
    await waitForStackStatus(clients.cloudFormation, 'UPDATE_COMPLETE');
    const updatedAttributes = await clients.sqs.send(
      new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ['VisibilityTimeout'] })
    );
    if (updatedAttributes.Attributes?.VisibilityTimeout !== '45') {
      limitations.push(
        `Floci reported UPDATE_COMPLETE but SQS VisibilityTimeout remained ${updatedAttributes.Attributes?.VisibilityTimeout ?? '<missing>'}`
      );
      capabilityResults.set('cloudformation-property-update', 'known-failure');
    } else {
      capabilityResults.set('cloudformation-property-update', 'pass');
    }

    stopFloci();
    endpoint = await startFloci();
    clients = makeClients(endpoint);
    cleanupCloudFormationClient = clients.cloudFormation;
    await waitForStackStatus(clients.cloudFormation, 'UPDATE_COMPLETE');
    const persistedObject = await clients.s3.send(new GetObjectCommand({ Bucket: bucketName, Key: 'probe.txt' }));
    assert(
      (await bodyToString(persistedObject.Body)) === 'before-restart',
      'S3 object did not survive emulator restart'
    );
    await exerciseDataPlane(clients, bucketName, queueUrl, 'after-restart', 'after-restart');
    capabilityResults.set('persistent-restart', 'pass');
    await clients.s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: 'probe.txt' }));

    await clients.cloudFormation.send(new DeleteStackCommand({ StackName: stackName }));
    await waitFor('stack deletion', async () => (await stackStatus(clients.cloudFormation)) === undefined);
    stackCreated = false;
    capabilityResults.set('cloudformation-delete-stack-record', 'pass');
    let bucketStillExists = true;
    try {
      await clients.s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    } catch (error) {
      if (!isMissingBucketError(error)) throw error;
      bucketStillExists = false;
    }
    if (bucketStillExists) limitations.push('CloudFormation delete removed the stack record but left the S3 bucket');

    let queueStillExists = true;
    try {
      await clients.sqs.send(new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ['QueueArn'] }));
    } catch (error) {
      if (!isMissingQueueError(error)) throw error;
      queueStillExists = false;
    }
    if (queueStillExists) limitations.push('CloudFormation delete removed the stack record but left the SQS queue');
    capabilityResults.set(
      'cloudformation-delete-resources',
      bucketStillExists || queueStillExists ? 'known-failure' : 'pass'
    );
    assertManifestMatchesResults(capabilityResults);

    console.log(
      JSON.stringify(
        {
          image,
          result: limitations.length === 0 ? 'pass' : 'not-ready',
          demonstrated: [
            'CloudFormation create',
            'non-stub physical resources',
            'S3 put/get',
            'SQS send/receive/delete',
            'persistent restart and state rediscovery',
            'CloudFormation stack-record delete'
          ],
          limitations
        },
        null,
        2
      )
    );
    if (limitations.length > 0) process.exitCode = 2;
  } finally {
    try {
      if (stackCreated && cleanupCloudFormationClient) {
        await Promise.race([
          cleanupCloudFormationClient.send(new DeleteStackCommand({ StackName: stackName })).catch(() => undefined),
          Bun.sleep(2_000)
        ]);
      }
    } finally {
      try {
        stopFloci();
      } finally {
        runDocker(['volume', 'rm', '--force', volumeName], { allowFailure: true, timeoutMs: 10_000 });
      }
    }
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
