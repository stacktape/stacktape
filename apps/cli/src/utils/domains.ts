import { parse } from 'tldts';

export const getApexDomain = (fullDomainName: string): string => parse(fullDomainName).domain;

export const normalizeDomainName = (domainName: string): string => domainName.replace(/\.$/, '').toLowerCase();

export const certificateSubjectNameCoversDomain = (subjectName: string, domainName: string): boolean => {
  const normalizedSubjectName = normalizeDomainName(subjectName);
  const normalizedDomainName = normalizeDomainName(domainName);
  if (!normalizedSubjectName.startsWith('*.')) {
    return normalizedSubjectName === normalizedDomainName;
  }

  const wildcardSuffix = normalizedSubjectName.slice(2);
  return (
    normalizedDomainName.endsWith(`.${wildcardSuffix}`) &&
    normalizedDomainName.split('.').length === wildcardSuffix.split('.').length + 1
  );
};

export const certificateCoversDomain = (certificate: CertificateDetail, domainName: string): boolean => {
  const subjectNames = certificate.SubjectAlternativeNames?.length
    ? certificate.SubjectAlternativeNames
    : [certificate.DomainName].filter(Boolean);
  return subjectNames.some((subjectName) => certificateSubjectNameCoversDomain(subjectName, domainName));
};

export const getAllParentDomains = (domainName: string) => {
  const result: string[] = [];
  let parentDomain = domainName;
  while (parentDomain.includes('.')) {
    result.push(parentDomain);
    parentDomain = parentDomain.slice(parentDomain.indexOf('.') + 1);
  }
  return result;
};
