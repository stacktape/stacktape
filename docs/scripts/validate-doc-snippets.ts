/**
 * Validates the TypeScript code blocks embedded in the docs (`docs/docs/**\/*.mdx`).
 *
 * The docs render code via `<CodeBlock tabs={[{ lang, code }]} />`. When `intellisense` is on,
 * the CodeBlock component runs each TS tab through Twoslash against the Stacktape declaration
 * files served from `docs/public/stacktape`. This script reproduces that exact setup so its verdict
 * matches the red error squiggles shown on the page — it extracts every `typescript` tab, strips
 * the Shiki `[!code ...]` markers (just like the component does before Twoslash), type-checks it,
 * and reports any compiler errors with a clickable `file:line` pointing back into the .mdx.
 *
 * By default only tabs inside a `<CodeBlock intellisense ...>` are checked — those are the ones the
 * docs actually type-check and render red squiggles for. Pass `--all` to check every TS tab.
 *
 *   bun scripts/validate-doc-snippets.ts                # validate intellisense tabs in all docs
 *   bun scripts/validate-doc-snippets.ts intro index    # only files whose path contains a token
 *   bun scripts/validate-doc-snippets.ts --all          # include non-intellisense tabs too
 *   bun scripts/validate-doc-snippets.ts --only-config   # only tabs that import from 'stacktape'
 *   bun scripts/validate-doc-snippets.ts --json          # machine-readable output
 *
 * Exit code is 1 when any snippet fails (so it can gate CI).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { createDefaultMapFromNodeModules } from '@typescript/vfs';
import { createTwoslasher } from 'twoslash';

const DOCS_ROOT = join(import.meta.dir, '..', 'docs');
const REPO_DOCS = join(import.meta.dir, '..');
const TYPES_DIR = join(import.meta.dir, '..', 'public', 'stacktape');
const NODE_TYPES_DIR = join(import.meta.dir, '..', 'node_modules', '@types', 'node');
const STP_FILES = ['index.d.ts', 'types.d.ts', 'plain.d.ts', 'cloudformation.d.ts'] as const;

// Mirrors CodeBlockNew's compiler setup: Twoslash defaults (strict, ESNext) + lib override.
// `types: ['node']` mirrors twoslash-cdn fetching @types/node on demand, so node built-in imports
// (`fs`, `path`) and globals (`process`) resolve instead of looking like errors only locally.
const COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  lib: ['esnext', 'dom'],
  types: ['node']
};

// Same regex CodeBlockNew uses to strip Shiki focus/highlight notations before Twoslash sees the code.
const MARKER_RE = /\s*(?:#|\/\/)\s*\[!code\s+(?:focus|highlight)(?:-(?:start|end))?(?::\d+)?\s*\]/g;
const ANY_MARKER_RE = /(?:#|\/\/)\s*\[!code\s+(?:focus|highlight)/;

const VALIDATABLE_LANGS = new Set(['typescript', 'ts', 'tsx', 'javascript', 'js', 'jsx']);

type Args = { paths: string[]; onlyConfig: boolean; json: boolean; all: boolean };

const parseArgs = (argv: string[]): Args => {
  const paths: string[] = [];
  let onlyConfig = false;
  let json = false;
  let all = false;
  for (const a of argv) {
    if (a === '--only-config') onlyConfig = true;
    else if (a === '--json') json = true;
    else if (a === '--all') all = true;
    else paths.push(a);
  }
  return { paths, onlyConfig, json, all };
};

const walkMdx = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkMdx(full));
    else if (entry.endsWith('.mdx')) out.push(full);
  }
  return out;
};

const lineStartOffsets = (text: string): number[] => {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return starts;
};

const offsetToLine = (starts: number[], offset: number): number => {
  // returns 0-indexed line of the given char offset
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo;
};

// --- Balanced scanner: find the `}` that closes a `{` (handles strings, templates, comments). ---

const scanString = (text: string, i: number, quote: string): number => {
  let j = i + 1;
  while (j < text.length) {
    if (text[j] === '\\') j += 2;
    else if (text[j] === quote) return j + 1;
    else j++;
  }
  return text.length;
};

const scanTemplate = (text: string, i: number): number => {
  let j = i + 1;
  while (j < text.length) {
    if (text[j] === '\\') j += 2;
    else if (text[j] === '`') return j + 1;
    else if (text[j] === '$' && text[j + 1] === '{') j = scanBraced(text, j + 2);
    else j++;
  }
  return text.length;
};

// `start` points just AFTER an opening `{`; returns the index just AFTER its matching `}`.
const scanBraced = (text: string, start: number): number => {
  let i = start;
  let depth = 1;
  while (i < text.length && depth > 0) {
    const c = text[i];
    const c2 = text[i + 1];
    if (c === '/' && c2 === '/') {
      i += 2;
      while (i < text.length && text[i] !== '\n') i++;
    } else if (c === '/' && c2 === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
    } else if (c === "'" || c === '"') {
      i = scanString(text, i, c);
    } else if (c === '`') {
      i = scanTemplate(text, i);
    } else {
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
  }
  return i;
};

const PREFIX = 'const __t = ';

type ExtractedTab = {
  label: string;
  lang: string;
  code: string; // cooked code (markers still present, stripped later)
  /** 0-indexed file line of the first line of `code` */
  baseLine: number;
  dynamic: boolean; // template had real ${...} interpolation
  intellisense: boolean; // parent <CodeBlock> enables type-checking
};

