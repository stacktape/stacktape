import { describe, expect, test } from 'bun:test';
import type { StpUptimeCheck } from '@domain-services/config-manager/resolved-types/uptime-checks';
import type { SupportedAWSRegion } from '@stacktape/config/aws-regions';
import { syncUptimeChecksInputSchema } from '@stacktape/console-api/api-key';
import { buildUptimeChecksSyncPayload, resolveUptimeCheckRegions, validateUptimeCheck } from './uptime-checks';
import { validateConfigWithZod } from './zod-validator';

const baseCheck = (
  overrides: Partial<StpUptimeCheck & { regions: SupportedAWSRegion[] }> = {}
): StpUptimeCheck & { regions: SupportedAWSRegion[] } => ({
  name: 'apiHealth',
  type: 'uptime-check',
  configParentResourceType: 'uptime-check',
  nameChain: ['apiHealth'],
  url: 'https://api.example.com/health',
  method: 'GET',
  intervalSeconds: 60,
  timeoutSeconds: 10,
  followRedirects: true,
  enabled: true,
  regions: ['eu-west-1', 'us-east-1', 'ap-southeast-1'],
  ...overrides
});

describe('resolveUptimeCheckRegions', () => {
  test('defaults to the stack region plus two distant regions', () => {
    expect(resolveUptimeCheckRegions({ configuredRegions: undefined, stackRegion: 'eu-central-1' })).toEqual([
      'eu-central-1',
      'us-east-1',
      'eu-west-1'
    ]);
  });

  test('does not duplicate the stack region when it is a distant-region candidate', () => {
    expect(resolveUptimeCheckRegions({ configuredRegions: undefined, stackRegion: 'us-east-1' })).toEqual([
      'us-east-1',
      'eu-west-1',
      'ap-southeast-1'
    ]);
  });
});

describe('validateUptimeCheck', () => {
  test('accepts a url that still contains an unresolved directive', () => {
    expect(() => validateUptimeCheck({ check: baseCheck({ url: "$ResourceParam('api', 'url')" }) })).not.toThrow();
  });

  test('rejects a literal url without an http scheme, including one that merely contains a dollar sign', () => {
    expect(() => validateUptimeCheck({ check: baseCheck({ url: 'api.example.com' }) })).toThrow(
      /must be an `http:\/\/` or `https:\/\/` URL/
    );
    expect(() => validateUptimeCheck({ check: baseCheck({ url: 'price$100.example' }) })).toThrow(
      /must be an `http:\/\/` or `https:\/\/` URL/
    );
  });

  test('rejects body-contains assertions on HEAD checks', () => {
    expect(() =>
      validateUptimeCheck({
        check: baseCheck({
          method: 'HEAD',
          assertions: [{ type: 'body-contains', properties: { value: 'ok' } }]
        })
      })
    ).toThrow(/has no body to match/);
  });

  test('rejects out-of-range timeout and evaluation values', () => {
    expect(() => validateUptimeCheck({ check: baseCheck({ timeoutSeconds: 31 }) })).toThrow(/between 1 and 30/);
    expect(() => validateUptimeCheck({ check: baseCheck({ evaluation: { consecutiveFailures: 0 } }) })).toThrow(
      /between 1 and 10/
    );
    expect(() => validateUptimeCheck({ check: baseCheck({ timeoutSeconds: 2.5 }) })).toThrow(/between 1 and 30/);
    expect(() => validateUptimeCheck({ check: baseCheck({ intervalSeconds: 30, timeoutSeconds: 30 }) })).not.toThrow();
    expect(() => validateUptimeCheck({ check: baseCheck({ intervalSeconds: 30, timeoutSeconds: 31 }) })).toThrow(
      /between 1 and 30/
    );
  });

  test('rejects malformed assertions', () => {
    expect(() =>
      validateUptimeCheck({
        check: baseCheck({ assertions: [{ type: 'status-code', properties: { accepted: [] } }] })
      })
    ).toThrow(/at least one entry/);
    expect(() =>
      validateUptimeCheck({
        check: baseCheck({ assertions: [{ type: 'status-code', properties: { accepted: [42] } }] })
      })
    ).toThrow(/between 100 and 599/);
    expect(() =>
      validateUptimeCheck({
        check: baseCheck({ assertions: [{ type: 'body-contains', properties: { value: '   ' } }] })
      })
    ).toThrow(/non-empty/);
  });

  test('rejects duplicate and excessive probe regions', () => {
    expect(() => validateUptimeCheck({ check: baseCheck({ regions: ['eu-west-1', 'eu-west-1'] }) })).toThrow(
      /duplicate entries/
    );
    expect(() =>
      validateUptimeCheck({
        check: baseCheck({
          regions: ['eu-west-1', 'us-east-1', 'ap-southeast-1', 'eu-central-1', 'us-west-2', 'ca-central-1']
        })
      })
    ).toThrow(/at most 5 probe regions/);
  });
});

