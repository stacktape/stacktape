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

describe('stack-info selectors', () => {
  test('returns user resources and flattens one level of nested CloudFormation children without mutating input', () => {
    const resources = getUserResourcesFromStackInfoMap(stackInfoMap);

    expect(resources.map(({ name }) => name)).toEqual(['api']);
    expect(Object.keys(resources[0]!.cloudformationChildResources)).toEqual(['Service', 'Deployment']);
    expect(Object.keys(stackInfoMap.resources.api!.cloudformationChildResources)).toEqual(['Service']);
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

  test('returns empty selections for a missing stack-info map', () => {
    expect(getUserResourcesFromStackInfoMap(null)).toEqual([]);
    expect(getQuickLinks(null)).toEqual([]);
    expect(getResourcesWithMetrics({ stackInfoMap: null })).toEqual([]);
    expect(getResourcesWithLogs({ stackInfoMap: null })).toEqual([]);
  });
});
