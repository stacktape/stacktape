import { pendingOperations } from '@application-services/command-lifecycle/pending-operations';
import { operationReporter } from '@application-services/operation-manager';
import { calculatedStackOverviewManager } from './index';
import { settleResourceResolvers } from './resolver-lifecycle';
import { resolveAgentCoreResources } from './resource-resolvers/agentcore';
import { resolveApplicationLoadBalancers } from './resource-resolvers/application-load-balancers';
import { resolveAppSyncApis } from './resource-resolvers/appsync-apis';
import { resolveAwsCdkConstructs } from './resource-resolvers/aws-cdk-construct';
import { resolveAcceptVpcPeeringCustomResource } from './resource-resolvers/background-resources/accept-vpc-peerings-custom-resource';
import { resolveCodeDeploySharedResources } from './resource-resolvers/background-resources/code-deploy';
import { resolveDefaultDomainCertCustomResource } from './resource-resolvers/background-resources/default-domain-cert-custom-resource';
import { resolveDeploymentBucket } from './resource-resolvers/background-resources/deployment-bucket';
import { resolveDebugAgentRole } from './resource-resolvers/background-resources/debug-agent-role';
import { resolveDevAgentRole } from './resource-resolvers/background-resources/dev-agent-role';
import { resolveImageRepository } from './resource-resolvers/background-resources/deployment-image-repository';
import { resolveS3EventsCustomResource } from './resource-resolvers/background-resources/s3-events-custom-resource';
import { resolveSensitiveDataCustomResource } from './resource-resolvers/background-resources/sensitive-data-custom-resource';
import { resolveServiceDiscoveryPrivateNamespace } from './resource-resolvers/background-resources/service-discovery';
import {
  resolveDefaultEdgeLambdaBucket,
  resolveDefaultEdgeLambdas
} from './resource-resolvers/background-resources/shared-edge-lambdas-custom-resource';
import { resolveStacktapeServiceLambda } from './resource-resolvers/background-resources/stacktape-service-lambda';
import { resolveAwsVpcDeployment } from './resource-resolvers/background-resources/vpc';
import { resolveBastions } from './resource-resolvers/bastion';
import { resolveBatchJobs } from './resource-resolvers/batch-jobs';
import { resolveBuckets } from './resource-resolvers/buckets';
import { resolveBudget } from './resource-resolvers/budget';
import { resolveCloudformationResources } from './resource-resolvers/cloudformation-resources';
import { resolveConvexes } from './resource-resolvers/convex';
import { resolveCustomResources } from './resource-resolvers/custom-resources';
import { resolveDatabases } from './resource-resolvers/databases';
import { resolveDeploymentScripts } from './resource-resolvers/deployment-scripts';
import { resolveDynamoTables } from './resource-resolvers/dynamo-db-tables';
import { resolveDsqlDatabases } from './resource-resolvers/dsql-databases';
import { resolveEmailSenders } from './resource-resolvers/email-senders';
import { resolveEdgeLambdaFunctions } from './resource-resolvers/edge-lambda-functions';
import { resolveEfsFilesystems } from './resource-resolvers/efs-filesystems';
import { resolveEventBuses } from './resource-resolvers/event-buses';
import { resolveFunctions } from './resource-resolvers/functions';
import { resolveHostingBuckets } from './resource-resolvers/hosting-buckets';
import { resolveHttpApiGateways } from './resource-resolvers/http-api-gateways';
import { resolveWebsocketApiGateways } from './resource-resolvers/websocket-api-gateways';
import { resolveKinesisStreams } from './resource-resolvers/kinesis-streams';
import { resolveKafkaClusters } from './resource-resolvers/kafka-clusters';
import { resolveAtlasMongoClusters } from './resource-resolvers/mongo-db-atlas-clusters';
import { resolveContainerWorkloads } from './resource-resolvers/multi-container-workloads';
import { resolveDevContainerWorkloadRoles } from './resource-resolvers/multi-container-workloads/dev-roles';
import { resolveNetworkLoadBalancers } from './resource-resolvers/network-load-balancers';
import { resolveNextjsWebs } from './resource-resolvers/nextjs-web';
import {
  resolveAstroWebs,
  resolveNuxtWebs,
  resolveSvelteKitWebs,
  resolveSolidStartWebs,
  resolveTanStackWebs,
  resolveRemixWebs
} from './resource-resolvers/ssr-web';
import { resolveOpenSearchDomains } from './resource-resolvers/open-search';
import { resolveStackOutputs } from './resource-resolvers/outputs';
import { resolvePrivateServices } from './resource-resolvers/private-services';
import { resolveRedisClusters } from './resource-resolvers/redis-clusters';
import { resolveSnsTopics } from './resource-resolvers/sns-topics';
import { resolveSqsQueues } from './resource-resolvers/sqs-queues';
import { resolveStateMachines } from './resource-resolvers/state-machines';
import { resolveSyntheticTests } from './resource-resolvers/synthetic-tests';
import { resolveTracingInfrastructure } from './resource-resolvers/tracing';
import { resolveUpstashRedisDatabases } from './resource-resolvers/upstash-redis';
import { resolveUptimeChecks } from './resource-resolvers/uptime-checks';
import { resolveUserPools } from './resource-resolvers/user-pools';
import { resolveWebAppFirewalls } from './resource-resolvers/web-app-firewalls';
import { resolveWebServices } from './resource-resolvers/web-services';
import { resolveWorkerServices } from './resource-resolvers/worker-services';

