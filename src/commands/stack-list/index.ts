import { globalStateManager } from '@application-services/global-state-manager';
import { StackStatus as StackStatusEnum } from '@aws-sdk/client-cloudformation';
import { budgetManager } from '@domain-services/budget-manager';
import { getStacktapeStackInfoFromTemplateDescription, isStacktapeStackDescription } from '@shared/naming/utils';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { printer } from '@utils/printer';
import { loadUserCredentials } from '../_utils/initialization';

export const commandStackList = async (): Promise<StackListReturnValue> => {
  await loadUserCredentials();

  const [stacks] = await Promise.all([awsSdkManager.listStacks(), budgetManager.init()]);
  const nonDeletedStacks = stacks.filter(({ StackStatus }) => StackStatus !== StackStatusEnum.DELETE_COMPLETE);
  const result: StackListReturnValue = nonDeletedStacks.map(
    ({ CreationTime, StackName, StackStatus, StackStatusReason, LastUpdatedTime, TemplateDescription, StackId }) => {
      const spendingInfo = budgetManager.getBudgetInfoForSpecifiedStack({ stackName: StackName });
      return {
        stackName: StackName,
        stackId: StackId,
        ...getStacktapeStackInfoFromTemplateDescription(TemplateDescription),
        stackStatus: StackStatus as StackStatusEnum,
        lastUpdateTime: LastUpdatedTime?.getTime(),
        creationTime: CreationTime?.getTime(),
        stackStatusReason: StackStatusReason,
        isStacktapeStack: isStacktapeStackDescription(TemplateDescription),
        actualSpend: spendingInfo.actualSpend?.Amount,
        forecastedSpend: spendingInfo.forecastedSpend?.Amount
      };
    }
  );
  if (globalStateManager.invokedFrom === 'cli') {
    printer.printListStack(result);
  }

  return result;
};
