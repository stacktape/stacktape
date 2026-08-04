import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { resolveReferenceToKinesisStream } from '@domain-services/config-manager/utils/kinesis-streams';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { CliError } from '@utils/errors';
import type { KinesisIntegration, KinesisIntegrationProps } from '@stacktape/config/events';
import type { StpIamRoleStatement } from '@stacktape/config/shared';

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
        throw new CliError({
          category: 'CONFIG_VALIDATION',
          code: 'CONFIG_KINESIS_CONSUMER_CONFLICT',
          message: `Error in ${configParentResourceType} \`${name}\`. Kinesis event properties cannot specify both \`consumerArn\` and \`autoCreateConsumer\`.`,
          hints: 'Specify only one of these properties, or omit both.'
        });
      }
      if (
        [event.properties.kinesisStreamName, event.properties.streamArn].filter((streamReference) => streamReference)
          .length !== 1
      ) {
        throw new CliError({
          category: 'CONFIG_VALIDATION',
          code: 'CONFIG_KINESIS_STREAM_REFERENCE_INVALID',
          message: `Error in ${configParentResourceType} \`${name}\`. When referencing a Kinesis stream, specify exactly one of \`kinesisStreamName\` or \`streamArn\`.`
        });
      }

      // Resolve streamArn from kinesisStreamName if provided
      let streamArn: string | Intrinsic = event.properties.streamArn;
      if (event.properties.kinesisStreamName) {
        resolveReferenceToKinesisStream({
          referencedFrom: name,
          referencedFromType: configParentResourceType,
          stpResourceReference: event.properties.kinesisStreamName
        });
        streamArn = getAtt(
          cfLogicalNames.kinesisStream(event.properties.kinesisStreamName),
          'Arn'
        ) as unknown as string;
      }

      let consumerArn = event.properties.consumerArn;
      if (event.properties.autoCreateConsumer) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.kinesisEventConsumer(name, index),
          nameChain,
          resource: cfnResource('AWS::Kinesis::StreamConsumer', {
            StreamARN: streamArn,
            ConsumerName: awsResourceNames.kinesisEventConsumer(
              calculatedStackOverviewManager.context.stackName,
              name,
              index
            )
          })
        });
        consumerArn = getAtt(cfLogicalNames.kinesisEventConsumer(name, index), 'ConsumerARN') as unknown as string;
      }
      if (consumerArn) {
        eventInducedKinesisConsumerStatement.Resource.push(consumerArn);
        eventInducedKinesisStreamWithConsumerStatement.Resource.push(streamArn);
      } else {
        eventInducedKinesisStreamStatement.Resource.push(streamArn);
      }

      const lambdaEndpointArn = aliasLogicalName ? ref(aliasLogicalName) : getAtt(cfLogicalName, 'Arn');

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
  lambdaEndpointArn: string | Intrinsic;
  consumerArn?: string;
  streamArn: string | Intrinsic;
}) => {
  // const consumerDependency =
  //   !eventDetails.consumerArn ||
  //   (getIsDirective(eventDetails.consumerArn) && startsLikeGetParamDirective(eventDetails.consumerArn));
  const resource = cfnResource('AWS::Lambda::EventSourceMapping', {
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
