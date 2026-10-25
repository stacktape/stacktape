import { describe, expect, test } from 'bun:test';
import { normalizeScheduleExpression } from './schedule';

describe('schedule expression normalization', () => {
  test('writes the unit in the form EventBridge rules accept', () => {
    expect(normalizeScheduleExpression('rate(5 minute)')).toBe('rate(5 minutes)');
    expect(normalizeScheduleExpression('rate(1 hours)')).toBe('rate(1 hour)');
    expect(normalizeScheduleExpression('rate( 2 Days )')).toBe('rate(2 days)');
    expect(normalizeScheduleExpression('rate(15 minutes)')).toBe('rate(15 minutes)');
  });

  test('converts a five-field Unix cron into the EventBridge form', () => {
    expect(normalizeScheduleExpression('0 3 * * *')).toBe('cron(0 3 * * ? *)');
    expect(normalizeScheduleExpression('*/15 * * * *')).toBe('cron(*/15 * * * ? *)');
    // Unix counts weekdays from 0 for Sunday, EventBridge from 1.
    expect(normalizeScheduleExpression('30 9 * * 1-5')).toBe('cron(30 9 ? * 2-6 *)');
    expect(normalizeScheduleExpression('0 0 * * 0')).toBe('cron(0 0 ? * 1 *)');
    expect(normalizeScheduleExpression('0 6 1 * *')).toBe('cron(0 6 1 * ? *)');
    // Both day fields restricted has no EventBridge equivalent.
    expect(normalizeScheduleExpression('0 6 1 * 1')).toBe('0 6 1 * 1');
  });

  test('leaves cron and unrecognized expressions alone', () => {
    expect(normalizeScheduleExpression('cron(0 12 * * ? *)')).toBe('cron(0 12 * * ? *)');
    expect(normalizeScheduleExpression('every 5 minutes')).toBe('every 5 minutes');
  });
});
