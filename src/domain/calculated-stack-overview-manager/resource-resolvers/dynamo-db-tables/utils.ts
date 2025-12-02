import type { AttributeDefinition, KeySchema } from '@cloudform/dynamoDb/table';
import { globalStateManager } from '@application-services/global-state-manager';
import ScalableTarget from '@cloudform/applicationAutoScaling/scalableTarget';
import ScalingPolicy from '@cloudform/applicationAutoScaling/scalingPolicy';
import GlobalTable from '@cloudform/dynamoDb/globalTable';
import Table from '@cloudform/dynamoDb/table';
import { Join, Ref } from '@cloudform/functions';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { SubWithoutMapping } from '@utils/cloudformation';

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
  new GlobalTable({
    AttributeDefinitions: getAttributeDefinitions({ resource }),
    KeySchema: getKeySchema({ resource }),
    BillingMode: resource.provisionedThroughput ? 'PROVISIONED' : 'PAY_PER_REQUEST',
    Replicas: [
      {
        Region: globalStateManager.region,
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
      globalStateManager.targetStack.globallyUniqueStackHash,
      globalStateManager.targetStack.stackName
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
  new Table({
    AttributeDefinitions: getAttributeDefinitions({ resource }),
    KeySchema: getKeySchema({ resource }),
    BillingMode: resource.provisionedThroughput ? 'PROVISIONED' : 'PAY_PER_REQUEST',
    ProvisionedThroughput: resource.provisionedThroughput && {
      ReadCapacityUnits: resource.provisionedThroughput.readUnits,
      WriteCapacityUnits: resource.provisionedThroughput.writeUnits
    },
    StreamSpecification: resource.streamType && { StreamViewType: resource.streamType },
    TableName: awsResourceNames.dynamoRegionalTable(resource.name, globalStateManager.targetStack.stackName)
  });

export const getScalingPolicyForDynamoTableProvisionedCapacity = ({
  resource,
  metric
}: {
  resource: StpDynamoTable;
  metric: Subtype<keyof StpDynamoTable['provisionedThroughput'], 'readScaling' | 'writeScaling'>;
}) => {
  return new ScalingPolicy({
    PolicyName: awsResourceNames.autoScalingPolicy(resource.name, globalStateManager.targetStack.stackName, metric),
    PolicyType: 'TargetTrackingScaling',
    ScalingTargetId: Ref(cfLogicalNames.dynamoAutoScalingTarget(resource.name, metric)),
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
  return new ScalableTarget({
    ResourceId: Join('/', ['table', Ref(cfLogicalNames.dynamoGlobalTable(resource.name))]),
    RoleARN: SubWithoutMapping(
      // eslint-disable-next-line no-template-curly-in-string
      'arn:aws:iam::${AWS::AccountId}:role/aws-service-role/dynamodb.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_DynamoDBTable'
    ),
    MaxCapacity: resource.provisionedThroughput[metric].maxUnits,
    MinCapacity: resource.provisionedThroughput[metric].minUnits,
    ScalableDimension:
      metric === 'writeScaling' ? 'dynamodb:table:WriteCapacityUnits' : 'dynamodb:table:ReadCapacityUnits',
    ServiceNamespace: 'dynamodb'
  });
};
