import { tuiManager } from '@application-services/tui-manager';
import { initializeControlPlaneOperation } from '../_utils/initialization';
import { AI_PROVIDERS, chooseAiProvider } from '../ai-connect';

/** Removes the person's own subscription with one provider from Stacktape, in the API key's organization. */
export const commandAiDisconnect = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const provider = await chooseAiProvider(args.aiProvider, 'Which AI subscription do you want to disconnect?');
  const connection = await apiClient.disconnectAiSubscription({ provider });
  tuiManager.success(
    `Removed your ${AI_PROVIDERS[provider].label} for ${connection.member.email ?? 'you'} in ` +
      `${connection.organization.name}. Connect it again with \`stacktape ai:connect\`.`
  );
  return { provider, configured: connection.configured, organization: connection.organization };
};
