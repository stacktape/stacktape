import { afterAll, describe, expect, test } from 'bun:test';
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { CliError } from '@utils/errors';
import { captureSetupTokenThroughPseudoTerminal, pseudoTerminalRecorder } from './claude-setup-token';

/**
 * The risky boundary is the pseudo-terminal recording: `claude setup-token` draws through a TTY, so the token is
 * read from what `script` recorded. A stand-in `claude` prints what the real one prints around the token (a banner,
 * colors and a terminal hyperlink), and the real `script` records it.
 */
const standInDirectories: string[] = [];
afterAll(() => {
  for (const directory of standInDirectories) rmSync(directory, { recursive: true, force: true });
});
const standInClaude = (body: string) => {
  const directory = mkdtempSync(join(tmpdir(), 'stacktape-ai-connect-spec-'));
  standInDirectories.push(directory);
  const binary = join(directory, 'claude');
  writeFileSync(binary, `#!/bin/sh\n${body}\n`);
  chmodSync(binary, 0o755);
  return binary;
};

const TOKEN = `sk-ant-oat01-${'x'.repeat(40)}_-abc`;
const recorder = pseudoTerminalRecorder();
const describeWithRecorder = recorder ? describe : describe.skip;

describeWithRecorder('captureSetupTokenThroughPseudoTerminal', () => {
  test('returns the token a stand-in claude prints inside the recorded pseudo-terminal and deletes the transcript', async () => {
    let transcript = '';
    const recording = (binary: string, path: string) => {
      transcript = path;
      return recorder!(binary, path);
    };
    const claudeBinary = standInClaude(
      `printf 'Old: sk-ant-oat01-${'y'.repeat(30)}\\n'\nprintf 'Welcome to Claude Code\\n'\nprintf '\\033]8;;https://claude.com/oauth\\007sign in\\033]8;;\\007\\n'\nprintf '\\033[32m%s\\033[0m\\n' '${TOKEN}'`
    );
    const token = await captureSetupTokenThroughPseudoTerminal({ claudeBinary, recorder: recording });
    expect(token).toBe(TOKEN);
    expect(existsSync(dirname(transcript)), 'the owned transcript directory is removed').toBe(false);
  });

  test('rejects API-key output and an unsuccessful sign-in, deleting either transcript', async () => {
    for (const body of [`printf 'sk-ant-api03-not-a-subscription-token\\n'`, `printf '%s\\n' '${TOKEN}'\nexit 1`]) {
      const claudeBinary = standInClaude(body);
      let transcript = '';
      const recording = (binary: string, path: string) => {
        transcript = path;
        return recorder!(binary, path);
      };
      await expect(
        captureSetupTokenThroughPseudoTerminal({ claudeBinary, recorder: recording })
      ).rejects.toBeInstanceOf(CliError);
      expect(existsSync(dirname(transcript))).toBe(false);
      expect(existsSync(claudeBinary)).toBe(true);
    }
  });
});
