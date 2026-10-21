import { expect, test } from 'bun:test';
import { ANALYTICS_SCHEMA_VERSION } from './events';
import { POSTHOG_UI_HOST } from './posthog';
import { getCookielessPostHogConfig } from './web';

// The docs and website pass this configuration to posthog-js unchanged.
const config = getCookielessPostHogConfig({
  apiHost: 'https://eu.i.posthog.com',
  app: 'docs',
  capturePageview: 'history_change',
  environment: 'preview'
});

test('browser events carry the app and environment and are scrubbed before they leave the page', () => {
  const registered: Record<string, unknown>[] = [];
  config.loaded({ register: (properties) => registered.push(properties) });
  expect(registered).toEqual([{ app: 'docs', environment: 'preview', schema_version: ANALYTICS_SCHEMA_VERSION }]);

  expect(config.before_send(null)).toBeNull();
  expect(
    config.before_send({
      event: '$pageview',
      properties: {
        $current_url: 'https://console.stacktape.com/after-gitlab-app-install?code=oauth-code&state=oauth-state',
        $referrer: 'https://user:hunter2@git.example.com/repo'
      }
    })
  ).toEqual({
    event: '$pageview',
    properties: {
      $current_url: 'https://console.stacktape.com/after-gitlab-app-install?code=[REDACTED]&state=[REDACTED]',
      $referrer: 'https://[REDACTED]@git.example.com/repo'
    }
  });
  // Exceptions get the stricter error masking: identifiers and home paths, not only credentials.
  expect(
    config.before_send({
      event: '$exception',
      properties: {
        $exception_list: [
          {
            value: 'Failed for user@example.com in account 123456789012',
            stacktrace: { frames: [{ filename: '/home/jane/site/index.ts' }] }
          }
        ]
      }
    })
  ).toEqual({
    event: '$exception',
    properties: {
      $exception_list: [
        {
          value: 'Failed for [redacted:email]@example.com in account [REDACTED_AWS_ACCOUNT_ID]',
          stacktrace: { frames: [{ filename: '/home/[user]/site/index.ts' }] }
        }
      ]
    }
  });
});

test('browser analytics never identify a visitor or store anything on their device', () => {
  // No cookie, no local storage, no person profile and no session recording: the sites need no consent banner.
  expect(config).toMatchObject({
    api_host: 'https://eu.i.posthog.com',
    ui_host: POSTHOG_UI_HOST,
    person_profiles: 'never',
    cookieless_mode: 'always',
    persistence: 'memory',
    autocapture: false,
    capture_pageview: 'history_change',
    disable_session_recording: true
  });
});
