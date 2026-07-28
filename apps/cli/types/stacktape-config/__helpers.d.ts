import type { StacktapeConfig } from '@stacktape/config';
import type { AgentCoreRuntime } from '@stacktape/config/agentcore';
import type { IntrinsicFunction } from '@stacktape/config/cloudformation';
import type { Convex } from '@stacktape/config/convex';
import type { StacktapeWorkloadDefinition } from '@stacktape/config/shared';
import type { StpStateMachine } from '@stacktape/config/state-machines';

declare global {
type StpResource = (
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
type StpWorkloadType = StacktapeWorkloadDefinition['type'] | Convex['type'] | AgentCoreRuntime['type'];
type StpResourceType = StpResource['type'];
type Tracing = 'Active' | 'PassThrough';
type EcsServiceScheduledMaintenanceRuleInput = {
  ecsServiceArn: string | IntrinsicFunction;
  asgName: string | IntrinsicFunction;
  codeDeployApplicationName?: string;
  codeDeployDeploymentGroupName?: string;
};
type CustomTaggingScheduledRuleInput = {
  tagNetworkInterfaceWithSecurityGroup: {
    securityGroupId: string | IntrinsicFunction;
    attributionCfResourceLogicalName: string;
    extraTags?: { Key: string; Value: string }[];
  }[];
  tagHostedZoneAttributedToCloudMapNamespace: {
    namespaceId: string | IntrinsicFunction;
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
type StpCdnCompatibleResource = StpBucket | StpApplicationLoadBalancer | StpHttpApiGateway | StpLambdaFunction;
type StpCdnAttachableResourceType = Subtype<
  StpResourceType,
  'bucket' | 'application-load-balancer' | 'http-api-gateway' | 'function' // | 'web-service' | 'hosting-bucket'
>;
type DevModeCapableResourceType = Subtype<StpResourceType, 'batch-job' | 'multi-container-workload' | 'function'>;
type StpCdnOriginTargetableByRouteRewrite = StpCdnAttachableResourceType | 'custom-origin';
type StpDomainAttachableResourceType =
  | Subtype<StpResourceType, 'application-load-balancer' | 'http-api-gateway' | 'network-load-balancer'>
  | 'cdn';
type StpResourceScopableByConnectToAffectingRole =
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
  | Subtype<StpResource, StpKinesisStream>;
type StpResourceScopableByConnectToAffectingSecurityGroup =
  | Subtype<StpResource, StpRelationalDatabase>
  | Subtype<StpResource, StpRedisCluster>;
type StpResourceScopableByConnectTo =
  | StpResourceScopableByConnectToAffectingSecurityGroup
  | StpResourceScopableByConnectToAffectingRole;
type Script = StacktapeConfig['scripts'][string] & { scriptName: string };
interface TunnelTargetInfo {
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
type ResolvedRemoteTarget = {
  bastionInstanceId: string;
  remoteHost: string;
  remotePort: number;
  label: string;
  targetStpName: string;
  additionalStringToSubstitute?: string;
  affectedReferencableParams?: StacktapeResourceReferenceableParam[];
};
interface CfStackPolicyStatement {
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
type StacktapeResourceReferenceableParam =
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
}
