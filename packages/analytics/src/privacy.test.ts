import { describe, expect, test } from 'bun:test';
import { redactTelemetryText, sanitizeErrorForTelemetry, sanitizeExceptionTelemetryValue } from './privacy';

describe('telemetry redaction', () => {
  // Every event, not only errors, passes these rules. Each row is one rule the collector scenarios do not reach.
  test.each([
    [
      'Authorization: Bearer abc.def and api_key=super-secret on deploy',
      'Authorization: [REDACTED] and api_key=[REDACTED] on deploy'
    ],
    ['header Bearer eyJhbGciOi.payload.sig rejected', 'header Bearer [REDACTED] rejected'],
    ['AKIAIOSFODNN7EXAMPLE expired', '[REDACTED_AWS_ACCESS_KEY_ID] expired'],
    ['pull https://user:hunter2@git.example.com/repo', 'pull https://[REDACTED]@git.example.com/repo'],
    [
      `key ${['-----BEGIN RSA PRIVATE', 'KEY-----\nMIIE\n-----END RSA PRIVATE', 'KEY-----'].join(' ')} rejected`,
      'key [REDACTED_PRIVATE_KEY] rejected'
    ],
    [
      'https://console.stacktape.com/git-integrations?bitbucketPairingState=pairing-secret&org=org-1',
      'https://console.stacktape.com/git-integrations?bitbucketPairingState=[REDACTED]&org=org-1'
    ],
    [
      'https://console.stacktape.com/sign-in?redirectTo=git-integrations%3FpairBitbucket%3D1',
      'https://console.stacktape.com/sign-in?redirectTo=[REDACTED]'
    ]
  ])('redacts %p in any event', (input, expected) => {
    expect(redactTelemetryText(input)).toBe(expected);
  });

  test('removes user and cloud-account identifiers from exception text, stacks and frames', () => {
    const sanitized = sanitizeErrorForTelemetry(
      new Error('Failed for user@example.com in arn:aws:iam::123456789012:role/example')
    );
    expect(sanitized.message).toBe(
      'Failed for [redacted:email]@example.com in arn:aws:iam::[REDACTED_AWS_ACCOUNT_ID]:role/example'
    );
    expect(sanitized.stack).not.toContain('user@example.com');
    expect(
      sanitizeExceptionTelemetryValue({
        $exception_list: [
          {
            value: 'Failed for user@example.com in account 123456789012',
            stacktrace: { frames: [{ filename: '/home/jane/app/src/index.ts', lineno: 3 }] }
          }
        ]
      })
    ).toEqual({
      $exception_list: [
        {
          value: 'Failed for [redacted:email]@example.com in account [REDACTED_AWS_ACCOUNT_ID]',
          stacktrace: { frames: [{ filename: '/home/[user]/app/src/index.ts', lineno: 3 }] }
        }
      ]
    });
  });
});
