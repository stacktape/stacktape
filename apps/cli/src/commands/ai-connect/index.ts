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
 * Connects the person's own Claude subscription for the hosted incident runs they request: runs `claude setup-token`,
 * captures the token it prints, and stores it with Stacktape under the API key's user and organization. The token
 * is never printed or logged by this command.
 */
export const commandAiConnect = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const provider = args.aiProvider ?? 'claude';
  if (provider !== 'claude') {
    throw new CliError({
      category: 'CLI',
      code: 'AI_PROVIDER_UNSUPPORTED',
      message: `Subscription connection for ${provider} is not available yet.`,
      hints: ['Use `--aiProvider claude` (the default).']
    });
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new CliError({
      category: 'CLI',
      code: 'AI_CONNECT_NEEDS_TERMINAL',
      message: '`stacktape ai:connect` needs an interactive terminal: it signs you in to Claude through your browser.',
      hints: ['Run it in a terminal, or connect your token on an incident page in the Stacktape Console.']
    });
  }
  const claudeBinary = findClaudeBinary();
  tuiManager.info('Signing you in to Claude with `claude setup-token`. Finish the sign-in in your browser.');
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
