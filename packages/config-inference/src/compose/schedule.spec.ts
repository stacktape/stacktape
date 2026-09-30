import { describe, expect, test } from 'bun:test';
import { normalizeScheduleExpression } from './schedule';

describe('schedule expression normalization', () => {
  test('writes the unit in the form EventBridge rules accept', () => {
    expect(normalizeScheduleExpression('rate(5 minute)')).toBe('rate(5 minutes)');
    expect(normalizeScheduleExpression('rate(1 hours)')).toBe('rate(1 hour)');
    expect(normalizeScheduleExpression('rate( 2 Days )')).toBe('rate(2 days)');
    expect(normalizeScheduleExpression('rate(15 minutes)')).toBe('rate(15 minutes)');
  });

  test('leaves cron and unrecognized expressions alone', () => {
    expect(normalizeScheduleExpression('cron(0 12 * * ? *)')).toBe('cron(0 12 * * ? *)');
    expect(normalizeScheduleExpression('every 5 minutes')).toBe('every 5 minutes');
  });
});
