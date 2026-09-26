import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { checkExecutableInPath } from '@utils/bin-executable';
import { CliError } from '@utils/errors';

/**
 * The sign-ins of the coding agents other than Claude Code, as their own CLIs keep them: Codex's ChatGPT tokens, Grok's
 * sign-in file and OpenCode's. Each is read where the agent writes it, after the agent's own sign-in ran on the person's
 * terminal when there was none to use. Nothing here prints or logs a credential.
 */

/** Runs a command on the person's terminal, for a sign-in that draws its own prompts, and returns its exit code. */
export const runOnTerminal = (command: string, args: string[]) =>
  new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env: process.env });
    child.on('error', reject);
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });

/** Whether a sign-in can open a browser here: not over SSH, and on Linux only with a display (or WSL's Windows side). */
export const canOpenBrowser = ({
  env = process.env,
  platform = process.platform
}: { env?: NodeJS.ProcessEnv; platform?: NodeJS.Platform } = {}) => {
  if (env.SSH_CONNECTION || env.SSH_TTY) return false;
  if (platform === 'linux') return Boolean(env.DISPLAY || env.WAYLAND_DISPLAY || env.WSL_DISTRO_NAME);
  return true;
};

const readJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const findAgentCli = ({ command, agent, installHint }: { command: string; agent: string; installHint: string }) => {
  const binary = checkExecutableInPath(command);
  if (!binary) {
    throw new CliError({
      category: 'MISSING_PREREQUISITE',
      code: 'AI_AGENT_CLI_NOT_FOUND',
      message: `The \`${command}\` command was not found on your PATH, so Stacktape cannot use your ${agent} sign-in.`,
      hints: [installHint]
    });
  }
  return binary;
};

export type AgentSignIn<Credential> = {
  /** The agent's CLI on this machine. */
  binary: () => string;
  /** The sign-in to connect, or null when the agent has none Stacktape can use yet. */
  current: (binary: string) => Credential;
  /** The agent's own sign-in, on the terminal. */
  signIn: (binary: string) => Promise<number>;
};

export type CodexTokens = { id_token: string; access_token: string; refresh_token: string; account_id: string };

/**
 * Codex keeps a ChatGPT sign-in as tokens in `$CODEX_HOME/auth.json` (`~/.codex` by default). An OpenAI API key it
 * keeps there is not a subscription and is never read.
 */
export const codexSignIn = ({ env = process.env }: { env?: NodeJS.ProcessEnv } = {}): AgentSignIn<{
  tokens: CodexTokens;
  lastRefresh: string | null;
} | null> => {
  const authFile = join(env.CODEX_HOME || join(homedir(), '.codex'), 'auth.json');
  return {
    binary: () =>
      findAgentCli({
        command: 'codex',
        agent: 'Codex',
        installHint: 'Install the Codex CLI first: `npm install -g @openai/codex`.'
      }),
    current: (binary) => {
      const status = spawnSync(binary, ['login', 'status'], { encoding: 'utf8', env });
      const said = `${status.stdout ?? ''}${status.stderr ?? ''}`;
      if (status.status !== 0 || !/logged in/iu.test(said)) return null;
      if (!/chatgpt/iu.test(said)) {
        throw new CliError({
          category: 'CLI',
          code: 'CODEX_NOT_SIGNED_IN_WITH_CHATGPT',
          message:
            'Codex is signed in with an OpenAI API key, and an API key is not a subscription, so nothing was connected.',
          hints: [
            'Sign in to Codex with your ChatGPT account (`codex login`) and run `stacktape ai:connect` again.',
            'To fund runs with an OpenAI API key, an Admin or Owner connects it once for the organization in the Console.'
          ]
        });
      }
      const auth = readJson(authFile);
      const tokens = isRecord(auth) && isRecord(auth.tokens) ? auth.tokens : null;
      const fields = ['id_token', 'access_token', 'refresh_token', 'account_id'] as const;
      if (!tokens || !fields.every((field) => typeof tokens[field] === 'string' && tokens[field])) {
        throw new CliError({
          category: 'CLI',
          code: 'CODEX_SIGN_IN_NOT_IN_FILE',
          message: `Codex says it is signed in with ChatGPT, but ${authFile} holds no sign-in, so nothing was connected.`,
          hints: [
            'Codex may keep your sign-in in the system keyring. Set `cli_auth_credentials_store = "file"` in ' +
              '~/.codex/config.toml, run `codex login`, then run `stacktape ai:connect` again.'
          ]
        });
      }
      return {
        tokens: {
          id_token: tokens.id_token as string,
          access_token: tokens.access_token as string,
          refresh_token: tokens.refresh_token as string,
          account_id: tokens.account_id as string
        },
        lastRefresh: isRecord(auth) && typeof auth.last_refresh === 'string' ? auth.last_refresh : null
      };
    },
    signIn: (binary) => runOnTerminal(binary, canOpenBrowser({ env }) ? ['login'] : ['login', '--device-auth'])
  };
};

