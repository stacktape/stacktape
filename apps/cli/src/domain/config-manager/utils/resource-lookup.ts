import type { StpResource, StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import type { ResourcePropsFromConfig } from '@domain-services/stack-info/types';
import { configErrors } from '../errors';

export type ResourceLookup = {
  findResourceInConfig: (input: { nameChain: string | string[] }) => {
    resource: StpResource;
    validPath: string;
    restPath: string;
    fullyResolved: boolean;
  };
};

/** Resolve one authored resource without depending on the ConfigManager composition root. */
export const getPropsOfResourceReferencedInConfig = <T extends StpResourceType>({
  activeConfig,
  stpResourceReference,
  stpResourceType,
  referencedFrom,
  referencedFromType
}: {
  activeConfig: ResourceLookup;
  stpResourceReference: string;
  stpResourceType?: T;
  referencedFrom: string;
  referencedFromType?: StpResourceType | 'alarm';
}): ResourcePropsFromConfig<T> => {
  const { resource, restPath, validPath, fullyResolved } = activeConfig.findResourceInConfig({
    nameChain: stpResourceReference.split('.')
  });
  if (!fullyResolved || (stpResourceType && resource.type !== stpResourceType)) {
    throw configErrors.unresolvedResourceReference({
      stpResourceName: stpResourceReference,
      stpResourceType,
      referencedFrom,
      referencedFromType,
      validResourcePath: validPath,
      invalidRestResourcePath: restPath,
      possibleNestedResources: Object.keys(resource?._nestedResources || {}),
      incorrectResourceType: stpResourceType && resource?.type !== stpResourceType
    });
  }
  return resource as ResourcePropsFromConfig<T>;
};
