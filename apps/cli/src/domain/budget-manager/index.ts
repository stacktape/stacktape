import type { BudgetInfo, CostExplorerTagsError } from '@domain-services/budget-manager/types';
import type { LoggableEventType } from '@application-services/operation-manager';
import type { Budget } from '@aws-sdk/client-budgets';
import { operationReporter } from '@application-services/operation-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { tagNames } from '@stacktape/naming/tag-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { allAwsEndpointsAreLoopback } from '@utils/local-aws-endpoint';
import { CliError } from '@utils/errors';
import compose from '@utils/compose';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';

class BudgetManager {
  tagsUsedInRegion: string[] = [];
  tagsUsableInCostExploring: { error?: CostExplorerTagsError; tags: string[] };
  budgets: Budget[] = [];

  private get skipsLocalCostDiscovery() {
    if (process.env.STP_SKIP_COST_DISCOVERY !== '1') return false;
    const isLoopback = allAwsEndpointsAreLoopback();
    if (!isLoopback) {
      throw new CliError({
        category: 'CONFIG',
        code: 'LOCAL_COST_DISCOVERY_ONLY',
        message:
          'Skipping cost discovery requires a loopback AWS_ENDPOINT_URL, loopback service overrides, and configured endpoints enabled.'
      });
    }
    return true;
  }

  init = async ({ parentEventType }: { parentEventType?: LoggableEventType } = {}) => {
    await operationReporter.startEvent({
      eventType: 'FETCH_BUDGET_INFO',
      description: 'Fetching budget info',
      parentEventType,
      instanceId: parentEventType ? 'Cost budgets' : undefined
    });
    // Local AWS emulators have no billing data; omission requires both an opt-in and a loopback endpoint.
    if (this.skipsLocalCostDiscovery) {
      this.tagsUsedInRegion = [];
      this.tagsUsableInCostExploring = { error: 'DATA_UNAVAILABLE', tags: [] };
      this.budgets = [];
      await operationReporter.finishEvent({
        eventType: 'FETCH_BUDGET_INFO',
        parentEventType,
        instanceId: parentEventType ? 'Cost budgets' : undefined
      });
      return;
    }
    const [tagsUsedInRegion, tagsUsableInCostExploring] = await Promise.all([
      awsSdkManager.costManagement.listResourceTagKeys(),
      awsSdkManager.costManagement.listCostExplorerTags(),
      this.loadBudgets()
    ]);
    // await this.loadBudgets();
    this.tagsUsedInRegion = tagsUsedInRegion;
    this.tagsUsableInCostExploring = tagsUsableInCostExploring;
    await operationReporter.finishEvent({
      eventType: 'FETCH_BUDGET_INFO',
      parentEventType,
      instanceId: parentEventType ? 'Cost budgets' : undefined
    });
  };

  loadBudgets = async () => {
    if (this.skipsLocalCostDiscovery) {
      this.budgets = [];
      return;
    }
    this.budgets = await awsSdkManager.costManagement.listBudgets({
      accountId: globalStateManager.targetAwsAccount.awsAccountId
    });
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
