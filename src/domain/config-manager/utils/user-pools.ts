import { getPropsOfResourceReferencedInConfig } from './resource-references';

export const resolveReferenceToUserPool = ({
  referencedFrom,
  referencedFromType,
  stpResourceReference
}: {
  referencedFrom: string;
  referencedFromType?: 'open-search-domain';
  stpResourceReference: string | undefined;
}) => {
  return getPropsOfResourceReferencedInConfig({
    stpResourceReference,
    stpResourceType: 'user-auth-pool',
    referencedFrom,
    referencedFromType
  });
};
