import { describe, expect, test } from 'bun:test';
import {
  redactTelemetryText,
  sanitizeErrorForTelemetry,
  sanitizeExceptionTelemetryValue,
  sanitizeTelemetryValue
} from './privacy';

describe('telemetry redaction', () => {
  test('redacts common credential forms without destroying useful context', () => {
    const text = 'request failed: Authorization: Bearer abc.def and api_key=super-secret on deploy';
    expect(redactTelemetryText(text)).toBe(
      'request failed: Authorization: [REDACTED] and api_key=[REDACTED] on deploy'
    );
  });

  test('redacts OAuth and provider-pairing values embedded in analytics URLs', () => {
    expect(
      redactTelemetryText(
        'https://console.stacktape.com/after-gitlab-app-install?code=oauth-code&state=oauth-state&safe=value'
      )
    ).toBe('https://console.stacktape.com/after-gitlab-app-install?code=[REDACTED]&state=[REDACTED]&safe=value');
    expect(
      redactTelemetryText(
        'https://console.stacktape.com/git-integrations?bitbucketPairingState=pairing-secret&org=org-1'
      )
    ).toBe('https://console.stacktape.com/git-integrations?bitbucketPairingState=[REDACTED]&org=org-1');
    expect(
      redactTelemetryText('https://console.stacktape.com/sign-in?redirectTo=git-integrations%3FpairBitbucket%3D1')
    ).toBe('https://console.stacktape.com/sign-in?redirectTo=[REDACTED]');
  });

  test('redacts nested exception payloads and handles cycles', () => {
    const payload: Record<string, unknown> = { message: 'token=secret-value' };
    payload.self = payload;
    expect(sanitizeTelemetryValue(payload)).toEqual({ message: 'token=[REDACTED]', self: '[CIRCULAR]' });
  });

  test('redacts values stored under credential-shaped property names', () => {
    expect(
      sanitizeTelemetryValue({
        accessToken: 'opaque-value',
        nested: { api_key: 'opaque-value', harmless: 'kept' }
      })
    ).toEqual({
      accessToken: '[REDACTED]',
      nested: { api_key: '[REDACTED]', harmless: 'kept' }
    });
  });

  test('removes user and cloud-account identifiers from exception text', () => {
    const sanitized = sanitizeErrorForTelemetry(
      new Error('Failed for user@example.com in arn:aws:iam::123456789012:role/example')
    );

    expect(sanitized.message).toBe(
      'Failed for [REDACTED_EMAIL] in arn:aws:iam::[REDACTED_AWS_ACCOUNT_ID]:role/example'
    );
    expect(sanitized.stack).not.toContain('user@example.com');
    expect(
      sanitizeExceptionTelemetryValue({
        $exception_list: [{ value: 'Failed for user@example.com in account 123456789012' }]
      })
    ).toEqual({
      $exception_list: [{ value: 'Failed for [REDACTED_EMAIL] in account [REDACTED_AWS_ACCOUNT_ID]' }]
    });
  });
});
