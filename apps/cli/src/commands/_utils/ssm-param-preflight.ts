import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { linksMap } from '@config';
import { configManager } from '@domain-services/config-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from './agent-mode';

/**
 * Checks all `$SsmParam` references in the config against existing SSM parameters.
 *
 * Missing parameters are handled based on the execution context:
 * - **Interactive (TTY)**: prompts user to create each missing parameter (value + type).
 * - **Non-interactive / agent**: aborts with an actionable error listing missing params
 *   and a link to the Stacktape console SSM Params page.
 */
export const ensureMissingSsmParamsCreated = async () => {
  const paramRefs = configManager.allSsmParamReferencesUsedInConfig;
  if (!paramRefs.size) {
    return;
  }

  const missingParams: string[] = [];
  for (const paramName of paramRefs) {
    try {
      await awsSdkManager.getSsmParameterValue({ ssmParameterName: paramName });
    } catch {
      missingParams.push(paramName);
    }
  }

  if (!missingParams.length) {
    return;
  }

  const paramList = missingParams.map((name) => `  - ${tuiManager.makeBold(name)}`).join('\n');
  tuiManager.warn(
    `The config references ${missingParams.length} SSM parameter(s) that don't exist in ${tuiManager.makeBold(globalStateManager.region)}:\n${paramList}`
  );

  if (!isAgentMode() && process.stdout.isTTY) {
    await promptAndCreateParams(missingParams);
  } else {
    throw new ExpectedError(
      'CONFIG',
      `Missing ${missingParams.length} SSM parameter(s): ${missingParams.join(', ')}`,
      `Create the parameters in the Stacktape console: ${linksMap.ssmParams}`
    );
  }
};

const promptAndCreateParams = async (paramNames: string[]) => {
  for (const paramName of paramNames) {
    const isSecure = await tuiManager.promptConfirm({
      message: `Should ${tuiManager.makeBold(paramName)} be encrypted (SecureString)?`
    });
    const value = await tuiManager.promptText({
      message: `Enter value for ${tuiManager.makeBold(paramName)}:`,
      isPassword: isSecure
    });
    const spinner = tuiManager.createSpinner({ text: `Creating SSM parameter ${tuiManager.makeBold(paramName)}` });
    await awsSdkManager.putSsmParameterValue({
      ssmParameterName: paramName,
      value,
      encrypt: isSecure
    });
    spinner.success({ text: `SSM parameter ${tuiManager.makeBold(paramName)} created` });
  }
};
