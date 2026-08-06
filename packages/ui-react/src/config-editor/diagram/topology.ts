import type { StacktapeConfig } from '@stacktape/config';
// ── Flow layers ──
// Each node is assigned a layer based on its role in the request/data flow.
// Layer 0 = external, Layer 5 = data stores. This drives the left-to-right layout.

export type FlowLayer = 'external' | 'edge' | 'ingress' | 'compute' | 'integration' | 'data';

export const FLOW_LAYER_ORDER: FlowLayer[] = ['external', 'edge', 'ingress', 'compute', 'integration', 'data'];

// Subnet placement within VPC (or null for non-VPC resources). Stacktape creates only
// two subnet tiers: public (always, 3 AZs) and private (only when a container service
// sets usePrivateSubnetsWithNAT). There is no isolated/data tier.
export type SubnetType = 'public' | 'private' | null;

export type EdgeSemantic = 'request' | 'event' | 'dependency' | 'egress';

export type TopologyNode = {
  id: string;
  label: string;
  resourceType: string;
  layer: FlowLayer;
  subnet: SubnetType;
  implicit?: boolean | undefined;
  replicaCount?: number | undefined;
  // Reachable only from inside the VPC (internal load balancers) — no user edge.
  internal?: boolean | undefined;
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

const VPC_COMPUTE = new Set([
  'web-service',
  'private-service',
  'worker-service',
  'multi-container-workload',
  'batch-job',
  'bastion'
]);

const INTEGRATION_TYPES = new Set(['sqs-queue', 'sns-topic', 'event-bus', 'kinesis-stream', 'state-machine']);

const DATA_TYPES = new Set([
  'relational-database',
  'dynamo-db-table',
  'redis-cluster',
  'mongo-db-atlas-cluster',
  'upstash-redis',
  'open-search-domain',
  'bucket',
  'efs-filesystem'
]);

// Only container services support usePrivateSubnetsWithNAT; batch jobs and bastions
// always run in public subnets.
const PRIVATE_SUBNET_CAPABLE = new Set([
  'web-service',
  'private-service',
  'worker-service',
  'multi-container-workload'
]);

const INGRESS_TYPES = new Set(['http-api-gateway', 'application-load-balancer', 'network-load-balancer']);

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

  if (VPC_COMPUTE.has(type) || type === 'function' || type === 'deployment-script') {
    return 'compute';
  }

  if (INTEGRATION_TYPES.has(type)) return 'integration';
  if (DATA_TYPES.has(type)) return 'data';
  if (type === 'user-auth-pool') return 'data';

  return 'compute';
};

// ── Subnet assignment ──
// Determines which VPC subnet a resource belongs to, or null if outside VPC.
// Verified against the CLI synthesizer: databases, redis clusters, EFS mount targets
// and load balancers all live in the PUBLIC subnets — accessibility modes only change
// security-group ingress rules, never the subnet placement.

