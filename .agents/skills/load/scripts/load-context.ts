#!/usr/bin/env bun
/**
 * Load context from Claude Code and Codex sessions into the current agent session.
 *
 * Runs with Bun (uses `bun:sqlite`), no other dependencies. Reads the local transcripts written by
 * Claude Code (`~/.claude/projects/<project>/<id>.jsonl`) and Codex (`~/.codex/sessions/** /rollout-*.jsonl`,
 * indexed by `~/.codex/state_5.sqlite`). Both formats are internal to their tools and may change; the
 * script fails with a clear message rather than guessing.
 *
 *   bun load-context.ts list [--tool claude|codex|all] [--project SUBSTR | --all-projects] [--limit N]
 *   bun load-context.ts extract SELECTOR... [--tactic TACTIC] [options]
 *
 * Selector: [tool:]<index | title substring | session id | transcript path>
 *   0 = newest session, -1 = the one before, ... A bare index counts across both tools;
 *   `claude:0` / `codex:-1` count within one tool. Titles match case-insensitively.
 */

import { Database } from 'bun:sqlite';
import { spawnSync } from 'node:child_process';
import {
  closeSync,
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve as resolvePath } from 'node:path';
import { createInterface } from 'node:readline';

type Tool = 'claude' | 'codex';
type Tactic = 'messages' | 'actions' | 'full' | 'summary' | 'search' | 'handoff';
const TACTICS: Tactic[] = ['messages', 'actions', 'full', 'summary', 'search', 'handoff'];

type Session = {
  tool: Tool;
  id: string;
  path: string;
  title: string;
  cwd: string;
  updated: Date;
  size: number;
  toolIndex: number;
  globalIndex: number;
};

type EventKind = 'user' | 'assistant' | 'tool_call' | 'tool_result' | 'summary' | 'boundary';
type Event = { kind: EventKind; text: string; name: string; detail: string; ts: string; turn: number };
type Transcript = { session: Session; events: Event[]; userTurns: number };
type Json = Record<string, unknown>;

type Options = {
  command: 'list' | 'extract';
  selectors: string[];
  tool: Tool | 'all';
  project?: string;
  allProjects: boolean;
  limit: number;
  tactic: Tactic;
  out?: string;
  stdout: boolean;
  lastTurns: number;
  maxResultChars: number;
  maxInputChars: number;
  query?: string;
  context: number;
  maxHits: number;
  prompt?: string;
  timeout: number;
};

const SESSION_FILE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Blocks the tools inject into user messages. They are noise for a reader of the transcript.
const INJECTED_TAGS = [
  'system-reminder',
  'app-context',
  'recommended_plugins',
  'environment_context',
  'permissions instructions',
  'permissions',
  'user_instructions',
  'skills_instructions',
  'turn_aborted',
  'collaboration_mode',
  'local-command-stdout',
  'local-command-caveat',
  'command-name',
  'command-message',
  'command-args',
  'ide_opened_file',
  'ide_selection',
  'in-app-browser-context',
  'multi_agent_role',
  'multi_agent_mode',
  'send_user_message_question_reply',
  'INSTRUCTIONS'
];
// Whole messages the tools inject as if the user wrote them.
const INJECTED_MESSAGE_PREFIXES = ['# AGENTS.md instructions for'];
const INJECTED_RE = new RegExp(
  `<(${INJECTED_TAGS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(\\s[^>]*)?>[\\s\\S]*?</\\1>`,
  'g'
);
const WHOLE_TAG_RE = /^\s*<([a-zA-Z_-]+)(\s[^>]*)?>[\s\S]*<\/\1>\s*$/;

const DEFAULT_HANDOFF_PROMPT =
  'Write a handoff for a new agent session that has none of this conversation in its context. ' +
  "Be concrete and complete. Sections: 1) Goal and the user's requests, quoting the user's exact " +
  'wording where the wording matters. 2) Decisions made and why. 3) Approaches tried and rejected, ' +
  'with the reason. 4) Current state: files changed, commands that were run, what is verified and ' +
  'what is not. 5) Open questions and next steps. 6) Facts a new session would otherwise have to ' +
  'rediscover: paths, identifiers, error messages, measurements. Plain text, no preamble.';

// ----------------------------------------------------------------------------- small helpers

const fail = (message: string): never => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const str = (value: unknown): string => (typeof value === 'string' ? value : '');

const safeJson = (raw: string): Json => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const firstLine = (text: string, width = 80): string => {
  const line = text.trim().split('\n')[0] ?? '';
  return line.length <= width ? line : `${line.slice(0, width - 1)}…`;
};

const normalizePath = (p: string): string =>
  p
    .replace(/^\\\\\?\\/, '')
    .replaceAll('\\', '/')
    .replace(/\/+$/, '')
    .toLowerCase();

const parseTs = (value: unknown): Date | undefined => {
  if (typeof value === 'number') return new Date(value > 1e11 ? value : value * 1000);
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
};

