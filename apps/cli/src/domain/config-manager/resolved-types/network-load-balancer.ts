import type { ContainerWorkloadNetworkLoadBalancerIntegrationProps } from '@stacktape/config/events';
import type { NetworkLoadBalancer } from '@stacktape/config/network-load-balancer';
import type { PrivateService } from '@stacktape/config/private-services';
import type { DomainConfiguration } from '@stacktape/config/shared';
import type { WebService } from '@stacktape/config/web-services';

export type StpNetworkLoadBalancer = Omit<NetworkLoadBalancer['properties'], 'customDomains'> & {
  customDomains?: DomainConfiguration[];
  name: string;
  type: NetworkLoadBalancer['type'];
  configParentResourceType: WebService['type'] | NetworkLoadBalancer['type'] | PrivateService['type'];
  nameChain: string[];
};
export interface StpResolvedNetworkLoadBalancerReference extends Omit<
  ContainerWorkloadNetworkLoadBalancerIntegrationProps,
  'loadBalancerName'
> {
  protocol: 'TCP' | 'TLS';
  loadBalancer: StpNetworkLoadBalancer;
  listenerPort: number;
  listenerHasCustomCerts?: boolean;
}
