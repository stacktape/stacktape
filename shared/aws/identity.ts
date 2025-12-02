import { Sha256 } from '@aws-crypto/sha256-browser';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { createRequest } from '@aws-sdk/util-create-request';

export const getSignedGetCallerIdentityRequest = async ({
  credentials,
  region
}: {
  credentials: AwsCredentials;
  region: string;
}) => {
  const rawRequest = await createRequest(new STSClient({ region, credentials }), new GetCallerIdentityCommand({}));
  const signer = new SignatureV4({
    credentials,
    region,
    service: 'sts',
    sha256: Sha256
  });
  const signedRequest = await signer.sign(rawRequest);
  return signedRequest;
};
