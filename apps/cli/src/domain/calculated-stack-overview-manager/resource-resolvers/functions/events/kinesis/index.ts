import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt, Ref } from '@cloudform/functions';
import KinesisConsumer from '@cloudform/kinesis/streamConsumer';
import EventSourceMapping from '@cloudform/lambda/eventSourceMapping';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { resolveReferenceToKinesisStream } from '@domain-services/config-manager/utils/kinesis-streams';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { ExpectedError } from '@utils/errors';

export const resolveKinesisEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  const { name, cfLogicalName, aliasLogicalName, events, configParentResourceType, nameChain } = lambdaFunction;

  const eventInducedKinesisStreamStatement = {
    Effect: 'Allow',
    Action: ['kinesis:GetRecords', 'kinesis:GetShardIterator', 'kinesis:DescribeStream', 'kinesis:ListStreams'],
    Resource: []
  };
  const eventInducedKinesisStreamWithConsumerStatement = {
    Effect: 'Allow',
    Action: ['kinesis:GetRecords', 'kinesis:GetShardIterator', 'kinesis:DescribeStreamSummary', 'kinesis:ListShards'],
    Resource: []
  };
  const eventInducedKinesisConsumerStatement = {
    Effect: 'Allow',
    Action: ['kinesis:SubscribeToShard'],
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
  // @todo: See my comments in sqs event
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
  (events || []).forEach((event: KinesisIntegration, index) => {
    if (event.type === 'kinesis-stream') {
      if (event.properties.consumerArn && event.properties.autoCreateConsumer) {
        throw new ExpectedError(
          'CONFIG_VALIDATION',
          `Error in ${configParentResourceType} compute resource ${name}. You cannot define both "consumerArn" and enable "autoCreateConsumer" in kinesis event properties.` +
            ' You can only define one of these properties or omit both of them.'
        );
      }

      // Resolve streamArn from kinesisStreamName if provided
      let streamArn: string | IntrinsicFunction = event.properties.streamArn;
      if (event.properties.kinesisStreamName) {
        resolveReferenceToKinesisStream({
          referencedFrom: name,
          referencedFromType: configParentResourceType,
          stpResourceReference: event.properties.kinesisStreamName
        });
        streamArn = GetAtt(
          cfLogicalNames.kinesisStream(event.properties.kinesisStreamName),
          'Arn'
        ) as unknown as string;
      }

      let consumerArn = event.properties.consumerArn;
      if (event.properties.autoCreateConsumer) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.kinesisEventConsumer(name, index),
          nameChain,
          resource: new KinesisConsumer({
            StreamARN: streamArn,
            ConsumerName: awsResourceNames.kinesisEventConsumer(globalStateManager.targetStack.stackName, name, index)
          })
        });
        consumerArn = GetAtt(cfLogicalNames.kinesisEventConsumer(name, index), 'ConsumerARN') as unknown as string;
      }
      if (consumerArn) {
        eventInducedKinesisConsumerStatement.Resource.push(consumerArn);
        eventInducedKinesisStreamWithConsumerStatement.Resource.push(streamArn);
      } else {
        eventInducedKinesisStreamStatement.Resource.push(streamArn);
      }

      const lambdaEndpointArn = aliasLogicalName ? Ref(aliasLogicalName) : GetAtt(cfLogicalName, 'Arn');

      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.eventSourceMapping(name, index),
        nameChain,
        resource: getEventSourceMapping({
          eventDetails: event.properties,
          consumerArn,
          lambdaEndpointArn,
          streamArn
        })
      });

      if (event.properties.onFailure?.type === 'sns') {
        onFailureSnsStatement.Resource.push(event.properties.onFailure.arn);
      } else if (event.properties.onFailure?.type === 'sqs') {
        onFailureSqsStatement.Resource.push(event.properties.onFailure.arn);
      }
    }
  });
  let statements: StpIamRoleStatement[] = [];
  if (eventInducedKinesisConsumerStatement.Resource.length) {
    statements = statements.concat(eventInducedKinesisConsumerStatement);
    statements = statements.concat(eventInducedKinesisStreamWithConsumerStatement);
  }
  if (eventInducedKinesisStreamStatement.Resource.length) {
    statements = statements.concat(eventInducedKinesisStreamStatement);
  }
  if (onFailureSqsStatement.Resource.length) {
    statements = statements.concat(onFailureSqsStatement);
  }
  if (onFailureSnsStatement.Resource.length) {
    statements = statements.concat(onFailureSnsStatement);
  }

  return statements;
};

const getEventSourceMapping = ({
  eventDetails,
  lambdaEndpointArn,
  consumerArn,
  streamArn
}: {
  eventDetails: KinesisIntegrationProps;
  lambdaEndpointArn: string | IntrinsicFunction;
  consumerArn?: string;
  streamArn: string | IntrinsicFunction;
}) => {
  // const consumerDependency =
  //   !eventDetails.consumerArn ||
  //   (getIsDirective(eventDetails.consumerArn) && startsLikeGetParamDirective(eventDetails.consumerArn));
  const resource = new EventSourceMapping({
    BatchSize: eventDetails.batchSize,
    EventSourceArn: consumerArn || streamArn,
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
  // if (consumerDependency) {
  //   let consumerLogicalName: string;
  //   if (getIsDirective(eventDetails.consumerArn) && startsLikeGetParamDirective(eventDetails.consumerArn)) {
  //     consumerLogicalName = getDirectiveParams('ResourceParam', eventDetails.consumerArn)[0].value;
  //   }
  //   resource.DependsOn = consumerLogicalName || cfLogicalNames.kinesisEventConsumer(workloadName, eventIndex);
  // }
  return resource;
};
