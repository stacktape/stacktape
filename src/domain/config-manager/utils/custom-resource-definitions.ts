import { getPropsOfResourceReferencedInConfig } from './resource-references';

export const resolveReferenceToCustomResourceDefinition = ({
  stpResourceReference,
  referencedFromType,
  referencedFrom
}: {
  stpResourceReference: string;
  referencedFromType?: StpResourceType;
  referencedFrom: string;
}) => {
  return getPropsOfResourceReferencedInConfig({
    stpResourceReference,
    stpResourceType: 'custom-resource-definition',
    referencedFrom,
    referencedFromType
  });
};
