import { describe, expect, test } from 'bun:test';
import { STACKTAPE_RESOURCE_TYPES } from '@stacktape/config/resource-types';
import { parse } from 'yaml';
import { getNodeAppearance } from './node-appearance.js';
import { buildIsometricScene } from './scene-builder.js';
import { buildDiagramTopology } from './topology.js';

/**
 * What the diagram draws for resource types and relations that are easy to get wrong. Every expectation here was
 * checked against the CLI synthesizer (apps/cli resource resolvers and config-manager), not against the config type.
 */

const topologyOf = (yaml: string) => {
  const topology = buildDiagramTopology({ parsedConfig: parse(yaml) });
  if (!topology) throw new Error('The configuration must produce a topology');
  return topology;
};

const edgeKeys = (yaml: string) =>
  topologyOf(yaml).edges.map(
    (edge) => `${edge.from} -> ${edge.to} ${edge.semantic}${edge.label ? ` ${edge.label}` : ''}`
  );

const fn = (name: string, body = '') => `
  ${name}:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/${name}.ts
${body}`;

describe('resource types', () => {
  test('every resource type a configuration can declare has its own shape, except a CDK construct', () => {
    const hidden = new Set(['synthetic-test', 'uptime-check', 'custom-resource-instance']);
    const generic = STACKTAPE_RESOURCE_TYPES.filter(
      (type) => !hidden.has(type) && getNodeAppearance(type).shape === 'construct'
    );
    expect(generic).toEqual(['aws-cdk-construct']);
  });

  test('monitoring checks and custom-resource instances are not drawn; the definition counts its instances', () => {
    const topology = topologyOf(`resources:
  seed:
    type: custom-resource-definition
  seedA:
    type: custom-resource-instance
    properties: { definitionName: seed }
  seedB:
    type: custom-resource-instance
    properties: { definitionName: seed }
  homepage:
    type: uptime-check
    properties: { url: https://example.com }
  checkout:
    type: synthetic-test
`);
    expect(topology.nodes.map((node) => node.id)).toEqual(['seed']);
    expect(topology.nodes[0].typeLabel).toBe('Custom resource · 2 instances');
  });

  test.each([
    ['kafka-cluster', 'integration', 'public'],
    ['dsql-database', 'data', null],
    ['email-sender', 'integration', null],
    ['appsync-api', 'ingress', null],
    ['websocket-api-gateway', 'ingress', null],
    ['agentcore-gateway', 'ingress', null],
    ['agentcore-memory', 'data', null],
    ['agentcore-browser', 'integration', null],
    ['agentcore-code-interpreter', 'integration', null],
    ['agentcore-runtime', 'compute', null],
    ['aws-cdk-construct', 'compute', null],
    ['custom-resource-definition', 'compute', null]
  ] as const)('places %s in the %s layer, subnet %s', (type, layer, subnet) => {
    const node = topologyOf(`resources:\n  thing:\n    type: ${type}\n`).nodes.find(({ id }) => id === 'thing');
    expect({ layer: node?.layer, subnet: node?.subnet }).toEqual({ layer, subnet });
  });

  test('an AgentCore runtime that connects to a VPC-only resource runs in the private subnets behind NAT', () => {
    const topology = topologyOf(`resources:
  agent:
    type: agentcore-runtime
    properties:
      connectTo: [db]
  db:
    type: relational-database
`);
    expect(topology.nodes.find(({ id }) => id === 'agent')?.subnet).toBe('private');
    expect(topology.nodes.some(({ id }) => id === 'nat-gateway')).toBe(true);
    expect(topology.edges.some(({ from, to }) => from === 'agent' && to === 'nat-gateway')).toBe(true);
  });

  test('VPC functions move to the private subnets once the stack configures NAT', () => {
    const vpcFunction = fn('job', '      joinDefaultVpc: true');
    expect(topologyOf(`resources:${vpcFunction}`).nodes[0].subnet).toBe('public');
    expect(topologyOf(`stackConfig:\n  nat: gateway\nresources:${vpcFunction}`).nodes[0].subnet).toBe('private');
  });

  test('Convex expands into its load balancer, backend, dashboard, database and storage', () => {
    const topology = topologyOf(`resources:
  backend:
    type: convex
    properties:
      appDirectory: apps/backend
`);
    expect(topology.nodes.map(({ id, subnet }) => `${id}:${subnet}`).toSorted()).toEqual([
      'backend--alb:public',
      'backend--dashboard:public',
      'backend--db:public',
      'backend--storage:null',
      'backend:null',
      'user:null'
    ]);
    expect(topology.edges.some(({ from, to }) => from === 'user' && to === 'backend--alb')).toBe(true);
    // Its database defaults to scoping-workloads-in-vpc, so it is not open to the internet.
    expect(topology.nodes.find(({ id }) => id === 'backend--db')?.isPublic).toBeUndefined();
  });
});