const fmtDate = (d: Date): string => d.toISOString().slice(0, 16).replace('T', ' ');

const messageText = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const block of content) {
    if (!isRecord(block)) continue;
    const type = block.type;
    if (type === 'text' || type === 'input_text' || type === 'output_text') parts.push(str(block.text));
    else if (type === 'image') parts.push('[image]');
  }
  return parts.join('\n');
};

const cleanText = (text: string): string => {
  if (!text) return '';
  const stripped = text.replace(INJECTED_RE, '').trim();
  if (INJECTED_MESSAGE_PREFIXES.some((p) => stripped.startsWith(p))) return '';
  return WHOLE_TAG_RE.test(stripped) ? '' : stripped;
};

const truncate = (text: string, limit: number): string => {
  if (limit <= 0 || text.length <= limit) return text;
  const head = Math.floor((limit * 2) / 3);
  const tail = limit - head;
  return `${text.slice(0, head)}\n… [${text.length - limit} chars omitted] …\n${text.slice(-tail)}`;
};

const patchFiles = (patch: string): string => {
  const files = [...patch.matchAll(/^\*\*\* (?:Update|Add|Delete) File: (.+)$/gm)].map((m) => m[1]);
  return files.length > 0 ? files.join(', ') : 'apply_patch';
};

/** One line that says what a tool call touched, for the `actions` tactic. */
const summarizeToolInput = (input: unknown): string => {
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch {
      return firstLine(input, 200);
    }
  }
  if (!isRecord(value)) return firstLine(String(value), 200);
  for (const key of ['file_path', 'path', 'notebook_path']) {
    if (typeof value[key] === 'string') {
      const extra = typeof value.pattern === 'string' ? ` pattern=${JSON.stringify(value.pattern)}` : '';
      return `${value[key]}${extra}`;
    }
  }
  for (const key of ['command', 'cmd']) {
    const cmd = value[key];
    if (typeof cmd === 'string') return firstLine(cmd, 240);
    if (Array.isArray(cmd)) return firstLine(cmd.map(String).join(' '), 240);
  }
  if (typeof value.pattern === 'string') {
    return `pattern=${JSON.stringify(value.pattern)}${typeof value.glob === 'string' ? ` glob=${JSON.stringify(value.glob)}` : ''}`;
  }
  if (typeof value.url === 'string') return value.url;
  if (typeof value.description === 'string') return firstLine(value.description, 200);
  if (typeof value.input === 'string' && value.input.includes('*** Begin Patch')) return patchFiles(value.input);
  return firstLine(JSON.stringify(value), 200);
};

/** Raw lines containing `needle`, found by scanning the file in chunks instead of parsing every line. */
const findLines = (path: string, needle: string, limit: number): string[] => {
  const found: string[] = [];
  const needleBuf = Buffer.from(needle);
  const chunkSize = 8 * 1024 * 1024;
  const fd = openSync(path, 'r');
  try {
    let carry = Buffer.alloc(0);
    const chunk = Buffer.alloc(chunkSize);
    for (;;) {
      const read = readSync(fd, chunk, 0, chunkSize, null);
      if (read === 0) break;
      const buf = Buffer.concat([carry, chunk.subarray(0, read)]);
      const lastNewline = buf.lastIndexOf(10);
      const complete = lastNewline >= 0 ? buf.subarray(0, lastNewline + 1) : Buffer.alloc(0);
      carry = lastNewline >= 0 ? Buffer.from(buf.subarray(lastNewline + 1)) : Buffer.from(buf);
      let pos = 0;
      while (found.length < limit) {
        const i = complete.indexOf(needleBuf, pos);
        if (i < 0) break;
        const start = complete.lastIndexOf(10, i) + 1;
        const end = complete.indexOf(10, i);
        found.push(complete.subarray(start, end < 0 ? complete.length : end).toString('utf8'));
        pos = end < 0 ? complete.length : end + 1;
      }
      if (found.length >= limit) break;
    }
    if (found.length < limit && carry.length > 0 && carry.indexOf(needleBuf) >= 0) found.push(carry.toString('utf8'));
  } finally {
    closeSync(fd);
  }
  return found;
};

const listDir = (path: string): string[] => {
  try {
    return readdirSync(path).toSorted();
  } catch {
    return [];
  }
};

const isDir = (path: string): boolean => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

const isFile = (path: string): boolean => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

// ----------------------------------------------------------------------------- roots

const wslDistros = (): string[] => {
  const proc = spawnSync('wsl', ['-l', '-q'], { timeout: 10_000 });
  if (proc.error || !proc.stdout) return [];
  const out = proc.stdout;
  const text = out.includes(0) ? out.toString('utf16le') : out.toString('utf8');
  return text
    .split(/\r?\n/)
    .map((l) => l.replaceAll('\0', '').trim())
    .filter((l) => l && !/^(docker|podman|rancher)-/.test(l));
};

