import type { StpSqsQueue } from '@domain-services/config-manager/resolved-types/sqs-queues';
import type { Dimension } from '@cloudform/cloudWatch/alarm';
import { GetAtt } from '@cloudform/functions';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

export const getDimensionsForSqsQueue = ({ queueResource }: { queueResource: StpSqsQueue }): Dimension[] => {
  return [
    {
      Name: 'QueueName',
      Value: GetAtt(cfLogicalNames.sqsQueue(queueResource.name), 'QueueName')
    }
  ];
};
