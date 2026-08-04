import { describe, expect, test } from 'bun:test';
import { getPostHogEnvironment } from './posthog';

describe('PostHog environment selection', () => {
  test('keeps local and preview traffic out of production cohorts', () => {
    expect(getPostHogEnvironment({ version: 'dev' })).toBe('local');
    expect(getPostHogEnvironment({ version: '4.0.0-preview.7' })).toBe('preview');
    expect(getPostHogEnvironment({ version: '4.0.0' })).toBe('production');
    expect(getPostHogEnvironment({ version: '4.0.0', explicitEnvironment: 'development' })).toBe('development');
  });
});
