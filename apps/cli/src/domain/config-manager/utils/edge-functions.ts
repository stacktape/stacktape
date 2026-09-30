import { configManager } from '@domain-services/config-manager';
import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import { getPropsOfResourceReferencedInConfig } from './resource-lookup';

export const resolveReferenceToEdgeLambdaFunction = ({
  stpResourceReference,
  referencedFromType,
  referencedFrom
}: {
  stpResourceReference: string;
  referencedFromType?: StpResourceType;
  referencedFrom: string;
}) => {
  return getPropsOfResourceReferencedInConfig({
    activeConfig: configManager,
    stpResourceReference,
    stpResourceType: 'edge-lambda-function',
    referencedFrom,
    referencedFromType
  });
};
