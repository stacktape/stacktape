import { afterEach, describe, expect, test } from 'bun:test';
import { ACMClient } from '@aws-sdk/client-acm';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { Route53DomainsClient } from '@aws-sdk/client-route-53-domains';
import { S3Client } from '@aws-sdk/client-s3';
import type { Pluggable } from '@aws-sdk/types';
import { AwsSdkManager } from '../../src/aws/sdk-manager';

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

    await managerWith().listStacks();

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

    await manager.listStacks();

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

    await manager.listStacks();
    expect((await captured().config.credentials()).accessKeyId).toBe('synthetic-access-key');

    currentCredentials = {
      accessKeyId: 'refreshed-access-key',
      expiration: new Date(Date.now() + 60 * 60_000),
      secretAccessKey: 'refreshed-secret'
    };
    expect((await captured().config.credentials()).accessKeyId).toBe('refreshed-access-key');
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

    await manager.listCertificatesForAccount();
    await manager.listCertificatesForAccount(undefined, true);
    await manager.listTopLevelDomainPrices();

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

    await manager.uploadToBucket({
      bucketName: 'example-bucket',
      filePath: import.meta.path,
      s3Key: 'ordinary-upload.ts'
    });
    await manager.uploadToBucket({
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

  test.serial('gives Lambda invocations the fifteen-minute request timeout', async () => {
    const captured = captureSend<LambdaClient>(LambdaClient.prototype, {});

    await managerWith().getLambda({ lambdaResourceName: 'example-function' });

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

    await managerWith([plugin]).listStacks();

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

    await manager.getStackDetails('example-stack');
    await manager.getStackDetails('example-stack', 'us-east-2');

    expect(await clients[0].config.region()).toBe('eu-west-1');
    expect(await clients[1].config.region()).toBe('us-east-2');
    expect(appliedStacks).toHaveLength(2);
    expect(appliedStacks[0]).toBe(clients[0].middlewareStack);
    expect(appliedStacks[1]).toBe(clients[1].middlewareStack);
  });
});
