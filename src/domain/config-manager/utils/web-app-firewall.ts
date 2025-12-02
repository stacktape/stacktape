import { stpErrors } from '@errors';
import { getPropsOfResourceReferencedInConfig } from './resource-references';

export const resolveReferenceToFirewall = ({
  referencedFrom,
  referencedFromType,
  stpResourceReference,
  cdn
}: {
  referencedFrom: string;
  referencedFromType?: StpCdnAttachableResourceType | 'user-auth-pool' | 'web-service' | 'hosting-bucket';
  stpResourceReference: string | undefined;
  cdn?: boolean;
}) => {
  const firewall = getPropsOfResourceReferencedInConfig({
    stpResourceReference,
    stpResourceType: 'web-app-firewall',
    referencedFrom,
    referencedFromType
  });

  if ((cdn === true && firewall.scope === 'regional') || (cdn === false && firewall.scope === 'cdn')) {
    throw stpErrors.e1004({
      firewallName: firewall.name
    });
  }
  return firewall;
};
