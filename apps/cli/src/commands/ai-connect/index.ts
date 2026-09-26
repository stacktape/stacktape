import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
import { initializeControlPlaneOperation } from '../_utils/initialization';
import {
  captureSetupTokenThroughPseudoTerminal,
  extractSetupToken,
  findClaudeBinary,
  runSetupTokenOnTerminal
} from './claude-setup-token';

/**
 * The providers whose subscription a member can connect for the hosted incident runs they request. Each entry says
 * what the connection does, so the person chooses knowingly; a provider is listed only once the runner can use it.
 */
export const AI_PROVIDERS = {
  claude: {
    label: 'Claude subscription (Anthropic)',
    description: 'Signs you in with the Claude Code CLI and stores the long-lived token it prints.',
    explanation: [
      'This runs `claude setup-token` for you. Your browser opens to sign in to Claude; when you finish, the Claude',
      'Code CLI prints a long-lived token and Stacktape captures it (it is never shown or logged by Stacktape).',
      'The token is stored with Stacktape for your user in this organization, encrypted. Only the hosted incident runs',
      'you request with "Your Claude subscription" use it; they count against your own Claude plan. To start a run,',
      'the token is copied into an encrypted, expiring parameter in the incident’s AWS account, where the runner',
      'reads and deletes it. Remove it at any time with `stacktape ai:disconnect`.'
    ].join(' ')
  }
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;

const needsTerminal = () =>
  new CliError({
    category: 'CLI',
    code: 'AI_CONNECT_NEEDS_TERMINAL',
    message:
      '`stacktape ai:connect` needs an interactive terminal: it signs you in to the provider through your browser.',
    hints: ['Run it in a terminal, or connect your token on an incident page in the Stacktape Console.']
  });

/** The provider from `--aiProvider`, or the one the person picks; a non-interactive run must name it. */
const chooseProvider = async (requested: string | undefined): Promise<AiProvider> => {
  if (requested) {
    if (!(requested in AI_PROVIDERS)) {
      throw new CliError({
        category: 'CLI',
        code: 'AI_PROVIDER_UNSUPPORTED',
        message: `Subscription connection for ${requested} is not available yet.`,
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
    message: 'Which AI subscription do you want to connect for hosted incident runs?',
    options: Object.entries(AI_PROVIDERS).map(([value, { label, description }]) => ({ value, label, description }))
  })) as AiProvider;
};

/**
 * Connects the person's own AI subscription for the hosted incident runs they request. For Claude: runs
 * `claude setup-token`, captures the token it prints, and stores it with Stacktape under the API key's user and
 * organization. The token is never printed or logged by this command.
 */
export const commandAiConnect = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const provider = await chooseProvider(args.aiProvider);
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw needsTerminal();
  const claudeBinary = findClaudeBinary();
  tuiManager.info(`${tuiManager.makeBold(AI_PROVIDERS[provider].label)}\n${AI_PROVIDERS[provider].explanation}`);
  const proceed = await tuiManager.promptConfirm({ message: 'Open the browser sign-in now?', defaultValue: true });
  if (!proceed) {
    tuiManager.info('Nothing was connected.');
    return { provider, configured: false };
  }
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
  const connection = await apiClient.connectClaudeSubscription({ token });
  tuiManager.success(
    `Connected your Claude subscription for ${connection.member.email ?? 'you'} in ${connection.organization.name}. ` +
      'Hosted runs you request with "Your Claude subscription" now use it; remove it with `stacktape ai:disconnect`.'
  );
  return { provider, configured: connection.configured, organization: connection.organization };
};
