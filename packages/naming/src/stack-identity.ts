import { shortHash } from './short-hash';

/**
 * Returns the historical Stacktape stack identity used in globally unique AWS names.
 *
 * The concatenation order and lack of separators are compatibility-sensitive.
 */
export const getGloballyUniqueStackHash = ({
  region,
  stackName,
  accountId
}: {
  region: string;
  stackName: string;
  accountId: string;
}) => shortHash(region + stackName + accountId);
