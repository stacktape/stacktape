import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { renderHelp } from './render';

export const commandHelp = async () => {
  tuiManager.printLines(renderHelp(globalStateManager.args.command));
};
