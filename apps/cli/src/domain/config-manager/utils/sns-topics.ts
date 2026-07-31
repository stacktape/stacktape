import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import type { StpSnsTopic } from '@domain-services/config-manager/resolved-types/sns-topic';
import { getPropsOfResourceReferencedInConfig } from './resource-references';
import { configErrors } from '../errors';

export const resolveReferenceToSnsTopic = ({
  referencedFrom,
  referencedFromType,
  stpResourceReference
}: {
  referencedFrom: string;
  referencedFromType?: StpResourceType | 'alarm';
  stpResourceReference: string | undefined;
}) => {
  return getPropsOfResourceReferencedInConfig({
    stpResourceReference,
    stpResourceType: 'sns-topic',
    referencedFrom,
    referencedFromType
  });
};

export const validateSnsTopicConfig = ({ resource }: { resource: StpSnsTopic }) => {
  if (resource.contentBasedDeduplication && !resource.fifoEnabled) {
    throw configErrors.snsContentDeduplicationRequiresFifo({ stpSqsQueueName: resource.name });
  }
};
