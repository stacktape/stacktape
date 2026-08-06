import { describe, expect, test } from 'bun:test';
import { parse } from 'yaml';
import { buildDiagramTopology } from './topology.js';
import { getDiagramFixtures, getSceneForFixture, parseFixtureConfig } from './fixture-scenes.js';

describe('diagram scene model', () => {
  for (const fixture of getDiagramFixtures()) {
    test(`builds stable scene for ${fixture.id}`, () => {
      const scene = getSceneForFixture({ fixture });

      expect(scene).not.toBeNull();
      expect(scene!.nodes.length).toBeGreaterThanOrEqual(fixture.expectation.minNodes);
      expect(scene!.connectors.length).toBeGreaterThanOrEqual(fixture.expectation.minConnectors);

      const nodeIds = new Set(scene!.nodes.map((node) => node.id));
      expect(nodeIds.size).toBe(scene!.nodes.length);

      const tileKeys = new Set(scene!.nodes.map((node) => `${node.tile.x}:${node.tile.y}`));
      expect(tileKeys.size).toBe(scene!.nodes.length);

      for (const connector of scene!.connectors) {
        expect(nodeIds.has(connector.from)).toBe(true);
        expect(nodeIds.has(connector.to)).toBe(true);
        expect(connector.route.points.length).toBeGreaterThanOrEqual(2);
        expect(connector.route.labelTile).toBeDefined();
      }

      if (fixture.expectation.hasVpc) {
        expect(scene!.rectangles.some((rectangle) => rectangle.id === 'vpc')).toBe(true);
      }

      for (const semantic of fixture.expectation.connectorSemantics || []) {
        expect(scene!.connectors.some((connector) => connector.semantic === semantic)).toBe(true);
      }
    });

    test(`keeps non-VPC nodes outside the VPC rectangle for ${fixture.id}`, () => {
      const scene = getSceneForFixture({ fixture });
      const topology = buildDiagramTopology({ parsedConfig: parseFixtureConfig({ fixture }) });
      const vpcRect = scene!.rectangles.find((rectangle) => rectangle.id === 'vpc');
      if (!vpcRect || !topology) return;

      const subnetByNodeId = new Map(topology.nodes.map((node) => [node.id, node.subnet]));
      const offenders = scene!.nodes.filter((node) => {
        if (subnetByNodeId.get(node.id) !== null) return false;
        return (
          node.tile.x >= vpcRect.from.x &&
          node.tile.x <= vpcRect.to.x &&
          node.tile.y >= vpcRect.from.y &&
          node.tile.y <= vpcRect.to.y
        );
      });

      expect(offenders.map((node) => node.id)).toEqual([]);
    });
  }

  test('gives every web service its own dedicated implicit gateway', () => {
    const topology = buildDiagramTopology({
      parsedConfig: parse(`resources:
  apiGateway:
    type: http-api-gateway

  serviceA:
    type: web-service

  serviceB:
    type: web-service
`) as any
    });

    expect(topology).not.toBeNull();
    // Each web service provisions its own gateway; none may reuse the unrelated explicit one.
    expect(topology!.nodes.some((node) => node.id === 'serviceA--gw')).toBe(true);
    expect(topology!.nodes.some((node) => node.id === 'serviceB--gw')).toBe(true);
    expect(topology!.edges.some((edge) => edge.from === 'apiGateway')).toBe(false);
    expect(topology!.edges.some((edge) => edge.from === 'serviceA--gw' && edge.to === 'serviceA')).toBe(true);
    expect(topology!.edges.some((edge) => edge.from === 'user' && edge.to === 'serviceA--gw')).toBe(true);
  });

  test('places databases inside the VPC public subnets regardless of accessibility mode', () => {
    const topology = buildDiagramTopology({
      parsedConfig: parse(`resources:
  internetDb:
    type: relational-database
    properties:
      engine:
        type: postgres

  cache:
    type: redis-cluster
`) as any
    });

    // Stacktape has no data/isolated subnet tier and accessibility modes only change
    // security-group rules — both resources really live in the public subnets.
    const internetDb = topology!.nodes.find((node) => node.id === 'internetDb');
    const cache = topology!.nodes.find((node) => node.id === 'cache');
    expect(internetDb!.subnet).toBe('public');
    expect(internetDb!.accessNote).toContain('internet');
    expect(cache!.subnet).toBe('public');
    expect(topology!.nodes.every((node) => node.subnet !== ('data' as any))).toBe(true);
  });

  test('gives private services an internal ALB without a user edge', () => {
    const topology = buildDiagramTopology({
      parsedConfig: parse(`resources:
  internalApi:
    type: private-service
    properties:
      loadBalancing:
        type: application-load-balancer

  publicApp:
    type: web-service
`) as any
    });

    const internalAlb = topology!.nodes.find((node) => node.id === 'internalApi--alb');
    expect(internalAlb).toBeDefined();
    expect(internalAlb!.internal).toBe(true);
    expect(topology!.edges.some((edge) => edge.from === 'internalApi--alb' && edge.to === 'internalApi')).toBe(true);
    expect(topology!.edges.some((edge) => edge.from === 'user' && edge.to === 'internalApi--alb')).toBe(false);
  });

  test('resolves dynamo-db-stream and s3 event ARNs through ResourceParam directives', () => {
    const topology = buildDiagramTopology({
      parsedConfig: parse(`resources:
  processor:
    type: function
    properties:
      events:
        - type: dynamo-db-stream
          properties:
            streamArn: $ResourceParam('ordersTable', 'streamArn')
        - type: s3
          properties:
            bucketArn: $ResourceParam('uploads', 'arn')

  ordersTable:
    type: dynamo-db-table

  uploads:
    type: bucket
`) as any
    });

    expect(topology!.edges.some((edge) => edge.from === 'ordersTable' && edge.to === 'processor')).toBe(true);
    expect(topology!.edges.some((edge) => edge.from === 'uploads' && edge.to === 'processor')).toBe(true);
  });

  test('decomposes SSR webs into CDN, server function and assets bucket', () => {
    const topology = buildDiagramTopology({
      parsedConfig: parse(`resources:
  web:
    type: nextjs-web
    properties:
      connectTo:
        - dataTable

  dataTable:
    type: dynamo-db-table
`) as any
    });

    expect(topology!.nodes.some((node) => node.id === 'web--server' && node.resourceType === 'function')).toBe(true);
    expect(topology!.nodes.some((node) => node.id === 'web--assets' && node.resourceType === 'bucket')).toBe(true);
    expect(topology!.edges.some((edge) => edge.from === 'web' && edge.to === 'web--server')).toBe(true);
    expect(topology!.edges.some((edge) => edge.from === 'web' && edge.to === 'web--assets')).toBe(true);
    // The server function (not the CDN entry) talks to connectTo targets.
    expect(topology!.edges.some((edge) => edge.from === 'web--server' && edge.to === 'dataTable')).toBe(true);
    expect(topology!.edges.some((edge) => edge.from === 'web' && edge.to === 'dataTable')).toBe(false);
  });

  test('adds event edges and schedule node for batch jobs', () => {
    const topology = buildDiagramTopology({
      parsedConfig: parse(`resources:
  nightlyJob:
    type: batch-job
    properties:
      events:
        - type: schedule
          properties:
            scheduleRate: rate(1 day)
        - type: sqs
          properties:
            sqsQueueName: jobQueue

  jobQueue:
    type: sqs-queue
`) as any
    });

    expect(topology).not.toBeNull();
    expect(topology!.nodes.some((node) => node.resourceType === 'schedule' && node.implicit)).toBe(true);
    expect(topology!.edges.some((edge) => edge.from === 'schedule--implicit' && edge.to === 'nightlyJob')).toBe(true);
    expect(topology!.edges.some((edge) => edge.from === 'jobQueue' && edge.to === 'nightlyJob')).toBe(true);
  });

  test('routes CDN-enabled ALB services through the CDN without direct user ingress', () => {
    const topology = buildDiagramTopology({
      parsedConfig: parse(`resources:
  app:
    type: web-service
    properties:
      cdn:
        enabled: true
      loadBalancing:
        type: application-load-balancer
`) as any
    });

    expect(topology).not.toBeNull();
    expect(topology!.edges.some((edge) => edge.from === 'user' && edge.to === 'app--cdn')).toBe(true);
    expect(topology!.edges.some((edge) => edge.from === 'app--cdn' && edge.to === 'app--alb')).toBe(true);
    expect(topology!.edges.some((edge) => edge.from === 'user' && edge.to === 'app--alb')).toBe(false);
  });

  test('adds dependency edges for ResourceParam references', () => {
    const topology = buildDiagramTopology({
      parsedConfig: parse(`resources:
  api:
    type: http-api-gateway

  worker:
    type: function
    properties:
      environment:
        API_URL: "$ResourceParam('api', 'url')"
        FORMATTED: "$Format('url: {}', $ResourceParam('table', 'name'))"

  table:
    type: dynamo-db-table
`) as any
    });

    expect(topology).not.toBeNull();
    expect(topology!.edges.some((edge) => edge.from === 'worker' && edge.to === 'api')).toBe(true);
    expect(topology!.edges.some((edge) => edge.from === 'worker' && edge.to === 'table')).toBe(true);
  });
});
