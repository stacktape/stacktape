import type { Pluggable } from '@aws-sdk/types';
import type { AwsCredentials } from './credentials';
import type { SupportedAWSRegion as AWSRegion } from '@stacktape/config/aws-regions';
import { redirectPlugin, retryPlugin } from './client-middleware';
import { createFetchHandler } from './fetch-handler';

export type AwsCredentialsProvider = () => AwsCredentials | Promise<AwsCredentials>;

export type AwsClientContext = Readonly<{
  credentials: () => Promise<AwsCredentials>;
  endpoint?: string;
  plugins: readonly Pluggable<any, any>[];
  region: AWSRegion;
}>;

export type AwsClientContextInput = {
  credentials: AwsCredentials | AwsCredentialsProvider;
  endpoint?: string;
  plugins?: Pluggable<any, any>[];
  region: AWSRegion;
};

export const createAwsClientContext = ({
  credentials,
  endpoint,
  plugins = [redirectPlugin, retryPlugin],
  region
}: AwsClientContextInput): AwsClientContext => ({
  credentials: async () => (typeof credentials === 'function' ? credentials() : credentials),
  endpoint,
  plugins,
  region
});

export const awsClientConfig = (
  context: AwsClientContext,
  {
    endpoint = context.endpoint,
    region = context.region,
    requestTimeout
  }: {
    endpoint?: string;
    region?: string;
    requestTimeout?: number;
  } = {}
) => ({
  credentials: context.credentials,
  ...(endpoint ? { endpoint } : {}),
  region,
  requestHandler: createFetchHandler(requestTimeout === undefined ? {} : { requestTimeout })
});

export type AwsClientWithMiddleware = {
  middlewareStack: {
    use: (plugin: Pluggable<any, any>) => void;
  };
};

export const applyAwsClientPlugins = <TClient extends AwsClientWithMiddleware>(
  client: TClient,
  plugins: readonly Pluggable<any, any>[]
): TClient => {
  for (const plugin of plugins) {
    client.middlewareStack.use(plugin);
  }
  return client;
};
