import { expect, test } from 'bun:test';
import { STACKTAPE_RESOURCE_TYPES } from '@stacktape/config/resource-types';
import { getResourceVisual } from './catalog.js';

test('every authored Stacktape resource has one shared visual assignment', () => {
  const missing = STACKTAPE_RESOURCE_TYPES.filter((resourceType) => getResourceVisual(resourceType) === undefined);

  // These resource types intentionally use the generic atom until the product assigns them an icon.
  expect(missing).toEqual([
    'aws-cdk-construct',
    'convex',
    'custom-resource-definition',
    'custom-resource-instance',
    'synthetic-test',
    'uptime-check'
  ]);
});

test('the same catalog carries the diagram and ordinary React meanings', () => {
  expect(getResourceVisual('nextjs-web')).toEqual({
    category: 'network',
    diagramIconId: 'aws-cloudfront',
    icon: { kind: 'framework', name: 'nextjs' }
  });
  expect(getResourceVisual('relational-database')).toEqual({
    category: 'database',
    diagramIconId: 'aws-rds',
    icon: { kind: 'aws', name: 'rds' }
  });
});
