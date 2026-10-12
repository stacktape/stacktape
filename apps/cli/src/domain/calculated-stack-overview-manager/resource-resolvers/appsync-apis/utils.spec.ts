import { expect, test } from 'bun:test';
import { getAppSyncApiKeyReference, getAppSyncCustomDomainUrls } from './utils';

test('uses the API key value attribute and the AppSync custom-domain realtime path', () => {
  expect(getAppSyncApiKeyReference('GraphqlApiKey')).toEqual({ 'Fn::GetAtt': ['GraphqlApiKey', 'ApiKey'] });
  expect(getAppSyncCustomDomainUrls('api.example.com')).toEqual({
    url: 'https://api.example.com/graphql',
    realtimeUrl: 'wss://api.example.com/graphql/realtime'
  });
});
