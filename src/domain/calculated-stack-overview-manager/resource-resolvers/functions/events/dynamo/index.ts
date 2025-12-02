import { GetAtt, Ref } from '@cloudform/functions';
import EventSourceMapping from '@cloudform/lambda/eventSourceMapping';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';

export const resolveDynamoEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  const { name, cfLogicalName, aliasLogicalName, events, nameChain } = lambdaFunction;
  const eventInducedDynamoStatement = {
    Effect: 'Allow',
    Action: ['dynamodb:GetRecords', 'dynamodb:GetShardIterator', 'dynamodb:DescribeStream', 'dynamodb:ListStreams'],
    Resource: []
  };
  const onFailureSnsStatement = {
    Effect: 'Allow',
    Action: ['sns:Publish'],
    Resource: []
  };
  const onFailureSqsStatement = {
    Effect: 'Allow',
    Action: ['sqs:ListQueues', 'sqs:SendMessage'],
    Resource: []
  };
  // @todo: See comments in sqs event
  // let roleDependency: string;
  // if (definition.iamRoleArn) {
  //   // check if we are referencing role with directive
  //   if (getIsDirective(definition.iamRoleArn) && startsLikeGetParamDirective(definition.iamRoleArn)) {
  //     roleDependency = getDirectiveParams('ResourceParam', definition.iamRoleArn)[0].value;
  //   }
  // } else {
  //   // if the role is not defined, we can be sure we will be creating the role due to this event
  //   roleDependency = getLambdaRoleLogicalName(name);
  // }
  const lambdaEndpointArn = aliasLogicalName ? Ref(aliasLogicalName) : GetAtt(cfLogicalName, 'Arn');
  (events || []).forEach((event: DynamoDbIntegration, index) => {
    if (event.type === 'dynamo-db-stream') {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.eventSourceMapping(name, index),
        nameChain,
        resource: getEventSourceMapping({ eventDetails: event.properties, lambdaEndpointArn }) // roleDependency
      });
      eventInducedDynamoStatement.Resource.push(event.properties.streamArn);
      if (event.properties.onFailure?.type === 'sns') {
        onFailureSnsStatement.Resource.push(event.properties.onFailure.arn);
      } else if (event.properties.onFailure?.type === 'sqs') {
        onFailureSqsStatement.Resource.push(event.properties.onFailure.arn);
      }
    }
  });
  let iamRoleStatements: StpIamRoleStatement[] = [];
  if (eventInducedDynamoStatement.Resource.length) {
    iamRoleStatements = iamRoleStatements.concat(eventInducedDynamoStatement);
  }
  if (onFailureSqsStatement.Resource.length) {
    iamRoleStatements = iamRoleStatements.concat(onFailureSqsStatement);
  }
  if (onFailureSnsStatement.Resource.length) {
    iamRoleStatements = iamRoleStatements.concat(onFailureSnsStatement);
  }

  return iamRoleStatements;
};

const getEventSourceMapping = ({
  eventDetails,
  lambdaEndpointArn
}: {
  eventDetails: DynamoDbIntegrationProps;
  lambdaEndpointArn: string | IntrinsicFunction;
}) => {
  const resource = new EventSourceMapping({
    BatchSize: eventDetails.batchSize,
    EventSourceArn: eventDetails.streamArn,
    Enabled: true,
    FunctionName: lambdaEndpointArn,
    StartingPosition: eventDetails.startingPosition || 'TRIM_HORIZON',
    MaximumBatchingWindowInSeconds: eventDetails.maxBatchWindowSeconds,
    MaximumRetryAttempts: eventDetails.maximumRetryAttempts,
    ParallelizationFactor: eventDetails.parallelizationFactor,
    BisectBatchOnFunctionError: eventDetails.bisectBatchOnFunctionError,
    DestinationConfig: eventDetails.onFailure
      ? {
          OnFailure: {
            Destination: eventDetails.onFailure.arn
          }
        }
      : undefined
  });
  // if (roleDependency) {
  //   resource.DependsOn = [roleDependency];
  // }
  return resource;
};
