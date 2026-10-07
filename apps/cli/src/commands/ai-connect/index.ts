import type { ConnectAiSubscriptionParams } from '@stacktape/console-api/api-key';
import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
import { initializeControlPlaneOperation } from '../_utils/initialization';
import { type AgentSignIn, codexSignIn, grokSignIn, openCodeSignIn } from './agent-sign-ins';
import {
  captureSetupTokenThroughPseudoTerminal,
  extractSetupToken,
  findClaudeBinary,
  runSetupTokenOnTerminal
} from './claude-setup-token';

const REFRESH_NOTE =
  'A run may refresh the sign-in. If the provider then replaces its refresh token, either your local sign-in or ' +
  "Stacktape's copy stops working; run `stacktape ai:connect` again to connect a fresh one.";
const STORAGE_NOTE =
  'Stacktape stores a copy for your user in this organization, encrypted; it is never shown or logged by Stacktape. ' +
  'To start a run, the copy goes into an encrypted, expiring parameter in the incident’s AWS account, where the ' +
  'runner reads and deletes it. Remove it at any time with `stacktape ai:disconnect`.';

/**
 * The providers whose subscription a member can connect for the hosted incident runs they request, each with the
 * coding agent a run then uses. Each entry says what the connection does, so the person chooses knowingly.
 */
