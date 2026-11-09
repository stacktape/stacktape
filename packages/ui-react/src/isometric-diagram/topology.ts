import type { StacktapeConfig } from '@stacktape/config';
// ── Flow layers ──
// Each node is assigned a layer based on its role in the request/data flow.
// Layer 0 = external, Layer 5 = data stores. This drives the left-to-right layout.

export type FlowLayer = 'external' | 'edge' | 'ingress' | 'compute' | 'integration' | 'data';

// Subnet placement within VPC (or null for non-VPC resources). Stacktape creates only
// two subnet tiers: public (always, 3 AZs) and private (only when something needs it:
// a container service with usePrivateSubnetsWithNAT, an AgentCore runtime in VPC mode,
// or VPC functions once `stackConfig.nat` is set). There is no isolated/data tier.
type SubnetType = 'public' | 'private' | null;

/**
 * `security` covers controls that sit in front of a resource rather than carrying its traffic: a firewall attached
 * with `useFirewall`, or a user pool that signs the tokens a gateway checks.
 */
export type EdgeSemantic = 'request' | 'event' | 'dependency' | 'egress' | 'security';

export type TopologyNode = {
  id: string;
  label: string;
  resourceType: string;
  layer: FlowLayer;
  subnet: SubnetType;
  implicit?: boolean | undefined;
  /** Short type line under the name, e.g. "Aurora Postgres · 2 instances". */
  typeLabel?: string | undefined;
  /** Copies the resource really runs (tasks, instances, NAT gateways); absent for one. */
  replicas?: { min: number; max: number } | undefined;
  // Reachable only from inside the VPC (internal load balancers) — no user edge.
  internal?: boolean | undefined;
  /** A data store whose accessibility mode lets the internet connect to it. */
  isPublic?: boolean | undefined;
  // Resource-specific reachability note appended to the type description in tooltips
  // (e.g. which accessibility mode a database uses and what that means).
  accessNote?: string | undefined;
};

export type TopologyEdge = {
  id: string;
  from: string;
  to: string;
  label?: string | undefined;
  semantic: EdgeSemantic;
  // Plain-English explanation of the communication (sync/async, push/pull, what is
  // configured) shown in the hover tooltip.
  description?: string | undefined;
};

export type DiagramTopology = {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  hasVpc: boolean;
  hasPublicIngress: boolean;
};

// ── Resource type sets ──

const SSR_WEBS = new Set([
  'nextjs-web',
  'astro-web',
  'nuxt-web',
  'sveltekit-web',
  'solidstart-web',
  'tanstack-web',
  'remix-web'
]);

const SSR_FRAMEWORK_NAMES: Record<string, string> = {
  'nextjs-web': 'Next.js',
  'astro-web': 'Astro',
  'nuxt-web': 'Nuxt',
  'sveltekit-web': 'SvelteKit',
  'solidstart-web': 'SolidStart',
  'tanstack-web': 'TanStack Start',
  'remix-web': 'Remix'
};

const CONTAINER_SERVICES = new Set(['web-service', 'private-service', 'worker-service', 'multi-container-workload']);

// Convex's backend is a container workload the CLI creates with `usePrivateSubnetsWithNAT: false`, so it runs in the
// public subnets like a batch job or bastion.
const VPC_COMPUTE = new Set([...CONTAINER_SERVICES, 'batch-job', 'bastion', 'convex']);

const INTEGRATION_TYPES = new Set([
  'sqs-queue',
  'sns-topic',
  'event-bus',
  'kinesis-stream',
  'kafka-cluster',
  'state-machine',
  'email-sender',
  // AgentCore tools an agent runtime calls; they sit beside the runtime's other integrations.
  'agentcore-browser',
  'agentcore-code-interpreter'
]);

const DATA_TYPES = new Set([
  'relational-database',
  'dsql-database',
  'dynamo-db-table',
  'redis',
  'mongo-db-atlas-cluster',
  'upstash-redis',
  'open-search-domain',
  'bucket',
  'efs-filesystem',
  'agentcore-memory',
  'user-auth-pool'
]);

const INGRESS_TYPES = new Set([
  'http-api-gateway',
  'websocket-api-gateway',
  'appsync-api',
  'application-load-balancer',
  'network-load-balancer',
  'agentcore-gateway'
]);

// Ingress types a user reaches over the internet (AgentCore gateways are called by agents, not people).
const USER_FACING_INGRESS = new Set([
  'http-api-gateway',
  'websocket-api-gateway',
  'appsync-api',
  'application-load-balancer',
  'network-load-balancer'
]);

/**
 * Resource types that are not drawn.
 *
 * Synthetic tests and uptime checks watch a URL from outside the request path, and their target is a URL string,
 * not a resource reference, so there is nothing truthful to connect them to. A custom-resource instance is a single
 * deploy-time call of its definition with no runtime presence; the definition's node counts its instances instead.
 */
const HIDDEN_TYPES = new Set(['synthetic-test', 'uptime-check', 'custom-resource-instance']);

// connectTo targets that make an AgentCore runtime run in VPC mode (private subnets): the CLI opens security groups
// only for these (resolveConnectToList → accessToResourcesPotentiallyRequiringSecurityGroupCreation).
const VPC_ONLY_CONNECT_TARGETS = new Set(['relational-database', 'redis']);

// The shared implicit node representing EventBridge schedules. The `--` suffix
// cannot collide with user resource names (they never contain `--`).
const SCHEDULE_NODE_ID = 'schedule--implicit';

// ── Helpers ──

const getProps = (resource: any) => resource?.properties || {};
const getField = (resource: any, key: string) => resource?.[key] ?? resource?.properties?.[key];
const getLoadBalancerName = (value: any) => value?.loadBalancerName;

const getAccessibilityMode = (resource: any) => {
  const props = getProps(resource);
  return props.accessibility?.accessibilityMode ?? props.accessibilityMode;
};

const getConnectToNames = (resource: any): string[] => {
  const connectTo = getField(resource, 'connectTo');
  if (!Array.isArray(connectTo)) return [];
  return connectTo
    .map((target: any) => (typeof target === 'string' ? target : target?.name))
    .filter((name: unknown): name is string => typeof name === 'string');
};

// ── Layer assignment ──
// Determines the flow layer based on resource type (semantic default).
// Implicit nodes (user, CDN, NAT gateway, per-service ingress) set their layer explicitly.

const getLayer = ({ type }: { type: string }): FlowLayer => {
  if (
    SSR_WEBS.has(type) ||
    type === 'hosting-bucket' ||
    type === 'edge-lambda-function' ||
    type === 'web-app-firewall'
  ) {
    return 'edge';
  }

  if (INGRESS_TYPES.has(type)) return 'ingress';
  if (INTEGRATION_TYPES.has(type)) return 'integration';
  if (DATA_TYPES.has(type)) return 'data';

  // Functions, containers, batch jobs, deployment scripts, custom-resource handlers, Convex, agent runtimes and CDK
  // constructs all run code.
  return 'compute';
};

