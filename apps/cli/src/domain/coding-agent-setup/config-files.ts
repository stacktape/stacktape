import { chmod, copyFile, mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { applyEdits, format, modify, parse, printParseErrorCode, type ParseError } from 'jsonc-parser';
import { isDeepStrictEqual } from 'node:util';

export type FileChange = 'created' | 'updated' | 'unchanged' | 'removed' | 'absent';

export type FileEditResult = { change: FileChange; backupPath?: string };

// Absent only when the file does not exist: a file that cannot be read (permissions) is an error, never "not set up".
const readIfExists = async (path: string): Promise<string | undefined> => {
  try {
    return await readFile(path, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
};

// Written next to the original and renamed over it, so an interrupted write never leaves a half-written config. A
// symlinked config (dotfiles) is updated at its target, and the file keeps its permissions: agent configs can hold
// other servers' tokens. New files are readable by their owner only.
const writeAtomically = async (path: string, content: string) => {
  const target = existsSync(path) ? await realpath(path) : path;
  const mode = existsSync(target) ? (await stat(target)).mode & 0o777 : 0o600;
  await mkdir(dirname(target), { recursive: true });
  const temporaryPath = `${target}.stacktape-${process.pid}.tmp`;
  await writeFile(temporaryPath, content, { encoding: 'utf-8', mode });
  await chmod(temporaryPath, mode);
  await rename(temporaryPath, target);
};

const backUp = async (path: string): Promise<string> => {
  const backupPath = `${path}.bak.${new Date().toISOString().replace(/[:.]/g, '-')}`;
  await copyFile(path, backupPath);
  return backupPath;
};

const detectIndentation = (text: string): { insertSpaces: boolean; tabSize: number } => {
  const indented = text.split(/\r?\n/).find((line) => /^[\t ]+\S/.test(line));
  if (indented?.startsWith('\t')) return { insertSpaces: false, tabSize: 1 };
  const spaces = indented?.match(/^ +/)?.[0].length;
  return { insertSpaces: true, tabSize: spaces && spaces <= 8 ? spaces : 2 };
};

const parseJsonc = (path: string, text: string): unknown => {
  const errors: ParseError[] = [];
  const value = parse(text, errors, { allowTrailingComma: true, disallowComments: false });
  if (errors.length > 0) {
    const first = errors[0];
    throw new Error(`${path} is not valid JSON (${printParseErrorCode(first.error)} at offset ${first.offset}).`);
  }
  return value;
};

const getAtPath = (value: unknown, keyPath: string[]): unknown =>
  keyPath.reduce<unknown>(
    (current, key) =>
      current && typeof current === 'object' && !Array.isArray(current)
        ? (current as Record<string, unknown>)[key]
        : undefined,
    value
  );

// `modify` with formatting options reformats the whole enclosing object. Insert the value unformatted, then format
// only the inserted text, so sibling entries keep the user's layout.
const setWithLocalFormatting = (text: string, keyPath: string[], value: unknown): string => {
  const formattingOptions = detectIndentation(text);
  const [edit, ...rest] = modify(text, keyPath, value, {});
  if (!edit || rest.length > 0) return applyEdits(text, modify(text, keyPath, value, { formattingOptions }));
  const edited = applyEdits(text, [edit]);
  return applyEdits(edited, format(edited, { offset: edit.offset, length: edit.content.length }, formattingOptions));
};

/**
 * Sets one entry in a JSON or JSONC config file with a minimal text edit, so the user's comments, ordering and
 * formatting survive. Leaves the file untouched when the entry already has this value; backs it up otherwise.
 */
export const upsertJsonEntry = async ({
  path,
  keyPath,
  value
}: {
  path: string;
  keyPath: string[];
  value: unknown;
}): Promise<FileEditResult> => {
  const current = await readIfExists(path);
  if (current === undefined || current.trim() === '') {
    const initial = applyEdits('{}', modify('{}', keyPath, value, { formattingOptions: detectIndentation('') }));
    await writeAtomically(path, `${initial}\n`);
    return { change: 'created' };
  }

  const parsed = parseJsonc(path, current);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${path} does not contain a JSON object.`);
  }
  if (isDeepStrictEqual(getAtPath(parsed, keyPath), value)) return { change: 'unchanged' };

  const backupPath = await backUp(path);
  await writeAtomically(path, setWithLocalFormatting(current, keyPath, value));
  return { change: 'updated', backupPath };
};

export const removeJsonEntry = async ({
  path,
  keyPath
}: {
  path: string;
  keyPath: string[];
}): Promise<FileEditResult> => {
  const current = await readIfExists(path);
  if (current === undefined || current.trim() === '') return { change: 'absent' };
  if (getAtPath(parseJsonc(path, current), keyPath) === undefined) return { change: 'absent' };

  // Without formatting options `modify` deletes only the entry; with them it would reformat the enclosing object.
  const edits = modify(current, keyPath, undefined, {});
  const backupPath = await backUp(path);
  await writeAtomically(path, applyEdits(current, edits));
  return { change: 'removed', backupPath };
};

/** The entry, or undefined when the file or entry is absent. Throws when the file cannot be parsed. */
export const readJsonEntry = async ({ path, keyPath }: { path: string; keyPath: string[] }): Promise<unknown> => {
  const current = await readIfExists(path);
  if (current === undefined || current.trim() === '') return undefined;
  return getAtPath(parseJsonc(path, current), keyPath);
};

type TomlServer = { command?: unknown; args?: unknown; env?: unknown };

const parseToml = (path: string, text: string): Record<string, unknown> => {
  try {
    return Bun.TOML.parse(text) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`${path} is not valid TOML (${error instanceof Error ? error.message : String(error)}).`);
  }
};

const readTomlServer = (parsed: Record<string, unknown>, name: string): TomlServer | undefined => {
  const servers = parsed.mcp_servers;
  if (!servers || typeof servers !== 'object') return undefined;
  return (servers as Record<string, TomlServer | undefined>)[name];
};

// Splits a TOML table key such as `mcp_servers."stacktape".env` into its parts.
const splitTomlKey = (key: string): string[] =>
  [...key.matchAll(/\s*(?:"((?:[^"\\]|\\.)*)"|'([^']*)'|([A-Za-z0-9_-]+))\s*(?:\.|$)/g)].map(
    (match) => match[1] ?? match[2] ?? match[3]
  );

const TABLE_HEADER = /^\s*\[(\[)?\s*(.+?)\s*\]\]?\s*(?:#.*)?$/;

// Lines that start inside a multi-line string (`"""` or `'''`) are content, not table headers.
const linesInsideMultilineStrings = (lines: string[]): Set<number> => {
  const inside = new Set<number>();
  let open: string | undefined;
  lines.forEach((line, index) => {
    if (open) inside.add(index);
    let rest = line;
    while (rest.length > 0) {
      if (open) {
        const close = rest.indexOf(open);
        if (close === -1) return;
        rest = rest.slice(close + 3);
        open = undefined;
        continue;
      }
      const start = rest.search(/"""|'''|#/);
      if (start === -1 || rest[start] === '#') return;
      open = rest.slice(start, start + 3);
      rest = rest.slice(start + 3);
    }
  });
  return inside;
};

/**
 * Line ranges of the `[mcp_servers.<name>]` table and every sub-table (`[mcp_servers.<name>.env]`), wherever they sit
 * in the file. Each table runs to the next table header. Located by line so the rest of the file, comments included,
 * is kept byte for byte.
 */
const findServerTables = (lines: string[], name: string): Array<{ start: number; end: number }> => {
  const inStrings = linesInsideMultilineStrings(lines);
  const headers = lines.flatMap((line, index) => {
    const match = inStrings.has(index) ? null : TABLE_HEADER.exec(line);
    return match ? [{ index, isArray: Boolean(match[1]), key: splitTomlKey(match[2]) }] : [];
  });
  return headers.flatMap((header, position) => {
    if (header.isArray || header.key[0] !== 'mcp_servers' || header.key[1] !== name) return [];
    let end = headers[position + 1]?.index ?? lines.length;
    while (end > header.index + 1 && lines[end - 1].trim() === '') end -= 1;
    return [{ start: header.index, end }];
  });
};

// Everything except the Stacktape server, to prove an edit touched nothing else.
const withoutServer = (parsed: Record<string, unknown>, name: string) => {
  const servers = parsed.mcp_servers;
  if (!servers || typeof servers !== 'object') return parsed;
  const { [name]: _server, ...otherServers } = servers as Record<string, unknown>;
  const { mcp_servers: _servers, ...rest } = parsed;
  return Object.keys(otherServers).length > 0 ? { ...rest, mcp_servers: otherServers } : rest;
};

const changesOnlyServer = (before: Record<string, unknown>, after: Record<string, unknown>, name: string) =>
  isDeepStrictEqual(withoutServer(before, name), withoutServer(after, name));

// Removes the ranges (and optionally puts `replacement` where the first one was), leaving one blank line at each seam
// and every other line untouched.
const replaceRanges = (lines: string[], ranges: Array<{ start: number; end: number }>, replacement?: string[]) => {
  let result = [...lines];
  const sorted = [...ranges].sort((left, right) => right.start - left.start);
  const pieces = [...sorted];
  if (replacement && ranges.length === 0) pieces.push({ start: lines.length, end: lines.length });
  for (const range of pieces) {
    const isFirst = range === pieces[pieces.length - 1];
    const before = result.slice(0, range.start);
    const after = result.slice(range.end);
    while (before.length > 0 && before[before.length - 1].trim() === '') before.pop();
    while (after.length > 0 && after[0].trim() === '') after.shift();
    const inserted = isFirst && replacement ? replacement : [];
    const middle =
      inserted.length > 0
        ? [...(before.length > 0 ? [''] : []), ...inserted, ...(after.length > 0 ? [''] : [])]
        : before.length > 0 && after.length > 0
          ? ['']
          : [];
    result = [...before, ...middle, ...after];
  }
  return result;
};

const finishToml = (lines: string[], newline: string) => {
  const text = lines.join(newline).replace(/\s+$/, '');
  return text ? `${text}${newline}` : '';
};

const cannotEditSafely = (path: string) =>
  new Error(
    `${path} defines the Stacktape server in a form Stacktape does not edit automatically (for example an inline table).`
  );

/** Codex's `~/.codex/config.toml`, for when the `codex` command is not available to do this itself. */
export const upsertCodexServer = async ({
  path,
  name,
  command,
  args,
  env
}: {
  path: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}): Promise<FileEditResult> => {
  const block = [
    `[mcp_servers.${name}]`,
    `command = ${JSON.stringify(command)}`,
    `args = ${JSON.stringify(args)}`,
    ...(Object.keys(env).length > 0
      ? ['', `[mcp_servers.${name}.env]`, ...Object.entries(env).map(([key, val]) => `${key} = ${JSON.stringify(val)}`)]
      : [])
  ];
  const current = await readIfExists(path);
  if (current === undefined || current.trim() === '') {
    await writeAtomically(path, `${block.join('\n')}\n`);
    return { change: 'created' };
  }

  const parsedCurrent = parseToml(path, current);
  const existing = readTomlServer(parsedCurrent, name);
  const desired = { command, args, ...(Object.keys(env).length > 0 ? { env } : {}) };
  if (isDeepStrictEqual(existing, desired)) return { change: 'unchanged' };

  const newline = current.includes('\r\n') ? '\r\n' : '\n';
  const lines = current.split(/\r?\n/);
  const tables = findServerTables(lines, name);
  if (existing !== undefined && tables.length === 0) throw cannotEditSafely(path);
  const next = finishToml(replaceRanges(lines, tables, block), newline);
  const parsedNext = parseToml(path, next);
  if (
    !isDeepStrictEqual(readTomlServer(parsedNext, name), desired) ||
    !changesOnlyServer(parsedCurrent, parsedNext, name)
  ) {
    throw cannotEditSafely(path);
  }

  const backupPath = await backUp(path);
  await writeAtomically(path, next);
  return { change: 'updated', backupPath };
};

export const removeCodexServer = async ({ path, name }: { path: string; name: string }): Promise<FileEditResult> => {
  const current = await readIfExists(path);
  if (current === undefined) return { change: 'absent' };
  const parsedCurrent = parseToml(path, current);
  if (readTomlServer(parsedCurrent, name) === undefined) return { change: 'absent' };
  const newline = current.includes('\r\n') ? '\r\n' : '\n';
  const lines = current.split(/\r?\n/);
  const tables = findServerTables(lines, name);
  const next = finishToml(replaceRanges(lines, tables), newline);
  const parsedNext = parseToml(path, next);
  if (
    tables.length === 0 ||
    readTomlServer(parsedNext, name) !== undefined ||
    !changesOnlyServer(parsedCurrent, parsedNext, name)
  ) {
    throw cannotEditSafely(path);
  }
  const backupPath = await backUp(path);
  await writeAtomically(path, next);
  return { change: 'removed', backupPath };
};

/** Whether the server is defined. Throws when the file cannot be parsed. */
export const codexServerConfigured = async ({ path, name }: { path: string; name: string }): Promise<boolean> => {
  const current = await readIfExists(path);
  return current !== undefined && readTomlServer(parseToml(path, current), name) !== undefined;
};