export const resolveAllResources = () => pendingOperations.track(synthesizeResources());

const synthesizeResources = async () => {
  void calculatedStackOverviewManager.context;
  // No phase pin: this runs at different points per command (after packaging
  // during deploy), and pinning it to INITIALIZE would file the event under a
  // phase that already closed in the operation journal.
  await operationReporter.startEvent({
    eventType: 'RESOLVE_CONFIG',
    description: 'Preparing infrastructure template'
  });
  await settleResourceResolvers([
    resolveStackOutputs,
    resolveCustomResources,
    resolveDeploymentBucket,
    resolveImageRepository,
    resolveApplicationLoadBalancers,
    resolveAppSyncApis,
    resolveBatchJobs,
    resolveNetworkLoadBalancers,
    resolveBuckets,
    resolveContainerWorkloads,
    resolveAwsVpcDeployment,
    resolveDefaultEdgeLambdas,
    resolveDefaultEdgeLambdaBucket,
    resolveStacktapeServiceLambda,
    resolveFunctions,
    resolveAgentCoreResources,
    resolveS3EventsCustomResource,
    resolveSensitiveDataCustomResource,
    resolveAcceptVpcPeeringCustomResource,
    resolveDefaultDomainCertCustomResource,
    resolveDatabases,
    resolveDynamoTables,
    resolveDsqlDatabases,
    resolveEmailSenders,
    resolveOpenSearchDomains,
    resolveEventBuses,
    resolveBastions,
    resolveCloudformationResources,
    resolveStateMachines,
    resolveHttpApiGateways,
    resolveWebsocketApiGateways,
    resolveUserPools,
    resolveAtlasMongoClusters,
    resolveServiceDiscoveryPrivateNamespace,
    resolveRedisClusters,
    resolveUpstashRedisDatabases,
    resolveUptimeChecks,
    resolveSyntheticTests,
    resolveTracingInfrastructure,
    resolveEdgeLambdaFunctions,
    resolveBudget,
    resolveCodeDeploySharedResources,
    resolveWebServices,
    resolveAwsCdkConstructs,
    resolvePrivateServices,
    resolveWorkerServices,
    resolveSqsQueues,
    resolveSnsTopics,
    resolveKinesisStreams,
    resolveKafkaClusters,
    resolveHostingBuckets,
    resolveWebAppFirewalls,
    resolveDeploymentScripts,
    resolveNextjsWebs,
    resolveAstroWebs,
    resolveNuxtWebs,
    resolveSvelteKitWebs,
    resolveSolidStartWebs,
    resolveTanStackWebs,
    resolveRemixWebs,
    resolveEfsFilesystems,
    () => resolveConvexes({ context: calculatedStackOverviewManager.context }),
    resolveDevAgentRole,
    resolveDebugAgentRole,
    resolveDevContainerWorkloadRoles
  ]);
  await operationReporter.finishEvent({
    eventType: 'RESOLVE_CONFIG',
    finalMessage: `Infrastructure template prepared (${calculatedStackOverviewManager.resourceCount} AWS resources)`
  });
};
