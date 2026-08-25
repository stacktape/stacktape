import { describe, expect, test } from 'bun:test';
import {
  getSsrWebStaticAssetPrefixes,
  SSR_WEB_FRAMEWORK_CONFIGS
} from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/ssr-web-shared';
import { HASHED_ASSET_DIRECTORIES_BY_TYPE } from './ssr-webs';

describe('single-Lambda SSR web asset routing', () => {
  test('keeps synthesized routes aligned with every packaging output variant', () => {
    for (const [resourceType, frameworkConfig] of Object.entries(SSR_WEB_FRAMEWORK_CONFIGS)) {
      expect(HASHED_ASSET_DIRECTORIES_BY_TYPE[resourceType]).toEqual(getSsrWebStaticAssetPrefixes(frameworkConfig));
    }
  });

  test('routes both current TanStack assets and the legacy Nitro prefix directly to the static bucket', () => {
    expect(HASHED_ASSET_DIRECTORIES_BY_TYPE['tanstack-web']).toEqual(['assets', '_build']);
  });
});
