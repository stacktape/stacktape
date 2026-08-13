import { describe, expect, test } from 'bun:test';
import {
  assertLogClassSupportsForwarding,
  getCloudFormationLogGroupClass,
  logClassSupportsSubscriptionFilters
} from './log-groups';

describe('CloudWatch log classes', () => {
  test('preserves existing templates for the default and explicit standard classes', () => {
    expect(getCloudFormationLogGroupClass(undefined)).toBeUndefined();
    expect(getCloudFormationLogGroupClass('standard')).toBeUndefined();
    expect(getCloudFormationLogGroupClass('infrequent-access')).toBe('INFREQUENT_ACCESS');
  });

  test('rejects forwarding from an Infrequent Access group before synthesis', () => {
    expect(() =>
      assertLogClassSupportsForwarding({
        logClass: 'infrequent-access',
        logForwarding: { type: 'highlight', properties: { projectId: 'project' } }
      })
    ).toThrow('cannot be combined with log forwarding');

    expect(() =>
      assertLogClassSupportsForwarding({
        logClass: 'standard',
        logForwarding: { type: 'highlight', properties: { projectId: 'project' } }
      })
    ).not.toThrow();
  });

  test('disables subscription-filter features for Infrequent Access groups', () => {
    expect(logClassSupportsSubscriptionFilters(undefined)).toBe(true);
    expect(logClassSupportsSubscriptionFilters('standard')).toBe(true);
    expect(logClassSupportsSubscriptionFilters('infrequent-access')).toBe(false);
  });
});
