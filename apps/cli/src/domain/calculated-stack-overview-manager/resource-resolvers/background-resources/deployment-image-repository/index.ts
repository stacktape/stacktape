import { globalStateManager } from '@application-services/global-state-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { getEcrRepositoryResource } from './utils';

export const resolveImageRepository = () => {
  calculatedStackOverviewManager.addCfChildResource({
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
    cfLogicalName: cfLogicalNames.ecrRepo(),
    resource: getEcrRepositoryResource(globalStateManager.targetStack.globallyUniqueStackHash),
    initial: true
  });
};
