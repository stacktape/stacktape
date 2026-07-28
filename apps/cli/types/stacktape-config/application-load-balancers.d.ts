type StpApplicationLoadBalancer = Omit<ApplicationLoadBalancer['properties'], 'customDomains'> & {
  customDomains?: DomainConfiguration[];
  name: string;
  type: ApplicationLoadBalancer['type'];
  configParentResourceType: WebService['type'] | ApplicationLoadBalancer['type'] | PrivateService['type'] | Convex['type'];
  nameChain: string[];
};
interface StpResolvedLoadBalancerReference extends Omit<
  ContainerWorkloadLoadBalancerIntegrationProps,
  'loadBalancerName'
> {
  protocol: 'HTTP' | 'HTTPS';
  loadBalancer: StpApplicationLoadBalancer;
  listenerPort: number;
  listenerHasCustomCerts?: boolean;
}
type ContainerWorkloadTargetDetails = {
  targetProtocol: 'HTTP' | 'TCP';
  targetContainerPort: number;
  // availabilityCheck: LoadBalancerAvailabilityCheck;
  targetContainerName: string;
  targetWorkload: string;
  loadBalancerName: string;
  listenerPorts: Set<number>;
  loadBalancerHealthCheck: LoadBalancerHealthCheck;
};
type LambdaTargetDetails = {
  // workloadName: string;
  // workloadType: Subtype<StpWorkloadType, 'batch-job' | 'function'>;
  // lambdaCfLogicalName: string;
  stpResourceName: string;
  lambdaEndpointArn: IntrinsicFunction | string;
  loadBalancerName: string;
};
type AggregatedTargetsDetails = {
  [targetIdentifier: string]: ContainerWorkloadTargetDetails | LambdaTargetDetails;
};
type ApplicationLoadBalancerReferenceableParam = 'domain' | 'customDomains' | `port${number}` | CdnReferenceableParam;
type ApplicationLoadBalancerOutputs = {
  integrations: {
    urls: (string | IntrinsicFunction)[];
    priority: number;
    methods?: string[];
    hosts?: string[];
    headers?: LbHeaderCondition[];
    queryParams?: LbQueryParamCondition[];
    sourceIps?: string[];
    resourceName: string;
    listenerPort: number;
  }[];
};
