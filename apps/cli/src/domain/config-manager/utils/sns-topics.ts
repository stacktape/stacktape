import type { ConfigManager } from '../index';
import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import type { StpSnsTopic } from '@domain-services/config-manager/resolved-types/sns-topic';
import { getPropsOfResourceReferencedInConfig } from './resource-lookup';
import { configErrors } from '../errors';

export const resolveReferenceToSnsTopic = ({
  activeConfig,
  referencedFrom,
  referencedFromType,
  stpResourceReference
}: {
  activeConfig: ConfigManager;
  referencedFrom: string;
  referencedFromType?: StpResourceType | 'alarm';
  stpResourceReference: string | undefined;
}) => {
  return getPropsOfResourceReferencedInConfig({
    activeConfig: activeConfig,
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
