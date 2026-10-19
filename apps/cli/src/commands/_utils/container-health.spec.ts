import { expect, test } from 'bun:test';
import { hasEssentialContainerHealthCheck } from './container-health';

test.each([
  { essential: undefined, checked: true },
  { essential: true, checked: true },
  { essential: false, checked: false }
])('effective task health with essential=$essential is $checked', ({ essential, checked }) => {
  expect(
    hasEssentialContainerHealthCheck([
      { Name: 'api' },
      { Name: 'telemetry', Essential: essential, HealthCheck: { Command: ['CMD', 'true'] } }
    ])
  ).toBe(checked);
});
test('the essential supervisor is checked without an authored application health check', () => {
  expect(
    hasEssentialContainerHealthCheck([
      { Essential: true, HealthCheck: { Command: ['CMD', '/stacktape-supervisor', 'readiness'] } },
      { Essential: false }
    ])
  ).toBe(true);
  expect(hasEssentialContainerHealthCheck([{ Essential: true }, { Essential: false, HealthCheck: {} }])).toBe(false);
  expect(hasEssentialContainerHealthCheck({ Ref: 'unresolved' })).toBe(false);
});
