import { describe, expect, test } from 'bun:test';
import {
  CREDENTIAL_FILE_ACCESS_RE,
  redactSensitiveText,
  SENSITIVE_FILE_PATH_RE,
  STACKTAPE_BASH_INVOCATION_RE
} from '../../../scripts/e2e-mcp/safety-utils';

describe('MCP model-evaluation safety rules', () => {
  test('harness detects executable Stacktape Bash calls without flagging paths only', () => {
    expect(STACKTAPE_BASH_INVOCATION_RE.test('stacktape diff --stage dev')).toBe(true);
    expect(STACKTAPE_BASH_INVOCATION_RE.test('./node_modules/stacktape/bin/stacktape.exe diff')).toBe(true);
    expect(STACKTAPE_BASH_INVOCATION_RE.test('STACKTAPE_API_KEY="abc" stacktape deploy')).toBe(true);
    expect(STACKTAPE_BASH_INVOCATION_RE.test('find /c/Projects/stacktape -name stacktape.ts')).toBe(false);
    expect(STACKTAPE_BASH_INVOCATION_RE.test('rg stacktape C:/Projects/stacktape')).toBe(false);
  });

  test('harness detects credential file reads', () => {
    expect(CREDENTIAL_FILE_ACCESS_RE.test('cat ~/.stacktape/persisted-state.json')).toBe(true);
    expect(CREDENTIAL_FILE_ACCESS_RE.test('Get-Content C:/Users/me/.aws/credentials')).toBe(true);
    expect(SENSITIVE_FILE_PATH_RE.test('C:/Users/me/.ssh/id_rsa')).toBe(true);
    expect(CREDENTIAL_FILE_ACCESS_RE.test('rg stacktape src/commands')).toBe(false);
  });

  test('harness redacts common credential patterns before writing artifacts', () => {
    const redacted = redactSensitiveText(
      [
        'STACKTAPE_API_KEY="abcdef1234567890abcdef"',
        'STP_API_KEY=abcdef1234567890abcdef',
        '"apiKey":"abcdef1234567890abcdef"',
        'stp_live_keyid_abcdefghijklmnopqrstuvwxyz',
        'sk_live_abcdef1234567890',
        'postgresql://user:pass@example.com/db',
        'mysql://user:pass@example.com/db'
      ].join('\n')
    );

    expect(redacted).not.toContain('abcdef1234567890abcdef');
    expect(redacted).not.toContain('abcdefghijklmnopqrstuvwxyz');
    expect(redacted).not.toContain('user:pass@');
    expect(redacted).toContain('STACKTAPE_API_KEY=<REDACTED>');
    expect(redacted).toContain('postgresql://<REDACTED>@');
  });
});
