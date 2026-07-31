import type { StpCdnAttachableResourceType } from '@domain-services/config-manager/resolved-types/resources';
import { getPropsOfResourceReferencedInConfig } from './resource-references';
import { configErrors } from '../errors';

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
    throw configErrors.firewallScopeIncompatible({
      firewallName: firewall.name
    });
  }
  return firewall;
};