/** (tool, root) pairs for every local and cross-boundary home we can see. */
const discoverRoots = (): { tool: Tool; root: string }[] => {
  const homes = [homedir()];
  if (process.platform === 'win32') {
    for (const distro of wslDistros()) {
      const base = `\\\\wsl.localhost\\${distro}\\home`;
      for (const user of listDir(base)) homes.push(join(base, user));
    }
  } else {
    for (const mount of ['/mnt/c/Users', '/mnt/d/Users']) {
      if (isDir(mount)) for (const user of listDir(mount)) homes.push(join(mount, user));
    }
  }
  const extra = process.env.LOAD_CONTEXT_HOMES ?? '';
  homes.push(...extra.split(process.platform === 'win32' ? ';' : ':').filter(Boolean));

  const roots: { tool: Tool; root: string }[] = [];
  const seen = new Set<string>();
  for (const home of homes) {
    for (const [tool, sub] of [
      ['claude', '.claude/projects'],
      ['codex', '.codex']
    ] as const) {
      const root = join(home, sub);
      const key = `${tool}:${root.toLowerCase()}`;
      if (seen.has(key) || !isDir(root)) continue;
      seen.add(key);
      roots.push({ tool, root });
    }
  }
  return roots;
};

// ----------------------------------------------------------------------------- indexing

const indexClaude = (root: string): Session[] => {
  const sessions: Session[] = [];
  for (const project of listDir(root)) {
    const projectDir = join(root, project);
    if (!isDir(projectDir)) continue;
    for (const name of listDir(projectDir)) {
      if (!SESSION_FILE_RE.test(name)) continue;
      const path = join(projectDir, name);
      let stat;
      try {
        stat = statSync(path);
      } catch {
        continue;
      }
      if (stat.size === 0) continue;
      let title = '';
      for (const raw of findLines(path, '"type":"custom-title"', 20)) title = str(safeJson(raw).customTitle) || title;
      if (!title)
        for (const raw of findLines(path, '"type":"ai-title"', 5)) title = str(safeJson(raw).aiTitle) || title;
      let cwd = '';
      let firstPrompt = '';
      for (const raw of findLines(path, '"type":"user"', 6)) {
        const rec = safeJson(raw);
        cwd ||= str(rec.cwd);
        if (!firstPrompt && !rec.isMeta && !rec.isCompactSummary && isRecord(rec.message)) {
          firstPrompt = cleanText(messageText(rec.message.content));
        }
        if (cwd && firstPrompt) break;
      }
      if (!cwd && !firstPrompt) continue; // metadata-only file
      sessions.push({
        tool: 'claude',
        id: name.slice(0, -'.jsonl'.length),
        path,
        title: title || firstLine(firstPrompt),
        cwd,
        updated: stat.mtime,
        size: stat.size,
        toolIndex: -1,
        globalIndex: -1
      });
    }
  }
  return sessions;
};

/** Map a rollout path recorded on one OS onto the root we are reading from. */
const translateCodexPath = (raw: string, root: string): string | undefined => {
  const cleaned = raw.replace(/^\\\\\?\\/, '');
  if (isFile(cleaned)) return cleaned;
  const normalized = cleaned.replaceAll('\\', '/');
  const marker = '.codex';
  const at = normalized.indexOf(marker);
  if (at < 0) return undefined;
  const candidate = join(root, normalized.slice(at + marker.length).replace(/^\/+/, ''));
  return isFile(candidate) ? candidate : undefined;
};

