import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import type { Subtype } from '@utils/type-helpers';
import type { AnyReferenceableParamName } from '@stacktape/config-authoring/resource-metadata';
import type {
  StpAgentCoreBrowser,
  StpAgentCoreCodeInterpreter,
  StpAgentCoreGateway,
  StpAgentCoreMemory,
  StpAgentCoreRuntime
} from '@domain-services/config-manager/resolved-types/agentcore';
import type { StpApplicationLoadBalancer } from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type { StpAppSyncApi } from '@domain-services/config-manager/resolved-types/appsync-apis';
import type { StpAstroWeb } from '@domain-services/config-manager/resolved-types/astro-web';
import type { StpAwsCdkConstruct } from '@domain-services/config-manager/resolved-types/aws-cdk-construct';
import type { StpBastion } from '@domain-services/config-manager/resolved-types/bastion';
import type { StpBatchJob } from '@domain-services/config-manager/resolved-types/batch-jobs';
import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type { StpConvex } from '@domain-services/config-manager/resolved-types/convex';
import type {
  StpCustomResource,
  StpCustomResourceDefinition
} from '@domain-services/config-manager/resolved-types/custom-resources';
import type { StpDeploymentScript } from '@domain-services/config-manager/resolved-types/deployment-script';
import type { StpDynamoTable } from '@domain-services/config-manager/resolved-types/dynamo-db-tables';
import type { StpDsqlDatabase } from '@domain-services/config-manager/resolved-types/dsql-databases';
import type { StpEmailSender } from '@domain-services/config-manager/resolved-types/email-senders';
import type {
  StpEdgeLambdaFunction,
  StpHelperEdgeLambdaFunction
} from '@domain-services/config-manager/resolved-types/edge-lambda-functions';
import type { StpEfsFilesystem } from '@domain-services/config-manager/resolved-types/efs-filesystem';
import type { StpEventBus } from '@domain-services/config-manager/resolved-types/event-buses';
import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import type { StpHostingBucket } from '@domain-services/config-manager/resolved-types/hosting-buckets';
import type { StpHttpApiGateway } from '@domain-services/config-manager/resolved-types/http-api-gateways';
import type { StpWebSocketApiGateway } from '@domain-services/config-manager/resolved-types/websocket-api-gateways';
import type { StpKinesisStream } from '@domain-services/config-manager/resolved-types/kinesis-streams';
import type { StpKafkaCluster } from '@domain-services/config-manager/resolved-types/kafka-clusters';
import type { StpMongoDbAtlasCluster } from '@domain-services/config-manager/resolved-types/mongo-db-atlas-clusters';
import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { StpNetworkLoadBalancer } from '@domain-services/config-manager/resolved-types/network-load-balancer';
import type { StpNextjsWeb } from '@domain-services/config-manager/resolved-types/nextjs-web';
import type { StpNuxtWeb } from '@domain-services/config-manager/resolved-types/nuxt-web';
import type { StpOpenSearchDomain } from '@domain-services/config-manager/resolved-types/open-search';
import type { StpPrivateService } from '@domain-services/config-manager/resolved-types/private-services';
import type { StpRedis } from '@domain-services/config-manager/resolved-types/redis';
import type { StpRelationalDatabase } from '@domain-services/config-manager/resolved-types/relational-databases';
import type { StpRemixWeb } from '@domain-services/config-manager/resolved-types/remix-web';
import type { StpSnsTopic } from '@domain-services/config-manager/resolved-types/sns-topic';
import type { StpSolidStartWeb } from '@domain-services/config-manager/resolved-types/solidstart-web';
import type { StpSqsQueue } from '@domain-services/config-manager/resolved-types/sqs-queues';
import type { StpSvelteKitWeb } from '@domain-services/config-manager/resolved-types/sveltekit-web';
import type { StpTanStackWeb } from '@domain-services/config-manager/resolved-types/tanstack-web';
import type { StpUpstashRedis } from '@domain-services/config-manager/resolved-types/upstash-redis';
import type { StpSyntheticTest } from '@domain-services/config-manager/resolved-types/synthetic-tests';
import type { StpUptimeCheck } from '@domain-services/config-manager/resolved-types/uptime-checks';
import type { StpUserAuthPool } from '@domain-services/config-manager/resolved-types/user-pools';
import type { StpWebAppFirewall } from '@domain-services/config-manager/resolved-types/web-app-firewall';
import type { StpWebService } from '@domain-services/config-manager/resolved-types/web-services';
import type { StpWorkerService } from '@domain-services/config-manager/resolved-types/worker-services';
import type { StacktapeConfig } from '@stacktape/config';
import type { AgentCoreRuntime } from '@stacktape/config/agentcore';
import type { Convex } from '@stacktape/config/convex';
import type { StacktapeWorkloadDefinition } from '@stacktape/config/shared';
import type { StpStateMachine } from '@stacktape/config/state-machines';