describe('uptime check notification channels', () => {
  const SYNTHETIC_CREDENTIAL = 'synthetic-uptime-credential';
  const configWithChannel = (channel: unknown) => ({
    resources: {
      site: {
        type: 'uptime-check',
        properties: { url: 'https://example.invalid/health', notificationChannels: [channel] }
      }
    }
  });

  test.each([
    { type: 'slack', properties: { conversationId: 'C_SYNTHETIC', accessToken: SYNTHETIC_CREDENTIAL } },
    { type: 'slack', properties: { conversationId: 'C_SYNTHETIC', accessToken: "$Secret('review-token')" } },
    { type: 'ms-teams', properties: { webhookUrl: "$Secret('review-webhook')" } },
    { type: 'discord', properties: { webhookUrl: 'https://example.invalid/synthetic-webhook' } },
    { type: 'webhook', properties: { url: 'https://example.invalid/hook', secret: SYNTHETIC_CREDENTIAL } }
  ])('config validation rejects an inline $type channel and points to Console channels', (channel) => {
    const result = validateConfigWithZod({ config: configWithChannel(channel), configPath: 'stacktape.yml' });
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.errorMessage).toContain('notificationChannels[0]');
      expect(result.errorMessage).toContain('type: console-channel');
    }
  });

  test('alarms keep accepting inline channels; only uptime checks reject them', () => {
    const result = validateConfigWithZod({
      config: {
        resources: {
          api: {
            type: 'function',
            properties: {
              packaging: { type: 'js-bundle', properties: { entryfilePath: 'src/index.ts' } },
              alarms: [
                {
                  trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 1 } },
                  notificationChannels: [
                    { type: 'slack', properties: { conversationId: 'C_SYNTHETIC', accessToken: "$Secret('token')" } }
                  ]
                }
              ]
            }
          }
        }
      },
      configPath: 'stacktape.yml'
    });
    expect(result).toEqual({ valid: true });
  });

  test.each([
    { type: 'console-channel', properties: { channelName: 'on-call' } },
    { type: 'slack-app', properties: { channel: '#alerts' } },
    { type: 'email', properties: { sender: 'alerts@example.com', recipient: 'oncall@example.com' } }
  ])('config validation accepts a $type channel', (channel) => {
    expect(validateConfigWithZod({ config: configWithChannel(channel), configPath: 'stacktape.yml' })).toEqual({
      valid: true
    });
  });

  test('the sync payload carries only the named properties of each channel', () => {
    const payload = buildUptimeChecksSyncPayload({
      projectName: 'review',
      stage: 'production',
      checks: [
        {
          ...baseCheck(),
          notificationChannels: [
            { type: 'console-channel', properties: { channelName: 'on-call' } },
            {
              type: 'slack-app',
              properties: {
                channel: '#alerts',
                connectionId: 'conn-1',
                channelId: 'C123',
                channelName: 'alerts',
                accessToken: SYNTHETIC_CREDENTIAL
              } as never
            },
            {
              type: 'email',
              properties: {
                sender: 'alerts@example.com',
                recipient: 'oncall@example.com',
                password: SYNTHETIC_CREDENTIAL
              } as never
            }
          ]
        }
      ] as never
    });

    expect(payload.checks[0].notificationChannels).toEqual([
      { name: 'on-call', type: 'console-channel', properties: {} },
      {
        name: '#alerts',
        type: 'slack_app',
        properties: { channel: '#alerts', connectionId: 'conn-1', channelId: 'C123', channelName: 'alerts' }
      },
      { name: 'Email', type: 'e_mail', properties: { sender: 'alerts@example.com', recipient: 'oncall@example.com' } }
    ]);
    expect(JSON.stringify(syncUptimeChecksInputSchema.parse(payload))).not.toContain(SYNTHETIC_CREDENTIAL);
  });
});
