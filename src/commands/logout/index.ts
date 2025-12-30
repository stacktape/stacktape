import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@utils/tui';

export const commandLogout = async () => {
  await globalStateManager.saveApiKey({ apiKey: null });

  tuiManager.success('Successfully logged out and removed API Key.');
};
