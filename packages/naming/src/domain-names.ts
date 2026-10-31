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

/** Stacktape's original default prefix. Pools deployed with it keep it, so their hosted UI URL does not change. */
export const getUserPoolDomainPrefix = (stackName: string, userPoolName: string) => {
  return `${stackName}-${userPoolName}`.toLowerCase();
};

/** Cognito's rules for a prefix domain (CreateUserPoolDomain). */
const USER_POOL_DOMAIN_PREFIX_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const USER_POOL_DOMAIN_PREFIX_MAX_LENGTH = 63;
const USER_POOL_DOMAIN_PREFIX_RESERVED_WORDS = ['aws', 'amazon', 'cognito'];

/** Says why Cognito rejects a prefix domain, or returns `undefined` when it accepts it. */
export const getUserPoolDomainPrefixProblem = (prefix: string) => {
  if (!USER_POOL_DOMAIN_PREFIX_PATTERN.test(prefix)) {
    return `Cognito accepts 1 to ${USER_POOL_DOMAIN_PREFIX_MAX_LENGTH} lowercase letters, digits and hyphens, starting and ending with a letter or digit`;
  }
  const reservedWord = USER_POOL_DOMAIN_PREFIX_RESERVED_WORDS.find((word) => prefix.includes(word));
  if (reservedWord) {
    return `it contains "${reservedWord}", and Cognito rejects a prefix that contains "aws", "amazon" or "cognito"`;
  }
  return undefined;
};

/**
 * The prefix for a pool that sets neither `hostedUiDomainPrefix` nor a custom domain. It is the original default when
 * Cognito accepts that. Otherwise the original default loses its reserved words and invalid characters, is shortened,
 * and ends with a hash of the original, so two pools whose names clean up to the same text still get different
 * prefixes.
 */
export const getDefaultUserPoolDomainPrefix = (stackName: string, userPoolName: string) => {
  const original = getUserPoolDomainPrefix(stackName, userPoolName);
  if (!getUserPoolDomainPrefixProblem(original)) return original;
  let cleaned = original.replace(/[^a-z0-9-]/g, '-');
  let previous: string;
  do {
    previous = cleaned;
    USER_POOL_DOMAIN_PREFIX_RESERVED_WORDS.forEach((word) => {
      cleaned = cleaned.replaceAll(word, '-');
    });
  } while (cleaned !== previous);
  const hash = createHash('sha256').update(original, 'utf8').digest('hex').slice(0, 8);
  const head = cleaned
    .replace(/-+/g, '-')
    .replace(/^-/, '')
    .slice(0, USER_POOL_DOMAIN_PREFIX_MAX_LENGTH - hash.length - 1)
    .replace(/-$/, '');
  return head ? `${head}-${hash}` : hash;
};
