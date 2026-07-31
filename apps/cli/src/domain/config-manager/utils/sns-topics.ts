import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import type { StpSnsTopic } from '@domain-services/config-manager/resolved-types/sns-topic';
import { stpErrors } from '@errors';
import { getPropsOfResourceReferencedInConfig } from './resource-references';

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
    throw stpErrors.e82({ stpSqsQueueName: resource.name });
  }
};
