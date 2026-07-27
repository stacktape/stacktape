import { describe, test, expect, beforeEach } from 'bun:test';
import { PromptSink } from '../prompt-sink';
import { UserCancelledError } from '../prompts';
import { scrollbackFeed, type ScrollbackItem } from '../scrollback-feed';
import { tuiState } from '../state';
import type { TuiPromptConfirm } from '../types';

let sink: PromptSink;
let autoAnswerLogs: string[];
let received: ScrollbackItem[];

beforeEach(() => {
  tuiState.reset();
  scrollbackFeed.reset();
  scrollbackFeed.enable();
  received = [];
  scrollbackFeed.setConsumer((item) => received.push(item));
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
  test('sets the active prompt and resolves with a scrollback transcript', async () => {
    const promise = sink.confirm({
      config: { message: 'Deploy to production?', defaultValue: false },
      isEnabled: true,
      isTTY: true
    });

    const prompt = tuiState.getSnapshot().activePrompt as TuiPromptConfirm;
    expect(prompt?.type).toBe('confirm');
    prompt.resolve(true);

    await expect(promise).resolves.toBe(true);
    expect(tuiState.getSnapshot().activePrompt).toBeUndefined();
    expect(received).toEqual([{ kind: 'prompt-answer', message: 'Deploy to production?', answer: 'yes' }]);
  });

  test('text prompt masks password answers in the transcript', async () => {
    const promise = sink.text({
      config: { message: 'API key', isPassword: true },
      isEnabled: true,
      isTTY: true
    });

    const prompt = tuiState.getSnapshot().activePrompt;
    (prompt as Extract<typeof prompt, { type: 'text' }>)!.resolve('secret');

    await expect(promise).resolves.toBe('secret');
    expect(received[0]).toEqual({ kind: 'prompt-answer', message: 'API key', answer: '••••••' });
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
