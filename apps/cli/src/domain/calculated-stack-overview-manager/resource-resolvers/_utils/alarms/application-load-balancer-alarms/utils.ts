import type { Dimension } from '@stacktape/cloudformation/resources/aws-cloudwatch-alarm';
import { getAtt } from '@stacktape/cloudformation/intrinsics';
import type { StpApplicationLoadBalancer } from '@domain-services/config-manager/resolved-types/application-load-balancers';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

export const getDimensionsForAlb = ({ resource }: { resource: StpApplicationLoadBalancer }): Dimension[] => {
  return [
    {
      Name: 'LoadBalancer',
      Value: getAtt(cfLogicalNames.loadBalancer(resource.name), 'LoadBalancerFullName')
    }
  ];
};