const readObjectTab = (
  obj: ts.ObjectLiteralExpression,
  sf: ts.SourceFile,
  exprAbsStart: number,
  fileLineStarts: number[],
  intellisense: boolean
): ExtractedTab | null => {
  let label = '';
  let lang = '';
  let codeNode: ts.Expression | undefined;
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop) || !prop.name) continue;
    const key = prop.name.getText(sf).replace(/['"]/g, '');
    if (key === 'label' && ts.isStringLiteralLike(prop.initializer)) label = prop.initializer.text;
    else if (key === 'lang' && ts.isStringLiteralLike(prop.initializer)) lang = prop.initializer.text;
    else if (key === 'code') codeNode = prop.initializer;
  }
  if (!codeNode) return null;

  let code: string;
  let dynamic = false;
  if (ts.isNoSubstitutionTemplateLiteral(codeNode) || ts.isStringLiteralLike(codeNode)) {
    code = codeNode.text;
  } else if (ts.isTemplateExpression(codeNode)) {
    // Real interpolation present — reconstruct a best-effort plain-TS version (rare in practice).
    dynamic = true;
    code = codeNode.head.text + codeNode.templateSpans.map((s) => s.expression.getText(sf) + s.literal.text).join('');
  } else {
    return null;
  }

  const contentStartWrapped = codeNode.getStart(sf) + 1; // skip opening backtick/quote
  const fileOffset = exprAbsStart + (contentStartWrapped - PREFIX.length);
  const baseLine = offsetToLine(fileLineStarts, fileOffset);
  return { label, lang, code, baseLine, dynamic, intellisense };
};

const extractTabs = (fileText: string, fileLineStarts: number[]): ExtractedTab[] => {
  const tabs: ExtractedTab[] = [];
  const re = /tabs\s*=\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fileText))) {
    const braceIndex = m.index + m[0].length - 1; // index of the `{`
    const exprAbsStart = braceIndex + 1;
    // The parent <CodeBlock> opens before `tabs=`; its attribute list tells us whether the docs
    // type-check this block (only `intellisense`/`stacktapeConfig` blocks render TS errors).
    const tagStart = fileText.lastIndexOf('<CodeBlock', m.index);
    const attrs = tagStart >= 0 ? fileText.slice(tagStart, m.index) : '';
    const intellisense = /\bintellisense\b/.test(attrs) || /\bstacktapeConfig\b/.test(attrs);
    const end = scanBraced(fileText, exprAbsStart) - 1; // index of matching `}`
    const inner = fileText.slice(exprAbsStart, end);
    const wrapped = PREFIX + inner;
    let sf: ts.SourceFile;
    try {
      sf = ts.createSourceFile('tabs.ts', wrapped, ts.ScriptTarget.Latest, true);
    } catch {
      continue;
    }
    const decl = (sf.statements[0] as ts.VariableStatement | undefined)?.declarationList?.declarations?.[0];
    const init = decl?.initializer;
    if (!init || !ts.isArrayLiteralExpression(init)) continue;
    for (const el of init.elements) {
      if (!ts.isObjectLiteralExpression(el)) continue;
      const tab = readObjectTab(el, sf, exprAbsStart, fileLineStarts, intellisense);
      if (tab) tabs.push(tab);
    }
    re.lastIndex = end + 1;
  }
  return tabs;
};