// ── Subnet assignment ──
// Determines which VPC subnet a resource belongs to, or null if outside VPC.
// Verified against the CLI synthesizer: databases, Redis caches, EFS mount targets,
// load balancers and Kafka clusters all live in the PUBLIC subnets — accessibility modes
// only change security-group ingress rules, never the subnet placement.

const isAgentRuntimeInVpc = ({ resource, resources }: { resource: any; resources: Record<string, any> }) =>
  getConnectToNames(resource).some((name) => VPC_ONLY_CONNECT_TARGETS.has(resources[name]?.type));

const getSubnet = ({
  type,
  resource,
  resources,
  vpcFunctionsUsePrivateSubnets
}: {
  type: string;
  resource: any;
  resources: Record<string, any>;
  vpcFunctionsUsePrivateSubnets: boolean;
}): SubnetType => {
  const props = getProps(resource);

  if (VPC_COMPUTE.has(type)) {
    return CONTAINER_SERVICES.has(type) && props.usePrivateSubnetsWithNAT ? 'private' : 'public';
  }

  // Always inside the VPC, whatever the accessibility mode.
  if (type === 'relational-database' || type === 'redis' || type === 'efs-filesystem' || type === 'kafka-cluster') {
    return 'public';
  }

  // OpenSearch joins the VPC only in vpc/scoping modes; in internet mode (default) the
  // domain runs outside the VPC entirely.
  if (type === 'open-search-domain') {
    const mode = getAccessibilityMode(resource);
    return mode === 'vpc' || mode === 'scoping-workloads-in-vpc' ? 'public' : null;
  }

  if ((type === 'function' || type === 'deployment-script') && props.joinDefaultVpc) {
    return vpcFunctionsUsePrivateSubnets ? 'private' : 'public';
  }

  // AWS offers AgentCore's VPC mode only in private subnets with NAT.
  if (type === 'agentcore-runtime' && isAgentRuntimeInVpc({ resource, resources })) {
    return 'private';
  }

  if (type === 'application-load-balancer' || type === 'network-load-balancer') {
    return 'public';
  }

  return null;
};

// Reachability notes appended to tooltips — this is where accessibility modes surface,
// since they change security-group rules rather than placement.
const getAccessNote = ({ type, resource }: { type: string; resource: any }): string | undefined => {
  if (type === 'relational-database') {
    const mode = getAccessibilityMode(resource) || 'internet';
    if (mode === 'internet') {
      return 'Accessibility mode "internet" (the default): the database is reachable from the internet — only credentials protect it.';
    }
    if (mode === 'vpc') return 'Accessibility mode "vpc": only resources inside the VPC can connect.';
    if (mode === 'scoping-workloads-in-vpc') {
      return 'Accessibility mode "scoping-workloads-in-vpc": only resources that connectTo this database can reach it.';
    }
    if (mode === 'whitelisted-ips-only') return 'Only whitelisted IP addresses can connect.';
  }

  if (type === 'mongo-db-atlas-cluster') {
    const mode = getAccessibilityMode(resource) || 'internet';
    if (mode === 'internet') {
      return 'Accessibility mode "internet" (the default): the cluster is reachable from the internet — only credentials protect it.';
    }
    if (mode === 'whitelisted-ips-only') return 'Only whitelisted IP addresses can connect.';
    return 'Reachable only through a private connection from the VPC.';
  }

  if (type === 'redis') {
    const mode = getAccessibilityMode(resource) || 'vpc';
    return mode === 'scoping-workloads-in-vpc'
      ? 'Reachable only from resources that connectTo this cache.'
      : 'Reachable only from inside the VPC.';
  }

  if (type === 'open-search-domain') {
    const mode = getAccessibilityMode(resource) || 'internet';
    if (mode === 'internet') return 'Accessibility mode "internet" (the default): reachable from the internet.';
    return mode === 'scoping-workloads-in-vpc'
      ? 'Reachable only from resources that connectTo this domain.'
      : 'Reachable only from inside the VPC.';
  }

  if (type === 'dsql-database') {
    return 'A public endpoint outside the VPC; every connection needs an IAM authentication token.';
  }

  if (type === 'kafka-cluster') {
    return 'Runs in the VPC; only resources that connectTo this cluster can reach its brokers, with IAM authentication.';
  }

  if (type === 'private-service') {
    const lbType = getProps(resource).loadBalancing?.type;
    if (lbType !== 'application-load-balancer') {
      return 'Reachable from other services in the stack via Service Connect (private DNS), without a load balancer.';
    }
  }

  if (
    (type === 'application-load-balancer' || type === 'network-load-balancer') &&
    getProps(resource).interface === 'internal'
  ) {
    return 'Internal load balancer — reachable only from inside the VPC, not from the internet.';
  }

  return undefined;
};

// Accessibility modes that let anyone on the internet open a connection. Relational databases, OpenSearch and
// MongoDB Atlas default to `internet`; `whitelisted-ips-only` admits only listed addresses.
const isInternetReachable = ({ type, resource }: { type: string; resource: any }) => {
  if (type !== 'relational-database' && type !== 'open-search-domain' && type !== 'mongo-db-atlas-cluster') {
    return false;
  }
  return (getAccessibilityMode(resource) || 'internet') === 'internet';
};

const isInternalLoadBalancer = ({ type, resource }: { type: string; resource: any }) =>
  (type === 'application-load-balancer' || type === 'network-load-balancer') &&
  getProps(resource).interface === 'internal';

// ── Replicas and type lines ──

const getContainerTasks = (resource: any) => {
  const scaling = getProps(resource).scaling;
  const min = Math.max(1, Number(scaling?.minInstances) || 1);
  const max = Math.max(min, Number(scaling?.maxInstances) || min);
  return { min, max };
};

/** Instances in the database cluster: the writer plus its readers, exactly as configured. */
const getDatabaseInstances = (resource: any) => {
  const engine = getProps(resource).engine;
  const type: string = engine?.type ?? '';
  const properties = engine?.properties ?? {};
  if (type === 'aurora-postgresql' || type === 'aurora-mysql') {
    return Math.max(1, Array.isArray(properties.instances) ? properties.instances.length : 1);
  }
  if (type.endsWith('-serverless-v2')) return 1 + Math.max(0, Number(properties.serverlessReadersCount) || 0);
  if (type.endsWith('-serverless')) return 1;
  return 1 + (Array.isArray(properties.readReplicas) ? properties.readReplicas.length : 0);
};

const getReplicas = ({ type, resource }: { type: string; resource: any }) => {
  if (CONTAINER_SERVICES.has(type)) {
    const tasks = getContainerTasks(resource);
    return tasks.max > 1 ? tasks : undefined;
  }
  if (type === 'relational-database') {
    const instances = getDatabaseInstances(resource);
    return instances > 1 ? { min: instances, max: instances } : undefined;
  }
  return undefined;
};

