import { getPropsOfResourceReferencedInConfig } from './resource-references';

export const resolveReferenceToEventBus = ({
  referencedFrom,
  referencedFromType,
  stpResourceReference
}: {
  referencedFrom: string;
  referencedFromType?: StpWorkloadType | 'alarm';
  stpResourceReference: string | undefined;
}) => {
  return getPropsOfResourceReferencedInConfig({
    stpResourceReference,
    stpResourceType: 'event-bus',
    referencedFrom,
    referencedFromType
  });
};