describe('type lines, replicas and reachability', () => {
  test.each([
    ['postgres', '', 'Postgres', undefined],
    ['postgres', 'readReplicas: [{ instanceSize: db.t4g.micro }]', 'Postgres · 2 instances', 2],
    ['aurora-postgresql', 'instances: [{ instanceSize: db.r6g.large }]', 'Aurora Postgres', undefined],
    [
      'aurora-mysql',
      'instances: [{ instanceSize: a }, { instanceSize: b }, { instanceSize: c }]',
      'Aurora MySQL · 3 instances',
      3
    ],
    ['aurora-postgresql-serverless-v2', 'serverlessReadersCount: 1', 'Aurora Serverless Postgres · 2 instances', 2],
    ['aurora-postgresql-serverless', '', 'Aurora Serverless Postgres', undefined]
  ] as const)('draws a %s database with %s literally', (engine, properties, typeLabel, instances) => {
    const node = topologyOf(`resources:
  db:
    type: relational-database
    properties:
      engine:
        type: ${engine}
        properties: { ${properties} }
`).nodes[0];
    expect(node.typeLabel).toBe(typeLabel);
    expect(node.replicas).toEqual(instances ? { min: instances, max: instances } : undefined);
  });

  test('a container service shows its running tasks and its maximum', () => {
    const node = topologyOf(`resources:
  worker:
    type: worker-service
    properties:
      scaling: { minInstances: 2, maxInstances: 6 }
`).nodes[0];
    expect(node.typeLabel).toBe('Worker service · 2–6 tasks');
    expect(node.replicas).toEqual({ min: 2, max: 6 });
  });

  test.each([
    ['relational-database', '', true],
    ['relational-database', 'accessibility: { accessibilityMode: vpc }', false],
    ['relational-database', 'accessibility: { accessibilityMode: whitelisted-ips-only }', false],
    ['open-search-domain', '', true],
    ['open-search-domain', 'accessibility: { accessibilityMode: scoping-workloads-in-vpc }', false],
    ['mongo-db-atlas-cluster', '', true],
    ['redis', '', false],
    ['dsql-database', '', false]
  ] as const)('marks %s {%s} as internet-reachable: %s', (type, properties, isPublic) => {
    const node = topologyOf(`resources:\n  store:\n    type: ${type}\n    properties: { ${properties} }\n`).nodes[0];
    expect(Boolean(node.isPublic)).toBe(isPublic);
    expect(
      Boolean(
        buildIsometricScene({
          parsedConfig: parse(`resources:\n  store:\n    type: ${type}\n    properties: { ${properties} }\n`)
        })?.nodes[0].isPublic
      )
    ).toBe(isPublic);
  });
});