const indexCodex = (root: string): Session[] => {
  const sessions: Session[] = [];
  const names = new Map<string, string>();
  const indexFile = join(root, 'session_index.jsonl');
  if (isFile(indexFile)) {
    for (const line of readFileSync(indexFile, 'utf8').split('\n')) {
      const rec = safeJson(line);
      if (typeof rec.id === 'string' && typeof rec.thread_name === 'string') names.set(rec.id, rec.thread_name);
    }
  }
  const db = join(root, 'state_5.sqlite');
  if (!isFile(db)) return sessions;
  // Copy the database first: the app holds it open in WAL mode, and a live read over a network
  // or 9p mount can fail or block.
  const tmp = mkdtempSync(join(tmpdir(), 'load-context-db-'));
  type Row = { id: string; rollout_path: string; cwd: string; title: string; updated_at: number };
  let rows: Row[] = [];
  try {
    for (const suffix of ['', '-wal', '-shm']) {
      if (isFile(db + suffix)) copyFileSync(db + suffix, join(tmp, basename(db) + suffix));
    }
    const con = new Database(join(tmp, basename(db)), { readonly: true });
    try {
      rows = con
        .query<Row, []>('select id, rollout_path, cwd, title, updated_at from threads order by updated_at desc')
        .all();
    } finally {
      con.close();
    }
  } catch (error) {
    process.stderr.write(`warning: cannot read ${db}: ${String(error)}\n`);
    return sessions;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  for (const row of rows) {
    const path = translateCodexPath(row.rollout_path, root);
    if (!path) continue;
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    sessions.push({
      tool: 'codex',
      id: row.id,
      path,
      title: names.get(row.id) ?? firstLine(cleanText(row.title ?? '')),
      cwd: normalizePath(row.cwd ?? ''),
      updated: parseTs(row.updated_at) ?? stat.mtime,
      size: stat.size,
      toolIndex: -1,
      globalIndex: -1
    });
  }
  return sessions;
};

const currentSessionIds = (): Set<string> => {
  const ids = new Set<string>();
  for (const key of ['CLAUDE_CODE_SESSION_ID', 'CLAUDE_SESSION_ID', 'CODEX_THREAD_ID', 'CODEX_SESSION_ID']) {
    const value = process.env[key];
    if (value) ids.add(value);
  }
  return ids;
};

const buildIndex = (opts: Options): Session[] => {
  const tools: Tool[] = opts.tool === 'all' ? ['claude', 'codex'] : [opts.tool];
  let sessions: Session[] = [];
  for (const { tool, root } of discoverRoots()) {
    if (!tools.includes(tool)) continue;
    sessions.push(...(tool === 'claude' ? indexClaude(root) : indexCodex(root)));
  }
  const project = opts.allProjects ? undefined : (opts.project ?? basename(process.cwd()));
  if (project) {
    const needle = project.toLowerCase();
    sessions = sessions.filter((s) => normalizePath(s.cwd).includes(needle));
  }
  const exclude = currentSessionIds();
  sessions = sessions.filter((s) => !exclude.has(s.id));
  sessions.sort((a, b) => b.updated.getTime() - a.updated.getTime());
  const counters: Record<Tool, number> = { claude: 0, codex: 0 };
  sessions.forEach((s, i) => {
    s.globalIndex = i;
    s.toolIndex = counters[s.tool];
    counters[s.tool] += 1;
  });
  return sessions;
};

const label = (s: Session): string => `${s.tool}:${s.toolIndex}`;

const resolveSelector = (selector: string, sessions: Session[]): Session => {
  let tool: Tool | undefined;
  let rest = selector;
  const prefix = selector.split(':', 1)[0];
  if ((prefix === 'claude' || prefix === 'codex') && selector.includes(':')) {
    tool = prefix;
    rest = selector.slice(prefix.length + 1);
  }
  rest = rest.trim();
  const pool = sessions.filter((s) => !tool || s.tool === tool);
  if (/^-?\d+$/.test(rest)) {
    const idx = Math.abs(Number(rest));
    if (idx >= pool.length)
      return fail(`selector ${JSON.stringify(selector)}: only ${pool.length} sessions match the current filters`);
    return pool[idx] ?? fail(`selector ${JSON.stringify(selector)}: no session at that index`);
  }
  if (rest.endsWith('.jsonl') && isFile(rest)) {
    const path = resolvePath(rest);
    const stat = statSync(path);
    const id = basename(path, '.jsonl');
    return {
      tool: tool ?? (id.startsWith('rollout-') ? 'codex' : 'claude'),
      id,
      path,
      title: id,
      cwd: '',
      updated: stat.mtime,
      size: stat.size,
      toolIndex: -1,
      globalIndex: -1
    };
  }
  if (UUID_RE.test(rest)) {
    const byId = pool.find((s) => s.id.toLowerCase() === rest.toLowerCase());
    if (byId) return byId;
  }
  const needle = rest.toLowerCase();
  const matches = pool.filter((s) => s.title.toLowerCase().includes(needle));
  if (matches.length === 1 && matches[0]) return matches[0];
  if (matches.length === 0)
    return fail(`selector ${JSON.stringify(selector)}: no session title contains it (run \`list\` to see titles)`);
  const lines = matches
    .slice(0, 15)
    .map((s) => `  ${label(s).padEnd(10)} ${fmtDate(s.updated)}  ${s.title}`)
    .join('\n');
  return fail(
    `selector ${JSON.stringify(selector)} is ambiguous, ${matches.length} matches:\n${lines}\nUse the index instead.`
  );
};

// ----------------------------------------------------------------------------- parsing

const readLines = async (path: string, onLine: (line: string) => void): Promise<void> => {
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) onLine(line);
};

