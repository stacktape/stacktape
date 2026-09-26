import { describe, expect, test } from 'bun:test';
import { chmodSync, existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CliError } from '@utils/errors';
import {
  captureSetupTokenThroughPseudoTerminal,
  extractSetupToken,
  pseudoTerminalRecorder
} from './claude-setup-token';

/**
 * The risky boundary is the pseudo-terminal recording: `claude setup-token` draws through a TTY, so the token is
 * read from what `script` recorded. A stand-in `claude` prints what the real one prints around the token (a banner,
 * colors and a terminal hyperlink), and the real `script` records it.
 */
const standInClaude = (body: string) => {
  const directory = mkdtempSync(join(tmpdir(), 'stacktape-ai-connect-spec-'));
  const binary = join(directory, 'claude');
  writeFileSync(binary, `#!/bin/sh\n${body}\n`);
  chmodSync(binary, 0o755);
  return binary;
};

const TOKEN = `sk-ant-oat01-${'x'.repeat(40)}_-abc`;
const recorder = pseudoTerminalRecorder();
const describeWithRecorder = recorder ? describe : describe.skip;

describe('extractSetupToken', () => {
  test('finds the token among colors, cursor moves and terminal hyperlinks, and takes the last one', () => {
    const transcript =
      '\u001b[1mWelcome to Claude Code\u001b[0m\r\n' +
      '\u001b]8;id=1;https://claude.com/oauth\u0007https://claude.com/oauth\u001b]8;;\u0007\r\n' +
      `Old: sk-ant-oat01-${'y'.repeat(30)}\r\n` +
      `\u001b[32m${TOKEN}\u001b[0m\r\n`;
    expect(extractSetupToken(transcript)).toBe(TOKEN);
  });

  test('returns null for text without a subscription token', () => {
    expect(extractSetupToken('sk-ant-api03-not-a-subscription-token and nothing else')).toBeNull();
  });
});

describeWithRecorder('captureSetupTokenThroughPseudoTerminal', () => {
  test('returns the token a stand-in claude prints inside the recorded pseudo-terminal and deletes the transcript', async () => {
    const transcriptDirectories = () =>
      readdirSync(tmpdir()).filter((name) => name.startsWith('stacktape-ai-connect-') && !name.includes('spec')).length;
    const before = transcriptDirectories();
    const claudeBinary = standInClaude(
      `printf 'Welcome to Claude Code\\n'\nprintf '\\033]8;;https://claude.com/oauth\\007sign in\\033]8;;\\007\\n'\nprintf '\\033[32m%s\\033[0m\\n' '${TOKEN}'`
    );
    const token = await captureSetupTokenThroughPseudoTerminal({ claudeBinary, recorder });
    expect(token).toBe(TOKEN);
    expect(transcriptDirectories(), 'the transcript directory is removed').toBe(before);
  });

  test('fails when claude exits without printing a token', async () => {
    const claudeBinary = standInClaude(`printf 'Browser did not open\\n'\nexit 1`);
    await expect(captureSetupTokenThroughPseudoTerminal({ claudeBinary, recorder })).rejects.toBeInstanceOf(CliError);
    expect(existsSync(claudeBinary)).toBe(true);
  });
});
