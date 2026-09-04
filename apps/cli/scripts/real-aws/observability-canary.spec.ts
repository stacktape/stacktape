import { describe, expect, test } from 'bun:test';
import { extractObservabilityStackInfo, servicesObservedInSpanEvents } from './observability-canary';

describe('real-AWS observability canary', () => {
  test('extracts only the deployed fixture endpoints from Stacktape stack info', () => {
    const output = {
      resources: {
        api: { resourceType: 'function', referencableParams: { url: { value: 'https://api.example.test' } } },
        web: { resourceType: 'web-service', referencableParams: { url: { value: 'https://web.example.test' } } }
      }
    };
    expect(
      extractObservabilityStackInfo({
        Outputs: [{ OutputKey: 'StpStackInfoMap', OutputValue: JSON.stringify(output) }]
      })
    ).toEqual({ apiUrl: 'https://api.example.test', webUrl: 'https://web.example.test' });
  });

  test('fails closed when an endpoint is absent', () => {
    expect(() =>
      extractObservabilityStackInfo({
        Outputs: [{ OutputKey: 'StpStackInfoMap', OutputValue: JSON.stringify({ resources: {} }) }]
      })
    ).toThrow('api.url');
  });

  test('requires signal evidence from both instrumented workloads', () => {
    const messages = [
      JSON.stringify({ resource: { attributes: { 'service.name': 'api', 'stacktape.project': 'canary' } } }),
      JSON.stringify({ resource: { attributes: { 'service.name': 'web', 'stacktape.project': 'canary' } } })
    ];
    expect(servicesObservedInSpanEvents(messages, ['api', 'web'])).toEqual(['api', 'web']);
    expect(servicesObservedInSpanEvents(messages.slice(0, 1), ['api', 'web'])).toEqual(['api']);
  });
});
