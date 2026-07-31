import type { CdnReferenceableParam } from '@domain-services/config-manager/resolved-types/cdn';
import type { ApplicationLoadBalancer } from '@stacktape/config/application-load-balancers';
import type { IntrinsicFunction } from '@stacktape/config/cloudformation';
import type { Convex } from '@stacktape/config/convex';
import type {
  ContainerWorkloadLoadBalancerIntegrationProps,
  LbHeaderCondition,
  LbQueryParamCondition
} from '@stacktape/config/events';
import type { LoadBalancerHealthCheck } from '@stacktape/config/multi-container-workloads';
import type { PrivateService } from '@stacktape/config/private-services';
import type { DomainConfiguration } from '@stacktape/config/shared';
import type { WebService } from '@stacktape/config/web-services';

export type StpApplicationLoadBalancer = Omit<NonNullable<ApplicationLoadBalancer['properties']>, 'customDomains'> & {
  customDomains?: DomainConfiguration[];
  name: string;
  type: ApplicationLoadBalancer['type'];
  configParentResourceType:
    | WebService['type']
    | ApplicationLoadBalancer['type']
    | PrivateService['type']
    | Convex['type'];
  nameChain: string[];
};
export interface StpResolvedLoadBalancerReference extends Omit<
  ContainerWorkloadLoadBalancerIntegrationProps,
  'loadBalancerName'
> {
  protocol: 'HTTP' | 'HTTPS';
  loadBalancer: StpApplicationLoadBalancer;
  listenerPort: number;
  listenerHasCustomCerts?: boolean;
}
export type ContainerWorkloadTargetDetails = {
  targetProtocol: 'HTTP' | 'TCP';
  targetContainerPort: number;
  // availabilityCheck: LoadBalancerAvailabilityCheck;
  targetContainerName: string;
  targetWorkload: string;
  loadBalancerName: string;
  listenerPorts: Set<number>;
  loadBalancerHealthCheck: LoadBalancerHealthCheck;
};
export type LambdaTargetDetails = {
  // workloadName: string;
  // workloadType: Subtype<StpWorkloadType, 'batch-job' | 'function'>;
  // lambdaCfLogicalName: string;
  stpResourceName: string;
  lambdaEndpointArn: IntrinsicFunction | string;
  loadBalancerName: string;
};
export type AggregatedTargetsDetails = {
  [targetIdentifier: string]: ContainerWorkloadTargetDetails | LambdaTargetDetails;
};
export type ApplicationLoadBalancerReferenceableParam =
  | 'domain'
  | 'customDomains'
  | `port${number}`
  | CdnReferenceableParam;
export type ApplicationLoadBalancerOutputs = {
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