const parseClaude = async (session: Session): Promise<Transcript> => {
  const tr: Transcript = { session, events: [], userTurns: 0 };
  let turn = 0;
  const push = (kind: EventKind, text: string, ts: string, name = '', detail = ''): void => {
    tr.events.push({ kind, text, name, detail, ts, turn });
  };
  await readLines(session.path, (line) => {
    const rec = safeJson(line);
    const type = rec.type;
    if ((type !== 'user' && type !== 'assistant' && type !== 'system') || rec.isSidechain) return;
    const ts = str(rec.timestamp);
    if (type === 'system') {
      if (rec.subtype === 'compact_boundary') push('boundary', 'Conversation compacted here', ts);
      return;
    }
    const message = isRecord(rec.message) ? rec.message : {};
    const content = message.content;
    if (type === 'user') {
      if (rec.isCompactSummary) {
        push('summary', cleanText(messageText(content)), ts);
        return;
      }
      if (Array.isArray(content)) {
        for (const block of content) {
          if (isRecord(block) && block.type === 'tool_result') push('tool_result', messageText(block.content), ts);
        }
      }
      if (rec.isMeta) return;
      const text = cleanText(messageText(content));
      if (text) {
        turn += 1;
        tr.userTurns = turn;
        push('user', text, ts);
      }
      return;
    }
    if (Array.isArray(content)) {
      for (const block of content) {
        if (!isRecord(block)) continue;
        if (block.type === 'text' && str(block.text).trim()) push('assistant', str(block.text).trim(), ts);
        else if (block.type === 'tool_use') {
          const name = str(block.name) || 'tool';
          push('tool_call', JSON.stringify(block.input ?? {}), ts, name, summarizeToolInput(block.input));
        }
      }
    } else if (typeof content === 'string' && content.trim()) push('assistant', content.trim(), ts);
  });
  return tr;
};

const parseCodex = async (session: Session): Promise<Transcript> => {
  const tr: Transcript = { session, events: [], userTurns: 0 };
  let turn = 0;
  const push = (kind: EventKind, text: string, ts: string, name = '', detail = ''): void => {
    tr.events.push({ kind, text, name, detail, ts, turn });
  };
  await readLines(session.path, (line) => {
    const rec = safeJson(line);
    const payload = isRecord(rec.payload) ? rec.payload : {};
    const ts = str(rec.timestamp);
    if (rec.type === 'compacted') {
      // Codex stores the summary itself encrypted (`encrypted_content`); only the plain messages it
      // kept next to the summary are readable here.
      const parts = [cleanText(str(payload.message))];
      const history = Array.isArray(payload.replacement_history) ? payload.replacement_history : [];
      let encrypted = false;
      for (const item of history) {
        if (!isRecord(item)) continue;
        if (item.type === 'compaction') encrypted = typeof item.encrypted_content === 'string';
        if (item.type !== 'message' || item.role === 'developer') continue;
        const text = cleanText(messageText(item.content));
        if (text) parts.push(`[${str(item.role) || '?'}] ${text}`);
      }
      if (encrypted)
        parts.unshift(
          '(The summary text is stored encrypted by Codex and is not readable locally. Below are the plain messages Codex kept after compacting.)'
        );
      push('boundary', 'Conversation compacted here', ts);
      push('summary', parts.filter(Boolean).join('\n\n'), ts);
      return;
    }
    if (rec.type !== 'response_item') return;
    const ptype = payload.type;
    if (ptype === 'message') {
      const text = cleanText(messageText(payload.content));
      if (!text) return;
      if (payload.role === 'user') {
        turn += 1;
        tr.userTurns = turn;
        push('user', text, ts);
      } else if (payload.role === 'assistant') push('assistant', text, ts);
    } else if (ptype === 'function_call' || ptype === 'custom_tool_call') {
      const name = str(payload.name) || 'tool';
      const input = ptype === 'function_call' ? payload.arguments : payload.input;
      push(
        'tool_call',
        typeof input === 'string' ? input : JSON.stringify(input ?? {}),
        ts,
        name,
        summarizeToolInput(input)
      );
    } else if (ptype === 'function_call_output' || ptype === 'custom_tool_call_output') {
      let output: unknown = payload.output;
      if (isRecord(output)) output = output.output ?? JSON.stringify(output);
      else if (Array.isArray(output)) output = messageText(output);
      let text = output === undefined || output === null ? '' : String(output);
      // Codex wraps shell output in a JSON envelope with metadata; unwrap it when present.
      if (text.startsWith('{') && text.slice(0, 200).includes('"output"')) {
        const inner = safeJson(text);
        if (inner.output !== undefined && inner.output !== null) text = String(inner.output);
      }
      push('tool_result', text, ts);
    }
  });
  return tr;
};

const parseTranscript = (session: Session): Promise<Transcript> =>
  session.tool === 'claude' ? parseClaude(session) : parseCodex(session);

// ----------------------------------------------------------------------------- rendering

const header = (tr: Transcript, tactic: Tactic, extra: string[] = []): string[] => {
  const s = tr.session;
  return [
    `# ${s.tool} session: ${s.title}`,
    `- id: ${s.id}`,
    `- transcript: ${s.path}`,
    `- cwd: ${s.cwd}`,
    `- last activity: ${fmtDate(s.updated)} UTC`,
    `- user turns: ${tr.userTurns}`,
    `- tactic: ${tactic}`,
    ...extra,
    ''
  ];
};