describe('relations', () => {
  test('useFirewall connects a firewall to everything it protects', () => {
    expect(
      edgeKeys(`resources:
  waf:
    type: web-app-firewall
    properties: { scope: regional }
  app:
    type: web-service
    properties:
      useFirewall: waf
      loadBalancing: { type: application-load-balancer }
  lb:
    type: application-load-balancer
    properties: { useFirewall: waf }
  users:
    type: user-auth-pool
    properties: { useFirewall: waf }
  site:
    type: hosting-bucket
    properties: { useFirewall: waf }
  web:
    type: nextjs-web
    properties: { useFirewall: waf }
  api:
    type: http-api-gateway
    properties:
      cdn: { enabled: true, useFirewall: waf }
`)
        .filter((key) => key.startsWith('waf ->'))
        .toSorted()
    ).toEqual(
      [
        'waf -> app--alb security protects',
        'waf -> lb security protects',
        'waf -> users security protects',
        'waf -> api--cdn security protects',
        'waf -> web security protects',
        'waf -> site security protects'
      ].toSorted()
    );
  });

  test('route authorizers point from the gateway to the user pool or authorizer function', () => {
    const keys = edgeKeys(`resources:
  api:
    type: http-api-gateway
  socket:
    type: websocket-api-gateway
  graph:
    type: appsync-api
    properties:
      authentication:
        type: user-auth-pool
        properties: { userAuthPoolName: users }
  users:
    type: user-auth-pool
${fn(
  'list',
  `      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            method: GET
            path: /items
            authorizer: { type: cognito, properties: { userPoolName: users } }
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            method: POST
            path: /items
            authorizer: { type: lambda, properties: { functionName: check } }
        - type: websocket-api-gateway
          properties:
            websocketApiGatewayName: socket
            routeKey: $connect
            authorizer: { type: lambda, properties: { functionName: check } }
        - type: appsync-api
          properties: { appsyncApiName: graph, field: Query.items }`
)}${fn('check')}`);
    expect(keys.filter((key) => key.includes(' security ')).toSorted()).toEqual(
      [
        'graph -> users security JWT auth',
        'api -> users security JWT auth',
        'api -> check security authorizer',
        'socket -> check security authorizer'
      ].toSorted()
    );
    expect(keys).toContain('graph -> list request Query.items');
    expect(keys).toContain('socket -> list request');
    expect(keys).toContain('user -> socket request WSS');
    // The generic "invoke" label is gone: the request edge needs no label.
    expect(keys).toContain('api -> list request');
  });

  test('a CDN in front of an API, load balancer, function or bucket takes the user edge and runs edge functions', () => {
    const keys = edgeKeys(`resources:
  api:
    type: http-api-gateway
    properties:
      cdn:
        enabled: true
        edgeFunctions: { onRequest: rewrite }
        routeRewrites:
          - path: /files/*
            routeTo: { type: bucket, properties: { bucketName: files } }
  lb:
    type: application-load-balancer
    properties:
      cdn: { enabled: true }
  files:
    type: bucket
    properties:
      cdn: { enabled: true }
  rewrite:
    type: edge-lambda-function
${fn(
  'handler',
  `      cdn: { enabled: true }
      events:
        - type: http-api-gateway
          properties: { httpApiGatewayName: api, method: GET, path: / }`
)}`);
    expect(keys.filter((key) => key.includes('--cdn') || key.startsWith('user ->')).toSorted()).toEqual(
      [
        'user -> api--cdn request HTTPS',
        'api--cdn -> api request',
        'api--cdn -> files request /files/*',
        'api--cdn -> rewrite request onRequest',
        'user -> lb--cdn request HTTPS',
        'lb--cdn -> lb request',
        'user -> files--cdn request HTTPS',
        'files--cdn -> files request',
        'user -> handler--cdn request HTTPS',
        'handler--cdn -> handler request'
      ].toSorted()
    );
  });

  test('Kafka topics, AgentCore tools and the agent runtime are wired from their directives', () => {
    const keys = edgeKeys(`resources:
  events:
    type: kafka-cluster
  agent:
    type: agentcore-runtime
    properties:
      useMemory: memory
      useGateway: tools
      useBrowser: browser
      useCodeInterpreter: sandbox
  memory:
    type: agentcore-memory
  browser:
    type: agentcore-browser
  sandbox:
    type: agentcore-code-interpreter
  tools:
    type: agentcore-gateway
    properties:
      tools:
        - { name: lookup, function: consume, toolSchema: [] }
${fn(
  'consume',
  `      events:
        - type: kafka-topic
          properties: { kafkaClusterName: events, topicName: orders }`
)}`);
    expect(keys.toSorted()).toEqual(
      [
        'agent -> memory dependency',
        'agent -> tools dependency',
        'agent -> browser dependency',
        'agent -> sandbox dependency',
        'tools -> consume request lookup',
        'events -> consume event stream'
      ].toSorted()
    );
  });
});
