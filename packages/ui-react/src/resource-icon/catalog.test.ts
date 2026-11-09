import { expect, test } from 'bun:test';
import { STACKTAPE_RESOURCE_TYPES } from '@stacktape/config/resource-types';
import { getResourceVisual } from './catalog.js';

test('every authored Stacktape resource has one shared visual assignment', () => {
  const missing = STACKTAPE_RESOURCE_TYPES.filter((resourceType) => getResourceVisual(resourceType) === undefined);

  // These resource types intentionally use the generic atom until the product assigns them an icon. A CDK construct
  // can hold anything, and the other three are never drawn in the architecture diagram.
  expect(missing).toEqual(['aws-cdk-construct', 'custom-resource-instance', 'synthetic-test', 'uptime-check']);
});

test('the same catalog carries the diagram category and the ordinary React icon', () => {
  expect(getResourceVisual('nextjs-web')).toEqual({ category: 'network', icon: { kind: 'framework', name: 'nextjs' } });
  expect(getResourceVisual('relational-database')).toEqual({
    category: 'database',
    icon: { kind: 'aws', name: 'rds' }
  });
  expect(getResourceVisual('custom-resource-definition')?.category).toBe('compute');
});
