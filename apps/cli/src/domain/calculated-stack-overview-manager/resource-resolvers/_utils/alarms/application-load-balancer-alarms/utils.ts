import type { StpApplicationLoadBalancer } from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type { Dimension } from '@cloudform/cloudWatch/alarm';
import { GetAtt } from '@cloudform/functions';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

export const getDimensionsForAlb = ({ resource }: { resource: StpApplicationLoadBalancer }): Dimension[] => {
  return [
    {
      Name: 'LoadBalancer',
      Value: GetAtt(cfLogicalNames.loadBalancer(resource.name), 'LoadBalancerFullName')
    }
  ];
};
