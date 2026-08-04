import { getGloballyUniqueStackHash } from './stack-identity';

export const CURRENT_DEFAULT_DOMAINS_VERSION = 1;

export const getDefaultDomainRootSuffix = ({ version }: { version: number }) =>
  version === 1 ? '.stacktape-app.com' : undefined;

export const getDefaultDomainSuffixForStack = ({
  stackName,
  region,
  accountId,
  version
}: {
  stackName: string;
  region: string;
  accountId: string;
  version: number;
}) => {
  if (version !== 1) return undefined;
  return `-${getGloballyUniqueStackHash({ stackName, region, accountId })}${getDefaultDomainRootSuffix({ version })}`;
};

export const isDefaultDomainSuffixForStack = ({
  domainName,
  ...stack
}: {
  domainName: string;
  region: string;
  accountId: string;
  stackName: string;
  version: number;
}) => {
  const suffix = getDefaultDomainSuffixForStack(stack);
  return suffix ? domainName.endsWith(suffix) : false;
};

export const getPrefixForUserAppResourceDefaultDomainName = ({
  stpResourceName,
  stackName,
  cdn
}: {
  stpResourceName: string;
  stackName: string;
  cdn?: boolean;
}) => `${stpResourceName.toLowerCase()}${cdn ? '-cdn' : ''}-${stackName}`;

export const getUserPoolDomainPrefix = (stackName: string, userPoolName: string) => {
  return `${stackName}-${userPoolName}`.toLowerCase();
};
