import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';

import type { SupportedPrivateCfResourceType } from '@domain-services/cloudformation-registry-manager/types';
import type {
  ApplicationLoadBalancerOutputs,
  StpApplicationLoadBalancer
} from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type { StpAstroWeb } from '@domain-services/config-manager/resolved-types/astro-web';
import type { StpAwsCdkConstruct } from '@domain-services/config-manager/resolved-types/aws-cdk-construct';
import type { StpBastion } from '@domain-services/config-manager/resolved-types/bastion';
import type { StpBatchJob } from '@domain-services/config-manager/resolved-types/batch-jobs';
import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type {
  StpCustomResource,
  StpCustomResourceDefinition
} from '@domain-services/config-manager/resolved-types/custom-resources';
import type { StpDeploymentScript } from '@domain-services/config-manager/resolved-types/deployment-script';
import type { StpDynamoTable } from '@domain-services/config-manager/resolved-types/dynamo-db-tables';
import type { StpEdgeLambdaFunction } from '@domain-services/config-manager/resolved-types/edge-lambda-functions';
import type { StpEfsFilesystem } from '@domain-services/config-manager/resolved-types/efs-filesystem';
import type { StpEventBus } from '@domain-services/config-manager/resolved-types/event-buses';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { StpHostingBucket } from '@domain-services/config-manager/resolved-types/hosting-buckets';
import type {
  HttpApiGatewayOutputs,
  StpHttpApiGateway
} from '@domain-services/config-manager/resolved-types/http-api-gateways';
import type { StpMongoDbAtlasCluster } from '@domain-services/config-manager/resolved-types/mongo-db-atlas-clusters';
import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { StpNetworkLoadBalancer } from '@domain-services/config-manager/resolved-types/network-load-balancer';
import type { StpNextjsWeb } from '@domain-services/config-manager/resolved-types/nextjs-web';
import type { StpNuxtWeb } from '@domain-services/config-manager/resolved-types/nuxt-web';
import type { StpOpenSearchDomain } from '@domain-services/config-manager/resolved-types/open-search';
import type { StpPrivateService } from '@domain-services/config-manager/resolved-types/private-services';
import type { StpRedisCluster } from '@domain-services/config-manager/resolved-types/redis-cluster';
import type { StpRelationalDatabase } from '@domain-services/config-manager/resolved-types/relational-databases';
import type { StpRemixWeb } from '@domain-services/config-manager/resolved-types/remix-web';
import type {
  StacktapeResourceReferenceableParam,
  StpResourceType
} from '@domain-services/config-manager/resolved-types/resources';
import type { StpSnsTopic } from '@domain-services/config-manager/resolved-types/sns-topic';
import type { StpSolidStartWeb } from '@domain-services/config-manager/resolved-types/solidstart-web';
import type { StpSqsQueue } from '@domain-services/config-manager/resolved-types/sqs-queues';
import type { StpSvelteKitWeb } from '@domain-services/config-manager/resolved-types/sveltekit-web';
import type { StpTanStackWeb } from '@domain-services/config-manager/resolved-types/tanstack-web';
import type { StpUpstashRedis } from '@domain-services/config-manager/resolved-types/upstash-redis';
import type { StpUserAuthPool } from '@domain-services/config-manager/resolved-types/user-pools';
import type { StpWebAppFirewall } from '@domain-services/config-manager/resolved-types/web-app-firewall';
import type { StpWebService } from '@domain-services/config-manager/resolved-types/web-services';
import type { StpWorkerService } from '@domain-services/config-manager/resolved-types/worker-services';
import type { StpStateMachine } from '@stacktape/config/state-machines';

export type ResourceWithPhysicalId = {
  nameChain: string[];
  parentType: StackInfoMapResource['resourceType'];
  resourcePhysicalId: string;
  cfType: import('@stacktape/cloudformation/resource').KnownCloudFormationResourceType | SupportedPrivateCfResourceType;
};

export type CfChildResourceOverview = import('@stacktape/stack-info/contracts').CloudformationChildResourceOverview<
  import('@aws-cdk/cloudformation-diff').ResourceImpact,
  import('@stacktape/cloudformation/resource').KnownCloudFormationResourceType | SupportedPrivateCfResourceType
>;

export type StackInfoMap = import('@stacktape/stack-info/contracts').StackInfoMap<
  StpResourceType,
  OutputValue,
  StacktapeResourceReferenceableParam,
  import('@aws-cdk/cloudformation-diff').ResourceImpact,
  import('@stacktape/cloudformation/resource').KnownCloudFormationResourceType | SupportedPrivateCfResourceType,
  OutputValue | Date
>;

