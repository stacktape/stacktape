import { describe, expect, test } from 'bun:test';
import type { StpSyntheticTest } from '@domain-services/config-manager/resolved-types/synthetic-tests';
import { getScheduleIntervalSeconds, validateSyntheticTest } from './synthetic-tests';

const baseTest = (overrides: Partial<StpSyntheticTest> = {}): StpSyntheticTest => ({
  name: 'checkoutFlow',
  type: 'synthetic-test',
  configParentResourceType: 'synthetic-test',
  nameChain: ['checkoutFlow'],
  test: { type: 'browser', properties: { scriptPath: './e2e/checkout.ts' } },
  scheduleRate: 'rate(5 minutes)',
  timeoutSeconds: 60,
  memory: 1024,
  retentionDays: 31,
  ...overrides
});

describe('getScheduleIntervalSeconds', () => {
  test('parses rate expressions and leaves cron undefined', () => {
    expect(getScheduleIntervalSeconds('rate(1 minute)')).toBe(60);
    expect(getScheduleIntervalSeconds('rate(15 minutes)')).toBe(900);
    expect(getScheduleIntervalSeconds('rate(1 hour)')).toBe(3600);
    expect(getScheduleIntervalSeconds('cron(0 9 * * ? *)')).toBeUndefined();
  });
});

describe('validateSyntheticTest', () => {
  test('accepts the defaults', () => {
    expect(() => validateSyntheticTest({ test: baseTest() })).not.toThrow();
  });

  test('rejects malformed and out-of-range schedules', () => {
    expect(() => validateSyntheticTest({ test: baseTest({ scheduleRate: 'every 5 minutes' }) })).toThrow(/rate/);
    expect(() => validateSyntheticTest({ test: baseTest({ scheduleRate: 'rate(30 seconds)' }) })).toThrow();
    expect(() => validateSyntheticTest({ test: baseTest({ scheduleRate: 'rate(2 hours)' }) })).toThrow();
    // AWS grammar: the unit must agree with the amount, and rates stop at one hour.
    expect(() => validateSyntheticTest({ test: baseTest({ scheduleRate: 'rate(2 minute)' }) })).toThrow(
      /unit matching/
    );
    expect(() => validateSyntheticTest({ test: baseTest({ scheduleRate: 'rate(1 minutes)' }) })).toThrow(
      /unit matching/
    );
    expect(() => validateSyntheticTest({ test: baseTest({ scheduleRate: 'rate(90 minutes)' }) })).toThrow();
    expect(() => validateSyntheticTest({ test: baseTest({ scheduleRate: 'cron(x)' }) })).toThrow(/six-field/);
    expect(() => validateSyntheticTest({ test: baseTest({ scheduleRate: 'cron(0 9 * * ? *)' }) })).not.toThrow();
    expect(() => validateSyntheticTest({ test: baseTest({ scheduleRate: 'rate(1 hour)' }) })).not.toThrow();
  });

  test('rejects a timeout above 840s or above the schedule interval', () => {
    expect(() => validateSyntheticTest({ test: baseTest({ timeoutSeconds: 900 }) })).toThrow(/between 3 and 840/);
    expect(() =>
      validateSyntheticTest({ test: baseTest({ scheduleRate: 'rate(1 minute)', timeoutSeconds: 120 }) })
    ).toThrow(/schedule interval/);
  });

  test('rejects invalid memory and retention', () => {
    expect(() => validateSyntheticTest({ test: baseTest({ memory: 512 }) })).toThrow(/between 960 and 3008/);
    expect(() => validateSyntheticTest({ test: baseTest({ memory: 1000 }) })).toThrow(/multiple of 64/);
    expect(() => validateSyntheticTest({ test: baseTest({ retentionDays: 0 }) })).toThrow(/between 1 and 455/);
    expect(() => validateSyntheticTest({ test: baseTest({ retentionDays: 500 }) })).toThrow(/between 1 and 455/);
  });
});
