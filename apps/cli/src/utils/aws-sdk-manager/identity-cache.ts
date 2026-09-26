import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { localStatePaths } from 'src/config/local-state-paths';

/**
 * The caller identity STS returned for an access key, kept so that commands do not ask STS again on every run. An
 * access key ID belongs to one IAM user or one role session for its whole life, so its identity cannot go stale;
 * entries still expire after a day. They are keyed by a SHA-256 of the key ID and never hold the key ID, the secret or
 * the session token. The file belongs to one user and is replaced whole by a rename, so a reader never sees a partial
 * write and concurrent writers at worst drop each other's entry. Nothing here throws: a file that cannot be read or
 * does not parse is a miss, and a failed write is dropped.
 */

export type CachedAwsIdentity = { account: string; arn: string; userId: string };

type CacheEntry = CachedAwsIdentity & { fetchedAt: string };

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const entryKey = (accessKeyId: string) => createHash('sha256').update(accessKeyId).digest('hex');

/** Complete, fetched in the last day, and not in the future (a clock that moved back would keep it forever). */
const isValid = (entry: unknown, now: number): entry is CacheEntry => {
  if (typeof entry !== 'object' || entry === null) return false;
  const { account, arn, userId, fetchedAt } = entry as Record<string, unknown>;
  const age = now - Date.parse(String(fetchedAt));
  return (
    typeof account === 'string' &&
    /^\d{12}$/.test(account) &&
    typeof arn === 'string' &&
    arn.startsWith('arn:') &&
    typeof userId === 'string' &&
    userId.length > 0 &&
    age >= 0 &&
    age < MAX_AGE_MS
  );
};

const readEntries = async (): Promise<Record<string, unknown>> => {
  try {
    const parsed = JSON.parse(await readFile(localStatePaths.awsIdentityCacheFile(), 'utf8'));
    return parsed?.version === 1 && typeof parsed.entries === 'object' && parsed.entries !== null ? parsed.entries : {};
  } catch {
    return {};
  }
};

export const readCachedAwsIdentity = async (accessKeyId: string): Promise<CachedAwsIdentity | null> => {
  const entry = (await readEntries())[entryKey(accessKeyId)];
  return isValid(entry, Date.now()) ? { account: entry.account, arn: entry.arn, userId: entry.userId } : null;
};

/** Records a lookup that succeeded, and drops every entry that is no longer valid. */
export const cacheAwsIdentity = async (accessKeyId: string, identity: CachedAwsIdentity) => {
  let temporary: string | undefined;
  try {
    const path = localStatePaths.awsIdentityCacheFile();
    const now = Date.now();
    const entries: Record<string, CacheEntry> = {};
    for (const [key, entry] of Object.entries(await readEntries())) {
      if (isValid(entry, now)) entries[key] = entry;
    }
    entries[entryKey(accessKeyId)] = { ...identity, fetchedAt: new Date(now).toISOString() };
    temporary = `${path}.${process.pid}-${randomBytes(4).toString('hex')}.tmp`;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(temporary, JSON.stringify({ version: 1, entries }));
    await rename(temporary, path);
  } catch {
    if (temporary) await rm(temporary, { force: true }).catch(() => {});
  }
};
