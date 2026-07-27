import { getPropsOfResourceReferencedInConfig } from './resource-references';

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
    stpResourceReference,
    stpResourceType: 'edge-lambda-function',
    referencedFrom,
    referencedFromType
  });
};