const ENGINE_NAMES: Record<string, string> = {
  postgres: 'Postgres',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  'oracle-ee': 'Oracle',
  'oracle-se2': 'Oracle',
  'sqlserver-ee': 'SQL Server',
  'sqlserver-ex': 'SQL Server',
  'sqlserver-se': 'SQL Server',
  'sqlserver-web': 'SQL Server',
  'aurora-postgresql': 'Aurora Postgres',
  'aurora-mysql': 'Aurora MySQL',
  'aurora-postgresql-serverless': 'Aurora Serverless Postgres',
  'aurora-mysql-serverless': 'Aurora Serverless MySQL',
  'aurora-postgresql-serverless-v2': 'Aurora Serverless Postgres',
  'aurora-mysql-serverless-v2': 'Aurora Serverless MySQL'
};

const TYPE_LABELS: Record<string, string> = {
  function: 'Function',
  'deployment-script': 'Deployment script',
  'batch-job': 'Batch job',
  bastion: 'Bastion host',
  'custom-resource-definition': 'Custom resource',
  'aws-cdk-construct': 'CDK construct',
  convex: 'Convex backend',
  'agentcore-runtime': 'Agent runtime',
  'agentcore-browser': 'Agent browser',
  'agentcore-code-interpreter': 'Code interpreter',
  'agentcore-memory': 'Agent memory',
  'agentcore-gateway': 'MCP gateway',
  'dsql-database': 'Aurora DSQL',
  'dynamo-db-table': 'DynamoDB table',
  redis: 'Redis',
  'upstash-redis': 'Upstash Redis',
  'mongo-db-atlas-cluster': 'MongoDB Atlas',
  'open-search-domain': 'OpenSearch',
  bucket: 'Bucket',
  'efs-filesystem': 'File system',
  'hosting-bucket': 'Static site · CDN',
  'http-api-gateway': 'HTTP API',
  'websocket-api-gateway': 'WebSocket API',
  'appsync-api': 'GraphQL API',
  'network-load-balancer': 'Network load balancer',
  'sns-topic': 'Topic',
  'event-bus': 'Event bus',
  'kinesis-stream': 'Kinesis stream',
  'kafka-cluster': 'Kafka cluster',
  'state-machine': 'State machine',
  'email-sender': 'Email (SES)',
  'user-auth-pool': 'User pool',
  'edge-lambda-function': 'Edge function',
  cloudfront: 'CDN',
  schedule: 'EventBridge schedule',
  user: 'Internet'
};

const CONTAINER_NAMES: Record<string, string> = {
  'web-service': 'Web service',
  'private-service': 'Private service',
  'worker-service': 'Worker service',
  'multi-container-workload': 'Containers'
};

const formatTasks = ({ min, max }: { min: number; max: number }) =>
  min === max ? `${min} task${min === 1 ? '' : 's'}` : `${min}–${max} tasks`;

const getTypeLabel = ({ type, resource }: { type: string; resource: any }): string => {
  const props = getProps(resource);

  if (CONTAINER_SERVICES.has(type)) {
    const tasks = getContainerTasks(resource);
    return tasks.max > 1 ? `${CONTAINER_NAMES[type]} · ${formatTasks(tasks)}` : CONTAINER_NAMES[type];
  }
  if (type === 'relational-database') {
    const name = ENGINE_NAMES[props.engine?.type] ?? 'Database';
    const instances = getDatabaseInstances(resource);
    return instances > 1 ? `${name} · ${instances} instances` : name;
  }
  if (SSR_WEBS.has(type)) return `${SSR_FRAMEWORK_NAMES[type]} site · CDN`;
  if (type === 'application-load-balancer') {
    return props.interface === 'internal' ? 'Internal load balancer' : 'Load balancer';
  }
  if (type === 'sqs-queue') return props.fifoEnabled ? 'FIFO queue' : 'Queue';
  if (type === 'web-app-firewall') return props.scope === 'cdn' ? 'Firewall · CDN' : 'Firewall';
  return TYPE_LABELS[type] ?? type;
};

const isFunctionPubliclyReachable = (resource: any) => {
  const events = getField(resource, 'events');
  const url = getField(resource, 'url');
  return Boolean(url?.enabled || events?.some((event: any) => event.type === 'http-api-gateway'));
};

const isCdnEnabled = (cdn: any) => Boolean(cdn && cdn.enabled !== false);

