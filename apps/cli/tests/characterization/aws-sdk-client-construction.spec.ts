import { afterEach, describe, expect, test } from 'bun:test';
import { EventEmitter } from 'node:events';
import { ACMClient } from '@aws-sdk/client-acm';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { IAMClient, NoSuchEntityException } from '@aws-sdk/client-iam';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { Route53DomainsClient } from '@aws-sdk/client-route-53-domains';
import { S3Client } from '@aws-sdk/client-s3';
import {
  DeleteParameterCommand,
  GetParameterCommand,
  GetParametersCommand,
  ParameterNotFound,
  ParameterType,
  PutParameterCommand,
  SSMClient
} from '@aws-sdk/client-ssm';
import type { Pluggable } from '@aws-sdk/types';
import type { TuiManager } from '@application-services/tui-manager';
import { AwsSdkManager } from '../../src/aws/sdk-manager';
import { S3Sync } from '../../src/aws/s3-sync';

type AwsClient = {
  config: {
    credentials: () => Promise<{ accessKeyId: string }>;
    endpoint?: () => Promise<{ hostname: string; protocol: string }>;
    region: () => Promise<string>;
    requestHandler: unknown;
  };
};

const credentials = {
  accessKeyId: 'synthetic-access-key',
  secretAccessKey: 'characterization-secret'
};

/**
 * These tests pin the handful of client-construction differences which are easy to lose when replacing the copied
 * manager. They intentionally reach clients only through public manager operations. Prototype interception is the
 * narrowest seam the current manager offers, so the suite is serial and restores every method it replaces.
 */
