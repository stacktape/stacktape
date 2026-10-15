import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { localStatePaths } from 'src/config/local-state-paths';

/**
 * Keeps the public images Stacktape's generated Dockerfiles start from in the local image store, pulled at most once a
 * day.
 *
 * BuildKit uses a base image from the local image store as it is, but asks the registry for one it holds only in its
 * build cache, on every build: about a second for `public.ecr.aws`. A plain Dockerfile build is usually spared that
 * because someone once pulled its base image. Pulling again after a day keeps base image updates coming much as they
 * did when every build asked the registry. A failed pull is not an error: the build then asks the registry itself, as
 * it always did.
 */

const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

type PullRecord = { version: 1; pulls: Record<string, string> };

const recordKey = ({ reference, platform }: { reference: string; platform: string | undefined }) =>
  `${platform ?? 'native'} ${reference}`;

const readPulls = async (): Promise<Record<string, string>> => {
  try {
    const parsed = JSON.parse(await readFile(localStatePaths.baseImagePullsFile(), 'utf8')) as PullRecord;
    return parsed?.version === 1 && typeof parsed.pulls === 'object' && parsed.pulls !== null ? parsed.pulls : {};
  } catch {
    return {};
  }
};

/** Whether the image was pulled for this platform within the last day, by the record. */
const wasPulledRecently = (pulls: Record<string, string>, key: string, now: number) => {
  const age = now - Date.parse(pulls[key] ?? '');
  return age >= 0 && age < REFRESH_AFTER_MS;
};

/** Records a pull that succeeded. Concurrent writers at worst drop each other's entry; a failed write is dropped. */
const recordPull = async (key: string, now: number) => {
  let temporary: string | undefined;
  try {
    const path = localStatePaths.baseImagePullsFile();
    const pulls: Record<string, string> = {};
    for (const [existingKey, pulledAt] of Object.entries(await readPulls())) {
      if (wasPulledRecently({ [existingKey]: pulledAt }, existingKey, now)) pulls[existingKey] = pulledAt;
    }
    pulls[key] = new Date(now).toISOString();
    temporary = `${path}.${process.pid}-${randomBytes(4).toString('hex')}.tmp`;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(temporary, JSON.stringify({ version: 1, pulls } satisfies PullRecord));
    await rename(temporary, path);
  } catch {
    if (temporary) await rm(temporary, { force: true }).catch(() => {});
  }
};

/**
 * Pulls `reference` for `platform` unless it was pulled in the last day. `pull` runs `docker pull`; it is a parameter
 * so the policy can be tested without Docker.
 */
export const keepBaseImagePulled = async ({
  reference,
  platform,
  pull,
  now = Date.now()
}: {
  reference: string;
  platform: string | undefined;
  pull: (args: { reference: string; platform: string | undefined }) => Promise<unknown>;
  now?: number;
}): Promise<'recent' | 'pulled' | 'failed'> => {
  const key = recordKey({ reference, platform });
  if (wasPulledRecently(await readPulls(), key, now)) return 'recent';
  try {
    await pull({ reference, platform });
  } catch {
    return 'failed';
  }
  await recordPull(key, now);
  return 'pulled';
};
