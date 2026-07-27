import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';

export const commandDefaultsList = async () => {
  const defaults = {
    ...(globalStateManager.persistedState?.otherDefaults || {}),
    ...(globalStateManager.persistedState?.cliArgsDefaults || {})
  };

  if (!Object.keys(defaults).length) {
    tuiManager.info(`No defaults configured. Run \`${tuiManager.prettyCommand('defaults:configure')}\`.`);
    return;
  }

  tuiManager.printLines([
    `${tuiManager.makeBold('Configured defaults')}:\n  ${Object.entries(defaults)
      .map(([name, value]) => `${name}: ${tuiManager.colorize('cyan', value)}`)
      .join('\n  ')}`
  ]);
};