// Strip `[!code ...]` markers exactly like CodeBlockNew.fullCode: drop marker-only lines, strip
// markers from the rest. Returns the cleaned code plus a map from cleaned-line -> raw-line (0-idx).
const stripMarkers = (code: string): { code: string; lineMap: number[] } => {
  const rawLines = code.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  const lineMap: number[] = [];
  rawLines.forEach((raw, rawIdx) => {
    const hasMarker = ANY_MARKER_RE.test(raw);
    const stripped = raw.replace(MARKER_RE, '');
    if (hasMarker && stripped.trim() === '') return; // marker-only line: drop entirely
    out.push(stripped);
    lineMap.push(rawIdx);
  });
  return { code: out.join('\n'), lineMap };
};

// Recursively collect every `.d.ts` under @types/node so node built-in imports (`fs`, `path`, …)
// and globals (`process`, `Buffer`) resolve — matching the docs' twoslash-cdn, which fetches these
// from a CDN on demand. Without this, node imports look like errors locally but render fine on the page.
const collectNodeTypes = (fsMap: Map<string, string>) => {
  const walk = (dir: string, rel: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      const relPath = rel ? `${rel}/${entry}` : entry;
      if (statSync(full).isDirectory()) walk(full, relPath);
      else if (entry.endsWith('.d.ts') || entry === 'package.json') {
        fsMap.set(`/node_modules/@types/node/${relPath}`, readFileSync(full, 'utf-8'));
      }
    }
  };
  walk(NODE_TYPES_DIR, '');
};

const buildFsMap = (): Map<string, string> => {
  const fsMap = createDefaultMapFromNodeModules(COMPILER_OPTIONS, ts);
  collectNodeTypes(fsMap);
  for (const f of STP_FILES) {
    fsMap.set(`/node_modules/stacktape/${f}`, readFileSync(join(TYPES_DIR, f), 'utf-8'));
  }
  fsMap.set(
    '/node_modules/stacktape/package.json',
    JSON.stringify({
      name: 'stacktape',
      version: '0.0.0-docs',
      types: './index.d.ts',
      exports: {
        '.': './index.d.ts',
        './types': './types.d.ts',
        './plain': './plain.d.ts',
        './cloudformation': './cloudformation.d.ts'
      }
    })
  );
  fsMap.set(
    '/node_modules/stacktape/module-declarations.d.ts',
    [
      "declare module 'stacktape' { export * from '/node_modules/stacktape/index.d.ts'; }",
      "declare module 'stacktape/types' { export * from '/node_modules/stacktape/types.d.ts'; }",
      "declare module 'stacktape/plain' { export * from '/node_modules/stacktape/plain.d.ts'; }",
      "declare module 'stacktape/cloudformation' { export * from '/node_modules/stacktape/cloudformation.d.ts'; }"
    ].join('\n')
  );
  return fsMap;
};

const langToExt = (lang: string): string => {
  const l = lang.toLowerCase();
  if (l === 'tsx') return 'tsx';
  if (l === 'jsx') return 'jsx';
  if (l === 'js' || l === 'javascript') return 'js';
  return 'ts';
};

