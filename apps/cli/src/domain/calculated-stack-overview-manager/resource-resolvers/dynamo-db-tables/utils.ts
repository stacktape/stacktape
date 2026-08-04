import type { AttributeDefinition, KeySchema } from '@stacktape/cloudformation/resources/aws-dynamodb-table';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { join, ref, sub } from '@stacktape/cloudformation/intrinsics';
import type { Subtype } from '@utils/type-helpers';
import type { StpDynamoTable } from '@domain-services/config-manager/resolved-types/dynamo-db-tables';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

const getAttributeDefinitions = ({ resource }: { resource: StpDynamoTable }) => {
  const attributes: AttributeDefinition[] = [];
  attributes.push({
    AttributeName: resource.primaryKey.partitionKey.name,
    AttributeType: transformAttributeType(resource.primaryKey.partitionKey.type)
  });
  if (resource.primaryKey.sortKey) {
    attributes.push({
      AttributeName: resource.primaryKey.sortKey.name,
      AttributeType: transformAttributeType(resource.primaryKey.sortKey.type)
    });
  }
  (resource.secondaryIndexes || []).forEach(({ partitionKey, sortKey }) => {
    if (!attributes.find(({ AttributeName }) => AttributeName === partitionKey.name)) {
      attributes.push({
        AttributeName: partitionKey.name,
        AttributeType: transformAttributeType(partitionKey.type)
      });
    }
    if (sortKey && !attributes.find(({ AttributeName }) => AttributeName === sortKey.name)) {
      attributes.push({
        AttributeName: sortKey.name,
        AttributeType: transformAttributeType(sortKey.type)
      });
    }
  });
  return attributes;
};

const getKeySchema = ({ resource }: { resource: StpDynamoTable }) => {
  const schema: KeySchema[] = [];
  schema.push({ AttributeName: resource.primaryKey.partitionKey.name, KeyType: 'HASH' });
  if (resource.primaryKey.sortKey) {
    schema.push({ AttributeName: resource.primaryKey.sortKey.name, KeyType: 'RANGE' });
  }
  return schema;
};

const transformAttributeType = (attributeType: StpDynamoTable['primaryKey']['partitionKey']['type']) => {
  return attributeType === 'binary' ? 'B' : attributeType === 'number' ? 'N' : 'S';
};

export const getDynamoGlobalTableResource = ({ resource }: { resource: StpDynamoTable }) =>
  cfnResource('AWS::DynamoDB::GlobalTable', {
    AttributeDefinitions: getAttributeDefinitions({ resource }),
    KeySchema: getKeySchema({ resource }),
    BillingMode: resource.provisionedThroughput ? 'PROVISIONED' : 'PAY_PER_REQUEST',
    Replicas: [
      {
        Region: calculatedStackOverviewManager.context.region,
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: resource.enablePointInTimeRecovery || false
        },
        ReadProvisionedThroughputSettings: resource.provisionedThroughput && {
          ReadCapacityAutoScalingSettings: {
            MinCapacity:
              resource.provisionedThroughput.readScaling?.minUnits || resource.provisionedThroughput.readUnits,
            MaxCapacity:
              resource.provisionedThroughput.readScaling?.maxUnits || resource.provisionedThroughput.readUnits,
            SeedCapacity: resource.provisionedThroughput.readUnits,
            TargetTrackingScalingPolicyConfiguration: {
              TargetValue: resource.provisionedThroughput.readScaling?.keepUtilizationUnder || 90
            }
          }
        }
      }
    ],
    WriteProvisionedThroughputSettings: resource.provisionedThroughput && {
      WriteCapacityAutoScalingSettings: {
        MinCapacity: resource.provisionedThroughput.writeScaling?.minUnits || resource.provisionedThroughput.writeUnits,
        MaxCapacity: resource.provisionedThroughput.writeScaling?.maxUnits || resource.provisionedThroughput.writeUnits,
        SeedCapacity: resource.provisionedThroughput.writeUnits,
        TargetTrackingScalingPolicyConfiguration: {
          TargetValue: resource.provisionedThroughput.writeScaling?.keepUtilizationUnder || 90
        }
      }
    },
    StreamSpecification: resource.streamType && { StreamViewType: resource.streamType },
    TableName: awsResourceNames.dynamoGlobalTable(
      resource.name,
      calculatedStackOverviewManager.context.globallyUniqueStackHash,
      calculatedStackOverviewManager.context.stackName
    ),
    GlobalSecondaryIndexes: resource.secondaryIndexes?.length
      ? resource.secondaryIndexes.map(({ name, partitionKey, sortKey, projections }) => ({
          IndexName: name,
          KeySchema: [
            { AttributeName: partitionKey.name, KeyType: 'HASH' },
            ...(sortKey ? [{ AttributeName: sortKey.name, KeyType: 'RANGE' }] : [])
          ],
          Projection: projections?.length
            ? {
                ProjectionType: 'INCLUDE',
                NonKeyAttributes: projections
              }
            : {
                ProjectionType: 'KEYS_ONLY'
              }
        }))
      : undefined
  });

