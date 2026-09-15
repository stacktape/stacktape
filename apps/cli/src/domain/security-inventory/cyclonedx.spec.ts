import { describe, expect, test } from 'bun:test';
import {
  carryOverComponents,
  type CycloneDxDocument,
  mergeInventoryParts,
  parseCycloneDx,
  STACKTAPE_COMPONENT_PROPERTY,
  summarizeInventory
} from './cyclonedx';

const trivyDocument = (components: CycloneDxDocument['components']): CycloneDxDocument => ({
  bomFormat: 'CycloneDX',
  specVersion: '1.6',
  components,
  dependencies: [{ ref: 'anything', dependsOn: [] }]
});

const lodash = {
  type: 'library',
  name: 'lodash',
  version: '4.17.20',
  purl: 'pkg:npm/lodash@4.17.20',
  'bom-ref': 'pkg:npm/lodash@4.17.20'
};
const openssl = {
  type: 'library',
  name: 'openssl',
  version: '3.0.13',
  purl: 'pkg:deb/debian/openssl@3.0.13',
  'bom-ref': 'pkg:deb/debian/openssl@3.0.13'
};

describe('inventory merge', () => {
  test('tags every component with its workload, digest and source, and keeps bom-refs unique across images', () => {
    const merged = mergeInventoryParts({
      parts: [
        { workload: null, source: 'filesystem', document: trivyDocument([lodash]) },
        { workload: 'api', artifactDigest: 'abc', source: 'image', document: trivyDocument([openssl, lodash]) },
        { workload: 'worker', artifactDigest: 'def', source: 'image', document: trivyDocument([openssl]) }
      ],
      application: { name: 'shop-production', version: '7' },
      tools: [{ name: 'trivy', version: '0.74.0' }],
      now: new Date('2026-09-15T20:00:00Z')
    });
    expect(merged.components?.map((component) => component['bom-ref'])).toEqual([
      'project:pkg:npm/lodash@4.17.20',
      'api:pkg:deb/debian/openssl@3.0.13',
      'api:pkg:npm/lodash@4.17.20',
      'worker:pkg:deb/debian/openssl@3.0.13'
    ]);
    const apiOpenssl = merged.components![1]!;
    expect(apiOpenssl.properties).toEqual([
      { name: STACKTAPE_COMPONENT_PROPERTY.workload, value: 'api' },
      { name: STACKTAPE_COMPONENT_PROPERTY.artifactDigest, value: 'abc' },
      { name: STACKTAPE_COMPONENT_PROPERTY.source, value: 'image' }
    ]);
    expect(merged.components![0]!.properties).toEqual([
      { name: STACKTAPE_COMPONENT_PROPERTY.source, value: 'filesystem' }
    ]);
    expect(merged.dependencies).toBeUndefined();
    expect(merged.metadata).toMatchObject({
      timestamp: '2026-09-15T20:00:00.000Z',
      component: { type: 'application', name: 'shop-production', version: '7' }
    });
  });

  test('carries the components of an unchanged image over from the previous inventory, and only those', () => {
    const previous = mergeInventoryParts({
      parts: [
        { workload: 'api', artifactDigest: 'abc', source: 'image', document: trivyDocument([openssl]) },
        { workload: 'worker', artifactDigest: 'def', source: 'image', document: trivyDocument([lodash]) }
      ],
      application: { name: 'shop-production', version: '6' },
      tools: []
    });
    expect(carryOverComponents({ previous, workload: 'api', artifactDigest: 'abc' }).map((c) => c.name)).toEqual([
      'openssl'
    ]);
    expect(carryOverComponents({ previous, workload: 'api', artifactDigest: 'rebuilt' })).toEqual([]);

    const next = mergeInventoryParts({
      parts: [
        {
          workload: 'api',
          artifactDigest: 'abc',
          source: 'carried-over',
          document: {
            bomFormat: 'CycloneDX',
            specVersion: '1.6',
            components: carryOverComponents({ previous, workload: 'api', artifactDigest: 'abc' })
          }
        }
      ],
      application: { name: 'shop-production', version: '7' },
      tools: []
    });
    // Already-scoped references are not prefixed twice, and the source now says where the packages came from.
    expect(next.components![0]!['bom-ref']).toBe('api:pkg:deb/debian/openssl@3.0.13');
    expect(summarizeInventory(next).workloads).toEqual([
      { name: 'api', source: 'carried-over', componentCount: 1, artifactDigest: 'abc' }
    ]);
  });

  test('summarizes counts per workload and per package ecosystem', () => {
    const merged = mergeInventoryParts({
      parts: [
        { workload: null, source: 'filesystem', document: trivyDocument([lodash]) },
        { workload: 'api', artifactDigest: 'abc', source: 'image', document: trivyDocument([openssl, lodash]) }
      ],
      application: { name: 'shop-production', version: '7' },
      tools: []
    });
    expect(summarizeInventory(merged)).toEqual({
      componentCount: 3,
      workloads: [
        { name: 'project', source: 'filesystem', componentCount: 1 },
        { name: 'api', source: 'image', componentCount: 2, artifactDigest: 'abc' }
      ],
      ecosystems: { npm: 2, deb: 1 }
    });
  });

  test('accepts an empty CycloneDX document and rejects other JSON', () => {
    expect(parseCycloneDx('{"bomFormat":"CycloneDX","specVersion":"1.6"}').components).toEqual([]);
    expect(() => parseCycloneDx('{"results":[]}')).toThrow('not a CycloneDX document');
  });
});
