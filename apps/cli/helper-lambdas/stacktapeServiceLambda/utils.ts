import type { Pluggable } from '@aws-sdk/types';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import type { AwsCredentials } from 'src/aws/credentials';
import type { AWSRegion } from 'src/aws/regions';
import { AwsSdkManager } from 'src/aws/sdk-manager';
import { retryPlugin } from 'src/aws/sdk-manager/utils';

export const getAwsSdkManager = async (input?: {
  region?: string;
  credentials?: AwsCredentials;
  plugins?: Pluggable<any, any>[];
}) => {
  const awsSdkManager = new AwsSdkManager();
  awsSdkManager.init({
    credentials: input?.credentials || (await defaultProvider()()),
    region: (input?.region || process.env.AWS_REGION) as AWSRegion,
    plugins: input?.plugins || [retryPlugin]
  });
  return awsSdkManager;
};
