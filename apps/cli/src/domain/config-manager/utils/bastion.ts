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
