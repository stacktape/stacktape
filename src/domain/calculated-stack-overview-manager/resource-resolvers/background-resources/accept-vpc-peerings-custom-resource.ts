import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { getStpServiceCustomResource } from '../_utils/custom-resource';

export const resolveAcceptVpcPeeringCustomResource = () => {
  const { allVpcPeeringConnections } = configManager;
  if (allVpcPeeringConnections.length) {
    calculatedStackOverviewManager.addCfChildResource({
      resource: getStpServiceCustomResource<'acceptVpcPeeringConnections'>({
        acceptVpcPeeringConnections: allVpcPeeringConnections
      }),
      cfLogicalName: cfLogicalNames.customResourceAcceptVpcPeerings(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
  }
};
