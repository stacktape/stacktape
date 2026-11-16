import { stacktapeConsoleUrl } from 'src/config/params';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
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
 *   and a link to the Stacktape Console SSM parameters page.
 */
export type MissingSsmParamsPlan = { name: string; value: string; encrypted: boolean }[];

/** Asks for the values of missing parameters, or fails where it cannot ask. Creates nothing. */
export const planMissingSsmParams = async (): Promise<MissingSsmParamsPlan> => {
  const missingParams = await findMissingSsmParams();
  if (!missingParams.length) {
    return [];
  }

  const paramList = missingParams.map((name) => `  - ${tuiManager.makeBold(name)}`).join('\n');
  tuiManager.warn(
    `The config references ${missingParams.length} SSM parameter(s) that don't exist in ${tuiManager.makeBold(globalStateManager.region)}:\n${paramList}`
  );

  if (!isAgentMode() && process.stdout.isTTY) {
    return promptForParams(missingParams);
  }
  throw new ExpectedError(
    'CONFIG',
    `Missing ${missingParams.length} SSM parameter(s): ${missingParams.join(', ')}`,
    `Create the parameters in the Stacktape Console: ${stacktapeConsoleUrl('/ssm-params')}`
  );
};

export const createMissingSsmParams = async (plan: MissingSsmParamsPlan) => {
  for (const { name, value, encrypted } of plan) {
    const spinner = tuiManager.createSpinner({ text: `Creating SSM parameter ${tuiManager.makeBold(name)}` });
    await awsSdkManager.parameterStore.put({ name, value, encrypted });
    spinner.success({ text: `SSM parameter ${tuiManager.makeBold(name)} created` });
  }
};

export const ensureMissingSsmParamsCreated = async () => createMissingSsmParams(await planMissingSsmParams());

/** `$SsmParam` references whose parameter does not exist in the target region. Reads only. */
export const findMissingSsmParams = async (): Promise<string[]> => {
  const paramRefs = [...configManager.allSsmParamReferencesUsedInConfig];
  const found = await Promise.all(
    paramRefs.map((paramName) =>
      awsSdkManager.parameterStore.get({ name: paramName }).then(
        () => true,
        () => false
      )
    )
  );
  return paramRefs.filter((_, index) => !found[index]);
};

const promptForParams = async (paramNames: string[]): Promise<MissingSsmParamsPlan> => {
  const plan: MissingSsmParamsPlan = [];
  for (const paramName of paramNames) {
    const encrypted = await tuiManager.promptConfirm({
      message: `Should ${tuiManager.makeBold(paramName)} be encrypted (SecureString)?`
    });
    const value = await tuiManager.promptText({
      message: `Enter value for ${tuiManager.makeBold(paramName)}:`,
      isPassword: encrypted
    });
    plan.push({ name: paramName, value, encrypted });
  }
  return plan;
};
