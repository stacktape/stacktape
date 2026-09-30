import { createHash } from 'node:crypto';

export type UntrackedFile = { path: string; contents: Uint8Array };

/**
 * Identifies the product state a qualification result was produced with: the commit, every change to tracked files
 * and every untracked source file. A resumed run reuses a passing case only when this is unchanged.
 *
 * Every field is length-prefixed, so one state's bytes can never be read as another state's (a path ending where
 * another file's contents begin).
 */
export const fingerprintProductState = ({
  commit,
  trackedDiff,
  untrackedFiles
}: {
  commit: string;
  trackedDiff: string;
  untrackedFiles: UntrackedFile[];
}): string => {
  const hash = createHash('sha256');
  const field = (value: string | Uint8Array) => {
    const bytes = typeof value === 'string' ? Buffer.from(value) : value;
    hash.update(`${bytes.byteLength}:`);
    hash.update(bytes);
  };
  field(commit);
  field(trackedDiff);
  for (const file of untrackedFiles.toSorted((left, right) => (left.path < right.path ? -1 : 1))) {
    field(file.path);
    field(file.contents);
  }
  return hash.digest('hex');
};
