import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';

export const commandLogout = async () => {
  await globalStateManager.saveApiKey({ apiKey: null });

  tuiManager.success('Logged out. API key removed.');
};
