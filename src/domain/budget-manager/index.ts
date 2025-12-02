import type { Budget } from '@aws-sdk/client-budgets';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { tagNames } from '@shared/naming/tag-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';

export class BudgetManager {
  tagsUsedInRegion: string[] = [];
  tagsUsableInCostExploring: { error?: CostExplorerTagsError; tags: string[] };
  budgets: Budget[] = [];

  init = async () => {
    await eventManager.startEvent({
      eventType: 'FETCH_BUDGET_INFO',
      description: 'Fetching budget info'
    });
    const [tagsUsedInRegion, tagsUsableInCostExploring] = await Promise.all([
      awsSdkManager.getAllTagsUsedInRegion(),
      awsSdkManager.getTagsUsableInCostExploring(),
      this.loadBudgets()
    ]);
    // await this.loadBudgets();
    this.tagsUsedInRegion = tagsUsedInRegion;
    this.tagsUsableInCostExploring = tagsUsableInCostExploring;
    await eventManager.finishEvent({
      eventType: 'FETCH_BUDGET_INFO'
    });
  };

  loadBudgets = async () => {
    this.budgets = await awsSdkManager.listBudgets({ accountId: globalStateManager.targetAwsAccount.awsAccountId });
  };

  isBudgetingEnabled = () => {
    return this.tagsUsableInCostExploring?.tags?.includes(tagNames.globallyUniqueStackHash());
  };

  isBudgetingAvailableForDeploymentRegion = () => {
    return !['ap-east-1', 'ap-northeast-3', 'af-south-1', 'eu-north-1', 'me-south-1', 'ap-southeast-3'].includes(
      globalStateManager.region
    );
  };

  getBudgetInfoForSpecifiedStack = ({ stackName }: { stackName: string }): BudgetInfo => {
    const stackBudget = this.budgets.find(
      ({ BudgetName }) =>
        BudgetName.startsWith(cfLogicalNames.stackBudget(stackName)) && BudgetName.includes(globalStateManager.region)
    );
    return {
      actualSpend: stackBudget?.CalculatedSpend?.ActualSpend,
      forecastedSpend: stackBudget?.CalculatedSpend?.ForecastedSpend
    };
  };
}

export const budgetManager = compose(skipInitIfInitialized, cancelablePublicMethods)(new BudgetManager());
