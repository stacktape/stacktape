import { globalStateManager } from '@application-services/global-state-manager';
import { printer } from '@utils/printer';

export const commandDefaultsList = async () => {
  const defaults = {
    ...(globalStateManager.persistedState?.otherDefaults || {}),
    ...(globalStateManager.persistedState?.cliArgsDefaults || {})
  };

  if (!Object.keys(defaults)) {
    printer.info('No defaults are configured on this system');
  }

  console.info(
    `${printer.makeBold('Configured defaults')}:\n  ${Object.entries(defaults)
      .map(([name, value]) => `${name}: ${printer.colorize('cyan', value)}`)
      .join('\n  ')}`
  );
};
