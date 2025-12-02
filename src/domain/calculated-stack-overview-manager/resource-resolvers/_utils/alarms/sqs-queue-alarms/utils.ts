import type { Dimension } from '@cloudform/cloudWatch/alarm';
import { GetAtt } from '@cloudform/functions';
import { cfLogicalNames } from '@shared/naming/logical-names';

export const getDimensionsForSqsQueue = ({ queueResource }: { queueResource: StpSqsQueue }): Dimension[] => {
  return [
    {
      Name: 'QueueName',
      Value: GetAtt(cfLogicalNames.sqsQueue(queueResource.name), 'QueueName')
    }
  ];
};
