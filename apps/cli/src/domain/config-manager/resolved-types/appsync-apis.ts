import type { AppSyncApi } from '@stacktape/config/appsync-apis';

export type StpAppSyncApi = AppSyncApi['properties'] & {
  name: string;
  type: AppSyncApi['type'];
  configParentResourceType: AppSyncApi['type'];
  nameChain: string[];
};

export type AppSyncApiReferencableParam = 'apiId' | 'arn' | 'url' | 'realtimeUrl' | 'customDomainUrl' | 'apiKey';
