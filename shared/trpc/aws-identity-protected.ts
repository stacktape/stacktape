import { Buffer } from 'node:buffer';
import type {
  AwsIdentityTrpcClient,
  DeleteDefaultDomainDnsRecordParams,
  UpsertDefaultDomainDnsRecordParams,
  ValidateCertificateParams
} from '../../types/console-app/trpc/aws-identity-protected';
import { getSignedGetCallerIdentityRequest } from '../aws/identity';
import { createTypedTrpcClient } from './client';

const createTrpcAwsIdentityProtectedClient = ({
  credentials,
  region,
  apiUrl
}: {
  credentials: AwsCredentials;
  region: string;
  apiUrl: string;
}) => {
  return createTypedTrpcClient<AwsIdentityTrpcClient>({
    url: apiUrl,
    headers: async () => ({
      aws_identity: Buffer.from(
        JSON.stringify(await getSignedGetCallerIdentityRequest({ credentials, region }))
      ).toString('base64')
    })
  });
};

export class AwsIdentityProtectedClient {
  #client: AwsIdentityTrpcClient | null = null;

  init = async ({ credentials, region, apiUrl }: { credentials: AwsCredentials; region: string; apiUrl: string }) => {
    this.#client = createTrpcAwsIdentityProtectedClient({ credentials, region, apiUrl });
  };

  #ensureInitialized = () => {
    if (!this.#client) {
      throw new Error('AwsIdentityProtectedClient not initialized. Call init({ credentials, region, apiUrl }) first.');
    }

    return this.#client;
  };

  validateCertificate = {
    mutate: async (args: ValidateCertificateParams): Promise<void> => {
      return this.#ensureInitialized().validateCertificate.mutate(args);
    }
  };

  upsertDefaultDomainDnsRecord = {
    mutate: async (args: UpsertDefaultDomainDnsRecordParams): Promise<void> => {
      return this.#ensureInitialized().upsertDefaultDomainDnsRecord.mutate(args);
    }
  };

  deleteDefaultDomainDnsRecord = {
    mutate: async (args: DeleteDefaultDomainDnsRecordParams): Promise<void> => {
      return this.#ensureInitialized().deleteDefaultDomainDnsRecord.mutate(args);
    }
  };
}
