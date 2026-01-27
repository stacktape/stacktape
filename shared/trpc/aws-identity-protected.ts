import { Buffer } from 'node:buffer';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { getSignedGetCallerIdentityRequest } from '../aws/identity';

// Manually typed interfaces based on actual TRPC router at console-app/server/api/aws-identity-protected.ts
type ValidateCertificateParams = {
  certificateArn: string;
  version: number;
};

type UpsertDefaultDomainDnsRecordParams = {
  domainName: string;
  region: string;
  stackName: string;
  targetInfo: {
    hostedZoneId: string;
    domainName: string;
  };
  version: number;
};

type DeleteDefaultDomainDnsRecordParams = {
  domainName: string;
  region: string;
  stackName: string;
  targetInfo: {
    hostedZoneId: string;
    domainName: string;
  };
  version: number;
};

type AwsIdentityTrpcClient = {
  validateCertificate: {
    mutate: (args: ValidateCertificateParams) => Promise<void>;
  };
  upsertDefaultDomainDnsRecord: {
    mutate: (args: UpsertDefaultDomainDnsRecordParams) => Promise<void>;
  };
  deleteDefaultDomainDnsRecord: {
    mutate: (args: DeleteDefaultDomainDnsRecordParams) => Promise<void>;
  };
};

const TRPC_REQUEST_TIMEOUT_MS = 30000; // 30 seconds

const fetchWithTimeout = async (url: any, options: any) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TRPC_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const createTrpcAwsIdentityProtectedClient = ({
  credentials,
  region,
  apiUrl
}: {
  credentials: AwsCredentials;
  region: string;
  apiUrl: string;
}): AwsIdentityTrpcClient => {
  return createTRPCClient<any>({
    links: [
      httpBatchLink({
        url: apiUrl,
        headers: async () => ({
          aws_identity: Buffer.from(
            JSON.stringify(await getSignedGetCallerIdentityRequest({ credentials, region }))
          ).toString('base64')
        }),
        fetch: fetchWithTimeout as any
      })
    ]
  }) as unknown as AwsIdentityTrpcClient;
};

export class AwsIdentityProtectedClient {
  #client: AwsIdentityTrpcClient | null = null;

  init = async ({ credentials, region, apiUrl }: { credentials: AwsCredentials; region: string; apiUrl: string }) => {
    this.#client = createTrpcAwsIdentityProtectedClient({ credentials, region, apiUrl });
  };

  validateCertificate = {
    mutate: async (args: ValidateCertificateParams): Promise<void> => {
      return this.#client!.validateCertificate.mutate(args);
    }
  };

  upsertDefaultDomainDnsRecord = {
    mutate: async (args: UpsertDefaultDomainDnsRecordParams): Promise<void> => {
      return this.#client!.upsertDefaultDomainDnsRecord.mutate(args);
    }
  };

  deleteDefaultDomainDnsRecord = {
    mutate: async (args: DeleteDefaultDomainDnsRecordParams): Promise<void> => {
      return this.#client!.deleteDefaultDomainDnsRecord.mutate(args);
    }
  };
}
