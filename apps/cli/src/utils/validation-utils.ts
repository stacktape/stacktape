import type { RequiredDirectivePrimitiveParams } from '@domain-services/config-manager/directive-types';
import { tuiManager } from '@application-services/tui-manager';
import type { StacktapeCommand } from '../config/cli/commands';
import { getCommandDescription } from '../config/cli/utils';
import { CliError } from './errors';

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
      throw new CliError({
        category: 'PARAMETER',
        code: 'DIRECTIVE_PARAMETER_REQUIRED',
        message: `${errorOwner} requires parameter \`${requiredParamName}\` of type \`${type}\` at position ${idx + 1}.`
      });
    }
    if (typeof actual !== type) {
      throw new CliError({
        category: 'PARAMETER',
        code: 'DIRECTIVE_PARAMETER_TYPE_INVALID',
        message: `${errorOwner} parameter \`${requiredParamName}\` at position ${idx + 1} must be of type \`${type}\`, but received \`${typeof actual}\`.`
      });
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
