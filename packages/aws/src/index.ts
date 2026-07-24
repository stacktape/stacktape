export type AwsEndpointOverrides = Readonly<Record<string, URL>>;

export interface AwsClientFactory {
  create<Service>(service: string, region: string): Service;
}

export type AwsClientFactoryOptions = Readonly<{
  endpointOverrides?: AwsEndpointOverrides;
  forbidUnconfiguredNetwork?: boolean;
}>;
