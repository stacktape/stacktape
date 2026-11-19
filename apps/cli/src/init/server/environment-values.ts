/**
 * Values from the project's own `.env`, for the Deploy step's "Use the values from .env".
 *
 * The page offers to save these as secrets in the user's AWS account, so it needs the values themselves, not the masked
 * text the code window shows. That makes this the one read of secret material over HTTP, fenced in more tightly than
 * `file-view.ts`:
 *
 * - **One file.** `.env` at the repository root, the file deployment files load with `env_file: .env`. Its real path
 *   must be inside the repository: a symlink to somewhere else is not followed.
 * - **Only the variables the configuration reads as secrets.** The caller passes the names the configuration sets from
 *   a `$Secret(...)`; any other key in the file is never returned, whatever the page asks for.
 * - **Nothing kept or logged.** The values are parsed per request and returned; nothing here writes them anywhere.
 */

import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';

/** A `.env` larger than this is not read. */
const MAX_BYTES = 200 * 1024;

export const ENVIRONMENT_FILE = '.env';

export type EnvironmentValues = { file: string; values: Array<{ name: string; value: string }> } | { file: undefined };

/**
 * `.env` text as the variables it sets, the way dotenv reads it: `KEY=value`, `export KEY=value`, single, double or
 * back quotes around a value (double-quoted `\n` is a newline), and a `#` comment after an unquoted value. A later line
 * wins over an earlier one. Lines that are not assignments are skipped.
 */
export const parseEnvironmentText = (text: string): Map<string, string> => {
  const values = new Map<string, string>();
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/.exec(lines[index]!);
    if (match === null) continue;
    const name = match[1]!;
    let raw = match[2]!;
    const quote = raw[0];
    if (quote === '"' || quote === "'" || quote === '`') {
      // A quoted value may run over several lines, up to its closing quote.
      let body = raw.slice(1);
      let end = body.indexOf(quote);
      while (end === -1 && index + 1 < lines.length) {
        index += 1;
        body += `\n${lines[index]}`;
        end = body.indexOf(quote);
      }
      raw = end === -1 ? body : body.slice(0, end);
      values.set(name, quote === '"' ? raw.replace(/\\n/g, '\n').replace(/\\"/g, '"') : raw);
      continue;
    }
    values.set(name, raw.replace(/\s+#.*$/, '').trim());
  }
  return values;
};

const isInside = (root: string, candidate: string): boolean => {
  const fromRoot = relative(root, candidate);
  return fromRoot !== '' && !fromRoot.startsWith(`..${sep}`) && fromRoot !== '..' && !isAbsolute(fromRoot);
};

/**
 * The values `.env` sets for `names`, in the order asked, including empty ones (an empty value is worth saying: the
 * app runs locally without it). `{ file: undefined }` when there is no readable `.env`.
 */
export const readEnvironmentValues = async ({
  repositoryRoot,
  names
}: {
  repositoryRoot: string;
  names: ReadonlySet<string>;
}): Promise<EnvironmentValues> => {
  try {
    const root = await realpath(repositoryRoot);
    const resolved = await realpath(join(root, ENVIRONMENT_FILE));
    if (!isInside(root, resolved)) return { file: undefined };
    const info = await stat(resolved);
    if (!info.isFile() || info.size > MAX_BYTES) return { file: undefined };
    const parsed = parseEnvironmentText(await readFile(resolved, 'utf8'));
    return {
      file: ENVIRONMENT_FILE,
      values: [...names].flatMap((name) => (parsed.has(name) ? [{ name, value: parsed.get(name)! }] : []))
    };
  } catch {
    return { file: undefined };
  }
};
