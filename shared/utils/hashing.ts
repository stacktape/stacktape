import { createHash } from 'node:crypto';
import { hashElement } from 'folder-hash';
import { shortHash } from './short-hash';

export const getDirectoryChecksum = async ({
  absoluteDirectoryPath,
  excludeGlobs
}: {
  absoluteDirectoryPath: string;
  excludeGlobs?: string[];
}) => {
  const res = await hashElement(absoluteDirectoryPath, {
    encoding: 'hex',
    folders: { exclude: excludeGlobs || [] }
  });
  return res.hash;
};

export const mergeHashes = (...hashes: string[]) => {
  const result = createHash('sha1');

  hashes.forEach((hash) => {
    result.update(hash);
  });

  return result.digest('hex');
};

export const getGloballyUniqueStackHash = ({
  region,
  stackName,
  accountId
}: {
  region: string;
  stackName: string;
  accountId: string;
}) => shortHash(region + stackName + accountId);
