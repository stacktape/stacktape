import { describe, expect, test } from 'bun:test';
import { parseStacktapeScriptCommand } from './cli-command-tools';

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
