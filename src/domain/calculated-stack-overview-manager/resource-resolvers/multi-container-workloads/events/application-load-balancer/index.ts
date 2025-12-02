import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import {
  DEFAULT_TEST_LISTENER_PORT,
  resolveReferenceToApplicationLoadBalancer
} from '@domain-services/config-manager/utils/application-load-balancers';
import { stpErrors } from '@errors';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getListenerRule } from '../../../_utils/lb-listener-rule-helpers';
import { getContainerWorkloadTargetGroup, getTargetsForContainerWorkload } from '../../utils';

export const resolveApplicationLoadBalancerEvents = ({ definition }: { definition: StpContainerWorkload }) => {
  const blueGreen = !!definition.deployment;
  definition.containers.forEach(({ events }) =>
    (events || []).forEach((event: ContainerWorkloadLoadBalancerIntegration) => {
      if (event.type === 'application-load-balancer') {
        const resolvedLbReference = resolveReferenceToApplicationLoadBalancer(
          event.properties,
          definition.name,
          definition.type
        );
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.listenerRule(
            resolvedLbReference.listenerPort,
            resolvedLbReference.loadBalancer.name,
            resolvedLbReference.priority
          ),
          resource: getListenerRule(definition.name, resolvedLbReference, blueGreen),
          nameChain: definition.nameChain
        });
        // if there is beforeAllowTrafficFunction hook, we automatically assume user wants to use test listener
        if (definition.deployment?.beforeAllowTrafficFunction) {
          // if load balancer uses custom listeners check also if it has listener for testListenerPort
          if (event.properties.listenerPort) {
            if (!definition.deployment.testListenerPort) {
              throw stpErrors.e62({ stpContainerWorkloadName: definition.name });
            }
            resolveReferenceToApplicationLoadBalancer(
              { ...event.properties, listenerPort: definition.deployment.testListenerPort },
              definition.name
            );
          }
          const testListenerPort = definition.deployment.testListenerPort || DEFAULT_TEST_LISTENER_PORT;
          calculatedStackOverviewManager.addCfChildResource({
            cfLogicalName: cfLogicalNames.listenerRule(
              testListenerPort,
              resolvedLbReference.loadBalancer.name,
              resolvedLbReference.priority
            ),
            resource: getListenerRule(
              definition.name,
              {
                ...resolvedLbReference,
                listenerPort: testListenerPort
              },
              blueGreen
            ),
            nameChain: definition.nameChain
          });
        }
      }
    })
  );
  getTargetsForContainerWorkload({ workloadName: definition.name, containers: definition.containers })
    // filter out only targets for HTTP protocol (i.e targets for application load balancer)
    .filter(({ targetProtocol }) => targetProtocol === 'HTTP')
    .forEach((targetDetails: ContainerWorkloadTargetDetails) => {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.targetGroup({
          stpResourceName: definition.name,
          loadBalancerName: targetDetails.loadBalancerName,
          targetContainerPort: targetDetails.targetContainerPort
        }),
        resource: getContainerWorkloadTargetGroup({ targetDetails, definition }),
        nameChain: definition.nameChain
      });
      if (blueGreen) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.targetGroup({
            stpResourceName: definition.name,
            loadBalancerName: targetDetails.loadBalancerName,
            targetContainerPort: targetDetails.targetContainerPort,
            blueGreen
          }),
          resource: getContainerWorkloadTargetGroup({ targetDetails, definition }),
          nameChain: definition.nameChain
        });
      }
    });
};
