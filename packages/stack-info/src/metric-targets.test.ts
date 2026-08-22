import { describe, expect, test } from 'bun:test';
import type { NormalizedStackInfoMap, NormalizedStackInfoMapResource } from './contracts';
import type { StackPhysicalResource } from './metric-targets';
import { getMetricTargets } from './metric-targets';

const resourceOf = (
  resourceType: string,
  cloudformationChildResources: Record<string, { cloudformationResourceType: string }>,
  nested?: Record<string, NormalizedStackInfoMapResource>
): NormalizedStackInfoMapResource => ({
  resourceType,
  referenceableParams: {},
  cloudformationChildResources,
  links: {},
  outputs: {},
  ...(nested ? { _nestedResources: nested } : {})
});

const mapOf = (resources: Record<string, NormalizedStackInfoMapResource>): NormalizedStackInfoMap => ({
  metadata: {},
  customOutputs: {},
  resources
});

const physical = (
  LogicalResourceId: string,
  PhysicalResourceId: string,
  ResourceType: string
): StackPhysicalResource => ({
  LogicalResourceId,
  PhysicalResourceId,
  ResourceType
});

describe('getMetricTargets', () => {
  test('web service fronted by an HTTP API gateway yields ecs and apigateway targets with the right ids', () => {
    const stackInfoMap = mapOf({
      api: resourceOf(
        'web-service',
        { Cluster: { cloudformationResourceType: 'AWS::ECS::Cluster' } },
        {
          containerWorkload: resourceOf('multi-container-workload', {
            Service: { cloudformationResourceType: 'AWS::ECS::Service' }
          }),
          httpApiGateway: resourceOf('http-api-gateway', {
            HttpApi: { cloudformationResourceType: 'AWS::ApiGatewayV2::Api' }
          })
        }
      )
    });
    const targets = getMetricTargets({
      stackInfoMap,
      physicalResources: [
        physical('Cluster', 'my-cluster', 'AWS::ECS::Cluster'),
        physical('Service', 'arn:aws:ecs:eu-west-1:1:service/my-cluster/my-service', 'AWS::ECS::Service'),
        physical('HttpApi', 'a1b2c3', 'AWS::ApiGatewayV2::Api')
      ]
    });

    expect(targets).toEqual([
      {
        resourceName: 'api',
        resourceType: 'web-service',
        targets: [
          { type: 'ecs', primaryResourceIdentifier: 'my-cluster', secondaryResourceIdentifier: 'my-service' },
          { type: 'apigateway', primaryResourceIdentifier: 'a1b2c3' }
        ]
      }
    ]);
  });

  test('web service fronted by an application load balancer yields the CloudWatch ALB dimension, not the ARN', () => {
    const stackInfoMap = mapOf({
      api: resourceOf('web-service', {
        Cluster: { cloudformationResourceType: 'AWS::ECS::Cluster' },
        Service: { cloudformationResourceType: 'AWS::ECS::Service' },
        Alb: { cloudformationResourceType: 'AWS::ElasticLoadBalancingV2::LoadBalancer' }
      })
    });
    const targets = getMetricTargets({
      stackInfoMap,
      physicalResources: [
        physical('Cluster', 'my-cluster', 'AWS::ECS::Cluster'),
        physical('Service', 'arn:aws:ecs:eu-west-1:1:service/my-cluster/my-service', 'AWS::ECS::Service'),
        physical(
          'Alb',
          'arn:aws:elasticloadbalancing:eu-west-1:1:loadbalancer/app/my-alb/50dc6c495c0c9188',
          'AWS::ElasticLoadBalancingV2::LoadBalancer'
        )
      ]
    });

    expect(targets[0]!.targets).toEqual([
      { type: 'ecs', primaryResourceIdentifier: 'my-cluster', secondaryResourceIdentifier: 'my-service' },
      { type: 'alb', primaryResourceIdentifier: 'app/my-alb/50dc6c495c0c9188' }
    ]);
  });

  test('a network load balancer is not reported as an ALB target', () => {
    const stackInfoMap = mapOf({
      tcp: resourceOf('application-load-balancer', {
        Lb: { cloudformationResourceType: 'AWS::ElasticLoadBalancingV2::LoadBalancer' }
      })
    });
    const targets = getMetricTargets({
      stackInfoMap,
      physicalResources: [
        physical(
          'Lb',
          'arn:aws:elasticloadbalancing:eu-west-1:1:loadbalancer/net/my-nlb/aaa',
          'AWS::ElasticLoadBalancingV2::LoadBalancer'
        )
      ]
    });
    expect(targets).toEqual([]);
  });

  test('resources whose physical ids are missing produce no targets instead of undefined identifiers', () => {
    const stackInfoMap = mapOf({
      db: resourceOf('relational-database', { Db: { cloudformationResourceType: 'AWS::RDS::DBInstance' } }),
      fn: resourceOf('function', { Fn: { cloudformationResourceType: 'AWS::Lambda::Function' } })
    });
    const targets = getMetricTargets({
      stackInfoMap,
      physicalResources: [physical('Fn', 'my-function', 'AWS::Lambda::Function')]
    });
    expect(targets).toEqual([
      {
        resourceName: 'fn',
        resourceType: 'function',
        targets: [{ type: 'lambda', primaryResourceIdentifier: 'my-function' }]
      }
    ]);
  });

  test('dynamo tables match both the global-table and plain-table CloudFormation types', () => {
    const stackInfoMap = mapOf({
      table: resourceOf('dynamo-db-table', { Table: { cloudformationResourceType: 'AWS::DynamoDB::Table' } })
    });
    const targets = getMetricTargets({
      stackInfoMap,
      physicalResources: [physical('Table', 'my-table', 'AWS::DynamoDB::Table')]
    });
    expect(targets[0]!.targets).toEqual([{ type: 'dynamodb', primaryResourceIdentifier: 'my-table' }]);
  });

  test('a hosting bucket yields both s3 and cloudfront targets', () => {
    const stackInfoMap = mapOf({
      web: resourceOf('hosting-bucket', {
        Bucket: { cloudformationResourceType: 'AWS::S3::Bucket' },
        Distribution: { cloudformationResourceType: 'AWS::CloudFront::Distribution' }
      })
    });
    const targets = getMetricTargets({
      stackInfoMap,
      physicalResources: [
        physical('Bucket', 'my-bucket', 'AWS::S3::Bucket'),
        physical('Distribution', 'E123', 'AWS::CloudFront::Distribution')
      ]
    });
    expect(targets[0]!.targets).toEqual([
      { type: 's3', primaryResourceIdentifier: 'my-bucket' },
      { type: 'cloudfront', primaryResourceIdentifier: 'E123' }
    ]);
  });

  test('a null stack-info map yields nothing', () => {
    expect(getMetricTargets({ stackInfoMap: null, physicalResources: [] })).toEqual([]);
  });
});
