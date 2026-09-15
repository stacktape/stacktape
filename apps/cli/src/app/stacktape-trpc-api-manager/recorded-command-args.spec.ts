import { describe, expect, test } from 'bun:test';
import { commandArgsForRecording } from './recorded-command-args';

describe('commandArgsForRecording', () => {
  test('adds the stage taken from the CLI defaults when --stage was not passed', () => {
    expect(commandArgsForRecording({ args: { region: 'eu-west-1' }, stage: 'production' })).toEqual({
      region: 'eu-west-1',
      stage: 'production'
    });
  });

  test('keeps an explicit --stage argument exactly as it was typed', () => {
    expect(commandArgsForRecording({ args: { stage: 2024 }, stage: 2024 })).toEqual({ stage: 2024 });
    expect(commandArgsForRecording({ args: { stage: 'dev' }, stage: 'dev' })).toEqual({ stage: 'dev' });
  });

  test('leaves the arguments untouched while no stage is known', () => {
    const args = { region: 'eu-west-1' };
    expect(commandArgsForRecording({ args, stage: undefined })).toBe(args);
  });
});
