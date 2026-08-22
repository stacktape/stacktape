import type { NormalizedStackInfoMap } from './contracts';
import { getUserResourcesFromStackInfoMap } from './selectors';

/**
 * Which CloudWatch namespace family a Stacktape resource's charts read. Derived from the stack-info
 * map plus the deployed stack's physical resource ids, so the Console API and the Console UI agree on
 * what is chartable without re-implementing the mapping.
 */
export type MetricTargetType =
  | 'apigateway'
  | 'lambda'
  | 'ecs'
  | 'rds'
  | 'cognito'
  | 's3'
  | 'dynamodb'
  | 'cloudfront'
  | 'alb';

/**
 * The subset of CloudFormation's `StackResourceSummary` this module reads. Keys keep the SDK's
 * capitalized spelling so callers can pass SDK results straight through; the package itself stays
 * free of the AWS SDK dependency.
 */
export type StackPhysicalResource = {
  LogicalResourceId?: string;
  PhysicalResourceId?: string;
  ResourceType?: string;
};

export type MetricTarget = {
  type: MetricTargetType;
  /** API id, function name, cluster name, DB identifier, ALB dimension, bucket, table or distribution id. */
  primaryResourceIdentifier: string;
  /** ECS service name and Cognito user pool client id; unused for the other target types. */
  secondaryResourceIdentifier?: string;
};

export type ResourceMetricTargets = {
  resourceName: string;
  resourceType: string;
  targets: MetricTarget[];
};

const ECS_SERVICE_TYPES = ['AWS::ECS::Service', 'Stacktape::ECSBlueGreenV1::Service'];

/**
 * CloudWatch's `AWS/ApplicationELB` dimension is the ARN's trailing `app/<name>/<id>` part, not the
 * ARN itself. A network load balancer shares the CloudFormation resource type but lives in a
 * different namespace, so anything that is not `app/...` is not an ALB target.
 */
const albDimensionFromArn = (physicalId: string): string | null => {
  const dimension = physicalId.includes(':loadbalancer/') ? physicalId.split(':loadbalancer/')[1]! : physicalId;
  return dimension.startsWith('app/') ? dimension : null;
};

export const getMetricTargets = ({
  stackInfoMap,
  physicalResources
}: {
  stackInfoMap: NormalizedStackInfoMap | null;
  physicalResources: StackPhysicalResource[];
}): ResourceMetricTargets[] => {
  return getUserResourcesFromStackInfoMap(stackInfoMap).flatMap((resource) => {
    // `getUserResourcesFromStackInfoMap` flattens nested children (a web service's gateway or load
    // balancer) into `cloudformationChildResources`, so one lookup covers the whole composite.
    const physicalIdOf = (cloudformationTypes: string | string[]): string | undefined => {
      const wantedTypes = Array.isArray(cloudformationTypes) ? cloudformationTypes : [cloudformationTypes];
      for (const [logicalId, child] of Object.entries(resource.cloudformationChildResources)) {
        if (!wantedTypes.includes(child.cloudformationResourceType)) continue;
        const physical = physicalResources.find((candidate) => candidate.LogicalResourceId === logicalId);
        if (!physical?.PhysicalResourceId) continue;
        if (ECS_SERVICE_TYPES.includes(physical.ResourceType || '')) {
          // An ECS service's physical id is an ARN of the form `.../service/<cluster>/<service>`.
          return physical.PhysicalResourceId.split('/')[2];
        }
        return physical.PhysicalResourceId;
      }
      return undefined;
    };

    const targets: MetricTarget[] = [];
    const addTarget = (type: MetricTargetType, primary: string | undefined | null, secondary?: string) => {
      if (!primary) return;
      targets.push({
        type,
        primaryResourceIdentifier: primary,
        ...(secondary ? { secondaryResourceIdentifier: secondary } : {})
      });
    };
    const addEcsTarget = () => {
      const cluster = physicalIdOf('AWS::ECS::Cluster');
      const service = physicalIdOf(ECS_SERVICE_TYPES);
      if (cluster && service) addTarget('ecs', cluster, service);
    };

    switch (resource.resourceType) {
      case 'web-service': {
        addEcsTarget();
        // A web service fronts with exactly one of these; whichever child exists wins.
        addTarget('apigateway', physicalIdOf('AWS::ApiGatewayV2::Api'));
        const loadBalancerArn = physicalIdOf('AWS::ElasticLoadBalancingV2::LoadBalancer');
        if (loadBalancerArn) addTarget('alb', albDimensionFromArn(loadBalancerArn));
        break;
      }
      case 'multi-container-workload':
      case 'private-service':
      case 'worker-service':
        addEcsTarget();
        break;
      case 'relational-database':
        addTarget('rds', physicalIdOf('AWS::RDS::DBInstance'));
        break;
      case 'http-api-gateway':
        addTarget('apigateway', physicalIdOf('AWS::ApiGatewayV2::Api'));
        break;
      case 'application-load-balancer': {
        const loadBalancerArn = physicalIdOf('AWS::ElasticLoadBalancingV2::LoadBalancer');
        if (loadBalancerArn) addTarget('alb', albDimensionFromArn(loadBalancerArn));
        break;
      }
      case 'function':
        addTarget('lambda', physicalIdOf('AWS::Lambda::Function'));
        break;
      case 'dynamo-db-table':
        addTarget('dynamodb', physicalIdOf(['AWS::DynamoDB::GlobalTable', 'AWS::DynamoDB::Table']));
        break;
      case 'hosting-bucket':
        addTarget('s3', physicalIdOf('AWS::S3::Bucket'));
        addTarget('cloudfront', physicalIdOf('AWS::CloudFront::Distribution'));
        break;
      case 'nextjs-web':
      case 'ssr-web':
        addTarget('cloudfront', physicalIdOf('AWS::CloudFront::Distribution'));
        break;
      case 'bucket':
        addTarget('s3', physicalIdOf('AWS::S3::Bucket'));
        break;
      case 'user-auth-pool': {
        // Cognito metrics are reported per user-pool client; without both dimensions there is no series.
        const userPoolClient = physicalIdOf('AWS::Cognito::UserPoolClient');
        if (userPoolClient) addTarget('cognito', physicalIdOf('AWS::Cognito::UserPool'), userPoolClient);
        break;
      }
      default:
        break;
    }

    return targets.length ? [{ resourceName: resource.name, resourceType: resource.resourceType, targets }] : [];
  });
};
