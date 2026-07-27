import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getContainerWorkloadTargetGroup, getTargetsForContainerWorkload } from '../../utils';

export const resolveNetworkLoadBalancerEvents = ({ definition }: { definition: StpContainerWorkload }) => {
  // definition.containers.forEach(({ events }) => {
  //   if (events) {
  //     events.forEach((event) => {
  //       if (event.type === 'network-load-balancer') {
  //         const resolvedLbReference = resolveReferenceToNetworkLoadBalancer(event.properties, definition.name);

  //       }
  //     });
  //   }
  // });

  getTargetsForContainerWorkload({ workloadName: definition.name, containers: definition.containers })
    // filter out only targets for TCP protocol (i.e targets for network load balancer)
    .filter(({ targetProtocol }) => targetProtocol === 'TCP')
    .forEach((targetDetails) => {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.targetGroup({
          stpResourceName: definition.name,
          loadBalancerName: targetDetails.loadBalancerName,
          targetContainerPort: targetDetails.targetContainerPort
        }),
        resource: getContainerWorkloadTargetGroup({ targetDetails, definition }),
        nameChain: definition.nameChain
      });
    });
};