export type OutputValue = string | number | boolean | Intrinsic;

// number | boolean |

export type StackInfoMapResource = StackInfoMap['resources'][string];

export type StacktapeResourceOutput<T extends StpResourceType> = T extends 'http-api-gateway'
  ? HttpApiGatewayOutputs
  : T extends 'application-load-balancer'
    ? ApplicationLoadBalancerOutputs
    : T extends 'web-app-firewall'
      ? Intrinsic
      : never;

export type StackMetadata = {
  name: string;
  createdTime: Date;
  lastUpdatedTime: Date;
  [metaName: string]: OutputValue | Date;
};

export type DetailedStackResourceInfo = import('@stacktape/stack-info/contracts').DetailedStackResourceInfo<
  StpResourceType,
  OutputValue,
  StacktapeResourceReferenceableParam,
  import('@aws-cdk/cloudformation-diff').ResourceImpact,
  import('@stacktape/cloudformation/resource').KnownCloudFormationResourceType | SupportedPrivateCfResourceType
>;

export type DetailedStackInfoMap = Omit<
  import('@stacktape/stack-info/contracts').DetailedStackInfoMap<
    StpResourceType,
    OutputValue,
    StacktapeResourceReferenceableParam,
    import('@aws-cdk/cloudformation-diff').ResourceImpact,
    import('@stacktape/cloudformation/resource').KnownCloudFormationResourceType | SupportedPrivateCfResourceType
  >,
  'metadata'
> & {
  metadata: StackMetadata;
};

export type ResourcePropsFromConfig<T extends StpResourceType> = T extends 'application-load-balancer'
  ? StpApplicationLoadBalancer // []
  : T extends 'network-load-balancer'
    ? StpNetworkLoadBalancer // []
    : T extends 'batch-job'
      ? StpBatchJob // []
      : T extends 'bucket'
        ? StpBucket // []
        : T extends 'edge-lambda-function'
          ? StpEdgeLambdaFunction // []
          : T extends 'multi-container-workload'
            ? StpContainerWorkload // []
            : T extends 'custom-resource-definition'
              ? StpCustomResourceDefinition // []
              : T extends 'custom-resource-instance'
                ? StpCustomResource // []
                : T extends 'deployment-script'
                  ? StpDeploymentScript // []
                  : T extends 'dynamo-db-table'
                    ? StpDynamoTable // []
                    : T extends 'event-bus'
                      ? StpEventBus // []
                      : T extends 'bastion'
                        ? StpBastion
                        : T extends 'function'
                          ? StpLambdaFunction // []
                          : T extends 'http-api-gateway'
                            ? StpHttpApiGateway // []
                            : T extends 'mongo-db-atlas-cluster'
                              ? StpMongoDbAtlasCluster // []
                              : T extends 'redis-cluster'
                                ? StpRedisCluster // []
                                : T extends 'relational-database'
                                  ? StpRelationalDatabase // []
                                  : T extends 'state-machine'
                                    ? StpStateMachine // []
                                    : T extends 'upstash-redis'
                                      ? StpUpstashRedis // []
                                      : T extends 'user-auth-pool'
                                        ? StpUserAuthPool // []
                                        : T extends 'web-service'
                                          ? StpWebService // []
                                          : T extends 'worker-service'
                                            ? StpWorkerService // []
                                            : T extends 'private-service'
                                              ? StpPrivateService // []
                                              : T extends 'aws-cdk-construct'
                                                ? StpAwsCdkConstruct // []
                                                : T extends 'sqs-queue'
                                                  ? StpSqsQueue // []
                                                  : T extends 'sns-topic'
                                                    ? StpSnsTopic // []
                                                    : T extends 'hosting-bucket'
                                                      ? StpHostingBucket // []
                                                      : T extends 'web-app-firewall'
                                                        ? StpWebAppFirewall // []
                                                        : T extends 'nextjs-web'
                                                          ? StpNextjsWeb // []
                                                          : T extends 'astro-web'
                                                            ? StpAstroWeb
                                                            : T extends 'nuxt-web'
                                                              ? StpNuxtWeb
                                                              : T extends 'sveltekit-web'
                                                                ? StpSvelteKitWeb
                                                                : T extends 'solidstart-web'
                                                                  ? StpSolidStartWeb
                                                                  : T extends 'tanstack-web'
                                                                    ? StpTanStackWeb
                                                                    : T extends 'remix-web'
                                                                      ? StpRemixWeb
                                                                      : T extends 'open-search-domain'
                                                                        ? StpOpenSearchDomain // []
                                                                        : T extends 'efs-filesystem'
                                                                          ? StpEfsFilesystem
                                                                          : never;
