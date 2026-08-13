/**
 * Which git host this project pushes to.
 *
 * Read from the repository's own remote rather than asked, because the answer is already written down
 * and asking a question with a knowable answer is the thing this product is trying not to do.
 *
 * Only the three hosts we generate pipelines for are recognised. Anything else — a self-hosted Gitea,
 * an internal Bitbucket Server, no remote at all — is reported as unknown, which the wizard turns into
 * "we don't generate one for this" rather than a wrong guess.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type GitHost = 'github' | 'gitlab' | 'bitbucket';

export type DetectedRepository = {
  host: GitHost;
  /** `owner/name`, when the remote URL carries it. Used only to write clearer instructions. */
  slug?: string;
};

const HOST_PATTERNS: ReadonlyArray<{ host: GitHost; pattern: RegExp }> = [
  { host: 'github', pattern: /github\.com/i },
  { host: 'gitlab', pattern: /gitlab\.com/i },
  { host: 'bitbucket', pattern: /bitbucket\.org/i }
];

/** `owner/name` out of either URL form git uses. */
const slugFrom = (url: string): string | undefined => {
  const match = /[:/]([^/:]+\/[^/]+?)(?:\.git)?\s*$/.exec(url.trim());
  return match?.[1];
};

/**
 * Read the origin remote out of `.git/config`.
 *
 * Parsed rather than shelled out to `git remote`, so this works in a directory that has a `.git` but no
 * git on the PATH — which is most containers, and every CI image that unpacks a tarball.
 */
export const detectRepository = async (repositoryRoot: string): Promise<DetectedRepository | undefined> => {
  let config: string;
  try {
    config = await readFile(join(repositoryRoot, '.git', 'config'), 'utf8');
  } catch {
    // No repository, or no permission to read it. Neither is an error worth stopping for.
    return undefined;
  }

  // `origin` first, then any other remote: a fork usually has `upstream` too, and the one you push to
  // is the one that runs your pipeline.
  const remotes = [...config.matchAll(/\[remote "([^"]+)"\][^[]*?url\s*=\s*(\S+)/g)].map(([, name, url]) => ({
    name: name!,
    url: url!
  }));
  const ordered = [...remotes.filter((remote) => remote.name === 'origin'), ...remotes];

  for (const remote of ordered) {
    const matched = HOST_PATTERNS.find(({ pattern }) => pattern.test(remote.url));
    if (matched === undefined) continue;
    const slug = slugFrom(remote.url);
    return { host: matched.host, ...(slug === undefined ? {} : { slug }) };
  }

  return undefined;
};
