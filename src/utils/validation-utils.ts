import commandsInfo from '@schemas/cli-schema.json';
import { ExpectedError } from './errors';
import { printer } from './printer';

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

export const getPrettyCommand = (command: string) => `'${printer.colorize('yellow', command)}'`;

export const getCommandShortDescription = (command: string) => {
  return commandsInfo[command].description.split('---')[0].slice(5).trim();
};