type SnippetError = { line: number; character: number; code: number | string; text: string; sourceLine: string };
type SnippetResult = {
  file: string;
  label: string;
  lang: string;
  baseLine: number;
  importsStacktape: boolean;
  dynamic: boolean;
  errors: SnippetError[];
  threw?: string;
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));

  let files = walkMdx(DOCS_ROOT).sort();
  if (args.paths.length) files = files.filter((f) => args.paths.some((p) => f.replace(/\\/g, '/').includes(p)));

  const fsMap = buildFsMap();
  const twoslasher = createTwoslasher({ fsMap, compilerOptions: COMPILER_OPTIONS, handbookOptions: { noErrorValidation: true } });

  const results: SnippetResult[] = [];
  let totalTabs = 0;
  let validated = 0;

  for (const file of files) {
    const text = readFileSync(file, 'utf-8');
    const lineStarts = lineStartOffsets(text);
    const rawFileLines = text.split('\n');
    const tabs = extractTabs(text, lineStarts);
    for (const tab of tabs) {
      if (!VALIDATABLE_LANGS.has(tab.lang.toLowerCase())) continue;
      if (!tab.intellisense && !args.all) continue; // docs only type-check intellisense blocks
      totalTabs++;
      const importsStacktape = /from\s+['"]stacktape['"]/.test(tab.code);
      if (args.onlyConfig && !importsStacktape) continue;
      validated++;

      const { code, lineMap } = stripMarkers(tab.code);
      const result: SnippetResult = {
        file: relative(REPO_DOCS, file).replace(/\\/g, '/'),
        label: tab.label,
        lang: tab.lang,
        baseLine: tab.baseLine,
        importsStacktape,
        dynamic: tab.dynamic,
        errors: []
      };

      try {
        const res = twoslasher(code, langToExt(tab.lang));
        for (const node of res.nodes) {
          if (node.type !== 'error') continue;
          const rawIdx = lineMap[node.line] ?? node.line;
          const absLine = tab.baseLine + rawIdx + 1; // 1-indexed file line
          result.errors.push({
            line: absLine,
            character: node.character + 1,
            code: (node as { code?: number | string }).code ?? '',
            text: node.text,
            sourceLine: (rawFileLines[absLine - 1] ?? '').trim()
          });
        }
      } catch (err) {
        result.threw = (err as Error).message?.split('\n').slice(0, 3).join(' ').slice(0, 300);
      }

      if (result.errors.length || result.threw) results.push(result);
    }
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({ totalTabs, validated, failed: results.length, results }, null, 2) + '\n');
  } else {
    for (const r of results) {
      const tag = r.label ? ` [${r.label}]` : '';
      const dyn = r.dynamic ? ' (dynamic ${} interpolation)' : '';
      process.stdout.write(`\n\x1b[1m${r.file}:${r.baseLine + 1}\x1b[0m${tag}${dyn}\n`);
      if (r.threw) {
        process.stdout.write(`  \x1b[31mtwoslash threw:\x1b[0m ${r.threw}\n`);
      }
      for (const e of r.errors) {
        process.stdout.write(`  \x1b[31m${r.file}:${e.line}:${e.character}\x1b[0m  TS${e.code}  ${e.text}\n`);
        if (e.sourceLine) process.stdout.write(`      \x1b[2m${e.sourceLine}\x1b[0m\n`);
      }
    }
    const failTabs = results.length;
    const errCount = results.reduce((n, r) => n + r.errors.length + (r.threw ? 1 : 0), 0);
    process.stdout.write(
      `\n\x1b[1mScanned\x1b[0m ${files.length} files, ${totalTabs} TS code blocks` +
        `${args.all ? '' : ' (intellisense only)'}` +
        `${args.onlyConfig ? ` (validated ${validated} that import 'stacktape')` : ''}.\n` +
        (failTabs
          ? `\x1b[31m\x1b[1m${failTabs} code block(s) with ${errCount} error(s).\x1b[0m\n`
          : `\x1b[32m\x1b[1mAll code blocks type-check.\x1b[0m\n`)
    );
  }

  process.exit(results.length ? 1 : 0);
};

main();
