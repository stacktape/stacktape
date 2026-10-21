import { publicCommandLine } from '../../config/cli/public-names';
import { describe, expect, test } from 'bun:test';
import {
  parseStacktapeScriptCommand,
  prepareCliRun,
  describeCliCommand,
  normalizeCliInvocation,
  listCliCommandSummaries
} from './cli-command-tools';

describe('MCP package script parsing', () => {
  test('parses stacktape package scripts and normalizes aliases', () => {
    for (const [script, expected] of [
      [
        'stacktape deploy --region eu-west-1 --stage production --aa prod-account --fd --projectName docs',
        {
          command: 'deploy',
          args: {
            region: 'eu-west-1',
            stage: 'production',
            awsAccount: 'prod-account',
            fullDeploy: true,
            projectName: 'docs'
          }
        }
      ],
      [
        'pnpm exec stacktape diff --stage=preview --configPath "infra/stacktape.ts"',
        { command: 'diff', args: { stage: 'preview', configPath: 'infra/stacktape.ts' } }
      ],
      [
        'node_modules/.bin/stacktape logs --container api --region eu-west-1',
        { command: 'logs', args: { container: 'api', region: 'eu-west-1' } }
      ],
      ['bun test', undefined],
      ['stacktape obsolete-command --stage dev', undefined]
    ] as const) {
      expect(parseStacktapeScriptCommand(script), script).toEqual(expected);
    }
  });
});

test('public and internal invocations normalize before safety policy lookup', () => {
  for (const [publicName, id, args] of [
    ['secret set', 'secret:set', { region: 'eu-west-1', secretName: 'token', secretFile: 'secret.txt' }],
    ['stack recover', 'cf:rollback', { region: 'eu-west-1', stage: 'prod' }],
    ['container shell', 'container:session', {}],
    ['error resolve', 'errors:resolve', { issueId: 'issue' }]
  ] as const) {
    expect(prepareCliRun({ command: publicName, args, confirm: true })).toEqual(
      prepareCliRun({ command: id, args, confirm: true })
    );
    expect(describeCliCommand(publicName)?.canonicalCommand).toBe(id);
    expect(describeCliCommand(publicName)?.command).toBe(publicName);
  }
  expect(normalizeCliInvocation('incident list', { status: 'OPEN' })).toEqual({
    command: 'incidents',
    args: { incidentStatus: 'OPEN' }
  });
  expect(normalizeCliInvocation('error list', { status: 'OPEN' })).toEqual({
    command: 'errors:list',
    args: { issueStatus: 'OPEN' }
  });
  expect(normalizeCliInvocation('secret set', { value: 'x', file: 'secret.txt' }).args).toEqual({
    secretValue: 'x',
    secretFile: 'secret.txt'
  });
  expect(listCliCommandSummaries().find((item) => item.canonicalCommand === 'info:stack')?.command).toBe('status');
});

test('package scripts accept public paths, positionals, typed flags and custom suffixes', () => {
  expect(parseStacktapeScriptCommand('stacktape container exec web "ls -la" --stage dev --json')).toEqual({
    command: 'container:exec',
    args: { resourceName: 'web', command: 'ls -la', stage: 'dev', outputFormat: 'jsonl' }
  });
  expect(
    parseStacktapeScriptCommand('stacktape secret set token --file "keys/token value.txt" --region eu-west-1')
  ).toEqual({
    command: 'secret:set',
    args: { secretName: 'token', secretFile: 'keys/token value.txt', region: 'eu-west-1' }
  });
});

test('quoted public package scripts round-trip literal shell characters', () => {
  const args = { secretName: 'token', secretFile: "keys/owner's token.txt", region: 'eu-west-1' };
  expect(parseStacktapeScriptCommand(publicCommandLine('secret:set', args))).toEqual({ command: 'secret:set', args });
});
