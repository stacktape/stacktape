import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode } from 'html-entities';
import ts from 'typescript';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
if (args.length > 0 && (args.length !== 2 || args[0] !== '--out-dir' || !args[1])) {
  throw new Error('Usage: validate-built-examples.ts [--out-dir <built-site-directory>]');
}
const output = resolve(appRoot, args[1] ?? 'dist');
const walk = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => (entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]))
  );
  return files.flat().toSorted();
};

// Astro serializes island strings as [0, string]. Read only code/lang pairs; never evaluate authored JavaScript.
const codeTabs = (props: unknown): Array<{ lang: string; code: string }> => {
  if (!props || typeof props !== 'object') return [];
  if (Array.isArray(props)) return props.flatMap(codeTabs);
  const record = props as Record<string, unknown>;
  const code = Array.isArray(record.code) && record.code[0] === 0 ? record.code[1] : undefined;
  const lang = Array.isArray(record.lang) && record.lang[0] === 0 ? record.lang[1] : undefined;
  return typeof code === 'string' && typeof lang === 'string'
    ? [{ lang, code }]
    : Object.values(record).flatMap(codeTabs);
};

const samples = new Map<string, { code: string; label: string }>();
const checkedPages = new Set<string>();
// Sequential reads keep the built corpus bounded without retaining every page in memory.
/* eslint-disable no-await-in-loop */
for (const file of (await walk(output)).filter((path) => path.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  let sample = 0;
  for (const island of html.matchAll(/<astro-island\b[^>]*>/g)) {
    if (!/component-url="[^"]*DocsCodeBlock\./.test(island[0])) continue;
    const rawProps = island[0].match(/\bprops="([^"]*)"/)?.[1];
    assert(rawProps, `${file}: CodeBlock island has no serialized props`);
    const props = JSON.parse(decode(rawProps)) as Record<string, unknown>;
    const exampleKind = Array.isArray(props.configExample) ? props.configExample[1] : undefined;
    assert(
      exampleKind === undefined || exampleKind === 'complete' || exampleKind === 'fragment',
      `${file}: invalid configExample metadata`
    );
    // IntelliSense blocks are authored config examples unless explicitly marked as contextual fragments.
    // Decide from metadata before reading code: broken imports, exports or factory names must still be compiled.
    const isCompleteConfig =
      exampleKind === 'complete' ||
      (exampleKind !== 'fragment' && Array.isArray(props.intellisense) && props.intellisense[1] === true);
    if (!isCompleteConfig) continue;
    for (const { lang, code } of codeTabs(props)) {
      if (!/^(?:ts|typescript)$/.test(lang)) continue;
      sample += 1;
      const page = relative(output, file).replace(/\\/g, '/');
      checkedPages.add(page);
      samples.set(join(appRoot, 'scripts', '__config_samples__', `sample${samples.size}.ts`), {
        code,
        label: `${page} complete config ${sample}`
      });
    }
  }
}
/* eslint-enable no-await-in-loop */
for (const page of ['index.html', 'resources/compute/lambda-function/index.html']) {
  assert(checkedPages.has(page), `${page}: the build must expose complete config examples`);
}
// Configs execute in Node. Compile all virtual samples against the actual declarations served by this build.
const options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  types: ['node'],
  typeRoots: [join(appRoot, 'node_modules', '@types')],
  paths: { stacktape: [join(output, 'stacktape', 'index.d.ts')], 'stacktape/*': [join(output, 'stacktape', '*')] }
};
const host = ts.createCompilerHost(options);
const originalGetSourceFile = host.getSourceFile.bind(host);
const originalReadFile = host.readFile.bind(host);
const originalFileExists = host.fileExists.bind(host);
host.getSourceFile = (filename, languageVersion, onError, shouldCreateNewSourceFile) => {
  const sample = samples.get(filename);
  return sample
    ? ts.createSourceFile(filename, sample.code, languageVersion, true)
    : originalGetSourceFile(filename, languageVersion, onError, shouldCreateNewSourceFile);
};
host.readFile = (filename) => samples.get(filename)?.code ?? originalReadFile(filename);
host.fileExists = (filename) => samples.has(filename) || originalFileExists(filename);
const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([...samples.keys()], options, host));
const errors = diagnostics.map((diagnostic) => {
  const sample = diagnostic.file ? samples.get(diagnostic.file.fileName) : undefined;
  return `${sample?.label ?? diagnostic.file?.fileName ?? 'compiler'}: TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`;
});
if (errors.length)
  throw new Error(
    `Invalid built config examples (${errors.length} errors in ${samples.size} configs):\n${errors.join('\n')}`
  );
console.info(
  `[example-validation] ${samples.size} complete configs on ${checkedPages.size} pages type-check against the served Stacktape declarations.`
);
