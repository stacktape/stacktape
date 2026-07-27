import { globalStateManager } from '@application-services/global-state-manager';
import PrivateDnsNamespace from '@cloudform/serviceDiscovery/privateDnsNamespace';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';

export const resolveServiceDiscoveryPrivateNamespace = async () => {
  if (configManager.isServiceDiscoveryPrivateNamespaceRequired) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.serviceDiscoveryPrivateNamespace(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
      resource: new PrivateDnsNamespace({
        Name: awsResourceNames.serviceDiscoveryPrivateNamespace(globalStateManager.targetStack.stackName),
        Vpc: vpcManager.getVpcId(),
        Tags: stackManager.getTags()
      })
    });
  }
};
