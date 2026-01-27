import type { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-browser';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { createRequest } from '@aws-sdk/util-create-request';

type SignedRequest = { headers: Record<string, string>; [key: string]: unknown };

export const getSignedGetCallerIdentityRequest = async ({
  credentials,
  region
}: {
  credentials: AwsCredentials;
  region: string;
}): Promise<SignedRequest> => {
  const rawRequest = await (createRequest as unknown as (client: any, command: any) => Promise<HttpRequest>)(
    new STSClient({ region, credentials }),
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