export type StpResource = (
  | StpWorkloadDefinition
  | StpRelationalDatabase
  | StpApplicationLoadBalancer
  | StpAppSyncApi
  | StpNetworkLoadBalancer
  | StpHttpApiGateway
  | StpWebSocketApiGateway
  | StpBucket
  | StpUserAuthPool
  | StpEventBus
  | StpBastion
  | StpDynamoTable
  | StpDsqlDatabase
  | StpEmailSender
  | StpStateMachine
  | StpMongoDbAtlasCluster
  | StpRedis
  | StpCustomResource
  | StpCustomResourceDefinition
  | StpUpstashRedis
  | StpUptimeCheck
  | StpSyntheticTest
  | StpDeploymentScript
  | StpAwsCdkConstruct
  | StpSqsQueue
  | StpSnsTopic
  | StpHostingBucket
  | StpWebAppFirewall
  | StpNextjsWeb
  | StpAstroWeb
  | StpNuxtWeb
  | StpSvelteKitWeb
  | StpSolidStartWeb
  | StpTanStackWeb
  | StpRemixWeb
  | StpHelperLambdaFunction
  | StpHelperEdgeLambdaFunction
  | StpOpenSearchDomain
  | StpEfsFilesystem
  | StpKinesisStream
  | StpKafkaCluster
  | StpConvex
  | StpAgentCoreRuntime
  | StpAgentCoreMemory
  | StpAgentCoreGateway
  | StpAgentCoreBrowser
  | StpAgentCoreCodeInterpreter
) & {
  _nestedResources?: {
    [nestedStpResourceIdentifier: string]: StpResource;
  };
};
export type StpWorkloadType = StacktapeWorkloadDefinition['type'] | Convex['type'] | AgentCoreRuntime['type'];
export type StpResourceType = StpResource['type'];
export type EcsServiceScheduledMaintenanceRuleInput = {
  ecsServiceArn: string | Intrinsic;
  asgName: string | Intrinsic;
  codeDeployApplicationName?: string;
  codeDeployDeploymentGroupName?: string;
};
/**
 * What the NAT failover handler needs to know about the stack's NAT instances. Both of its EventBridge rules (the
 * one-minute probe and the Auto Scaling events) send this as their constant input.
 */
export type NatFailoverRuleInput = {
  natFailover: {
    stackName: string;
    region: string | Intrinsic;
    /** One entry per availability zone that has a NAT instance, in AZ order. */
    zones: {
      azIndex: number;
      autoscalingGroupName: string;
      networkInterfaceId: string | Intrinsic;
      heartbeatParameterName: string;
    }[];
    /** One entry per private route table, with the zone whose instance it uses when everything is healthy. */
    routeTables: { routeTableId: string | Intrinsic; homeAzIndex: number }[];
  };
};
export type CustomTaggingScheduledRuleInput = {
  tagNetworkInterfaceWithSecurityGroup: {
    securityGroupId: string | Intrinsic;
    attributionCfResourceLogicalName: string;
    extraTags?: { Key: string; Value: string }[];
  }[];
  tagHostedZoneAttributedToCloudMapNamespace: {
    namespaceId: string | Intrinsic;
    attributionCfResourceLogicalName: string;
    extraTags?: { Key: string; Value: string }[];
  }[];
};
type StpWorkloadDefinition =
  | StpLambdaFunction
  | StpContainerWorkload
  | StpBatchJob
  | StpWebService
  | StpPrivateService
  | StpWorkerService
  | StpEdgeLambdaFunction;
