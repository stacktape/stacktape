import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import { getPropsOfResourceReferencedInConfig } from './resource-references';

export const resolveReferenceToBastion = ({
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
    stpResourceType: 'bastion',
    referencedFrom,
    referencedFromType
  });
};