describe.serial('AWS SDK client construction', () => {
  const restores: (() => void)[] = [];

  const captureSend = <TClient extends AwsClient>(
    prototype: { send: (...args: never[]) => Promise<unknown> },
    response: unknown
  ) => {
    const originalSend = prototype.send;
    const capturedClients: TClient[] = [];
    prototype.send = async function (this: TClient) {
      capturedClients.push(this);
      return response;
    } as typeof originalSend;
    restores.push(() => {
      prototype.send = originalSend;
    });
    return () => {
      const capturedClient = capturedClients[0];
      if (!capturedClient) {
        throw new Error('Expected the manager operation to construct and use an AWS client.');
      }
      return capturedClient;
    };
  };

  const managerWith = (plugins: Pluggable<any, any>[] = []) => {
    const manager = new AwsSdkManager();
    manager.init({ credentials, region: 'eu-west-1', plugins });
    return manager;
  };

  afterEach(() => {
    for (const restore of restores.splice(0).reverse()) {
      restore();
    }
  });

  test.serial('uses the initialized region for ordinary clients', async () => {
    const captured = captureSend<CloudFormationClient>(CloudFormationClient.prototype, {
      StackSummaries: []
    });

    await managerWith().cloudFormation.list();

    expect(await captured().config.region()).toBe('eu-west-1');
  });

  test.serial('passes an explicit local endpoint to ordinary clients', async () => {
    const captured = captureSend<CloudFormationClient>(CloudFormationClient.prototype, {
      StackSummaries: []
    });
    const manager = new AwsSdkManager();
    manager.init({
      credentials,
      endpoint: 'http://127.0.0.1:4566',
      plugins: [],
      region: 'eu-west-1'
    });

    await manager.cloudFormation.list();

    const endpoint = captured().config.endpoint;
    if (!endpoint) {
      throw new Error('Expected the client to carry the explicitly configured endpoint.');
    }
    expect(await endpoint()).toMatchObject({
      hostname: '127.0.0.1',
      port: 4566,
      protocol: 'http:'
    });
  });

  test.serial('lets an already constructed client refresh expiring credentials', async () => {
    let currentCredentials = {
      ...credentials,
      expiration: new Date(Date.now() + 60_000)
    };
    const captured = captureSend<CloudFormationClient>(CloudFormationClient.prototype, {
      StackSummaries: []
    });
    const manager = new AwsSdkManager();
    manager.init({
      credentials: () => currentCredentials,
      plugins: [],
      region: 'eu-west-1'
    });

    await manager.cloudFormation.list();
    expect((await captured().config.credentials()).accessKeyId).toBe('synthetic-access-key');

    currentCredentials = {
      accessKeyId: 'refreshed-access-key',
      expiration: new Date(Date.now() + 60 * 60_000),
      secretAccessKey: 'refreshed-secret'
    };
    expect((await captured().config.credentials()).accessKeyId).toBe('refreshed-access-key');
  });

  test.serial('resets IAM absence logging while preserving explicit missing-role failures', async () => {
    const originalSend = IAMClient.prototype.send;
    IAMClient.prototype.send = async () => {
      throw new NoSuchEntityException({ $metadata: {}, message: 'Role does not exist.' });
    };
    restores.push(() => {
      IAMClient.prototype.send = originalSend;
    });
    const debugMessages: string[] = [];
    const printer = {
      debug: (message: string) => {
        debugMessages.push(message);
      }
    } as TuiManager;
    const manager = new AwsSdkManager();
    manager.init({ credentials, plugins: [], printer, region: 'eu-west-1' });

    await expect(manager.iam.getRole({ roleName: 'missing-role' })).resolves.toBeUndefined();
    await expect(
      manager.iam.getRole({ roleName: 'missing-role', throwErrorWhenRoleNotExists: true })
    ).rejects.toBeInstanceOf(NoSuchEntityException);
    expect(debugMessages).toEqual(['Role with name missing-role does NOT exist.']);

    manager.init({ credentials, plugins: [], region: 'eu-west-1' });
    await expect(manager.iam.getRole({ roleName: 'still-missing' })).resolves.toBeUndefined();
    expect(debugMessages).toHaveLength(1);
  });

  test.serial('uses the initialized ACM region unless the operation explicitly requires us-east-1', async () => {
    const acmClients: ACMClient[] = [];
    const originalSend = ACMClient.prototype.send;
    ACMClient.prototype.send = async function (this: ACMClient) {
      acmClients.push(this);
      return { CertificateSummaryList: [] };
    } as typeof originalSend;
    restores.push(() => {
      ACMClient.prototype.send = originalSend;
    });
    const capturedDomains = captureSend<Route53DomainsClient>(Route53DomainsClient.prototype, {
      Prices: []
    });
    const manager = managerWith();

    await manager.domains.listCertificates();
    await manager.domains.listCertificates(undefined, true);
    await manager.domains.listTopLevelDomainPrices();

    expect(await acmClients[0].config.region()).toBe('eu-west-1');
    expect(await acmClients[1].config.region()).toBe('us-east-1');
    expect(await capturedDomains().config.region()).toBe('us-east-1');
  });

  test.serial('uses the S3 acceleration endpoint only when requested', async () => {
    const clients: S3Client[] = [];
    const originalSend = S3Client.prototype.send;
    S3Client.prototype.send = async function (this: S3Client) {
      clients.push(this);
      return { ETag: '"characterization"' };
    } as typeof originalSend;
    restores.push(() => {
      S3Client.prototype.send = originalSend;
    });
    const manager = managerWith();

    await manager.s3.uploadFile({
      bucketName: 'example-bucket',
      filePath: import.meta.path,
      s3Key: 'ordinary-upload.ts'
    });
    await manager.s3.uploadFile({
      bucketName: 'example-bucket',
      filePath: import.meta.path,
      s3Key: 'accelerated-upload.ts',
      useS3Acceleration: true
    });

    expect(clients).toHaveLength(2);
    expect(clients[0].config.endpoint).toBeUndefined();
    const acceleratedEndpoint = clients[1].config.endpoint;
    if (!acceleratedEndpoint) {
      throw new Error('Expected the accelerated S3 client to carry an explicit endpoint.');
    }
    expect(await acceleratedEndpoint()).toMatchObject({
      hostname: 's3-accelerate.amazonaws.com',
      protocol: 'https:'
    });
  });

  test.serial('preserves S3 sync retry, plugin, and acceleration client policy', async () => {
    const syncClients: S3Sync[] = [];
    const originalUploadDir = S3Sync.prototype.uploadDir;
    S3Sync.prototype.uploadDir = function (this: S3Sync) {
      syncClients.push(this);
      const uploader = Object.assign(new EventEmitter(), {
        activeTransfers: 0,
        progressAmount: 1,
        progressTotal: 1,
        progressMd5Amount: 1,
        progressMd5Total: 1,
        objectsFound: 1,
        filesFound: 1,
        deleteAmount: 0,
        deleteTotal: 0
      });
      queueMicrotask(() => uploader.emit('end'));
      return uploader;
    } as typeof originalUploadDir;
    restores.push(() => {
      S3Sync.prototype.uploadDir = originalUploadDir;
    });
    let pluginApplications = 0;
    const plugin: Pluggable<any, any> = {
      applyToStack: () => {
        pluginApplications += 1;
      }
    };
    const manager = managerWith([plugin]);
    const baseInput = {
      bucketName: 'example-bucket',
      onProgress: () => undefined
    };

    await manager.s3.syncDirectory({
      ...baseInput,
      uploadConfiguration: { directoryPath: import.meta.dir, disableS3TransferAcceleration: true }
    });
    await manager.s3.syncDirectory({
      ...baseInput,
      uploadConfiguration: { directoryPath: import.meta.dir, disableS3TransferAcceleration: false }
    });

    expect(syncClients).toHaveLength(2);
    expect(syncClients.map(({ s3RetryCount }) => s3RetryCount)).toEqual([5, 5]);
    expect(pluginApplications).toBe(2);
    expect(syncClients[0].s3.config.endpoint).toBeUndefined();
    const acceleratedEndpoint = syncClients[1].s3.config.endpoint;
    if (!acceleratedEndpoint) {
      throw new Error('Expected accelerated S3 sync to carry an explicit endpoint.');
    }
    expect(await acceleratedEndpoint()).toMatchObject({
      hostname: 's3-accelerate.amazonaws.com',
      protocol: 'https:'
    });
  });

  test.serial('gives Lambda invocations the fifteen-minute request timeout', async () => {
    const captured = captureSend<LambdaClient>(LambdaClient.prototype, {});

    await managerWith().lambda.getFunction({ lambdaResourceName: 'example-function' });

    const requestHandler = captured().config.requestHandler;
    if (typeof requestHandler !== 'object' || requestHandler === null || !('configProvider' in requestHandler)) {
      throw new Error('Expected Lambda to use a request handler with observable timeout configuration.');
    }
    const handlerConfig = await requestHandler.configProvider;
    if (typeof handlerConfig !== 'object' || handlerConfig === null || !('requestTimeout' in handlerConfig)) {
      throw new Error('Expected the Lambda request handler to expose its request timeout.');
    }
    expect(handlerConfig.requestTimeout).toBe(900_000);
  });

  test.serial('applies explicit plugins to ordinary clients', async () => {
    const appliedStacks: unknown[] = [];
    const plugin: Pluggable<any, any> = {
      applyToStack(stack) {
        appliedStacks.push(stack);
      }
    };
    captureSend<CloudFormationClient>(CloudFormationClient.prototype, {
      StackSummaries: []
    });

    await managerWith([plugin]).cloudFormation.list();

    expect(appliedStacks).toHaveLength(1);
  });

  test.serial('applies manager plugins to default and override-region CloudFormation clients', async () => {
    const appliedStacks: unknown[] = [];
    const clients: CloudFormationClient[] = [];
    const plugin: Pluggable<any, any> = {
      applyToStack(stack) {
        appliedStacks.push(stack);
      }
    };
    const originalSend = CloudFormationClient.prototype.send;
    CloudFormationClient.prototype.send = async function (this: CloudFormationClient) {
      clients.push(this);
      return { Stacks: [{ StackName: 'example-stack' }] };
    } as typeof originalSend;
    restores.push(() => {
      CloudFormationClient.prototype.send = originalSend;
    });
    const manager = managerWith([plugin]);

    await manager.cloudFormation.getDetails('example-stack');
    await manager.cloudFormation.getDetails('example-stack', 'us-east-2');

    expect(await clients[0].config.region()).toBe('eu-west-1');
    expect(await clients[1].config.region()).toBe('us-east-2');
    expect(appliedStacks).toHaveLength(2);
    expect(appliedStacks[0]).toBe(clients[0].middlewareStack);
    expect(appliedStacks[1]).toBe(clients[1].middlewareStack);
  });

  test.serial('gets and decrypts a parameter in the explicitly requested region', async () => {
    const clients: SSMClient[] = [];
    const commands: GetParameterCommand[] = [];
    const originalSend = SSMClient.prototype.send;
    SSMClient.prototype.send = async function (this: SSMClient, command: GetParameterCommand) {
      clients.push(this);
      commands.push(command);
      return { Parameter: { Name: command.input.Name, Value: 'synthetic-value' } };
    } as typeof originalSend;
    restores.push(() => {
      SSMClient.prototype.send = originalSend;
    });

    const result = await managerWith().parameterStore.get({ name: '/example/key', region: 'us-east-2' });

    expect(result.Parameter?.Value).toBe('synthetic-value');
    expect(commands[0].input).toEqual({ Name: '/example/key', WithDecryption: true });
    expect(await clients[0].config.region()).toBe('us-east-2');
  });

  test.serial('reads Parameter Store values in AWS-sized batches', async () => {
    const batches: string[][] = [];
    const originalSend = SSMClient.prototype.send;
    SSMClient.prototype.send = async function (_command: GetParametersCommand) {
      const names = _command.input.Names || [];
      batches.push(names);
      return { Parameters: names.map((Name) => ({ Name, Value: `value:${Name}` })) };
    } as typeof originalSend;
    restores.push(() => {
      SSMClient.prototype.send = originalSend;
    });
    const names = Array.from({ length: 23 }, (_, index) => `/example/${index}`);

    const parameters = await managerWith().parameterStore.getMany({ names });

    expect(batches.map((batch) => batch.length)).toEqual([10, 10, 3]);
    expect(parameters.map(({ Name }) => Name)).toEqual(names);
  });

  test.serial('writes encrypted values and treats deleting an absent parameter as successful cleanup', async () => {
    const commands: (DeleteParameterCommand | PutParameterCommand)[] = [];
    const originalSend = SSMClient.prototype.send;
    SSMClient.prototype.send = async function (command: DeleteParameterCommand | PutParameterCommand) {
      commands.push(command);
      if (command instanceof DeleteParameterCommand) {
        throw new ParameterNotFound({ $metadata: {}, message: 'missing' });
      }
      return {};
    } as typeof originalSend;
    restores.push(() => {
      SSMClient.prototype.send = originalSend;
    });
    const manager = managerWith();

    await manager.parameterStore.put({ name: '/example/secret', value: 'synthetic-secret', encrypted: true });
    await expect(manager.parameterStore.delete({ name: '/example/missing' })).resolves.toBeUndefined();

    expect(commands[0].input).toEqual({
      Name: '/example/secret',
      Overwrite: true,
      Type: ParameterType.SECURE_STRING,
      Value: 'synthetic-secret'
    });
    expect(commands[1].input).toEqual({ Name: '/example/missing' });
  });
});
