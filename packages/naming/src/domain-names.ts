import { createHash } from 'node:crypto';
import { getGloballyUniqueStackHash } from './stack-identity';

/**
 * Default-domain schemes. A version 1 suffix is a 32-bit hash that another AWS account can match with a chosen stack
 * name; stacks that already use one keep it, so their URLs do not change. A version 2 suffix is 80 bits of SHA-256,
 * which no chosen stack name can match.
 */
const DEFAULT_DOMAINS_VERSIONS = [1, 2] as const;
/**
 * The version a stack without default domains gets. The Console decides which version each stack keeps, so it must be
 * built from the same public commit as this package. This export was renamed when version 2 replaced version 1, so a
 * Console built against a different scheme fails to compile instead of handing out the wrong suffixes. Rename it again
 * whenever its value changes.
 */
export const NEW_STACK_DEFAULT_DOMAINS_VERSION = 2;

export const getDefaultDomainRootSuffix = ({ version }: { version: number }) =>
  (DEFAULT_DOMAINS_VERSIONS as readonly number[]).includes(version) ? '.stacktape-app.com' : undefined;

const getCollisionResistantStackHash = ({
  stackName,
  region,
  accountId
}: {
  stackName: string;
  region: string;
  accountId: string;
}) => createHash('sha256').update(`${region}\0${stackName}\0${accountId}`, 'utf8').digest('hex').slice(0, 20);

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
  const rootSuffix = getDefaultDomainRootSuffix({ version });
  if (!rootSuffix) return undefined;
  const hash =
    version === 1
      ? getGloballyUniqueStackHash({ stackName, region, accountId })
      : getCollisionResistantStackHash({ stackName, region, accountId });
  return `-${hash}${rootSuffix}`;
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
