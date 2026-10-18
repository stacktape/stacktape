import { expect, test } from 'bun:test';
import { hasApplicationHealthCheck } from './container-health';

test.each([
  { essential: undefined, checked: true },
  { essential: true, checked: true },
  { essential: false, checked: false }
])('application health with essential=$essential is $checked', ({ essential, checked }) => {
  expect(
    hasApplicationHealthCheck([
      { name: 'api' },
      { name: 'telemetry', essential, internalHealthCheck: { healthCheckCommand: ['CMD', 'true'] } }
    ] as Parameters<typeof hasApplicationHealthCheck>[0])
  ).toBe(checked);
});