const getSubnet = ({ type, resource }: { type: string; resource: any }): SubnetType => {
  const props = getProps(resource);

  if (VPC_COMPUTE.has(type)) {
    return PRIVATE_SUBNET_CAPABLE.has(type) && props.usePrivateSubnetsWithNAT ? 'private' : 'public';
  }

  // Always inside the VPC, whatever the accessibility mode.
  if (type === 'relational-database' || type === 'redis-cluster' || type === 'efs-filesystem') {
    return 'public';
  }

  // OpenSearch joins the VPC only in vpc/scoping modes; in internet mode (default) the
  // domain runs outside the VPC entirely.
  if (type === 'open-search-domain') {
    const mode = getAccessibilityMode(resource);
    return mode === 'vpc' || mode === 'scoping-workloads-in-vpc' ? 'public' : null;
  }

  if ((type === 'function' || type === 'deployment-script') && props.joinDefaultVpc) {
    return 'public';
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

  if (type === 'redis-cluster') {
    const mode = getAccessibilityMode(resource) || 'vpc';
    return mode === 'scoping-workloads-in-vpc'
      ? 'Reachable only from resources that connectTo this cluster.'
      : 'Reachable only from inside the VPC.';
  }

  if (type === 'open-search-domain') {
    const mode = getAccessibilityMode(resource) || 'internet';
    if (mode === 'internet') return 'Accessibility mode "internet" (the default): reachable from the internet.';
    return mode === 'scoping-workloads-in-vpc'
      ? 'Reachable only from resources that connectTo this domain.'
      : 'Reachable only from inside the VPC.';
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

const isInternalLoadBalancer = ({ type, resource }: { type: string; resource: any }) =>
  (type === 'application-load-balancer' || type === 'network-load-balancer') &&
  getProps(resource).interface === 'internal';

const getReplicaCount = ({ type, resource }: { type: string; resource: any }) => {
  const props = getProps(resource);

  if (['web-service', 'worker-service', 'private-service', 'multi-container-workload'].includes(type)) {
    const scaling = props.scaling;
    if (scaling?.minInstances && scaling.minInstances > 1) return Math.min(scaling.minInstances, 3);
    if (scaling?.maxInstances && scaling.maxInstances > 1) return 2;
  }

  if (type === 'relational-database') {
    const engineType = props.engine?.type;
    if (
      engineType === 'aurora-postgresql' ||
      engineType === 'aurora-mysql' ||
      engineType === 'aurora-postgresql-serverless' ||
      engineType === 'aurora-mysql-serverless'
    ) {
      return 2;
    }
  }

  return 1;
};

const isFunctionPubliclyReachable = (resource: any) => {
  const events = getField(resource, 'events');
  const url = getField(resource, 'url');
  return Boolean(url?.enabled || events?.some((event: any) => event.type === 'http-api-gateway'));
};

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
  if (!nodeMap.has(from) || !nodeMap.has(to)) return;
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
}: {
  edgeMap: Map<string, TopologyEdge>;
  nodeMap: Map<string, TopologyNode>;
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
      replicaCount: 1
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

const addEventEdges = ({
  edgeMap,
  nodeMap,
  nodeId,
  events,
  requestLabel = 'invoke',
  targetKind = 'function'
}: {
  edgeMap: Map<string, TopologyEdge>;
  nodeMap: Map<string, TopologyNode>;
  nodeId: string;
  events: any;
  requestLabel?: string;
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

  // Phase 1: Create nodes for all user-defined resources
  const userNodes = Object.entries(resources)
    .filter(([, resource]) => resource?.type)
    .map(([id, resource]) => {
      const type = resource.type as string;
      return {
        id,
        label: id,
        resourceType: type,
        layer: getLayer({ type }),
        subnet: getSubnet({ type, resource }),
        replicaCount: getReplicaCount({ type, resource }),
        accessNote: getAccessNote({ type, resource }),
        internal: isInternalLoadBalancer({ type, resource }) || undefined
      } satisfies TopologyNode;
    });

  userNodes.forEach((node) => addNode({ nodeMap, node }));

  // Phase 2: Detect public ingress
  const hasPublicIngress = userNodes.some((node) => {
    const resource = resources[node.id];
    return (
      node.resourceType === 'web-service' ||
      INGRESS_TYPES.has(node.resourceType) ||
      node.resourceType === 'hosting-bucket' ||
      SSR_WEBS.has(node.resourceType) ||
      (node.resourceType === 'function' && isFunctionPubliclyReachable(resource))
    );
  });

  if (hasPublicIngress) {
    addNode({
      nodeMap,
      node: { id: 'user', label: 'User', resourceType: 'user', layer: 'external', subnet: null, replicaCount: 1 }
    });
  }

  // Phase 3: Add NAT gateway if private subnets exist. Stacktape creates one NAT per
  // AZ — 2 by default, configurable 1-3 via stackConfig.vpc.nat.availabilityZones.
  const hasPrivateNodes = userNodes.some((node) => node.subnet === 'private');
  if (hasPrivateNodes) {
    const configuredNatCount = (parsedConfig as any)?.stackConfig?.vpc?.nat?.availabilityZones;
    addNode({
      nodeMap,
      node: {
        id: 'nat-gateway',
        label: 'NAT Gateway',
        resourceType: 'nat-gateway',
        layer: 'ingress',
        subnet: 'public',
        implicit: true,
        replicaCount: [1, 2, 3].includes(configuredNatCount) ? configuredNatCount : 2,
        accessNote: 'One NAT gateway per availability zone (2 by default), each with a static public IP.'
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
          replicaCount: 1
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

      const hasCdn = Boolean(props.cdn && props.cdn.enabled !== false);
      if (hasCdn) {
        const cdnId = `${node.id}--cdn`;
        addNode({
          nodeMap,
          node: {
            id: cdnId,
            label: `${node.label} CDN`,
            resourceType: 'cloudfront',
            layer: 'edge',
            subnet: null,
            implicit: true,
            replicaCount: 1
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
          to: ingressId,
          semantic: 'request',
          description:
            'On cache miss, the CDN forwards the request to the origin and can cache the response at the edge.'
        });
      }
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
          replicaCount: 1,
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
        label: 'CDN',
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
          subnet: getProps(resource).joinDefaultVpc ? 'public' : null,
          implicit: true,
          replicaCount: 1
        }
      });
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
          replicaCount: 1
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
    }

    // ── Hosting buckets ──
    if (type === 'hosting-bucket') {
      addEdge({
        edgeMap,
        nodeMap,
        from: 'user',
        to: node.id,
        label: 'CDN',
        semantic: 'request',
        description:
          'Users are served through the CloudFront CDN from the nearest edge location; files come from the underlying S3 bucket and are cached at the edge.'
      });
    }

    // ── Function / batch-job events ──
    if (type === 'function' || type === 'batch-job') {
      addEventEdges({
        edgeMap,
        nodeMap,
        nodeId: node.id,
        events: getField(resource, 'events'),
        requestLabel: type === 'function' ? 'invoke' : 'start',
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

    // ── connectTo (permission/dependency edges) ──
    // For SSR webs, the thing that actually talks to the targets is the server Lambda.
    const dependencySourceId = SSR_WEBS.has(type) ? `${node.id}--server` : node.id;
    const connectTo = getField(resource, 'connectTo');
    if (Array.isArray(connectTo)) {
      for (const target of connectTo) {
        const targetId = typeof target === 'string' ? target : target?.name;
        if (targetId) {
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
      }
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
        addEventEdges({ edgeMap, nodeMap, nodeId: node.id, events: container?.events, targetKind: 'container' });
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
    const ingressNodes = Array.from(nodeMap.values()).filter((node) => INGRESS_TYPES.has(node.resourceType));

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

      addEdge({
        edgeMap,
        nodeMap,
        from: 'user',
        to: ingressNode.id,
        label: ingressNode.resourceType === 'network-load-balancer' ? 'TCP/TLS' : 'HTTPS',
        semantic: 'request',
        description:
          ingressNode.resourceType === 'network-load-balancer'
            ? 'Users open TCP/TLS connections to this public endpoint (synchronous).'
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
