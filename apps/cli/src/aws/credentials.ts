import type { Credentials } from '@aws-sdk/types';

export type AwsCredentials = {
  -readonly [TKey in keyof Credentials]: Credentials[TKey];
};

export type LoadedAwsCredentials = AwsCredentials & {
  source: 'envVar' | 'credentialsFile' | 'providerChain' | 'api' | 'assumeRole';
};

export type ValidatedAwsCredentials = LoadedAwsCredentials & {
  identity: {
    account: string;
    arn: string;
  };
};
