type StpNetworkLoadBalancer = Omit<NetworkLoadBalancer['properties'], 'customDomains'> & {
  customDomains?: DomainConfiguration[];
  name: string;
  type: NetworkLoadBalancer['type'];
  configParentResourceType: WebService['type'] | NetworkLoadBalancer['type'] | PrivateService['type'];
  nameChain: string[];
};
interface StpResolvedNetworkLoadBalancerReference extends Omit<
  ContainerWorkloadNetworkLoadBalancerIntegrationProps,
  'loadBalancerName'
> {
  protocol: 'TCP' | 'TLS';
  loadBalancer: StpNetworkLoadBalancer;
  listenerPort: number;
  listenerHasCustomCerts?: boolean;
}
