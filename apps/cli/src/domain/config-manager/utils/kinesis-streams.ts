import { configManager } from '@domain-services/config-manager';
import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import { getPropsOfResourceReferencedInConfig } from './resource-lookup';

export const resolveReferenceToKinesisStream = ({
  referencedFrom,
  referencedFromType,
  stpResourceReference
}: {
  referencedFrom: string;
  referencedFromType?: StpResourceType | 'alarm';
  stpResourceReference: string | undefined;
}) => {
  return getPropsOfResourceReferencedInConfig({
    activeConfig: configManager,
    stpResourceReference,
    stpResourceType: 'kinesis-stream',
    referencedFrom,
    referencedFromType
  });
};
