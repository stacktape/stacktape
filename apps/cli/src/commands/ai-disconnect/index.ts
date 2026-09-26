import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
import { initializeControlPlaneOperation } from '../_utils/initialization';

/** Removes the person's own Claude subscription token from Stacktape, in the API key's organization. */
export const commandAiDisconnect = async () => {
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
  const connection = await apiClient.disconnectClaudeSubscription();
  tuiManager.success(
    `Removed your Claude subscription token for ${connection.member.email ?? 'you'} in ${connection.organization.name}. ` +
      'Connect it again with `stacktape ai:connect`.'
  );
  return { provider, configured: connection.configured, organization: connection.organization };
};
