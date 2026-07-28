import { normalizeDomainName } from '@utils/domains';
import type { DomainConfiguration } from '@stacktape/config/shared';

export const normalizeCustomDomains = ({
  customDomains
}: {
  customDomains?: (string | DomainConfiguration)[] | null;
}): DomainConfiguration[] | null | undefined => {
  if (customDomains === undefined) {
    return undefined;
  }
  if (customDomains === null) {
    return null;
  }

  return customDomains.map<DomainConfiguration>((customDomain) =>
    typeof customDomain === 'string'
      ? { domainName: normalizeDomainName(customDomain) }
      : { ...customDomain, domainName: normalizeDomainName(customDomain.domainName) }
  );
};
