import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import type { Subtype } from '@utils/type-helpers';
import type {
  AgentCoreBrowserReferencableParam,
  AgentCoreCodeInterpreterReferencableParam,
  AgentCoreGatewayReferencableParam,
  AgentCoreMemoryReferencableParam,
  AgentCoreRuntimeReferencableParam,
  StpAgentCoreBrowser,
  StpAgentCoreCodeInterpreter,
  StpAgentCoreGateway,
  StpAgentCoreMemory,
  StpAgentCoreRuntime
} from '@domain-services/config-manager/resolved-types/agentcore';
import type {
  ApplicationLoadBalancerReferenceableParam,
  StpApplicationLoadBalancer
} from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type { StpAstroWeb } from '@domain-services/config-manager/resolved-types/astro-web';
import type { StpAwsCdkConstruct } from '@domain-services/config-manager/resolved-types/aws-cdk-construct';
import type { StpBastion } from '@domain-services/config-manager/resolved-types/bastion';
import type { BatchJobReferencableParam, StpBatchJob } from '@domain-services/config-manager/resolved-types/batch-jobs';
import type { BucketReferencableParam, StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type { ConvexReferencableParam, StpConvex } from '@domain-services/config-manager/resolved-types/convex';
import type {
  StpCustomResource,
  StpCustomResourceDefinition
} from '@domain-services/config-manager/resolved-types/custom-resources';
import type { StpDeploymentScript } from '@domain-services/config-manager/resolved-types/deployment-script';
import type {
  DynamoDBTableReferencableParam,
  StpDynamoTable
} from '@domain-services/config-manager/resolved-types/dynamo-db-tables';
import type {
  StpEdgeLambdaFunction,
  StpHelperEdgeLambdaFunction
} from '@domain-services/config-manager/resolved-types/edge-lambda-functions';
import type { StpEfsFilesystem } from '@domain-services/config-manager/resolved-types/efs-filesystem';
import type {
  EventBusReferencableParam,
  StpEventBus
} from '@domain-services/config-manager/resolved-types/event-buses';
import type {
  FunctionReferencableParam,
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import type { StpHostingBucket } from '@domain-services/config-manager/resolved-types/hosting-buckets';
import type {
  HttpApiGatewayReferencableParam,
  StpHttpApiGateway
} from '@domain-services/config-manager/resolved-types/http-api-gateways';
import type {
  KinesisStreamReferencableParam,
  StpKinesisStream
} from '@domain-services/config-manager/resolved-types/kinesis-streams';
import type {
  MongoDbAtlasClusterReferencableParam,
  StpMongoDbAtlasCluster
} from '@domain-services/config-manager/resolved-types/mongo-db-atlas-clusters';
import type {
  ContainerWorkloadReferencableParam,
  StpContainerWorkload
} from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { StpNetworkLoadBalancer } from '@domain-services/config-manager/resolved-types/network-load-balancer';
import type { StpNextjsWeb } from '@domain-services/config-manager/resolved-types/nextjs-web';
import type { StpNuxtWeb } from '@domain-services/config-manager/resolved-types/nuxt-web';
import type {
  OpenSearchDomainReferencableParams,
  StpOpenSearchDomain
} from '@domain-services/config-manager/resolved-types/open-search';
import type {
  PrivateServiceReferencableParams,
  StpPrivateService
} from '@domain-services/config-manager/resolved-types/private-services';
import type {
  RedisClusterReferencableParam,
  StpRedisCluster
} from '@domain-services/config-manager/resolved-types/redis-cluster';
import type {
  RelationalDatabaseReferencableParam,
  StpRelationalDatabase
} from '@domain-services/config-manager/resolved-types/relational-databases';
import type { StpRemixWeb } from '@domain-services/config-manager/resolved-types/remix-web';
import type { StpSnsTopic } from '@domain-services/config-manager/resolved-types/sns-topic';
import type { StpSolidStartWeb } from '@domain-services/config-manager/resolved-types/solidstart-web';
import type { StpSqsQueue } from '@domain-services/config-manager/resolved-types/sqs-queues';
import type { StateMachineReferencableParam } from '@domain-services/config-manager/resolved-types/state-machines';
import type { StpSvelteKitWeb } from '@domain-services/config-manager/resolved-types/sveltekit-web';
import type { StpTanStackWeb } from '@domain-services/config-manager/resolved-types/tanstack-web';
import type {
  StpUpstashRedis,
  UpstashRedisReferencableParam
} from '@domain-services/config-manager/resolved-types/upstash-redis';
import type {
  StpUserAuthPool,
  UserPoolReferencableParam
} from '@domain-services/config-manager/resolved-types/user-pools';
import type {
  StpWebAppFirewall,
  WebAppFirewallReferencableParams
} from '@domain-services/config-manager/resolved-types/web-app-firewall';
import type {
  StpWebService,
  WebServiceReferencableParam
} from '@domain-services/config-manager/resolved-types/web-services';
import type {
  StpWorkerService,
  WorkerServiceReferencableParams
} from '@domain-services/config-manager/resolved-types/worker-services';
import type { StacktapeConfig } from '@stacktape/config';
import type { AgentCoreRuntime } from '@stacktape/config/agentcore';
import type { Convex } from '@stacktape/config/convex';
import type { StacktapeWorkloadDefinition } from '@stacktape/config/shared';
import type { StpStateMachine } from '@stacktape/config/state-machines';

export type StpResource = (
  | StpWorkloadDefinition
  | StpRelationalDatabase
  | StpApplicationLoadBalancer
  | StpNetworkLoadBalancer
  | StpHttpApiGateway
  | StpBucket
  | StpUserAuthPool
  | StpEventBus
  | StpBastion
  | StpDynamoTable
  | StpStateMachine
  | StpMongoDbAtlasCluster
  | StpRedisCluster
  | StpCustomResource
  | StpCustomResourceDefinition
  | StpUpstashRedis
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
export type Tracing = 'Active' | 'PassThrough';
export type EcsServiceScheduledMaintenanceRuleInput = {
  ecsServiceArn: string | Intrinsic;
  asgName: string | Intrinsic;
  codeDeployApplicationName?: string;
  codeDeployDeploymentGroupName?: string;
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
export type StpWorkloadDefinition =
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
export type DevModeCapableResourceType = Subtype<
  StpResourceType,
  'batch-job' | 'multi-container-workload' | 'function'
>;
export type StpCdnOriginTargetableByRouteRewrite = StpCdnAttachableResourceType | 'custom-origin';
export type StpDomainAttachableResourceType =
  | Subtype<StpResourceType, 'application-load-balancer' | 'http-api-gateway' | 'network-load-balancer'>
  | 'cdn';
export type StpResourceScopableByConnectToAffectingRole =
  | Subtype<StpResource, StpLambdaFunction>
  | Subtype<StpResource, StpContainerWorkload>
  | Subtype<StpResource, StpBatchJob>
  | Subtype<StpResource, StpStateMachine>
  | Subtype<StpResource, StpEventBus>
  | Subtype<StpResource, StpBucket>
  | Subtype<StpResource, StpDynamoTable>
  | Subtype<StpResource, StpOpenSearchDomain>
  | Subtype<StpResource, StpUserAuthPool>
  | Subtype<StpResource, StpSqsQueue>
  | Subtype<StpResource, StpSnsTopic>
  | Subtype<StpResource, StpKinesisStream>
  | Subtype<StpResource, StpAgentCoreRuntime>
  | Subtype<StpResource, StpAgentCoreMemory>
  | Subtype<StpResource, StpAgentCoreGateway>
  | Subtype<StpResource, StpAgentCoreBrowser>
  | Subtype<StpResource, StpAgentCoreCodeInterpreter>;
export type StpResourceScopableByConnectToAffectingSecurityGroup =
  | Subtype<StpResource, StpRelationalDatabase>
  | Subtype<StpResource, StpRedisCluster>;
export type StpResourceScopableByConnectTo =
  | StpResourceScopableByConnectToAffectingSecurityGroup
  | StpResourceScopableByConnectToAffectingRole;
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
   * - `redis-cluster`
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
export interface CfStackPolicyStatement {
  /**
   * #### Whether to allow or deny the specified update actions.
   */
  Effect?: 'Allow' | 'Deny';
  /**
   * #### Update actions to allow or deny on the specified resources.
   */
  Action?: ('Update:Modify' | 'Update:Replace' | 'Update:Delete' | 'Update:*')[];
  /**
   * #### Conditions under which this policy statement applies.
   */
  Condition?: any;
  /**
   * #### Logical resource IDs this policy applies to. Use `"*"` for all resources.
   */
  Resource: string[];
  /**
   * #### Must be `"*"` (applies to all callers). Required by CloudFormation.
   */
  Principal: '*';
}
export type StacktapeResourceReferenceableParam =
  | ApplicationLoadBalancerReferenceableParam
  | BatchJobReferencableParam
  | BucketReferencableParam
  | ContainerWorkloadReferencableParam
  | DynamoDBTableReferencableParam
  | EventBusReferencableParam
  | FunctionReferencableParam
  | HttpApiGatewayReferencableParam
  | MongoDbAtlasClusterReferencableParam
  | RedisClusterReferencableParam
  | RelationalDatabaseReferencableParam
  | StateMachineReferencableParam
  | UpstashRedisReferencableParam
  | UserPoolReferencableParam
  | PrivateServiceReferencableParams
  | WebServiceReferencableParam
  | WorkerServiceReferencableParams
  | WebAppFirewallReferencableParams
  | OpenSearchDomainReferencableParams
  | KinesisStreamReferencableParam
  | ConvexReferencableParam
  | AgentCoreRuntimeReferencableParam
  | AgentCoreMemoryReferencableParam
  | AgentCoreGatewayReferencableParam
  | AgentCoreBrowserReferencableParam
  | AgentCoreCodeInterpreterReferencableParam;
