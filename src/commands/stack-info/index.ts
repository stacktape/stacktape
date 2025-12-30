import type { TemplateDiff } from '@aws-cdk/cloudformation-diff';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { StackStatus } from '@aws-sdk/client-cloudformation';
import { budgetManager } from '@domain-services/budget-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { fsPaths } from '@shared/naming/fs-paths';
import { getIsConfigPotentiallyUsable } from '@utils/file-loaders';
import { getDetailedStackInfoMap } from '@utils/stack-info-map-diff';
import { saveDetailedStackInfoMap } from '../_utils/common';
import {
  initializeAllStackServices,
  initializeStackServicesForWorkingWithDeployedStack
} from '../_utils/initialization';
import { prepareArtifactsForStackDeployment } from '../deploy';

export const commandStackInfo = async (): Promise<StackInfoReturnValue> => {
  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });

  await budgetManager.init();

  calculatedStackOverviewManager.init();

  const { existingStackDetails } = stackManager;
  const { stackInfoMap } = deployedStackOverviewManager;
  const { stackName } = globalStateManager.targetStack;
  const shouldSimplePrint = !globalStateManager.args.detailed && globalStateManager.invokedFrom === 'cli';

  if (!configManager.config || shouldSimplePrint) {
    if (!existingStackDetails) {
      throw stpErrors.e30({
        stackName,
        organizationName: globalStateManager.organizationData?.name,
        awsAccountName: globalStateManager.targetAwsAccount.name,
        command: globalStateManager.command
      });
    }
    if (!stackInfoMap) {
      throw stpErrors.e31({ stackName });
    }
  }
  if (shouldSimplePrint) {
    deployedStackOverviewManager.printEntireStackInfo();
    return getDetailedStackInfoMap({
      deployedStackInfoMap: deployedStackOverviewManager.stackInfoMap,
      showSensitiveValues: true
    });
  }
  if (existingStackDetails?.StackStatus === StackStatus.UPDATE_FAILED) {
    tuiManager.warn(
      'Stack is in UPDATE_FAILED state. Shown values might be different from actual deployed infrastructure values.'
    );
  }

  const canUseConfig = getIsConfigPotentiallyUsable();
  let cfTemplateDiff: TemplateDiff;
  // if we have config we will do full resolving to get info for calculatedStackInfoMap
  if (canUseConfig) {
    await initializeAllStackServices({
      commandRequiresDeployedStack: false,
      commandModifiesStack: false,
      loadGlobalConfig: true,
      requiresSubscription: true
    });
    if (globalStateManager.args.detailed) {
      ({ cfTemplateDiff } = await prepareArtifactsForStackDeployment());
    }
  }

  // now that we have information about both existing stack and configuration stack we calculate stack info object
  const detailedStackInfo = getDetailedStackInfoMap({
    calculatedStackInfoMap: calculatedStackOverviewManager.stackInfoMap,
    deployedStackInfoMap: deployedStackOverviewManager.stackInfoMap,
    cfTemplateDiff,
    showSensitiveValues: globalStateManager.invokedFrom === 'sdk' || globalStateManager.args.showSensitiveValues
  });

  if (globalStateManager.invokedFrom === 'cli' && globalStateManager.args.detailed) {
    const outFormat = globalStateManager.args.outFormat || 'yml';
    await saveDetailedStackInfoMap({
      detailedStackInfo,
      filePath: fsPaths.stackInfoCommandOutFile({
        outputFileName: globalStateManager.args.outFormat,
        outputFormat: outFormat
      }),
      outFormat
    });
  }

  return detailedStackInfo;
};
