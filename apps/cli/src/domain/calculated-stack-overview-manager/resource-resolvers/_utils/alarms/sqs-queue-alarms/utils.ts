import type { Dimension } from '@stacktape/cloudformation/resources/aws-cloudwatch-alarm';
import { getAtt } from '@stacktape/cloudformation/intrinsics';
import type { StpSqsQueue } from '@domain-services/config-manager/resolved-types/sqs-queues';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

export const getDimensionsForSqsQueue = ({ queueResource }: { queueResource: StpSqsQueue }): Dimension[] => {
  return [
    {
      Name: 'QueueName',
      Value: getAtt(cfLogicalNames.sqsQueue(queueResource.name), 'QueueName')
    }
  ];
};
