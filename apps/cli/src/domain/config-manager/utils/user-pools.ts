import { configManager } from '@domain-services/config-manager';
import { getPropsOfResourceReferencedInConfig } from './resource-lookup';

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
    activeConfig: configManager,
    stpResourceReference,
    stpResourceType: 'user-auth-pool',
    referencedFrom,
    referencedFromType
  });
};