const render = (tr: Transcript, tactic: Tactic, opts: Options): string => {
  let events = tr.events;
  const extra: string[] = [];
  if (opts.lastTurns > 0 && tr.userTurns > opts.lastTurns) {
    const firstTurn = tr.userTurns - opts.lastTurns + 1;
    events = events.filter((e) => e.turn >= firstTurn || e.kind === 'summary');
    extra.push(`- showing the last ${opts.lastTurns} user turns`);
  }
  const head = header(tr, tactic, extra);

  if (tactic === 'summary') {
    const summaries = events.filter((e) => e.kind === 'summary');
    if (summaries.length === 0) {
      return `${head.join('\n')}No compaction summary exists in this session. Use --tactic messages or --tactic handoff.\n`;
    }
    const body = summaries.map(
      (e, i) => `## Compaction summary ${i + 1} of ${summaries.length} (${e.ts.slice(0, 16)})\n\n${e.text}\n`
    );
    return [...head, ...body].join('\n');
  }

  const out: string[] = [];
  const pendingCalls: Event[] = [];
  const flushCalls = (): void => {
    if (pendingCalls.length === 0) return;
    out.push('', ...pendingCalls.map((e) => `- \`${e.name}\` ${e.detail}`), '');
    pendingCalls.length = 0;
  };
  for (const e of events) {
    switch (e.kind) {
      case 'user':
        flushCalls();
        out.push(`\n## [${e.turn}] User (${e.ts.slice(0, 16)})\n\n${e.text}\n`);
        break;
      case 'assistant':
        flushCalls();
        out.push(`\n### Assistant\n\n${e.text}\n`);
        break;
      case 'summary':
        flushCalls();
        out.push(`\n## Compaction summary (${e.ts.slice(0, 16)})\n\n${e.text}\n`);
        break;
      case 'boundary':
        flushCalls();
        out.push(`\n---\n*${e.text}*\n`);
        break;
      case 'tool_call':
        if (tactic === 'full') {
          flushCalls();
          out.push(`\n**Tool call** \`${e.name}\` ${e.detail}`);
          if (opts.maxInputChars > 0) out.push(`\`\`\`\n${truncate(e.text, opts.maxInputChars)}\n\`\`\``);
        } else if (tactic === 'actions') pendingCalls.push(e);
        break;
      case 'tool_result':
        if (tactic === 'full') {
          flushCalls();
          out.push(`**Result**\n\`\`\`\n${truncate(e.text.trim(), opts.maxResultChars)}\n\`\`\``);
        }
        break;
      default:
        break;
    }
  }
  flushCalls();
  return [...head, ...out].join('\n');
};

const isRegex = (q: string): boolean => /[.*+?[\]{}()|^$\\]/.test(q) && !q.endsWith('\\');

const renderSearch = (tr: Transcript, opts: Options): string => {
  const query = opts.query ?? '';
  const rx = new RegExp(isRegex(query) ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const hits: string[] = [];
  const maxHitsPerEvent = 2;
  for (const e of tr.events) {
    if (hits.length >= opts.maxHits) break;
    let inEvent = 0;
    for (const m of e.text.matchAll(rx)) {
      const a = Math.max(0, m.index - opts.context);
      const b = Math.min(e.text.length, m.index + m[0].length + opts.context);
      const snippet = e.text.slice(a, b).replaceAll('\n', ' ');
      const kind = e.kind === 'tool_call' ? `tool_call ${e.name} ${e.detail}` : e.kind;
      hits.push(`- turn ${e.turn} · ${kind} · ${e.ts.slice(0, 16)}\n  …${snippet}…`);
      inEvent += 1;
      if (hits.length >= opts.maxHits || inEvent >= maxHitsPerEvent) break;
    }
  }
  const s = tr.session;
  const capped = hits.length >= opts.maxHits ? ' (capped)' : '';
  return `# ${s.tool} session: ${s.title}\n- id: ${s.id}\n- query: ${JSON.stringify(query)}\n- hits: ${hits.length}${capped}\n\n${hits.join('\n')}\n`;
};

// ----------------------------------------------------------------------------- handoff

const runHandoff = (session: Session, prompt: string, timeoutSec: number): string => {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && !k.startsWith('CLAUDE') && !k.startsWith('CODEX')) env[k] = v;
  }
  const cwd = session.cwd && isDir(session.cwd) ? session.cwd : process.cwd();
  // The prompt travels over stdin so that no shell quoting can mangle it.
  const common = {
    env,
    cwd,
    input: prompt,
    timeout: timeoutSec * 1000,
    encoding: 'utf8' as const,
    maxBuffer: 64 * 1024 * 1024
  };
  if (session.tool === 'claude') {
    const exe = Bun.which('claude') ?? 'claude';
    const args = [
      '-p',
      '--resume',
      session.id,
      '--output-format',
      'json',
      '--disallowedTools',
      'Bash,PowerShell,Edit,Write,MultiEdit,NotebookEdit,Agent,WebFetch,WebSearch,Read,Glob,Grep',
      '--append-system-prompt',
      'Do not call tools. Answer only from the conversation already in your context.'
    ];
    const proc = spawnSync(exe, args, common);
    if (proc.error) return fail(`handoff: cannot run claude: ${proc.error.message}`);
    if (proc.status !== 0)
      return fail(`handoff failed (${proc.status}):\n${proc.stderr.slice(-2000)}\n${proc.stdout.slice(-2000)}`);
    const lastLine = proc.stdout.trim().split('\n').at(-1) ?? '{}';
    const data = safeJson(lastLine);
    const usage = data.usage === undefined ? '' : `\n\n---\nhandoff usage: ${JSON.stringify(data.usage)}`;
    const cost = typeof data.total_cost_usd === 'number' ? `, cost_usd=${data.total_cost_usd}` : '';
    return `${str(data.result) || proc.stdout}${usage}${cost}`;
  }
  const outPath = join(mkdtempSync(join(tmpdir(), 'load-context-handoff-')), 'last-message.txt');
  const exe = Bun.which('codex') ?? 'codex';
  // `-` reads the prompt from stdin; the sandbox is set through config because `exec resume` has no `-s`.
  const args = [
    'exec',
    'resume',
    session.id,
    '--skip-git-repo-check',
    '-c',
    'sandbox_mode="read-only"',
    '-o',
    outPath,
    '-'
  ];
  const proc = spawnSync(exe, args, common);
  if (proc.error) return fail(`handoff: cannot run codex: ${proc.error.message}`);
  const text = existsSync(outPath) ? readFileSync(outPath, 'utf8').trim() : '';
  rmSync(dirname(outPath), { recursive: true, force: true });
  if (proc.status !== 0 && !text) {
    const hint = proc.stderr.includes('list_turns is not supported')
      ? '\nCodex cannot resume this thread (known Codex issue #37754, seen on older threads). Use --tactic messages, actions or full instead.'
      : '';
    return fail(`handoff failed (${proc.status}):\n${proc.stderr.slice(-2000)}\n${proc.stdout.slice(-2000)}${hint}`);
  }
  return text || proc.stdout.trim();
};

