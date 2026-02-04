import { globalStateManager } from '@application-services/global-state-manager';
import { configManager } from '@domain-services/config-manager';
import { stpErrors } from '@errors';
import { initializeStackServicesForLocalResolve } from '../_utils/initialization';
import { getExecutableScriptFunction } from './utils';

export const commandScriptRun = async () => {
  const { scriptName } = globalStateManager.args;

  await initializeStackServicesForLocalResolve();

  const scriptDefinition = configManager?.scripts?.[scriptName];

  const assumeRoleOfResource =
    globalStateManager.args.assumeRoleOfResource || scriptDefinition?.properties?.assumeRoleOfResource;

  if (!scriptDefinition) {
    throw stpErrors.e20({ scriptName });
  }

  const functionToExecute = getExecutableScriptFunction({
    scriptDefinition: {
      ...scriptDefinition,
      scriptName,
      properties: { ...scriptDefinition.properties, assumeRoleOfResource }
    }
  });

  await functionToExecute({});
};
