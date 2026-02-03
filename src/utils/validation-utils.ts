import { tuiManager } from '@application-services/tui-manager';
import type { StacktapeCommand } from '../config/cli/commands';
import { getCommandDescription } from '../config/cli/utils';
import { ExpectedError } from './errors';

export const validatePrimitiveFunctionParams = (
  actualParams: any[],
  requiredParams: RequiredDirectivePrimitiveParams,
  errorOwner: string
) => {
  let idx = 0;
  for (const requiredParamName in requiredParams) {
    const actual = actualParams[idx];
    const type = requiredParams[requiredParamName];
    if (!actual) {
      throw new ExpectedError(
        'PARAMETER',
        `${errorOwner} requires parameter ${requiredParamName} of type ${type} on position ${idx + 1}.`
      );
    }
    // eslint-disable-next-line valid-typeof
    if (typeof actual !== type) {
      throw new ExpectedError(
        'PARAMETER',
        `${errorOwner}: Parameter on position ${idx + 1} must be of type ${type} but got ${typeof actual}.`
      );
    }
    idx++;
  }
};

export const getPrettyCommand = (command: string) => `'${tuiManager.colorize('yellow', command)}'`;

export const getCommandShortDescription = (command: string) => {
  const description = getCommandDescription(command as StacktapeCommand);
  // Get the first line/paragraph as short description
  const firstParagraph = description.split('\n\n')[0];
  return firstParagraph.trim();
};