// What Grok keeps about the person beside the sign-in itself; a run does not need it, so it stays on this machine.
const GROK_PROFILE_FIELDS = ['first_name', 'email', 'profile_image_asset_id'];

/**
 * Grok keeps its sign-in in `$GROK_HOME/auth.json` (`~/.grok` by default): per identity provider, a token that lasts
 * days and a refresh token. One that expired and cannot be refreshed needs a new sign-in.
 */
export const grokSignIn = ({
  env = process.env,
  now = () => Date.now()
}: { env?: NodeJS.ProcessEnv; now?: () => number } = {}): AgentSignIn<Record<string, unknown> | null> => {
  const authFile = join(env.GROK_HOME || join(homedir(), '.grok'), 'auth.json');
  return {
    binary: () =>
      findAgentCli({
        command: 'grok',
        agent: 'Grok',
        installHint: 'Install the Grok CLI first: `curl -fsSL https://x.ai/cli/install.sh | bash`.'
      }),
    current: () => {
      const auth = readJson(authFile);
      if (!isRecord(auth)) return null;
      const usable = Object.entries(auth).filter(
        ([, entry]) =>
          isRecord(entry) &&
          typeof entry.key === 'string' &&
          (typeof entry.refresh_token === 'string' ||
            (typeof entry.expires_at === 'string' && Date.parse(entry.expires_at) > now() + 60 * 60 * 1000))
      );
      if (!usable.length) return null;
      return Object.fromEntries(
        usable.map(([identity, entry]) => [
          identity,
          Object.fromEntries(
            Object.entries(entry as Record<string, unknown>).filter(([field]) => !GROK_PROFILE_FIELDS.includes(field))
          )
        ])
      );
    },
    signIn: (binary) => runOnTerminal(binary, canOpenBrowser({ env }) ? ['login'] : ['login', '--device-auth'])
  };
};

/**
 * OpenCode keeps the sign-ins it made with other providers in `$XDG_DATA_HOME/opencode/auth.json`
 * (`~/.local/share/opencode` by default): subscriptions it signed in to and API keys it was given, per provider.
 */
export const openCodeSignIn = ({ env = process.env }: { env?: NodeJS.ProcessEnv } = {}): AgentSignIn<Record<
  string,
  unknown
> | null> => {
  const authFile = join(env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'opencode', 'auth.json');
  return {
    binary: () =>
      findAgentCli({
        command: 'opencode',
        agent: 'OpenCode',
        installHint: 'Install OpenCode first: `npm install -g opencode-ai`, or see https://opencode.ai/docs.'
      }),
    current: () => {
      const auth = readJson(authFile);
      if (!isRecord(auth)) return null;
      const signIns = Object.entries(auth).filter(([, entry]) => isRecord(entry) && typeof entry.type === 'string');
      return signIns.length ? Object.fromEntries(signIns) : null;
    },
    signIn: (binary) => runOnTerminal(binary, ['auth', 'login'])
  };
};
