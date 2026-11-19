import { describe, expect, test } from 'bun:test';
import { recordStackOperationInputSchema } from '@stacktape/console-api/api-key';
import { parseCliInput } from '@utils/cli';
import { validateArgs } from '@utils/validator';
import { commandArgsForRecording } from './recorded-command-args';

const SYNTHETIC_CREDENTIAL = 'synthetic-npm-token-value';

const recordedDeployArgs = (argv: string[]) => {
  const { commands, options } = parseCliInput(argv);
  validateArgs({ rawArgs: options, command: commands[0], defaults: {}, fromEnv: {} });
  return commandArgsForRecording({ args: options, stage: 'production' });
};

describe('recorded command arguments', () => {
  test('a deploy keeps its target and options but not the Docker arguments it passes to the build', () => {
    const recorded = recordedDeployArgs([
      'deploy',
      '--stage',
      'production',
      '--region',
      'eu-west-1',
      `--docker-args=--build-arg=NPM_TOKEN=${SYNTHETIC_CREDENTIAL}`,
      '--full'
    ]);

    expect(recorded).toEqual({ stage: 'production', region: 'eu-west-1', fullDeploy: true });
    const wire = recordStackOperationInputSchema.parse({
      invocationId: 'synthetic',
      command: 'deploy',
      commandArgs: recorded
    });
    expect(JSON.stringify(wire)).not.toContain(SYNTHETIC_CREDENTIAL);
  });

  test('script env, SDK input and other free-form values never leave the CLI', () => {
    const recorded = commandArgsForRecording({
      args: {
        scriptName: 'migrate',
        env: [`DATABASE_PASSWORD=${SYNTHETIC_CREDENTIAL}`],
        sdkInput: `{"SecretString":"${SYNTHETIC_CREDENTIAL}"}`,
        command: `curl -H "Authorization: ${SYNTHETIC_CREDENTIAL}"`,
        apiKey: SYNTHETIC_CREDENTIAL,
        currentWorkingDirectory: '/home/someone/project',
        sourcePath: './dist'
      },
      stage: 'dev'
    });

    expect(recorded).toEqual({ scriptName: 'migrate', stage: 'dev' });
  });

  test('a stage from saved defaults is recorded when --stage was not passed', () => {
    expect(commandArgsForRecording({ args: { region: 'eu-west-1' }, stage: 'staging' })).toEqual({
      region: 'eu-west-1',
      stage: 'staging'
    });
    expect(commandArgsForRecording({ args: { stage: 'explicit' }, stage: 'staging' })).toEqual({ stage: 'explicit' });
  });
});
