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
    typeof customDomain === 'string' ? { domainName: customDomain } : customDomain
  );
};
