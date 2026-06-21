import { describe, expect, test } from 'bun:test';
import { cliCommands } from '../../config/cli/commands';
import {
  describeCliCommand,
  findStacktapePackageScript,
  getCliCommandPolicy,
  listCliCommandSummaries,
  parseStacktapeScriptCommand,
  prepareCliRun
} from './cli-command-tools';

describe('MCP CLI command tools', () => {
  test('lists every CLI command from command definitions', () => {
    const summaries = listCliCommandSummaries();

    expect(summaries).toHaveLength(cliCommands.length);
    expect(summaries.some((summary) => summary.command === 'deploy')).toBe(true);
    expect(summaries.some((summary) => summary.command === 'logs')).toBe(true);
  });

  test('describes commands from CLI metadata and policy metadata', () => {
    const description = describeCliCommand('deploy');

    expect(description?.command).toBe('deploy');
    expect(description?.safety).toBe('mutating');
    expect(description?.requiresConfirmation).toBe(true);
    expect(description?.requiredArgs).toContain('stage');
    expect(description?.allowedArgs).toContain('configPath');
    expect(description?.args.stage.required).toBe(true);
  });

  test('filters command list by category and safety', () => {
    const readOnlyDiagnostics = listCliCommandSummaries({
      category: 'diagnostics',
      safety: 'readOnly'
    });

    expect(readOnlyDiagnostics.map((summary) => summary.command)).toContain('logs');
    expect(readOnlyDiagnostics.every((summary) => summary.category === 'diagnostics')).toBe(true);
    expect(readOnlyDiagnostics.every((summary) => summary.safety === 'readOnly')).toBe(true);
  });

  test('rejects unknown commands and unknown args before execution', () => {
    expect(prepareCliRun({ command: 'not-a-command' }).ok).toBe(false);
    for (const oldCommand of [
      'preview-changes',
      'compile-template',
      'package-workloads',
      'debug:logs',
      'debug:sql',
      'secret:create',
      'projects:list',
      'codebuild:deploy'
    ]) {
      const result = prepareCliRun({ command: oldCommand });
      expect(result.ok, oldCommand).toBe(false);
      if (result.ok === false) expect(result.code, oldCommand).toBe('UNKNOWN_COMMAND');
      expect(describeCliCommand(oldCommand), oldCommand).toBeUndefined();
    }

    const prepared = prepareCliRun({
      command: 'info:whoami',
      args: { notAnArg: true }
    });

    expect(prepared.ok).toBe(false);
    if (prepared.ok === false) {
      expect(prepared.code).toBe('VALIDATION_ERROR');
    }
  });

  test('requires confirmation for mutating and destructive commands', () => {
    const deployWithoutConfirm = prepareCliRun({
      command: 'deploy',
      args: { stage: 'dev', region: 'us-east-1' }
    });
    const deleteWithoutConfirm = prepareCliRun({
      command: 'delete',
      args: { stage: 'dev', region: 'us-east-1' }
    });

    expect(deployWithoutConfirm.ok).toBe(false);
    expect(deleteWithoutConfirm.ok).toBe(false);
    if (deployWithoutConfirm.ok === false) expect(deployWithoutConfirm.code).toBe('CONFIRMATION_REQUIRED');
    if (deleteWithoutConfirm.ok === false) expect(deleteWithoutConfirm.code).toBe('CONFIRMATION_REQUIRED');
  });

  test('allows read-only commands without confirmation', () => {
    const prepared = prepareCliRun({
      command: 'info:whoami',
      args: { logLevel: 'info' }
    });

    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.policy.safety).toBe('readOnly');
      expect(prepared.args.logLevel).toBe('info');
    }
  });

  test('normalizes natural debug sql query arg to sql', () => {
    const prepared = prepareCliRun({
      command: 'query:sql',
      args: { stage: 'dev', region: 'us-east-1', resourceName: 'mainDatabase', query: 'SELECT 1;' }
    });

    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.args.sql).toBe('SELECT 1;');
      expect(prepared.args.query).toBeUndefined();
    }
  });

  test('adds autoConfirmOperation only for confirmed commands that support it', () => {
    const prepared = prepareCliRun({
      command: 'deploy',
      args: { stage: 'dev', region: 'us-east-1' },
      confirm: true
    });

    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.args.autoConfirmOperation).toBe(true);
    }
  });

  test('does not run interactive commands through the generic CLI runner', () => {
    const prepared = prepareCliRun({ command: 'dev', args: { stage: 'dev', region: 'us-east-1' }, confirm: true });

    expect(prepared.ok).toBe(false);
    if (prepared.ok === false) {
      expect(prepared.code).toBe('UNSUPPORTED_COMMAND');
      expect(prepared.nextActions).toContain('Use stacktape_dev instead.');
    }
  });

  test('classifies high-risk diagnostic commands conservatively', () => {
    expect(getCliCommandPolicy('container:exec').safety).toBe('mutating');
    expect(getCliCommandPolicy('aws:call').requiresConfirmation).toBe(true);
    expect(getCliCommandPolicy('secret:get').sensitiveOutput).toBe(true);
  });

  test('adds MCP-side validation for secret commands that would otherwise prompt later', () => {
    const secretCreateDescription = describeCliCommand('secret:set');
    const missingValue = prepareCliRun({
      command: 'secret:set',
      args: { region: 'eu-west-1', secretName: 'db.password' },
      confirm: true
    });
    const missingName = prepareCliRun({
      command: 'secret:get',
      args: { region: 'eu-west-1' }
    });

    expect(secretCreateDescription?.requiredArgs).toContain('secretName');
    expect(secretCreateDescription?.requiredArgs).toContain('secretValue or secretFile');
    expect(missingValue.ok).toBe(false);
    expect(missingName.ok).toBe(false);
    if (missingValue.ok === false) expect(missingValue.message).toContain('secretValue');
    if (missingName.ok === false) expect(missingName.message).toContain('secretName');
  });

  test('adds MCP-side validation for local packaging commands that would otherwise prompt later', () => {
    const packageDescription = describeCliCommand('package');
    const missingProjectName = prepareCliRun({
      command: 'package',
      args: { stage: 'dev', region: 'eu-west-1', configPath: 'stacktape.ts' }
    });

    expect(packageDescription?.requiredArgs).toContain('projectName');
    expect(missingProjectName.ok).toBe(false);
    if (missingProjectName.ok === false) {
      expect(missingProjectName.message).toContain('projectName');
    }
  });

  test('describes validate with the 4.0 option surface', () => {
    const description = describeCliCommand('validate');
    const prepared = prepareCliRun({
      command: 'validate',
      args: { stage: 'dev', region: 'eu-west-1', withPackage: true, thorough: true }
    });
    const rejectedOldOption = prepareCliRun({
      command: 'validate',
      args: { stage: 'dev', region: 'eu-west-1', withCloud: true }
    });
    const rejectedPackagingOption = prepareCliRun({
      command: 'validate',
      args: { stage: 'dev', region: 'eu-west-1', onlyWorkloads: ['api'] }
    });

    expect(description?.safety).toBe('local');
    expect(description?.requiredArgs).toEqual(['stage', 'region']);
    expect(description?.allowedArgs).toContain('withPackage');
    expect(description?.allowedArgs).toContain('thorough');
    expect(description?.allowedArgs).not.toContain('withCloud');
    expect(description?.allowedArgs).not.toContain('onlyWorkloads');
    expect(prepared.ok).toBe(true);
    expect(rejectedOldOption.ok).toBe(false);
    expect(rejectedPackagingOption.ok).toBe(false);
  });

  test('deploy supports runner selection through the canonical command', () => {
    const description = describeCliCommand('deploy');
    const prepared = prepareCliRun({
      command: 'deploy',
      args: { stage: 'dev', region: 'eu-west-1', runner: 'codebuild' },
      confirm: true
    });
    const rejectedRunner = prepareCliRun({
      command: 'deploy',
      args: { stage: 'dev', region: 'eu-west-1', runner: 'lambda' },
      confirm: true
    });

    expect(description?.allowedArgs).toContain('runner');
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.args.runner).toBe('codebuild');
      expect(prepared.args.autoConfirmOperation).toBe(true);
    }
    expect(rejectedRunner.ok).toBe(false);
  });

  test('parses stacktape package scripts and normalizes aliases', () => {
    const parsed = parseStacktapeScriptCommand(
      'stacktape deploy --region eu-west-1 --stage production --aa stacktape-dev --hs --projectName docs'
    );

    expect(parsed?.command).toBe('deploy');
    expect(parsed?.args.region).toBe('eu-west-1');
    expect(parsed?.args.awsAccount).toBe('stacktape-dev');
    expect(parsed?.args.hotSwap).toBe(true);
  });

  test('selects matching package scripts by command and stage', () => {
    const matched = findStacktapePackageScript({
      command: 'deploy',
      projectName: 'docs',
      stage: 'production',
      packageJsonFiles: [
        {
          path: 'docs/package.json',
          name: 'docs',
          relevantScripts: {
            deploy: 'stacktape deploy --region eu-west-1 --stage production --aa stacktape-dev --projectName docs',
            'deploy:preview':
              'stacktape deploy --region eu-west-1 --stage preview --aa stacktape-dev --projectName docs'
          }
        }
      ]
    });

    expect(matched?.scriptName).toBe('deploy');
    expect(matched?.parsedArgs.stage).toBe('production');
  });
});
