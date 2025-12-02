import { globalStateManager } from '@application-services/global-state-manager';
import Budget from '@cloudform/budgets/budget';
import { Ref } from '@cloudform/functions';
import { budgetManager } from '@domain-services/budget-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { stackMetadataNames } from '@shared/naming/metadata-names';
import { tagNames } from '@shared/naming/tag-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { stpErrors } from '../../../../config/error-messages';

export const resolveBudget = async () => {
  if (configManager.budgetConfig) {
    if (!budgetManager.isBudgetingEnabled()) {
      throw stpErrors.e4(null);
    }
    // TODO: resolve what to do with these regions (opened issue ticket with AWS) - maybe use custom resource for creating budgets
    if (!budgetManager.isBudgetingAvailableForDeploymentRegion()) {
      throw stpErrors.e33({ region: globalStateManager.region });
    }
  }
  if (budgetManager.isBudgetingEnabled() && budgetManager.isBudgetingAvailableForDeploymentRegion()) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.stackBudget(globalStateManager.targetStack.stackName),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
      resource: getBudgetResource({ budgetConfig: configManager.budgetConfig }),
      initial: true
    });
    calculatedStackOverviewManager.addStackMetadata({
      metaName: stackMetadataNames.budgetName(),
      metaValue: Ref(cfLogicalNames.stackBudget(globalStateManager.targetStack.stackName)),
      showDuringPrint: false
    });
  }
};

const getBudgetResource = ({ budgetConfig }: { budgetConfig: BudgetControl }) => {
  return new Budget({
    Budget: {
      BudgetLimit: { Amount: budgetConfig?.limit || 100, Unit: 'USD' },
      BudgetType: 'COST',
      // BudgetName: awsResourceNames.stackBudget(globalStateManager.targetStack.stackName, globalStateManager.targetStack.globallyUniqueStackHash),
      TimeUnit: 'MONTHLY',
      CostTypes: {
        IncludeCredit: false,
        IncludeRefund: false
      },
      CostFilters: {
        TagKeyValue: [
          `user:${tagNames.globallyUniqueStackHash()}$${globalStateManager.targetStack.globallyUniqueStackHash}`
        ]
      }
    },
    NotificationsWithSubscribers: budgetConfig?.notifications?.length
      ? budgetConfig.notifications.map(({ emails, budgetType, thresholdPercentage }) => {
          return {
            Notification: {
              ComparisonOperator: 'GREATER_THAN',
              NotificationType: budgetType || 'ACTUAL',
              ThresholdType: 'PERCENTAGE',
              Threshold: thresholdPercentage || 100
            },
            Subscribers: emails.map((email) => ({ Address: email, SubscriptionType: 'EMAIL' }))
          };
        })
      : undefined
  });
};
