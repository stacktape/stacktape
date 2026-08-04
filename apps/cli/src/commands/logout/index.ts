import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';

export const commandLogout = async () => {
  tuiManager.intro('Logout from Stacktape');

  await globalStateManager.saveApiKey({ apiKey: null });

  tuiManager.outro('Logged out. API key removed.');
};