export const getDynamoTableResource = ({ resource }: { resource: StpDynamoTable }) =>
  cfnResource('AWS::DynamoDB::Table', {
    AttributeDefinitions: getAttributeDefinitions({ resource }),
    KeySchema: getKeySchema({ resource }),
    BillingMode: resource.provisionedThroughput ? 'PROVISIONED' : 'PAY_PER_REQUEST',
    ProvisionedThroughput: resource.provisionedThroughput && {
      ReadCapacityUnits: resource.provisionedThroughput.readUnits,
      WriteCapacityUnits: resource.provisionedThroughput.writeUnits
    },
    StreamSpecification: resource.streamType && { StreamViewType: resource.streamType },
    TableName: awsResourceNames.dynamoRegionalTable(resource.name, calculatedStackOverviewManager.context.stackName)
  });

export const getScalingPolicyForDynamoTableProvisionedCapacity = ({
  resource,
  metric
}: {
  resource: StpDynamoTable;
  metric: Subtype<keyof StpDynamoTable['provisionedThroughput'], 'readScaling' | 'writeScaling'>;
}) => {
  return cfnResource('AWS::ApplicationAutoScaling::ScalingPolicy', {
    PolicyName: awsResourceNames.autoScalingPolicy(
      resource.name,
      calculatedStackOverviewManager.context.stackName,
      metric
    ),
    PolicyType: 'TargetTrackingScaling',
    ScalingTargetId: ref(cfLogicalNames.dynamoAutoScalingTarget(resource.name, metric)),
    TargetTrackingScalingPolicyConfiguration: {
      TargetValue: resource.provisionedThroughput[metric].keepUtilizationUnder || 90,
      ScaleInCooldown: 60,
      ScaleOutCooldown: 60,
      PredefinedMetricSpecification: {
        PredefinedMetricType:
          metric === 'writeScaling' ? 'DynamoDBWriteCapacityUtilization' : 'DynamoDBReadCapacityUtilization'
      }
    }
  });
};

export const getScalableTargetForDynamoTableProvisionedCapacity = ({
  resource,
  metric
}: {
  resource: StpDynamoTable;
  metric: Subtype<keyof StpDynamoTable['provisionedThroughput'], 'readScaling' | 'writeScaling'>;
}) => {
  return cfnResource('AWS::ApplicationAutoScaling::ScalableTarget', {
    ResourceId: join('/', ['table', ref(cfLogicalNames.dynamoGlobalTable(resource.name))]),
    RoleARN: sub(
      'arn:aws:iam::${AWS::AccountId}:role/aws-service-role/dynamodb.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_DynamoDBTable'
    ),
    MaxCapacity: resource.provisionedThroughput[metric].maxUnits,
    MinCapacity: resource.provisionedThroughput[metric].minUnits,
    ScalableDimension:
      metric === 'writeScaling' ? 'dynamodb:table:WriteCapacityUnits' : 'dynamodb:table:ReadCapacityUnits',
    ServiceNamespace: 'dynamodb'
  });
};
