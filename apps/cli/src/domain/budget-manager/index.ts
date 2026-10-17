import type { BudgetInfo } from '@domain-services/budget-manager/types';
import type { LoggableEventType } from '@application-services/operation-manager';
import type { Budget } from '@aws-sdk/client-budgets';
import { operationReporter } from '@application-services/operation-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { allAwsEndpointsAreLoopback } from '@utils/local-aws-endpoint';
import { CliError } from '@utils/errors';
import compose from '@utils/compose';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';

class BudgetManager {
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
      this.budgets = [];
      await operationReporter.finishEvent({
        eventType: 'FETCH_BUDGET_INFO',
        parentEventType,
        instanceId: parentEventType ? 'Cost budgets' : undefined
      });
      return;
    }
    await this.loadBudgets();
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
