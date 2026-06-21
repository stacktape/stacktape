import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { cliCommands } from '../../config/cli/commands';
import { describeCliCommand, getCliCommandPolicy, listCliCommandSummaries, prepareCliRun } from './cli-command-tools';
import {
  CREDENTIAL_FILE_ACCESS_RE,
  redactSensitiveText,
  SENSITIVE_FILE_PATH_RE,
  STACKTAPE_BASH_INVOCATION_RE
} from '../../../scripts/e2e-mcp/safety-utils';

describe('MCP CLI agent contract', () => {
  test('every CLI command is listed with policy metadata', () => {
    const summaries = listCliCommandSummaries();
    expect(summaries.map((summary) => summary.command).sort()).toEqual([...cliCommands].sort());

    for (const summary of summaries) {
      expect(summary.category).toBeTruthy();
      expect(summary.safety).toBeTruthy();
      expect(typeof summary.requiresConfirmation).toBe('boolean');
      expect(Array.isArray(summary.requiredArgs)).toBe(true);
    }

    expect(summaries.map((summary) => summary.command)).not.toContain('preview-changes');
    expect(summaries.map((summary) => summary.command)).not.toContain('compile-template');
    expect(summaries.map((summary) => summary.command)).not.toContain('package-workloads');
    expect(summaries.map((summary) => summary.command)).not.toContain('debug:logs');
    expect(summaries.map((summary) => summary.command)).not.toContain('secret:create');
    expect(summaries.map((summary) => summary.command)).not.toContain('codebuild:deploy');
  });

  test('safe operational commands have a sanctioned MCP run path', () => {
    const safeCommands = [
      'diff',
      'synth',
      'package',
      'info:whoami',
      'info:stack',
      'info:stacks',
      'info:operations',
      'logs',
      'metrics',
      'alarms',
      'query:sql',
      'query:dynamodb',
      'query:redis',
      'query:opensearch'
    ];

    for (const command of safeCommands) {
      const policy = getCliCommandPolicy(command as (typeof cliCommands)[number]);
      expect(['readOnly', 'diagnostic', 'local']).toContain(policy.safety);
      expect(policy.requiresConfirmation).toBe(false);
      const prepared = prepareCliRun({ command, args: {} });
      if (prepared.ok === false) {
        expect(prepared.code).not.toBe('CONFIRMATION_REQUIRED');
        expect(prepared.code).not.toBe('UNSUPPORTED_COMMAND');
      }
    }
  });

  test('logs supports multi-container workload container selection', () => {
    const description = describeCliCommand('logs');
    expect(description?.allowedArgs).toContain('container');

    const prepared = prepareCliRun({
      command: 'logs',
      args: {
        stage: 'dev',
        region: 'eu-west-1',
        resourceName: 'apiServer',
        container: 'api-container'
      }
    });

    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.args.container).toBe('api-container');
    }
  });

  test('mutating, destructive, sensitive, and interactive commands keep strict boundaries', () => {
    for (const command of ['deploy', 'rollback', 'secret:set', 'domain:add', 'issues:resolve']) {
      const result = prepareCliRun({ command, args: {} });
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.code).toBe('CONFIRMATION_REQUIRED');
      }
    }

    for (const command of ['delete', 'secret:delete', 'aws-profile:delete', 'org:delete']) {
      const policy = getCliCommandPolicy(command as (typeof cliCommands)[number]);
      expect(policy.safety).toBe('destructive');
      expect(policy.requiresConfirmation).toBe(true);
    }

    for (const command of ['secret:get', 'param:get']) {
      const description = describeCliCommand(command);
      expect(description?.sensitiveOutput).toBe(true);
    }

    for (const command of [
      'login',
      'init',
      'dev',
      'dev:stop',
      'bastion:session',
      'bastion:tunnel',
      'container:session'
    ]) {
      const result = prepareCliRun({ command, args: {}, confirm: true });
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.code).toBe('UNSUPPORTED_COMMAND');
        expect(result.nextActions?.join('\n')).toMatch(/terminal|stacktape_dev|Do not run stacktape/i);
      }
    }
  });

  test('MCP rejects raw Stacktape credential arguments', () => {
    const result = prepareCliRun({
      command: 'info:whoami',
      args: { apiKey: 'stp_live_keyid_abcdefghijklmnopqrstuvwxyz' }
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('Raw Stacktape credential argument');
      expect(result.nextActions?.join('\n')).toContain('Do not ask the user to paste an API key into chat');
    }
  });

  test('MCP instructions explicitly forbid Bash and credential harvesting', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'commands', 'mcp', 'index.ts'), 'utf-8');

    expect(source).toContain('The stacktape CLI is forbidden as a Bash/shell command');
    expect(source).toContain('Never read ~/.stacktape/, ~/.aws/, ~/.ssh/');
    expect(source).toContain('Planning does not require Stacktape credentials');
    expect(source).toContain('validate, synth, package');
    expect(source).toContain('Non-mutating commands such as diff, synth, package');
    expect(source).toContain('If generic AWS/AWS SDK MCP tools are also available');
    expect(source).toContain('Do not bypass Stacktape');
    expect(source).toContain('Stacktape authentication failed. Stop here');
    expect(source).toContain(
      'Do not call generic AWS/AWS SDK MCP tools to work around a Stacktape authentication failure'
    );
    expect(source).toContain('Stacktape MCP reuses the local Stacktape CLI authentication state');
    expect(source).toContain('Never pass apiKey/STACKTAPE_API_KEY/STP_API_KEY as MCP arguments');
    expect(source).toContain('Do not repeat API-key-like strings');
    expect(source).toContain('Tool discovery/selection alone is not enough');
    expect(source).toContain('tools are discoverable immediately');
    expect(source).toContain('Full info:stack output was compacted for MCP');
  });

  test('CLI auth metadata is agent-safe', () => {
    const login = describeCliCommand('login');
    const whoami = describeCliCommand('info:whoami');

    expect(login?.description).toContain('starts the Stacktape login flow');
    expect(login?.description).toContain('do not paste API keys into chat');
    expect(whoami?.description).toContain('local Stacktape CLI authentication state');
  });

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
