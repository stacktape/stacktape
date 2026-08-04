import { tuiManager } from '@application-services/tui-manager';
import { getStacktapeVersion } from '@utils/versioning';

export const commandVersion = async () => {
  const version = getStacktapeVersion();

  tuiManager.info(`Stacktape version: ${tuiManager.colorize('yellow', version)}.`);

  return version;
};
