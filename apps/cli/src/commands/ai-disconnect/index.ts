import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
import { initializeControlPlaneOperation } from '../_utils/initialization';
import { AI_PROVIDERS, type AiProvider } from '../ai-connect';

/** Removes the person's own subscription token from Stacktape, in the API key's organization. */
export const commandAiDisconnect = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  let provider = args.aiProvider as AiProvider | undefined;
  if (provider && !(provider in AI_PROVIDERS)) {
    throw new CliError({
      category: 'CLI',
      code: 'AI_PROVIDER_UNSUPPORTED',
      message: `Subscription connection for ${provider} is not available yet.`,
      hints: [`Available providers: ${Object.keys(AI_PROVIDERS).join(', ')}.`]
    });
  }
  if (!provider) {
    if (!tuiManager.isTTY) {
      throw new CliError({
        category: 'CLI',
        code: 'AI_PROVIDER_REQUIRED',
        message: 'No provider was chosen, and there is no terminal to choose one in.',
        hints: [`Pass --aiProvider with one of: ${Object.keys(AI_PROVIDERS).join(', ')}.`]
      });
    }
    provider = (await tuiManager.promptSelect({
      message: 'Which AI subscription do you want to disconnect?',
      options: Object.entries(AI_PROVIDERS).map(([value, { label }]) => ({ value, label }))
    })) as AiProvider;
  }
  const connection = await apiClient.disconnectClaudeSubscription();
  tuiManager.success(
    `Removed your Claude subscription token for ${connection.member.email ?? 'you'} in ${connection.organization.name}. ` +
      'Connect it again with `stacktape ai:connect`.'
  );
  return { provider, configured: connection.configured, organization: connection.organization };
};