// ----------------------------------------------------------------------------- commands

const cmdList = (opts: Options): number => {
  const sessions = buildIndex(opts);
  if (sessions.length === 0) {
    process.stdout.write(
      'No sessions found. Try --all-projects, or set LOAD_CONTEXT_HOMES to extra home directories.\n'
    );
    return 1;
  }
  const lines = [
    `${'all'.padStart(4)}  ${'tool:idx'.padEnd(10)} ${'last activity'.padEnd(17)} ${'~tokens'.padStart(8)}  title  [cwd]`
  ];
  for (const s of sessions.slice(0, opts.limit)) {
    const tokens = Math.floor(s.size / 4);
    const tok = tokens >= 1000 ? `${Math.floor(tokens / 1000)}k` : String(tokens);
    lines.push(
      `${String(s.globalIndex).padStart(4)}  ${label(s).padEnd(10)} ${fmtDate(s.updated)}  ${tok.padStart(8)}  ${s.title}  [${s.cwd}]`
    );
  }
  if (sessions.length > opts.limit) lines.push(`… ${sessions.length - opts.limit} more (raise --limit)`);
  lines.push('', '~tokens is transcript size / 4 and overstates what a tactic loads; `extract` prints the real size.');
  process.stdout.write(`${lines.join('\n')}\n`);
  return 0;
};

const defaultOutPath = (sessions: Session[], tactic: Tactic): string => {
  const base = process.env.LOAD_CONTEXT_OUT_DIR ?? join(tmpdir(), 'load-context');
  const slug = sessions
    .slice(0, 3)
    .map(
      (s) =>
        s.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40) || s.id.slice(0, 8)
    )
    .join('+');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return join(base, `${slug}-${tactic}-${stamp}.md`);
};

const cmdExtract = async (opts: Options): Promise<number> => {
  if (opts.tactic === 'search' && !opts.query) return fail('--tactic search needs --query');
  const sessions = buildIndex(opts);
  const chosen = opts.selectors.map((sel) => resolveSelector(sel, sessions));
  const extractOne = async (s: Session): Promise<string> => {
    if (opts.tactic === 'handoff') {
      process.stderr.write(
        `handoff: asking ${s.tool} session ${s.id} (${s.title}); this reprocesses the whole session once\n`
      );
      const text = runHandoff(s, opts.prompt ?? DEFAULT_HANDOFF_PROMPT, opts.timeout);
      return `# ${s.tool} session: ${s.title}\n- id: ${s.id}\n- tactic: handoff\n\n${text}\n`;
    }
    const tr = await parseTranscript(s);
    return opts.tactic === 'search' ? renderSearch(tr, opts) : render(tr, opts.tactic, opts);
  };
  const sections = await Promise.all(chosen.map(extractOne));
  const body = sections.join('\n\n');
  if (opts.stdout) {
    process.stdout.write(body);
    return 0;
  }
  const out = opts.out ?? defaultOutPath(chosen, opts.tactic);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, body, 'utf8');
  const report = [
    `wrote ${out}`,
    `size: ${body.length.toLocaleString('en-US')} chars, about ${Math.floor(body.length / 4).toLocaleString('en-US')} tokens`
  ];
  for (const s of chosen) report.push(`- ${label(s)}  ${s.title}  (${s.tool} ${s.id})`);
  process.stdout.write(`${report.join('\n')}\n`);
  return 0;
};

