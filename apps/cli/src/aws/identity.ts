import type { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-browser';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { AssumeRoleCommand } from '@aws-sdk/client-sts';
import type { Credentials } from '@aws-sdk/types';
import { SignatureV4 } from '@aws-sdk/signature-v4';
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
    const duration = durationSeconds && durationSeconds <= 60 * 60 ? 60 * 60 : durationSeconds || 60 * 60 * 12;

    const executeAssumeRole = async (): Promise<Credentials> => {
      const result = await this.#createClient().send(
        new AssumeRoleCommand({
          RoleArn: roleArn,
          DurationSeconds: duration,
          RoleSessionName: roleSessionName
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
