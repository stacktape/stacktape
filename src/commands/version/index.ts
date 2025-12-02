import { printer } from '@utils/printer';
import { getStacktapeVersion } from '@utils/versioning';

export const commandVersion = async (): Promise<VersionReturnValue> => {
  const version = getStacktapeVersion();

  printer.info(`Stacktape version ${printer.colorize('yellow', version)}.`);

  return version;
};
