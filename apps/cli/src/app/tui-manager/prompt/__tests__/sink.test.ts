import { describe, test, expect, beforeEach } from 'bun:test';
import { PromptSink } from '../sink';
import { UserCancelledError } from '../inline';
import { tuiState } from '../../progress/state';
import type { TuiPromptConfirm } from '../../progress/types';
import { interactionCoordinator } from '../../interaction/coordinator';
import { operationSession } from '@application-services/operation-manager';

let sink: PromptSink;
let autoAnswerLogs: string[];

beforeEach(() => {
  tuiState.reset();
  autoAnswerLogs = [];
  sink = new PromptSink((message) => autoAnswerLogs.push(message));
});

describe('PromptSink non-interactive mode', () => {
  test('answers with the default and logs the auto-answer', async () => {
    const result = await sink.confirm({
      config: { message: 'Proceed?', defaultValue: true },
      isEnabled: false,
      isTTY: false
    });
    expect(result).toBe(true);
    expect(autoAnswerLogs).toHaveLength(1);
    expect(autoAnswerLogs[0]).toContain('Proceed?');
    expect(autoAnswerLogs[0]).toContain('yes');
  });

  test('select resolves the default value with its label in the log', async () => {
    const result = await sink.select({
      config: {
        message: 'Pick region',
        options: [{ label: 'Ireland (eu-west-1)', value: 'eu-west-1' }],
        defaultValue: 'eu-west-1'
      },
      isEnabled: false,
      isTTY: false
    });
    expect(result).toBe('eu-west-1');
    expect(autoAnswerLogs[0]).toContain('Ireland (eu-west-1)');
  });

  test('throws a structured error when no default exists', async () => {
    await expect(
      sink.confirm({ config: { message: 'Proceed?' }, isEnabled: false, isTTY: false })
    ).rejects.toMatchObject({ type: 'INPUT', isExpected: true });
  });
});

describe('PromptSink TUI mode', () => {
  test('sets the active prompt and resolves with a journal transcript', async () => {
    let promptSurfaceRuns = 0;
    sink = new PromptSink(
      (message) => autoAnswerLogs.push(message),
      async (run) => {
        promptSurfaceRuns++;
        return run();
      }
    );
    const promise = sink.confirm({
      config: { message: 'Deploy to production?', defaultValue: false },
      isEnabled: true,
      isTTY: true
    });

    const prompt = tuiState.getSnapshot().activePrompt as TuiPromptConfirm;
    expect(promptSurfaceRuns).toBe(1);
    expect(prompt?.type).toBe('confirm');
    interactionCoordinator.answerPrompt(prompt.id, true);

    await expect(promise).resolves.toBe(true);
    expect(tuiState.getSnapshot().activePrompt).toBeUndefined();
    expect(operationSession.journal.replay().at(-1)).toMatchObject({
      type: 'prompt-closed',
      promptId: prompt.id,
      answer: 'Yes',
      sensitive: false
    });
  });

  test('text prompt masks password answers in the transcript', async () => {
    const promise = sink.text({
      config: { message: 'API key', isPassword: true, defaultValue: 'secret-default' },
      isEnabled: true,
      isTTY: true
    });

    const prompt = tuiState.getSnapshot().activePrompt;
    expect(JSON.stringify(operationSession.journal.replay())).not.toContain('secret-default');
    expect(interactionCoordinator.getSensitiveDefault(prompt!.id)).toBe('secret-default');
    interactionCoordinator.answerPrompt(prompt!.id, 'secret');

    await expect(promise).resolves.toBe('secret');
    expect(operationSession.journal.replay().at(-1)).toMatchObject({
      type: 'prompt-closed',
      promptId: prompt!.id,
      sensitive: true,
      answer: undefined
    });
  });

  test('rejectPending rejects a prompt stranded by renderer teardown', async () => {
    const promise = sink.confirm({
      config: { message: 'Proceed?', defaultValue: true },
      isEnabled: true,
      isTTY: true
    });

    sink.rejectPending();

    await expect(promise).rejects.toBeInstanceOf(UserCancelledError);
    expect(tuiState.getSnapshot().activePrompt).toBeUndefined();
  });
});