// ----------------------------------------------------------------------------- CLI

const USAGE = `usage:
  bun load-context.ts list [--tool claude|codex|all] [--project SUBSTR | --all-projects] [--limit N]
  bun load-context.ts extract SELECTOR... [--tactic ${TACTICS.join('|')}] [options]

selector: [claude:|codex:]<index | title substring | session id | transcript path>
  0 = newest, -1 = the one before, ... (bare index counts across both tools)

extract options:
  --out FILE             write here (default: <tmp>/load-context/<slug>.md)
  --stdout               print instead of writing a file
  --last-turns N         keep only the last N user turns
  --max-result-chars N   full: truncate each tool result (default 1500)
  --max-input-chars N    full: truncate each tool input, 0 hides inputs (default 600)
  --query TEXT           search: substring or regex, case-insensitive
  --context N            search: chars of context around each hit (default 300)
  --max-hits N           search: cap hits per session (default 60)
  --prompt TEXT          handoff: custom prompt for the old session
  --timeout SEC          handoff: seconds to wait (default 1800)
`;

const parseArgs = (argv: string[]): Options => {
  const opts: Options = {
    command: 'list',
    selectors: [],
    tool: 'all',
    allProjects: false,
    limit: 30,
    tactic: 'messages',
    stdout: false,
    lastTurns: 0,
    maxResultChars: 1500,
    maxInputChars: 600,
    context: 300,
    maxHits: 60,
    timeout: 1800
  };
  const [command, ...rest] = argv;
  if (command !== 'list' && command !== 'extract') return fail(USAGE);
  opts.command = command;
  const takeValue = (i: number, flag: string): string => {
    const value = rest[i + 1];
    if (value === undefined) return fail(`${flag} needs a value`);
    return value;
  };
  const takeInt = (i: number, flag: string): number => {
    const n = Number(takeValue(i, flag));
    if (!Number.isInteger(n)) return fail(`${flag} needs an integer`);
    return n;
  };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i] ?? '';
    switch (arg) {
      case '--tool': {
        const value = takeValue(i, arg);
        if (value !== 'claude' && value !== 'codex' && value !== 'all')
          return fail('--tool must be claude, codex or all');
        opts.tool = value;
        i += 1;
        break;
      }
      case '--project':
        opts.project = takeValue(i, arg);
        i += 1;
        break;
      case '--all-projects':
        opts.allProjects = true;
        break;
      case '--limit':
        opts.limit = takeInt(i, arg);
        i += 1;
        break;
      case '--tactic': {
        const value = takeValue(i, arg);
        if (!TACTICS.includes(value as Tactic)) return fail(`--tactic must be one of ${TACTICS.join(', ')}`);
        opts.tactic = value as Tactic;
        i += 1;
        break;
      }
      case '--out':
        opts.out = takeValue(i, arg);
        i += 1;
        break;
      case '--stdout':
        opts.stdout = true;
        break;
      case '--last-turns':
        opts.lastTurns = takeInt(i, arg);
        i += 1;
        break;
      case '--max-result-chars':
        opts.maxResultChars = takeInt(i, arg);
        i += 1;
        break;
      case '--max-input-chars':
        opts.maxInputChars = takeInt(i, arg);
        i += 1;
        break;
      case '--query':
        opts.query = takeValue(i, arg);
        i += 1;
        break;
      case '--context':
        opts.context = takeInt(i, arg);
        i += 1;
        break;
      case '--max-hits':
        opts.maxHits = takeInt(i, arg);
        i += 1;
        break;
      case '--prompt':
        opts.prompt = takeValue(i, arg);
        i += 1;
        break;
      case '--timeout':
        opts.timeout = takeInt(i, arg);
        i += 1;
        break;
      case '-h':
      case '--help':
        process.stdout.write(USAGE);
        process.exit(0);
      default:
        if (arg.startsWith('--')) return fail(`unknown option ${arg}\n\n${USAGE}`);
        opts.selectors.push(arg);
    }
  }
  if (opts.command === 'extract' && opts.selectors.length === 0)
    return fail(`extract needs at least one selector\n\n${USAGE}`);
  return opts;
};

const main = async (): Promise<number> => {
  const opts = parseArgs(process.argv.slice(2));
  return opts.command === 'list' ? cmdList(opts) : cmdExtract(opts);
};

process.exitCode = await main();
