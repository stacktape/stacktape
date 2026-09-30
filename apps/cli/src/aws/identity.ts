import type { GetCallerIdentityResponse } from '@aws-sdk/client-sts';
import type { createAwsLoggingPlugin } from './client-instrumentation';
import { cacheAwsIdentity, readCachedAwsIdentity } from './identity-cache';
import { startTiming } from '@utils/timings';
import { retryPlugin } from './client-middleware';
import type { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-browser';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { AssumeRoleCommand } from '@aws-sdk/client-sts';
import type { Credentials } from '@aws-sdk/types';
import { SignatureV4 } from '@smithy/signature-v4';
import { createRequest } from '@aws-sdk/util-create-request';
import { createFetchHandler } from 'src/aws/fetch-handler';
import type { AwsCredentials } from './credentials';
import type { TuiManager as Printer } from '@application-services/tui-manager';
import pRetry from 'p-retry';
import { wait } from '@utils/misc';

type SignedRequest = { headers: Record<string, string>; [key: string]: unknown };

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export class AwsSts {
  readonly #createClient: () => STSClient;
  readonly #getErrorHandler: ErrorHandlerFactory;
  readonly #printer?: Printer;

  constructor({
    createClient,
    getErrorHandler,
    printer
  }: {
    createClient: () => STSClient;
    getErrorHandler: ErrorHandlerFactory;
    printer?: Printer;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
    this.#printer = printer;
  }

  assumeRoleCredentials = async ({
    roleArn,
    roleSessionName,
    durationSeconds,
    retry
  }: {
    roleArn: string;
    roleSessionName: string;
    durationSeconds?: number;
    retry?: { count: number; delaySeconds: number };
  }): Promise<Credentials> => {
    const errorHandler = this.#getErrorHandler('Failed to get credentials for assumed role.');

    const executeAssumeRole = async (): Promise<Credentials> => {
      const result = await this.#createClient().send(
        new AssumeRoleCommand({
          RoleArn: roleArn,
          RoleSessionName: roleSessionName,
          ...(durationSeconds !== undefined ? { DurationSeconds: durationSeconds } : {})
        })
      );
      const { AccessKeyId, SecretAccessKey, Expiration, SessionToken } = result.Credentials || {};
      if (!AccessKeyId || !SecretAccessKey || !Expiration || !SessionToken) {
        throw new Error(`AssumeRole for ${roleArn} succeeded but returned an incomplete set of credentials.`);
      }
      return {
        accessKeyId: AccessKeyId,
        secretAccessKey: SecretAccessKey,
        expiration: Expiration,
        sessionToken: SessionToken
      };
    };

    if (retry) {
      return pRetry(executeAssumeRole, {
        retries: retry.count,
        onFailedAttempt: async (error) => {
          this.#printer?.debug(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
          await wait(retry.delaySeconds * 1000);
        }
      }).catch(errorHandler);
    }

    return executeAssumeRole().catch(errorHandler);
  };
}

export const getSignedGetCallerIdentityRequest = async ({
  credentials,
  region
}: {
  credentials: AwsCredentials;
  region: string;
}): Promise<SignedRequest> => {
  const rawRequest = await (createRequest as unknown as (client: any, command: any) => Promise<HttpRequest>)(
    new STSClient({ region, credentials, requestHandler: createFetchHandler() }),
    new GetCallerIdentityCommand({})
  );
  const signer = new SignatureV4({
    credentials,
    region,
    service: 'sts',
    sha256: Sha256
  });
  const signedRequest = (await signer.sign(rawRequest as HttpRequest)) as unknown as SignedRequest;
  return signedRequest;
};

export const getAwsCredentialsIdentity = async ({
  credentials,
  region,
  getErrorHandler,
  loggingPlugin
}: {
  credentials: Credentials;
  region: string;
  getErrorHandler: (message: string) => (error: Error) => never;
  loggingPlugin: ReturnType<typeof createAwsLoggingPlugin>;
}): Promise<GetCallerIdentityResponse> => {
  const endTiming = startTiming('aws:identity');
  const cached = credentials.accessKeyId ? await readCachedAwsIdentity(credentials.accessKeyId) : null;
  if (cached) {
    endTiming({ source: 'cache', account: cached.account });
    return { Account: cached.account, Arn: cached.arn, UserId: cached.userId };
  }
  const errHandler = getErrorHandler(
    `Unable to get identity for credentials (access key id: ${credentials.accessKeyId}).`
  );
  const tempStsCli = new STSClient({
    credentials,
    region,
    requestHandler: createFetchHandler()
  });
  tempStsCli.middlewareStack.use(loggingPlugin);
  tempStsCli.middlewareStack.use(retryPlugin);
  const identity = await tempStsCli.send(new GetCallerIdentityCommand({})).catch((error: Error) => {
    endTiming({ source: 'sts', outcome: 'error' });
    return errHandler(error);
  });
  endTiming({ source: 'sts', account: identity.Account });
  if (credentials.accessKeyId && identity.Account && identity.Arn && identity.UserId) {
    await cacheAwsIdentity(credentials.accessKeyId, {
      account: identity.Account,
      arn: identity.Arn,
      userId: identity.UserId
    });
  }
  return identity;
};
