import { describe, expect, test } from 'bun:test';
import { getPostHogEnvironment, getPostHogIngestionHost, POSTHOG_API_HOST, POSTHOG_DIRECT_API_HOST } from './posthog';

describe('PostHog environment selection', () => {
  test('keeps local and preview traffic out of production cohorts', () => {
    expect(getPostHogEnvironment({ version: 'dev' })).toBe('local');
    expect(getPostHogEnvironment({ version: '4.0.0-preview.7' })).toBe('preview');
    expect(getPostHogEnvironment({ version: '4.0.0' })).toBe('production');
    expect(getPostHogEnvironment({ version: '4.0.0', explicitEnvironment: 'development' })).toBe('development');
  });

  test('uses the project-bound proxy only for production traffic', () => {
    expect(getPostHogIngestionHost('production')).toBe(POSTHOG_API_HOST);
    expect(getPostHogIngestionHost('preview')).toBe(POSTHOG_DIRECT_API_HOST);
    expect(getPostHogIngestionHost('dev')).toBe(POSTHOG_DIRECT_API_HOST);
    expect(getPostHogIngestionHost('local')).toBe(POSTHOG_DIRECT_API_HOST);
  });
});
