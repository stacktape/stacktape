import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import { getPropsOfResourceReferencedInConfig } from './resource-references';

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
    stpResourceReference,
    stpResourceType: 'kinesis-stream',
    referencedFrom,
    referencedFromType
  });
};