export const AI_PROVIDERS = {
  claude: {
    label: 'Claude subscription (Anthropic), for Claude Code',
    description: 'Signs you in with the Claude Code CLI and stores the long-lived token it prints.',
    explanation: [
      'This runs `claude setup-token` for you. Your browser opens to sign in to Claude; when you finish, the Claude',
      'Code CLI prints a long-lived token and Stacktape captures it. Only the hosted incident runs you request with',
      '"Your Claude subscription" use it, running Claude Code, and they count against your own Claude plan.',
      STORAGE_NOTE
    ].join(' ')
  },
  codex: {
    label: 'ChatGPT plan (OpenAI), for Codex',
    description: 'Uses the ChatGPT sign-in of your Codex CLI.',
    explanation: [
      'This uses the ChatGPT sign-in of your Codex CLI. If Codex is not signed in with ChatGPT, `codex login` runs',
      'first and your browser opens to sign in. Stacktape then reads the tokens Codex keeps in ~/.codex/auth.json.',
      'Only the hosted incident runs you request with "Your ChatGPT sign-in" use them, running Codex, and they count',
      'against your ChatGPT plan. An OpenAI API key is not a subscription: an Admin or Owner connects the',
      "organization's key in the Console.",
      REFRESH_NOTE,
      STORAGE_NOTE
    ].join(' ')
  },
  grok: {
    label: 'Grok sign-in (xAI), for Grok',
    description: 'Uses the sign-in of your Grok CLI.',
    explanation: [
      'This uses the sign-in of your Grok CLI. If Grok has none it can use, `grok login` runs first, with a device',
      'code when this terminal cannot open a browser. Stacktape then reads the sign-in Grok keeps in',
      '~/.grok/auth.json, without your name, email or picture. Only the hosted incident runs you request with "Your',
      'Grok sign-in" use it, running Grok, and they count against your Grok plan.',
      REFRESH_NOTE,
      STORAGE_NOTE
    ].join(' ')
  },
  opencode: {
    label: 'OpenCode sign-in, for OpenCode',
    description: 'Uses the providers your OpenCode CLI is signed in to.',
    explanation: [
      'This uses what your OpenCode CLI is signed in to with `opencode auth login`: plans such as ChatGPT, GitHub',
      'Copilot or OpenCode Go, and any provider API key you gave it. If OpenCode has none, `opencode auth login`',
      'runs first. Stacktape then reads ~/.local/share/opencode/auth.json. Only the hosted incident runs you request',
      'with "Your OpenCode sign-in" use it, running OpenCode, and they count against those accounts.',
      REFRESH_NOTE,
      STORAGE_NOTE
    ].join(' ')
  }
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;

const needsTerminal = () =>
  new CliError({
    category: 'CLI',
    code: 'AI_CONNECT_NEEDS_TERMINAL',
    message: '`stacktape ai:connect` needs an interactive terminal here: signing in to the provider is interactive.',
    hints: ['Run it in a terminal.']
  });

const notCompleted = (provider: AiProvider) =>
  new CliError({
    category: 'CLI',
    code: 'AI_SIGN_IN_NOT_COMPLETED',
    message: `The ${AI_PROVIDERS[provider].label} sign-in did not complete, so nothing was connected.`,
    hints: ['Run `stacktape ai:connect` again and finish the sign-in.']
  });

/** The provider from `--aiProvider`, or the one the person picks; a non-interactive run must name it. */
export const chooseAiProvider = async (requested: string | undefined, message: string): Promise<AiProvider> => {
  if (requested) {
    if (!(requested in AI_PROVIDERS)) {
      throw new CliError({
        category: 'CLI',
        code: 'AI_PROVIDER_UNSUPPORTED',
        message: `Subscription connection for ${requested} is not available.`,
        hints: [`Available providers: ${Object.keys(AI_PROVIDERS).join(', ')}.`]
      });
    }
    return requested as AiProvider;
  }
  if (!tuiManager.isTTY) {
    throw new CliError({
      category: 'CLI',
      code: 'AI_PROVIDER_REQUIRED',
      message: 'No provider was chosen, and there is no terminal to choose one in.',
      hints: [`Pass --aiProvider with one of: ${Object.keys(AI_PROVIDERS).join(', ')}.`]
    });
  }
  return (await tuiManager.promptSelect({
    message,
    options: Object.entries(AI_PROVIDERS).map(([value, { label, description }]) => ({ value, label, description }))
  })) as AiProvider;
};

const isInteractive = () => Boolean(process.stdin.isTTY && process.stdout.isTTY);

/** Claude: the token `claude setup-token` prints, which always needs the person at a terminal. */
const connectClaude = async (): Promise<ConnectAiSubscriptionParams> => {
  if (!isInteractive()) throw needsTerminal();
  const claudeBinary = findClaudeBinary();
  let token = await captureSetupTokenThroughPseudoTerminal({ claudeBinary });
  if (!token) {
    await runSetupTokenOnTerminal(claudeBinary);
    const pasted = await tuiManager.promptText({
      message: 'Paste the token that `claude setup-token` printed',
      isPassword: true
    });
    token = extractSetupToken(pasted);
    if (!token) {
      throw new CliError({
        category: 'CLI',
        code: 'CLAUDE_TOKEN_NOT_RECOGNIZED',
        message: 'That is not a Claude subscription token (they start with `sk-ant-oat01-`), so nothing was connected.',
        hints: ['Run `claude setup-token` again and paste the whole token it prints.']
      });
    }
  }
  return { provider: 'claude', token };
};

/**
 * Codex, Grok and OpenCode: the sign-in the agent's own CLI keeps. When it has none Stacktape can use, the agent's own
 * sign-in runs on the terminal first; a run without a terminal can only connect a sign-in that is already there.
 */
const connectWithAgentSignIn = async <Credential>(
  provider: AiProvider,
  signIn: AgentSignIn<Credential | null>
): Promise<Credential> => {
  const binary = signIn.binary();
  const existing = signIn.current(binary);
  if (existing) return existing;
  if (!isInteractive()) throw needsTerminal();
  if ((await signIn.signIn(binary)) !== 0) throw notCompleted(provider);
  const signedIn = signIn.current(binary);
  if (!signedIn) throw notCompleted(provider);
  return signedIn;
};

const collectCredential = async (provider: AiProvider): Promise<ConnectAiSubscriptionParams> => {
  if (provider === 'claude') return connectClaude();
  if (provider === 'codex') return { provider, ...(await connectWithAgentSignIn(provider, codexSignIn())) };
  if (provider === 'grok') return { provider, authFile: await connectWithAgentSignIn(provider, grokSignIn()) };
  return { provider, authFile: await connectWithAgentSignIn(provider, openCodeSignIn()) };
};

/**
 * Connects the person's own AI subscription for the hosted incident runs they request, and stores it with Stacktape
 * under the API key's user and organization. It explains what will happen first; in a terminal it asks before anything
 * runs. The credential is never printed or logged by this command.
 */
export const commandAiConnect = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const provider = await chooseAiProvider(
    args.aiProvider,
    'Which AI subscription do you want to connect for hosted incident runs?'
  );
  tuiManager.info(`${tuiManager.makeBold(AI_PROVIDERS[provider].label)}\n${AI_PROVIDERS[provider].explanation}`);
  if (isInteractive()) {
    const proceed = await tuiManager.promptConfirm({ message: 'Connect it now?', defaultValue: true });
    if (!proceed) {
      tuiManager.info('Nothing was connected.');
      return { provider, configured: false };
    }
  }
  const connection = await apiClient.connectAiSubscription(await collectCredential(provider));
  tuiManager.success(
    `Connected your ${AI_PROVIDERS[provider].label} for ${connection.member.email ?? 'you'} in ` +
      `${connection.organization.name}. Hosted runs you request with it now use it; remove it with ` +
      '`stacktape ai:disconnect`.'
  );
  return { provider, configured: connection.configured, organization: connection.organization };
};
