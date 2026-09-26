import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkExecutableInPath } from '@utils/bin-executable';
import { CliError } from '@utils/errors';
import { runOnTerminal } from './agent-sign-ins';

/**
 * Runs `claude setup-token` for the person and captures the long-lived token it prints.
 *
 * The command signs the person in through their browser and needs a terminal: it draws its prompts through a TTY and
 * waits for the OAuth callback or a pasted code. Its stdout can therefore not simply be piped. On Linux and macOS the
 * session runs inside a pseudo-terminal that `script` records to a private file; the token is read from that file and
 * the file is deleted. Where no `script` is available (Windows), the session runs on the real terminal and the person
 * pastes the token the command printed.
 */

const TOKEN_PATTERN = /sk-ant-oat01-[A-Za-z0-9_-]{20,}/gu;
// ANSI colors and cursor moves, and OSC sequences such as terminal hyperlinks. Built from strings, since the escape
// and bell characters are control characters.
const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);
const TERMINAL_SEQUENCES = new RegExp(
  `${ESC}\\[[0-?]*[ -/]*[@-~]|${ESC}\\][^${BEL}${ESC}]*(?:${BEL}|${ESC}\\\\)|${ESC}[78]`,
  'gu'
);

export const CLAUDE_INSTALL_HINT =
  'Install the Claude Code CLI first: `npm install -g @anthropic-ai/claude-code`, or see https://code.claude.com/docs/en/setup.';

export const findClaudeBinary = () => {
  const binary = checkExecutableInPath('claude');
  if (!binary) {
    throw new CliError({
      category: 'MISSING_PREREQUISITE',
      code: 'CLAUDE_CLI_NOT_FOUND',
      message: 'The `claude` command was not found on your PATH, so `claude setup-token` cannot run.',
      hints: [CLAUDE_INSTALL_HINT]
    });
  }
  return binary;
};

/** The last subscription token in a terminal transcript, or null. */
export const extractSetupToken = (transcript: string) => {
  const matches = transcript.replace(TERMINAL_SEQUENCES, '').match(TOKEN_PATTERN);
  return matches ? matches[matches.length - 1]! : null;
};

const shellQuote = (value: string) => `'${value.replace(/'/gu, "'\\''")}'`;

/** How `script` records a command on this platform, or null where it cannot. */
export const pseudoTerminalRecorder = ({
  platform = process.platform,
  scriptBinary = checkExecutableInPath('script')
}: { platform?: NodeJS.Platform; scriptBinary?: string | undefined } = {}) => {
  if (!scriptBinary || platform === 'win32') return null;
  return (claudeBinary: string, transcriptPath: string): { command: string; args: string[] } =>
    platform === 'darwin'
      ? // BSD script: `script -q <file> <command> [args]`.
        { command: scriptBinary, args: ['-q', transcriptPath, claudeBinary, 'setup-token'] }
      : // util-linux script: `-q` quiet, `-e` return the command's exit code, `-c` the command.
        { command: scriptBinary, args: ['-q', '-e', '-c', `${shellQuote(claudeBinary)} setup-token`, transcriptPath] };
};

const notCompleted = () =>
  new CliError({
    category: 'CLI',
    code: 'CLAUDE_SETUP_TOKEN_NOT_COMPLETED',
    message: 'Claude sign-in did not complete, so no token was connected.',
    hints: ['Run `stacktape ai:connect` again and finish the sign-in in your browser.']
  });

/**
 * Runs `claude setup-token` inside a recorded pseudo-terminal and returns the token it printed. Returns null when
 * the platform has no pseudo-terminal recorder, so the caller falls back to asking for the token.
 */
export const captureSetupTokenThroughPseudoTerminal = async ({
  claudeBinary,
  recorder = pseudoTerminalRecorder()
}: {
  claudeBinary: string;
  recorder?: ReturnType<typeof pseudoTerminalRecorder>;
}) => {
  if (!recorder) return null;
  const directory = mkdtempSync(join(tmpdir(), 'stacktape-ai-connect-'));
  const transcriptPath = join(directory, 'transcript');
  try {
    const { command, args } = recorder(claudeBinary, transcriptPath);
    const exitCode = await runOnTerminal(command, args);
    let transcript = '';
    try {
      transcript = readFileSync(transcriptPath, 'utf8');
    } catch {
      transcript = '';
    }
    const token = extractSetupToken(transcript);
    if (exitCode !== 0 || !token) throw notCompleted();
    return token;
  } finally {
    // The transcript holds the token.
    rmSync(directory, { recursive: true, force: true });
  }
};

/** Runs `claude setup-token` on the real terminal; the person then pastes the token it printed. */
export const runSetupTokenOnTerminal = async (claudeBinary: string) => {
  const exitCode = await runOnTerminal(claudeBinary, ['setup-token']);
  if (exitCode !== 0) throw notCompleted();
};
