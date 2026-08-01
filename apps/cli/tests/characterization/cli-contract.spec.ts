import { describe, expect, test } from 'bun:test';
import {
  cliCommands,
  commandsNotRequiringApiKey,
  commandsWithDisabledAnnouncements,
  commandDefinitions,
  type StacktapeCommand
} from '../../src/config/cli/commands';
import { getArgInfo, validateCommandArgs } from '../../src/config/cli/utils';
import { allCliArgsSchema, argAliases } from '../../src/config/cli/options';

const capabilityCommands: Record<string, StacktapeCommand[]> = {
  lifecycle: ['deploy', 'delete', 'dev', 'synth', 'diff', 'rollback'],
  packaging: ['package', 'bucket:sync'],
  configuration: ['init', 'validate', 'defaults:configure', 'defaults:list'],
  observability: ['logs', 'alarms', 'info:stack', 'info:stacks', 'info:operations'],
  dataAccess: ['query:sql', 'query:dynamodb', 'query:redis', 'query:opensearch'],
  remoteAccess: ['bastion:session', 'bastion:tunnel', 'container:session', 'container:exec'],
  identity: ['login', 'logout', 'org:list', 'project:list', 'info:whoami'],
  automation: ['script:run', 'deployment-script:run', 'mcp']
};

describe('CLI capability contract', () => {
  test('retains every major user capability during the v4 migration', () => {
    for (const [capability, commands] of Object.entries(capabilityCommands)) {
      expect(
        commands.every((command) => cliCommands.includes(command)),
        capability
      ).toBe(true);
    }
  });

  test('every command has usable metadata and internally consistent required arguments', () => {
    for (const command of cliCommands) {
      const definition = commandDefinitions[command];
      expect(definition.description.trim().length, `${command} description`).toBeGreaterThan(20);

      for (const requiredArg of definition.requiredArgs) {
        expect(requiredArg in definition.args, `${command} --${requiredArg}`).toBe(true);
        expect(getArgInfo(command, requiredArg).required, `${command} --${requiredArg}`).toBe(true);
      }
    }
  });

  test('preserves the minimum inputs for destructive and environment-specific operations', () => {
    expect(commandDefinitions.deploy.requiredArgs).toEqual(['stage', 'region']);
    expect(commandDefinitions.dev.requiredArgs).toEqual(['region', 'stage']);
    expect(commandDefinitions.delete.requiredArgs).toContain('region');
    expect(commandDefinitions['container:exec'].requiredArgs).toEqual(['region', 'stage', 'resourceName', 'command']);
    expect(commandDefinitions['query:sql'].requiredArgs).toEqual(['region', 'stage', 'resourceName', 'sql']);
  });

  test('keeps local commands usable before Stacktape authentication', () => {
    expect(commandsNotRequiringApiKey).toEqual(
      expect.arrayContaining([
        'help',
        'version',
        'init',
        'login',
        'logout',
        'mcp',
        'defaults:list',
        'package',
        'synth',
        'validate'
      ])
    );
    expect(commandsNotRequiringApiKey).not.toContain('deploy');
    expect(commandsNotRequiringApiKey).not.toContain('secret:get');

    for (const command of ['package', 'synth', 'validate'] as const) {
      expect(commandDefinitions[command].args).toHaveProperty('profile');
      expect(commandDefinitions[command].args).not.toHaveProperty('awsAccount');
      expect(commandDefinitions[command].args).not.toHaveProperty('templateId');
    }
  });

  test('answers help and version without update or announcement traffic', () => {
    // `runCommand` skips `checkForUpdates`/`printAnnouncements` for these commands, which is what keeps
    // `stacktape --help` and `--version` instant offline and the compiled smoke check network-free.
    expect(commandsWithDisabledAnnouncements).toEqual(expect.arrayContaining(['help', 'version']));
    expect(commandsWithDisabledAnnouncements.every((command) => cliCommands.includes(command))).toBe(true);
    expect(commandsWithDisabledAnnouncements).not.toContain('deploy');
  });
});

describe('CLI option semantics', () => {
  test('every declared option and alias belongs to a live command', () => {
    const commandArgs = new Set(
      Object.values(commandDefinitions).flatMap((definition) => Object.keys(definition.args))
    );

    expect(Object.keys(allCliArgsSchema.shape).filter((option) => !commandArgs.has(option))).toEqual([]);
    expect(Object.keys(argAliases).filter((option) => !commandArgs.has(option))).toEqual([]);
  });

  test('validates representative scalar, enum, and array options', () => {
    expect(
      validateCommandArgs('deploy', {
        stage: 'test',
        region: 'eu-west-1',
        runner: 'ec2',
        dockerArgs: ['--build-arg', 'MODE=test']
      }).success
    ).toBe(true);

    expect(validateCommandArgs('deploy', { runner: 'unknown-runner' }).success).toBe(false);
    expect(validateCommandArgs('deploy', { dockerArgs: '--no-cache' }).success).toBe(false);
    expect(validateCommandArgs('dev', { outputFormat: 'xml' }).success).toBe(false);
    expect(
      validateCommandArgs('validate', { stage: 'test', region: 'eu-west-1', outFile: '/tmp/template.yaml' }).success
    ).toBe(true);
  });

  test('retains documented aliases and machine-output choices', () => {
    expect(getArgInfo('deploy', 'configPath').alias).toContain('cp');
    expect(getArgInfo('deploy', 'region').alias).toContain('r');
    expect(getArgInfo('deploy', 'stage').alias).toContain('s');
    expect(getArgInfo('deploy', 'outputFormat').allowedValues).toEqual(['jsonl', 'plain', 'tty']);
  });

  test('exposes one dev workflow without the retired legacy mode selector', () => {
    expect(commandDefinitions.dev.args).not.toHaveProperty('devMode');
    expect(argAliases).not.toHaveProperty('devMode');
  });
});
