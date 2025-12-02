import { parse } from 'tldts';

export const getApexDomain = (fullDomainName: string): string => parse(fullDomainName).domain;

export const getAllParentDomains = (domainName: string) => {
  const result: string[] = [];
  let parentDomain = domainName;
  while (parentDomain.includes('.')) {
    result.push(parentDomain);
    parentDomain = parentDomain.slice(parentDomain.indexOf('.') + 1);
  }
  return result;
};
