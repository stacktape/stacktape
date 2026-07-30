import { shortHash } from '@stacktape/naming/short-hash';

export const getGloballyUniqueStackHash = ({
  region,
  stackName,
  accountId
}: {
  region: string;
  stackName: string;
  accountId: string;
}) => shortHash(region + stackName + accountId);
