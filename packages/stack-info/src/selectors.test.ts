import { describe, expect, test } from 'bun:test';
import type { NormalizedStackInfoMap } from './contracts';
import {
  getQuickLinks,
  getResourcesWithLogs,
  getResourcesWithMetrics,
  getUserResourcesFromStackInfoMap
} from './selectors';

const stackInfoMap: NormalizedStackInfoMap = {
  metadata: {},
  customOutputs: {},
  resources: {
    api: {
      resourceType: 'web-service',
      referenceableParams: {
        cdnCustomDomainUrls: { showDuringPrint: true, value: ['https://ignored.example.com'] },
        url: { showDuringPrint: true, value: 'https://api.example.com' }
      },
      cloudformationChildResources: {
        Service: { cloudformationResourceType: 'AWS::ECS::Service' }
      },
      links: {
        logs: 'https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups/log-group/%252Fecs%252Fapi',
        metricsCpu: 'https://console.aws.amazon.com/cloudwatch/home#metricsV2'
      },
      outputs: {},
      _nestedResources: {
        deployment: {
          resourceType: 'SHARED_GLOBAL',
          referenceableParams: {},
          cloudformationChildResources: {
            Deployment: { cloudformationResourceType: 'AWS::CodeDeploy::DeploymentGroup' }
          },
          links: {},
          outputs: {}
        }
      }
    },
    stacktapeServiceLambda: {
      resourceType: 'function',
      referenceableParams: {},
      cloudformationChildResources: {},
      links: {},
      outputs: {}
    },
    CUSTOM_CLOUDFORMATION: {
      resourceType: 'CUSTOM_CLOUDFORMATION',
      referenceableParams: {},
      cloudformationChildResources: {},
      links: {},
      outputs: {}
    },
    SHARED_GLOBAL: {
      resourceType: 'SHARED_GLOBAL',
      referenceableParams: {},
      cloudformationChildResources: {},
      links: {},
      outputs: {}
    }
  }
};

const gateway = (referenceableParams: NormalizedStackInfoMap['resources'][string]['referenceableParams']) => ({
  resourceType: 'http-api-gateway',
  referenceableParams,
  cloudformationChildResources: {},
  links: {},
  outputs: {}
});

describe('stack-info selectors', () => {
  test('selects customer resources and their nested CloudFormation children without changing the payload', () => {
    const before = structuredClone(stackInfoMap);
    const selected = getUserResourcesFromStackInfoMap(stackInfoMap);
    expect(selected.map(({ name }) => name)).toEqual(['api']);
    expect(selected[0]?.cloudformationChildResources).toEqual({
      Service: { cloudformationResourceType: 'AWS::ECS::Service' },
      Deployment: { cloudformationResourceType: 'AWS::CodeDeploy::DeploymentGroup' }
    });
    expect(stackInfoMap).toEqual(before);
    expect(getUserResourcesFromStackInfoMap(null)).toEqual([]);
  });

  test('selects the first string-valued quick link using the historical priority', () => {
    expect(getQuickLinks(stackInfoMap)).toEqual([
      {
        resourceName: 'api',
        url: 'https://api.example.com',
        resourceType: 'web-service'
      }
    ]);
  });

  test('links a custom domain before the AWS URL, and only the first of several domains', () => {
    // The CLI records several custom domains as one comma-separated parameter value.
    expect(
      getQuickLinks({
        ...stackInfoMap,
        resources: {
          single: gateway({
            url: { showDuringPrint: true, value: 'https://abc.execute-api.eu-west-1.amazonaws.com' },
            customDomainUrls: { showDuringPrint: true, value: 'https://api.example.com' }
          }),
          several: gateway({
            url: { showDuringPrint: true, value: 'https://def.execute-api.eu-west-1.amazonaws.com' },
            cdnCustomDomainUrls: { showDuringPrint: true, value: 'https://www.example.com, https://example.com' }
          })
        }
      }).map(({ url }) => url)
    ).toEqual(['https://api.example.com', 'https://www.example.com']);
  });

  test('exposes WebSocket client URLs as quick links', () => {
    expect(
      getQuickLinks({
        ...stackInfoMap,
        resources: {
          realtime: {
            resourceType: 'websocket-api-gateway',
            referenceableParams: {
              url: { value: 'wss://socket.example.com', showDuringPrint: true }
            },
            cloudformationChildResources: {},
            links: {},
            outputs: {}
          }
        }
      })
    ).toEqual([
      {
        resourceName: 'realtime',
        url: 'wss://socket.example.com',
        resourceType: 'websocket-api-gateway'
      }
    ]);
  });

  test('selects metrics and decodes CloudWatch log group names', () => {
    expect(getResourcesWithMetrics({ stackInfoMap })).toEqual([
      {
        resourceName: 'api',
        linkName: 'metricsCpu',
        linkValue: 'https://console.aws.amazon.com/cloudwatch/home#metricsV2',
        resourceType: 'web-service'
      }
    ]);
    expect(getResourcesWithLogs({ stackInfoMap })[0]?.logGroupName).toBe('/ecs/api');
  });
});