const extractResourceParamReferences = ({ value }: { value: unknown }): string[] => {
  const references = new Set<string>();
  const scan = (candidate: unknown) => {
    if (typeof candidate === 'string') {
      const resourceParamRegex = /\$ResourceParam\s*\(\s*(['"])(.*?)\1\s*,/g;
      for (const match of candidate.matchAll(resourceParamRegex)) {
        if (match[2]) references.add(match[2]);
      }
      return;
    }

    if (Array.isArray(candidate)) {
      for (const item of candidate) scan(item);
      return;
    }

    if (candidate && typeof candidate === 'object') {
      for (const item of Object.values(candidate)) scan(item);
    }
  };

  scan(value);
  return Array.from(references);
};

// ── Graph builder helpers ──

const addNode = ({ nodeMap, node }: { nodeMap: Map<string, TopologyNode>; node: TopologyNode }) => {
  if (!nodeMap.has(node.id)) {
    nodeMap.set(node.id, node);
  }
};

const addEdge = ({
  edgeMap,
  nodeMap,
  from,
  to,
  label,
  semantic,
  description
}: {
  edgeMap: Map<string, TopologyEdge>;
  nodeMap: Map<string, TopologyNode>;
  from: string;
  to: string;
  label?: string | undefined;
  semantic: EdgeSemantic;
  description?: string | undefined;
}) => {
  if (!nodeMap.has(from) || !nodeMap.has(to) || from === to) return;
  const key = `${from}->${to}::${semantic}::${label || ''}`;
  if (!edgeMap.has(key)) {
    edgeMap.set(key, {
      id: `edge-${key.replace(/[^a-zA-Z0-9-]/g, '-')}`,
      from,
      to,
      label,
      semantic,
      description
    });
  }
};

type GraphMaps = { edgeMap: Map<string, TopologyEdge>; nodeMap: Map<string, TopologyNode> };

type EventTargetKind = 'function' | 'batch-job' | 'container';

// Batch-job events are wired through a hidden trigger lambda that Stacktape synthesizes
// (queue → trigger function → AWS Batch SubmitJob → job) — the tooltip should not imply
// a direct subscription.
const getBatchSuffix = (targetKind: EventTargetKind) =>
  targetKind === 'batch-job'
    ? ' Delivered through an automatically created trigger function that submits the batch job.'
    : '';

const addScheduleEdge = ({
  edgeMap,
  nodeMap,
  nodeId,
  event,
  targetKind
}: GraphMaps & {
  nodeId: string;
  event: any;
  targetKind: EventTargetKind;
}) => {
  addNode({
    nodeMap,
    node: {
      id: SCHEDULE_NODE_ID,
      label: 'Schedule',
      resourceType: 'schedule',
      layer: 'external',
      subnet: null,
      implicit: true,
      typeLabel: TYPE_LABELS.schedule
    }
  });
  const scheduleRate = event.properties?.scheduleRate;
  const label = typeof scheduleRate === 'string' && scheduleRate.length <= 20 ? scheduleRate : 'schedule';
  addEdge({
    edgeMap,
    nodeMap,
    from: SCHEDULE_NODE_ID,
    to: nodeId,
    label,
    semantic: 'event',
    description: `EventBridge starts the target on a fixed schedule (${scheduleRate || 'see config'}). Asynchronous — nothing waits for the run to finish.${getBatchSuffix(targetKind)}`
  });
};

/**
 * Authorizers on an HTTP API route: a Cognito authorizer checks tokens signed by a user pool, a Lambda authorizer
 * calls a function before every request it admits.
 */
const addAuthorizerEdges = ({
  edgeMap,
  nodeMap,
  gatewayId,
  authorizer
}: GraphMaps & { gatewayId: string; authorizer: any }) => {
  if (authorizer?.type === 'cognito' && authorizer.properties?.userPoolName) {
    addEdge({
      edgeMap,
      nodeMap,
      from: gatewayId,
      to: authorizer.properties.userPoolName,
      label: 'JWT auth',
      semantic: 'security',
      description:
        'Protected routes accept only requests carrying a valid token issued by this user pool; the gateway rejects the rest with 401 before your code runs.'
    });
  }
  if (authorizer?.type === 'lambda' && authorizer.properties?.functionName) {
    addEdge({
      edgeMap,
      nodeMap,
      from: gatewayId,
      to: authorizer.properties.functionName,
      label: 'authorizer',
      semantic: 'security',
      description:
        'Before a protected route runs, the gateway calls this function with the request details and admits the request only if the function allows it.'
    });
  }
};

const addEventEdges = ({
  edgeMap,
  nodeMap,
  nodeId,
  events,
  requestLabel,
  targetKind = 'function'
}: GraphMaps & {
  nodeId: string;
  events: any;
  requestLabel?: string | undefined;
  targetKind?: EventTargetKind;
}) => {
  if (!Array.isArray(events)) return;
  const batchSuffix = getBatchSuffix(targetKind);

  for (const event of events) {
    if (event.type === 'http-api-gateway' && event.properties?.httpApiGatewayName) {
      addEdge({
        edgeMap,
        nodeMap,
        from: event.properties.httpApiGatewayName,
        to: nodeId,
        label: requestLabel,
        semantic: 'request',
        description:
          targetKind === 'container'
            ? 'Synchronous forwarding: the gateway routes matching requests into the VPC through a VPC Link and returns the container’s response.'
            : `Synchronous invocation: for matching routes, the gateway invokes the target and returns its response to the caller.${batchSuffix}`
      });
      addAuthorizerEdges({
        edgeMap,
        nodeMap,
        gatewayId: event.properties.httpApiGatewayName,
        authorizer: event.properties.authorizer
      });
    }

    if (event.type === 'websocket-api-gateway' && event.properties?.websocketApiGatewayName) {
      const gatewayId = event.properties.websocketApiGatewayName;
      addEdge({
        edgeMap,
        nodeMap,
        from: gatewayId,
        to: nodeId,
        semantic: 'request',
        description: `The gateway keeps each client connection open and invokes the function for the ${event.properties.routeKey ?? 'configured'} route; the function can reply or push messages back through the connection.`
      });
      if (event.properties.authorizer?.type === 'lambda' && event.properties.authorizer.properties?.functionName) {
        addEdge({
          edgeMap,
          nodeMap,
          from: gatewayId,
          to: event.properties.authorizer.properties.functionName,
          label: 'authorizer',
          semantic: 'security',
          description:
            'When a client opens a connection, the gateway calls this function and accepts the connection only if the function allows it.'
        });
      }
    }

    if (event.type === 'appsync-api' && event.properties?.appsyncApiName) {
      addEdge({
        edgeMap,
        nodeMap,
        from: event.properties.appsyncApiName,
        to: nodeId,
        label: event.properties.field,
        semantic: 'request',
        description:
          'Synchronous resolver: AppSync invokes the function to resolve this GraphQL field and returns its result in the query response.'
      });
    }

    if (event.type === 'application-load-balancer' || event.type === 'network-load-balancer') {
      const loadBalancerName = getLoadBalancerName(event.properties);
      if (loadBalancerName) {
        addEdge({
          edgeMap,
          nodeMap,
          from: loadBalancerName,
          to: nodeId,
          label: requestLabel,
          semantic: 'request',
          description: `Synchronous forwarding: the load balancer routes matching requests to this target and returns its response.${batchSuffix}`
        });
      }
    }

    if (event.type === 'sqs' && event.properties?.sqsQueueName) {
      addEdge({
        edgeMap,
        nodeMap,
        from: event.properties.sqsQueueName,
        to: nodeId,
        label: 'poll',
        semantic: 'event',
        description: `Asynchronous, pull-based: the Lambda service polls the queue and invokes the target with batches of messages. Failed batches are retried.${batchSuffix}`
      });
    }

    if (event.type === 'sns' && event.properties?.snsTopicName) {
      addEdge({
        edgeMap,
        nodeMap,
        from: event.properties.snsTopicName,
        to: nodeId,
        label: 'push',
        semantic: 'event',
        description: `Asynchronous, push-based: the topic delivers each published message to this subscriber immediately (fan-out to all subscribers).${batchSuffix}`
      });
    }

    if (event.type === 'kinesis-stream' && event.properties?.kinesisStreamName) {
      addEdge({
        edgeMap,
        nodeMap,
        from: event.properties.kinesisStreamName,
        to: nodeId,
        label: 'stream',
        semantic: 'event',
        description: `Asynchronous stream consumption: the target reads records from the stream in order, in batches.${batchSuffix}`
      });
    }

    if (event.type === 'kafka-topic' && event.properties?.kafkaClusterName) {
      addEdge({
        edgeMap,
        nodeMap,
        from: event.properties.kafkaClusterName,
        to: nodeId,
        label: 'stream',
        semantic: 'event',
        description: `Asynchronous stream consumption: the Lambda service reads the ${event.properties.topicName ?? 'configured'} topic and invokes the function with batches of records.`
      });
    }

    // Stream/bucket integrations reference ARNs, which in Stacktape configs are usually
    // written as $ResourceParam('<name>', 'streamArn'/'arn') directives — resolve the
    // referenced resource name from the directive.
    if (event.type === 'dynamo-db-stream' && event.properties?.streamArn) {
      for (const tableId of extractResourceParamReferences({ value: event.properties.streamArn })) {
        addEdge({
          edgeMap,
          nodeMap,
          from: tableId,
          to: nodeId,
          label: 'stream',
          semantic: 'event',
          description: `Asynchronous change data capture: every table change is streamed to the target in order.${batchSuffix}`
        });
      }
    }

    if (event.type === 'event-bus' && event.properties?.eventBusName) {
      addEdge({
        edgeMap,
        nodeMap,
        from: event.properties.eventBusName,
        to: nodeId,
        label: 'event',
        semantic: 'event',
        description: `Asynchronous event routing: events matching this target’s rule are delivered to it by the bus.${batchSuffix}`
      });
    }

    if (event.type === 's3' && event.properties?.bucketArn) {
      for (const bucketId of extractResourceParamReferences({ value: event.properties.bucketArn })) {
        addEdge({
          edgeMap,
          nodeMap,
          from: bucketId,
          to: nodeId,
          label: 'trigger',
          semantic: 'event',
          description: `Asynchronous trigger: bucket events (uploads, deletions) invoke the target with details of the affected object.${batchSuffix}`
        });
      }
    }

    if (event.type === 'schedule') {
      addScheduleEdge({ edgeMap, nodeMap, nodeId, event, targetKind });
    }
  }
};

const EDGE_FUNCTION_HOOKS = ['onRequest', 'onResponse', 'onOriginRequest', 'onOriginResponse'] as const;

const EDGE_FUNCTION_HOOK_DESCRIPTIONS: Record<(typeof EDGE_FUNCTION_HOOKS)[number], string> = {
  onRequest: 'when the CDN receives a request, before it looks in the cache',
  onResponse: 'before the CDN returns a response to the user',
  onOriginRequest: 'on a cache miss, before the CDN forwards the request to the origin',
  onOriginResponse: 'when the origin answers, before the CDN caches the response'
};

const addEdgeFunctionEdges = ({
  edgeMap,
  nodeMap,
  cdnId,
  edgeFunctions
}: GraphMaps & { cdnId: string; edgeFunctions: any }) => {
  for (const hook of EDGE_FUNCTION_HOOKS) {
    const functionName = edgeFunctions?.[hook];
    if (typeof functionName !== 'string') continue;
    addEdge({
      edgeMap,
      nodeMap,
      from: cdnId,
      to: functionName,
      label: hook,
      semantic: 'request',
      description: `The CDN runs this edge function at the edge location ${EDGE_FUNCTION_HOOK_DESCRIPTIONS[hook]}.`
    });
  }
};

const addFirewallEdge = ({
  edgeMap,
  nodeMap,
  firewallName,
  protectedId
}: GraphMaps & { firewallName: unknown; protectedId: string }) => {
  if (typeof firewallName !== 'string') return;
  addEdge({
    edgeMap,
    nodeMap,
    from: firewallName,
    to: protectedId,
    label: 'protects',
    semantic: 'security',
    description:
      'Every request to this resource is checked by the web application firewall first; requests matching its rules are blocked before they arrive.'
  });
};

const CDN_ORIGIN_FIELDS: Record<string, string> = {
  bucket: 'bucketName',
  'http-api-gateway': 'httpApiGatewayName',
  function: 'functionName',
  'application-load-balancer': 'loadBalancerName'
};

/**
 * The CloudFront distribution Stacktape puts in front of a resource whose `cdn` is enabled: users reach the CDN,
 * which forwards cache misses to the resource and to any other origin a route rewrite names.
 */
const addCdnInFront = ({
  edgeMap,
  nodeMap,
  owner,
  originId,
  cdn
}: GraphMaps & { owner: TopologyNode; originId: string; cdn: any }) => {
  if (!isCdnEnabled(cdn)) return;
  const cdnId = `${owner.id}--cdn`;
  addNode({
    nodeMap,
    node: {
      id: cdnId,
      label: `${owner.label} CDN`,
      resourceType: 'cloudfront',
      layer: 'edge',
      subnet: null,
      implicit: true,
      typeLabel: TYPE_LABELS.cloudfront
    }
  });
  addEdge({
    edgeMap,
    nodeMap,
    from: 'user',
    to: cdnId,
    label: 'HTTPS',
    semantic: 'request',
    description:
      'Users connect over HTTPS to the nearest CloudFront edge location; cached responses are served without reaching your service.'
  });
  addEdge({
    edgeMap,
    nodeMap,
    from: cdnId,
    to: originId,
    semantic: 'request',
    description: 'On cache miss, the CDN forwards the request to the origin and can cache the response at the edge.'
  });
  for (const rewrite of Array.isArray(cdn.routeRewrites) ? cdn.routeRewrites : []) {
    const routeTo = rewrite?.routeTo;
    const target = routeTo?.properties?.[CDN_ORIGIN_FIELDS[routeTo?.type] ?? ''];
    if (typeof target === 'string') {
      addEdge({
        edgeMap,
        nodeMap,
        from: cdnId,
        to: target,
        label: rewrite.path,
        semantic: 'request',
        description: `Requests matching ${rewrite.path ?? 'this route'} are forwarded to this origin instead of the default one.`
      });
    }
    addEdgeFunctionEdges({ edgeMap, nodeMap, cdnId, edgeFunctions: rewrite?.edgeFunctions });
  }
  addEdgeFunctionEdges({ edgeMap, nodeMap, cdnId, edgeFunctions: cdn.edgeFunctions });
  addFirewallEdge({ edgeMap, nodeMap, firewallName: cdn.useFirewall, protectedId: cdnId });
};

// Per-service implicit ingress created by web-service `loadBalancing`. In v4 every
// web-service provisions its own dedicated gateway / load balancer (there is no
// way to attach a web-service to an explicit ingress resource).
const WEB_SERVICE_INGRESS: Record<
  string,
  { suffix: string; labelSuffix: string; resourceType: string; subnet: SubnetType }
> = {
  'http-api-gateway': { suffix: 'gw', labelSuffix: 'GW', resourceType: 'http-api-gateway', subnet: null },
  'application-load-balancer': {
    suffix: 'alb',
    labelSuffix: 'ALB',
    resourceType: 'application-load-balancer',
    subnet: 'public'
  },
  'network-load-balancer': {
    suffix: 'nlb',
    labelSuffix: 'NLB',
    resourceType: 'network-load-balancer',
    subnet: 'public'
  }
};

/**
 * Convex is a self-hosted backend Stacktape assembles from ordinary parts (CLI `buildConvexNestedResources`): a
 * public ALB, the backend container (one task, public subnets), an optional dashboard container, a Postgres
 * database and five S3 buckets. The node named after the resource stands for the backend container.
 */
const addConvexParts = ({ edgeMap, nodeMap, node, resource }: GraphMaps & { node: TopologyNode; resource: any }) => {
  const props = getProps(resource);
  const albId = `${node.id}--alb`;
  const dbId = `${node.id}--db`;
  const storageId = `${node.id}--storage`;
  const dashboardId = `${node.id}--dashboard`;
  const databaseResource = {
    properties: {
      engine: props.database?.engine ?? { type: 'postgres' },
      accessibility: props.database?.accessibility ?? { accessibilityMode: 'scoping-workloads-in-vpc' }
    }
  };

  addNode({
    nodeMap,
    node: {
      id: albId,
      label: `${node.label} ALB`,
      resourceType: 'application-load-balancer',
      layer: 'ingress',
      subnet: 'public',
      implicit: true,
      typeLabel: 'Load balancer'
    }
  });
  addNode({
    nodeMap,
    node: {
      id: dbId,
      label: `${node.label} db`,
      resourceType: 'relational-database',
      layer: 'data',
      subnet: 'public',
      implicit: true,
      typeLabel: getTypeLabel({ type: 'relational-database', resource: databaseResource }),
      replicas: getReplicas({ type: 'relational-database', resource: databaseResource }),
      isPublic: isInternetReachable({ type: 'relational-database', resource: databaseResource }) || undefined,
      accessNote: getAccessNote({ type: 'relational-database', resource: databaseResource })
    }
  });
  addNode({
    nodeMap,
    node: {
      id: storageId,
      label: `${node.label} storage`,
      resourceType: 'bucket',
      layer: 'data',
      subnet: null,
      implicit: true,
      typeLabel: '5 buckets'
    }
  });

  addEdge({
    edgeMap,
    nodeMap,
    from: albId,
    to: node.id,
    semantic: 'request',
    description:
      'Synchronous forwarding: the load balancer sends client API calls (port 3210) and HTTP actions (port 3211) to the Convex backend.'
  });
  for (const targetId of [dbId, storageId]) {
    addEdge({
      edgeMap,
      nodeMap,
      from: node.id,
      to: targetId,
      semantic: 'dependency',
      description:
        targetId === dbId
          ? 'The backend keeps all Convex data in this Postgres database.'
          : 'The backend stores modules, files, search indexes, exports and snapshot imports in these buckets.'
    });
  }

  if (props.dashboard?.enabled !== false) {
    addNode({
      nodeMap,
      node: {
        id: dashboardId,
        label: `${node.label} dashboard`,
        resourceType: 'multi-container-workload',
        layer: 'compute',
        subnet: 'public',
        implicit: true,
        typeLabel: 'Convex dashboard'
      }
    });
    addEdge({
      edgeMap,
      nodeMap,
      from: albId,
      to: dashboardId,
      semantic: 'request',
      description: 'Synchronous forwarding: the load balancer serves the Convex dashboard on port 6791.'
    });
  }
};

// ── Main topology builder ──

export const buildDiagramTopology = ({
  parsedConfig
}: {
  parsedConfig: StacktapeConfig | null;
}): DiagramTopology | null => {
  if (!parsedConfig?.resources) return null;

  const resources = parsedConfig.resources as Record<string, any>;
  const nodeMap = new Map<string, TopologyNode>();
  const edgeMap = new Map<string, TopologyEdge>();
  const graph: GraphMaps = { edgeMap, nodeMap };

  const resourceEntries = Object.entries(resources).filter(([, resource]) => resource?.type);
  const customResourceInstances = new Map<string, number>();
  for (const [, resource] of resourceEntries) {
    const definitionName = resource.type === 'custom-resource-instance' ? getProps(resource).definitionName : null;
    if (typeof definitionName === 'string') {
      customResourceInstances.set(definitionName, (customResourceInstances.get(definitionName) ?? 0) + 1);
    }
  }

  // The CLI puts VPC functions in the private subnets whenever the stack has any (`allResourcesRequiringPrivateSubnets`):
  // containers with `usePrivateSubnetsWithNAT`, AgentCore runtimes in VPC mode, or VPC functions once a NAT is set.
  const hasNat = Boolean((parsedConfig as any)?.stackConfig?.nat);
  const vpcFunctionsUsePrivateSubnets =
    hasNat ||
    resourceEntries.some(
      ([, resource]) =>
        (CONTAINER_SERVICES.has(resource.type) && getProps(resource).usePrivateSubnetsWithNAT) ||
        (resource.type === 'agentcore-runtime' && isAgentRuntimeInVpc({ resource, resources }))
    );

  // MongoDB Atlas accessibility is set once for the Atlas project, under `providerConfig.mongoDbAtlas`, not on each
  // cluster. Without it the CLI opens the project's access list to 0.0.0.0/0, which is the `internet` default below.
  const atlasAccessibility = (parsedConfig as any)?.providerConfig?.mongoDbAtlas?.accessibility;
  const accessSettingsOf = ({ type, resource }: { type: string; resource: any }) =>
    type === 'mongo-db-atlas-cluster' ? { properties: { accessibility: atlasAccessibility } } : resource;

  // Phase 1: Create nodes for all user-defined resources
  const userNodes = resourceEntries
    .filter(([, resource]) => !HIDDEN_TYPES.has(resource.type))
    .map(([id, resource]) => {
      const type = resource.type as string;
      const instances = customResourceInstances.get(id);
      return {
        id,
        label: id,
        resourceType: type,
        layer: getLayer({ type }),
        subnet: getSubnet({ type, resource, resources, vpcFunctionsUsePrivateSubnets }),
        typeLabel:
          type === 'custom-resource-definition' && instances
            ? `Custom resource · ${instances} instance${instances === 1 ? '' : 's'}`
            : getTypeLabel({ type, resource }),
        replicas: getReplicas({ type, resource }),
        accessNote: getAccessNote({ type, resource: accessSettingsOf({ type, resource }) }),
        isPublic: isInternetReachable({ type, resource: accessSettingsOf({ type, resource }) }) || undefined,
        internal: isInternalLoadBalancer({ type, resource }) || undefined
      } satisfies TopologyNode;
    });

  userNodes.forEach((node) => addNode({ nodeMap, node }));

  // Phase 2: Detect public ingress
  const hasPublicIngress = userNodes.some((node) => {
    const resource = resources[node.id];
    const props = getProps(resource);
    return (
      node.resourceType === 'web-service' ||
      node.resourceType === 'convex' ||
      USER_FACING_INGRESS.has(node.resourceType) ||
      node.resourceType === 'hosting-bucket' ||
      SSR_WEBS.has(node.resourceType) ||
      (node.resourceType === 'function' && (isFunctionPubliclyReachable(resource) || isCdnEnabled(props.cdn))) ||
      (node.resourceType === 'bucket' && isCdnEnabled(props.cdn))
    );
  });

  if (hasPublicIngress) {
    addNode({
      nodeMap,
      node: {
        id: 'user',
        label: 'User',
        resourceType: 'user',
        layer: 'external',
        subnet: null,
        typeLabel: TYPE_LABELS.user
      }
    });
  }

  // Phase 3: Add the NAT if private subnets exist. `stackConfig.nat` picks managed gateways (`gateway`, one per
  // availability zone, 2 by default) or Stacktape-managed instances (`ec2`: one; `ha-ec2`: one per zone).
  const hasPrivateNodes =
    userNodes.some((node) => node.subnet === 'private') ||
    (vpcFunctionsUsePrivateSubnets &&
      userNodes.some((node) => SSR_WEBS.has(node.resourceType) && getProps(resources[node.id]).joinDefaultVpc));
  if (hasPrivateNodes) {
    const rawNat = (parsedConfig as any)?.stackConfig?.nat;
    const nat = typeof rawNat === 'string' ? { type: rawNat } : rawNat;
    const natType: string = nat?.type ?? 'gateway';
    const zones = [1, 2, 3].includes(nat?.availabilityZones) ? nat.availabilityZones : 2;
    const isInstance = natType === 'ec2' || natType === 'ha-ec2';
    const count = natType === 'ec2' ? 1 : zones;
    addNode({
      nodeMap,
      node: {
        id: 'nat-gateway',
        label: isInstance ? 'NAT instance' : 'NAT Gateway',
        resourceType: 'nat-gateway',
        layer: 'ingress',
        subnet: 'public',
        implicit: true,
        typeLabel:
          count > 1
            ? `${count} ${isInstance ? 'instances' : 'gateways'} · 1 per zone`
            : `1 ${isInstance ? 'instance' : 'gateway'}`,
        replicas: count > 1 ? { min: count, max: count } : undefined,
        accessNote:
          natType === 'ec2'
            ? 'One small NAT instance with a static public IP; no failover.'
            : isInstance
              ? 'One NAT instance per availability zone, each with a static public IP; a failed zone is routed through another zone.'
              : 'One NAT gateway per availability zone (2 by default), each with a static public IP.'
      }
    });
  }

  // Phase 4: Build edges
  for (const node of userNodes) {
    const resource = resources[node.id];
    const type = node.resourceType;
    const props = getProps(resource);

    // ── Web service ingress: dedicated per-service gateway / load balancer ──
    if (type === 'web-service') {
      const lbType = (props.loadBalancing?.type as string) || 'http-api-gateway';
      const ingress = WEB_SERVICE_INGRESS[lbType] || WEB_SERVICE_INGRESS['http-api-gateway'];
      const ingressId = `${node.id}--${ingress.suffix}`;
      addNode({
        nodeMap,
        node: {
          id: ingressId,
          label: `${node.label} ${ingress.labelSuffix}`,
          resourceType: ingress.resourceType,
          layer: 'ingress',
          subnet: ingress.subnet,
          implicit: true,
          typeLabel: getTypeLabel({ type: ingress.resourceType, resource: {} })
        }
      });
      addEdge({
        edgeMap,
        nodeMap,
        from: ingressId,
        to: node.id,
        semantic: 'request',
        description:
          lbType === 'network-load-balancer'
            ? 'Synchronous forwarding: the load balancer distributes TCP/TLS connections across the running instances of the service.'
            : lbType === 'application-load-balancer'
              ? 'Synchronous forwarding: the load balancer distributes HTTP(S) requests across the running instances of the service.'
              : 'Synchronous forwarding: the gateway routes each request into the VPC through a VPC Link and returns the service’s response to the caller.'
      });
      // `useFirewall` is valid only with an ALB, and the CLI attaches it to that ALB.
      addFirewallEdge({ ...graph, firewallName: props.useFirewall, protectedId: ingressId });
      addCdnInFront({ ...graph, owner: node, originId: ingressId, cdn: props.cdn });
    }

    // ── CDN in front of an API, load balancer, function or bucket ──
    if (
      type === 'http-api-gateway' ||
      type === 'application-load-balancer' ||
      type === 'function' ||
      type === 'bucket'
    ) {
      addCdnInFront({ ...graph, owner: node, originId: node.id, cdn: props.cdn });
    }

    if (type === 'application-load-balancer' || type === 'user-auth-pool') {
      addFirewallEdge({ ...graph, firewallName: props.useFirewall, protectedId: node.id });
    }

    // ── Private service with an internal load balancer ──
    // The default (service-connect) needs no infrastructure node; an explicit ALB choice
    // provisions a dedicated INTERNAL load balancer in the public subnets.
    if (type === 'private-service' && props.loadBalancing?.type === 'application-load-balancer') {
      const albId = `${node.id}--alb`;
      addNode({
        nodeMap,
        node: {
          id: albId,
          label: `${node.label} ALB`,
          resourceType: 'application-load-balancer',
          layer: 'ingress',
          subnet: 'public',
          implicit: true,
          internal: true,
          typeLabel: 'Internal load balancer',
          accessNote: 'Internal load balancer — reachable only from inside the VPC, not from the internet.'
        }
      });
      addEdge({
        edgeMap,
        nodeMap,
        from: albId,
        to: node.id,
        semantic: 'request',
        description:
          'Synchronous forwarding inside the VPC: the internal load balancer distributes requests from other VPC resources across the service instances.'
      });
    }

    // ── SSR webs: decompose into CDN entry → server function + assets bucket ──
    // An SSR web bundles CloudFront, a server Lambda and an assets bucket; showing the
    // internals makes the actual request flow (edge → origin) visible.
    if (SSR_WEBS.has(type)) {
      addEdge({
        edgeMap,
        nodeMap,
        from: 'user',
        to: node.id,
        label: 'HTTPS',
        semantic: 'request',
        description:
          'Users connect over HTTPS to the nearest CloudFront edge location; cached pages and assets are served immediately without reaching the origin.'
      });

      const serverId = `${node.id}--server`;
      addNode({
        nodeMap,
        node: {
          id: serverId,
          label: `${node.label} server`,
          resourceType: 'function',
          layer: 'compute',
          subnet: props.joinDefaultVpc ? (vpcFunctionsUsePrivateSubnets ? 'private' : 'public') : null,
          implicit: true,
          typeLabel: 'SSR function'
        }
      });
      if (nodeMap.get(serverId)?.subnet === 'private') {
        addEdge({
          edgeMap,
          nodeMap,
          from: serverId,
          to: 'nat-gateway',
          label: 'outbound',
          semantic: 'egress',
          description:
            'Outbound-only internet access: private-subnet workloads reach the internet through the NAT gateway, but nothing can connect to them from outside.'
        });
      }
      addEdge({
        edgeMap,
        nodeMap,
        from: node.id,
        to: serverId,
        label: 'SSR',
        semantic: 'request',
        description:
          'For dynamic pages, API routes and cache misses, the CDN synchronously invokes the server function (AWS Lambda) and can cache the response at the edge.'
      });

      const assetsId = `${node.id}--assets`;
      addNode({
        nodeMap,
        node: {
          id: assetsId,
          label: `${node.label} assets`,
          resourceType: 'bucket',
          layer: 'data',
          subnet: null,
          implicit: true,
          typeLabel: 'Static assets'
        }
      });
      addEdge({
        edgeMap,
        nodeMap,
        from: node.id,
        to: assetsId,
        label: 'static',
        semantic: 'request',
        description:
          'Static assets (JS, CSS, images) are fetched from the S3 bucket on first request and then cached at CDN edge locations.'
      });
      // The CLI hands `useFirewall` to the distribution it builds for the site.
      addFirewallEdge({ ...graph, firewallName: props.useFirewall, protectedId: node.id });
    }

    // ── Hosting buckets ──
    if (type === 'hosting-bucket') {
      addEdge({
        edgeMap,
        nodeMap,
        from: 'user',
        to: node.id,
        label: 'HTTPS',
        semantic: 'request',
        description:
          'Users are served through the CloudFront CDN from the nearest edge location; files come from the underlying S3 bucket and are cached at the edge.'
      });
      // The hosting bucket is its own CDN, so its edge functions and firewall attach to it directly.
      addEdgeFunctionEdges({ ...graph, cdnId: node.id, edgeFunctions: props.edgeFunctions });
      addFirewallEdge({ ...graph, firewallName: props.useFirewall, protectedId: node.id });
    }

    // ── Function / batch-job events ──
    if (type === 'function' || type === 'batch-job') {
      addEventEdges({
        ...graph,
        nodeId: node.id,
        events: getField(resource, 'events'),
        // Batch jobs are started, not answered; a function's request edge needs no label.
        requestLabel: type === 'batch-job' ? 'start' : undefined,
        targetKind: type
      });
    }

    // ── Function URL ──
    if (type === 'function' && getField(resource, 'url')?.enabled) {
      addEdge({
        edgeMap,
        nodeMap,
        from: 'user',
        to: node.id,
        label: 'Function URL',
        semantic: 'request',
        description: 'A direct public HTTPS endpoint that synchronously invokes the function and returns its response.'
      });
    }

    // ── AppSync: sign-in through a user pool ──
    if (type === 'appsync-api' && props.authentication?.type === 'user-auth-pool') {
      addEdge({
        edgeMap,
        nodeMap,
        from: node.id,
        to: props.authentication.properties?.userAuthPoolName,
        label: 'JWT auth',
        semantic: 'security',
        description:
          'AppSync accepts only GraphQL requests carrying a valid token issued by this user pool and rejects the rest.'
      });
    }

    // ── AgentCore: the runtime's tools and memory, the gateway's Lambda tools ──
    if (type === 'agentcore-runtime') {
      for (const [field, verb] of [
        ['useMemory', 'stores and recalls conversation memory in'],
        ['useGateway', 'calls MCP tools through'],
        ['useBrowser', 'browses the web through'],
        ['useCodeInterpreter', 'runs generated code in']
      ] as const) {
        const target = props[field];
        if (typeof target !== 'string') continue;
        addEdge({
          edgeMap,
          nodeMap,
          from: node.id,
          to: target,
          semantic: 'dependency',
          description: `The agent ${verb} this resource; Stacktape grants the permission and injects its ID.`
        });
      }
    }
    if (type === 'agentcore-gateway') {
      for (const tool of Array.isArray(props.tools) ? props.tools : []) {
        if (typeof tool?.function !== 'string') continue;
        addEdge({
          edgeMap,
          nodeMap,
          from: node.id,
          to: tool.function,
          label: tool.name !== tool.function ? tool.name : undefined,
          semantic: 'request',
          description:
            'Synchronous tool call: when an agent calls this MCP tool, the gateway invokes the function and returns its result.'
        });
      }
    }

    if (type === 'convex') {
      addConvexParts({ ...graph, node, resource });
    }

    // ── connectTo (permission/dependency edges) ──
    // For SSR webs, the thing that actually talks to the targets is the server Lambda.
    const dependencySourceId = SSR_WEBS.has(type) ? `${node.id}--server` : node.id;
    for (const targetId of getConnectToNames(resource)) {
      addEdge({
        edgeMap,
        nodeMap,
        from: dependencySourceId,
        to: targetId,
        semantic: 'dependency',
        description:
          'connectTo: Stacktape grants least-privilege IAM permissions, injects connection details as environment variables, and opens security-group access where the target requires it.'
      });
    }

    for (const targetId of extractResourceParamReferences({ value: resource })) {
      if (targetId !== node.id) {
        addEdge({
          edgeMap,
          nodeMap,
          from: dependencySourceId,
          to: targetId,
          semantic: 'dependency',
          description: 'References a parameter of this resource (e.g. its URL or name), injected at deploy time.'
        });
      }
    }

    // ── Container events (multi-container-workload) ──
    const containers = getField(resource, 'containers');
    if (containers) {
      for (const container of Object.values(containers) as any[]) {
        addEventEdges({ ...graph, nodeId: node.id, events: container?.events, targetKind: 'container' });
      }
    }

    // ── NAT egress for private subnet resources ──
    if (node.subnet === 'private') {
      addEdge({
        edgeMap,
        nodeMap,
        from: node.id,
        to: 'nat-gateway',
        label: 'outbound',
        semantic: 'egress',
        description:
          'Outbound-only internet access: private-subnet workloads reach the internet through the NAT gateway, but nothing can connect to them from outside.'
      });
    }
  }

  // Phase 5: Connect the user to every ingress node that serves traffic and is not
  // already fronted by a CDN.
  if (hasPublicIngress) {
    const edges = Array.from(edgeMap.values());
    const ingressNodes = Array.from(nodeMap.values()).filter((node) => USER_FACING_INGRESS.has(node.resourceType));

    for (const ingressNode of ingressNodes) {
      // Internal load balancers are unreachable from the internet — never draw a user edge.
      if (ingressNode.internal) continue;

      const servesRequests = edges.some(
        (edge) => edge.from === ingressNode.id && edge.semantic === 'request' && edge.to !== 'user'
      );
      if (!servesRequests) continue;

      const frontedByCdn = edges.some(
        (edge) => edge.to === ingressNode.id && nodeMap.get(edge.from)?.resourceType === 'cloudfront'
      );
      if (frontedByCdn) continue;

      const isNlb = ingressNode.resourceType === 'network-load-balancer';
      const isWebSocket = ingressNode.resourceType === 'websocket-api-gateway';
      addEdge({
        edgeMap,
        nodeMap,
        from: 'user',
        to: ingressNode.id,
        label: isNlb ? 'TCP/TLS' : isWebSocket ? 'WSS' : 'HTTPS',
        semantic: 'request',
        description: isNlb
          ? 'Users open TCP/TLS connections to this public endpoint (synchronous).'
          : isWebSocket
            ? 'Clients open a long-lived WebSocket connection; both sides can send messages at any time.'
            : 'Users call this public HTTPS endpoint; each request is answered synchronously.'
      });
    }
  }

  // Phase 6: Finalize
  const nodes = Array.from(nodeMap.values());
  const edges = Array.from(edgeMap.values());
  const hasVpc = nodes.some((node) => node.subnet !== null);

  return { nodes, edges, hasVpc, hasPublicIngress };
};
