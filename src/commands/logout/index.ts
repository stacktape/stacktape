import { globalStateManager } from '@application-services/global-state-manager';
import { printer } from '@utils/printer';

export const commandLogout = async () => {
  await globalStateManager.saveApiKey({ apiKey: null });

  printer.success('Successfully logged out and removed API Key.');
};
