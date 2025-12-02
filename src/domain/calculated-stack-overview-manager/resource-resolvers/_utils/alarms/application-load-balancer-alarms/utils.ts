import type { Dimension } from '@cloudform/cloudWatch/alarm';
import { GetAtt } from '@cloudform/functions';
import { cfLogicalNames } from '@shared/naming/logical-names';

export const getDimensionsForAlb = ({ resource }: { resource: StpApplicationLoadBalancer }): Dimension[] => {
  return [
    {
      Name: 'LoadBalancer',
      Value: GetAtt(cfLogicalNames.loadBalancer(resource.name), 'LoadBalancerFullName')
    }
  ];
};