export type StpCdnCompatibleResource = StpBucket | StpApplicationLoadBalancer | StpHttpApiGateway | StpLambdaFunction;
export type StpCdnAttachableResourceType = Subtype<
  StpResourceType,
  'bucket' | 'application-load-balancer' | 'http-api-gateway' | 'function' // | 'web-service' | 'hosting-bucket'
>;
export type StpCdnOriginTargetableByRouteRewrite = StpCdnAttachableResourceType | 'custom-origin';
export type StpDomainAttachableResourceType =
  | Subtype<
      StpResourceType,
      | 'application-load-balancer'
      | 'appsync-api'
      | 'http-api-gateway'
      | 'websocket-api-gateway'
      | 'network-load-balancer'
    >
  | 'cdn';
export type StpResourceScopableByConnectToAffectingRole =
  | Subtype<StpResource, StpLambdaFunction>
  | Subtype<StpResource, StpContainerWorkload>
  | Subtype<StpResource, StpBatchJob>
  | Subtype<StpResource, StpStateMachine>
  | Subtype<StpResource, StpEventBus>
  | Subtype<StpResource, StpBucket>
  | Subtype<StpResource, StpDynamoTable>
  | Subtype<StpResource, StpDsqlDatabase>
  | Subtype<StpResource, StpEmailSender>
  | Subtype<StpResource, StpOpenSearchDomain>
  | Subtype<StpResource, StpUserAuthPool>
  | Subtype<StpResource, StpSqsQueue>
  | Subtype<StpResource, StpSnsTopic>
  | Subtype<StpResource, StpKinesisStream>
  | Subtype<StpResource, StpKafkaCluster>
  | Subtype<StpResource, StpAgentCoreRuntime>
  | Subtype<StpResource, StpAgentCoreMemory>
  | Subtype<StpResource, StpAgentCoreGateway>
  | Subtype<StpResource, StpAgentCoreBrowser>
  | Subtype<StpResource, StpAgentCoreCodeInterpreter>
  | Subtype<StpResource, StpWebSocketApiGateway>
  | Subtype<StpResource, StpAppSyncApi>;
export type StpResourceScopableByConnectToAffectingSecurityGroup =
  | Subtype<StpResource, StpRelationalDatabase>
  | Subtype<StpResource, StpRedis>
  | Subtype<StpResource, StpKafkaCluster>;
export type Script = StacktapeConfig['scripts'][string] & { scriptName: string };
export interface TunnelTargetInfo {
  /**
   * #### Bastion Resource Name
   *
   * ---
   *
   * The name of the bastion resource (as defined in your configuration) to use for the tunnel.
   */
  bastionStpName?: string;
  /**
   * #### Target Resource Name
   *
   * ---
   *
   * The name of the target resource to connect to through the tunnel. Environment variables passed to the script are automatically adjusted to use the tunneled endpoints.
   *
   * **Supported Target Resources:**
   * - `relational-database`
   * - `redis`
   * - `mongo-db-atlas-cluster`
   * - `application-load-balancer`
   * - `private-service` (with an Application Load Balancer)
   *
   * If the target resource has multiple endpoints (e.g., a Redis cluster with reader and writer endpoints), all endpoints are tunneled automatically.
   */
  targetStpName: string;
}
export type ResolvedRemoteTarget = {
  bastionInstanceId: string;
  remoteHost: string;
  remotePort: number;
  label: string;
  targetStpName: string;
  additionalStringToSubstitute?: string;
  affectedReferencableParams?: StacktapeResourceReferenceableParam[];
};
export type StacktapeResourceReferenceableParam = AnyReferenceableParamName;
