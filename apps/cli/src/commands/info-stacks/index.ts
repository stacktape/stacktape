import { tuiManager } from '@application-services/tui-manager';
import { StackStatus as StackStatusEnum } from '@aws-sdk/client-cloudformation';
import { budgetManager } from '@domain-services/budget-manager';
import { getStacktapeStackInfoFromTemplateDescription, isStacktapeStackDescription } from '@stacktape/naming/stacks';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { loadUserCredentials } from '../_utils/initialization';
import { isAgentMode } from '../_utils/agent-mode';

const printStackList = (listStacksResult: any[]) => {
  const header = ['Stack name', 'Stage', 'Status', 'Last updated', 'Created', 'Monthly spend', 'Deployed by Stacktape'];

  const unspecifiedValue = tuiManager.colorize('gray', 'N/A');

  const sortedStacks = [
    ...listStacksResult
      .filter(({ isStacktapeStack }) => isStacktapeStack)
      .sort(({ stackName: name1 }, { stackName: name2 }) => name1.localeCompare(name2)),
    ...listStacksResult
      .filter(({ isStacktapeStack }) => !isStacktapeStack)
      .sort(({ stackName: name1 }, { stackName: name2 }) => name1.localeCompare(name2))
  ];

  const rows = sortedStacks.map((stackInfo) => [
    stackInfo.stackName,
    stackInfo.stage ? tuiManager.colorize('cyan', stackInfo.stage) : unspecifiedValue,
    stackInfo.stackStatus,
    stackInfo.lastUpdateTime
      ? tuiManager.colorize('blue', new Date(stackInfo.lastUpdateTime).toLocaleString())
      : unspecifiedValue,
    stackInfo.creationTime
      ? tuiManager.colorize('blue', new Date(stackInfo.creationTime).toLocaleString())
      : unspecifiedValue,
    stackInfo.actualSpend ? tuiManager.colorize('cyan', stackInfo.actualSpend) : unspecifiedValue,
    stackInfo.isStacktapeStack ? tuiManager.colorize('green', 'TRUE') : 'FALSE'
  ]);

  tuiManager.printTable({ header, rows });
};

export const commandInfoStacks = async () => {
  await loadUserCredentials();

  const [stacks] = await Promise.all([awsSdkManager.listStacks(), budgetManager.init()]);
  const nonDeletedStacks = stacks.filter(({ StackStatus }) => StackStatus !== StackStatusEnum.DELETE_COMPLETE);
  const result = nonDeletedStacks.map(
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

  if (isAgentMode()) {
    tuiManager.info(JSON.stringify(result, null, 2));
  } else {
    printStackList(result);
  }

  return result;
};
