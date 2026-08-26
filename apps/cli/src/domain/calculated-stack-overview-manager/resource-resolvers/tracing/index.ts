import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { isDevCommand } from '../../../../commands/dev/dev-mode-utils';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { getStpServiceCustomResource } from '../_utils/custom-resource';

/**
 * Account-level tracing prerequisites. The per-function instrumentation (layer + environment) is
 * applied inside the function resolver; this resolver contributes the one shared piece: enabling
 * X-Ray Transaction Search so exported spans land in the `aws/spans` log group.
 */
export const resolveTracingInfrastructure = async () => {
  // Keyed off functions that actually receive instrumentation: when every traced function was
  // skipped (unsupported runtime, wrapper collision), flipping the permanent account-level
  // Transaction Search setting would only cost money without producing a single span.
  if (!configManager.instrumentedLambdaFunctions.length || isDevCommand()) {
    return;
  }
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.customResourceTransactionSearch(),
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
    resource: getStpServiceCustomResource<'transactionSearch'>({
      transactionSearch: { version: 1 }
    })
  });
};
