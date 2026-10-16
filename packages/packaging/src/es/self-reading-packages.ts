/**
 * Which installed packages read their own files at run time, so a bundle cannot contain them.
 *
 * Such a package builds a path from its own location (`__dirname`, `import.meta.url`) and reads a file it ships with
 * `fs`: pdfkit its font metrics, figlet its fonts, geoip-lite its databases, tiktoken its WebAssembly. A bundle moves
 * the code and leaves those files behind, so it fails when it reads them. Like a native package, such a package stays
 * installed beside the bundle.
 *
 * The check reads the package's main entry points and, when the package ships data files, the files they load, found
 * by following their relative imports. Most packages ship only code and documentation, so following imports only for
 * the others keeps the check cheap. Many packages also ship their sources or command-line tools, which read files the
 * published build does not, and a bundle never contains those. A file counts when it calls an `fs` read and either
 * uses its own location with a path that exists in the package, or resolves one of the package's own files with
 * `require.resolve`, as uglify-js does. A few packages give no such sign and are listed by name.
 */
import { existsSync, statSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { readPackageManifest } from './installed-packages';

/** Packages that read their own files without the sign the check looks for. */
const PACKAGES_READING_OWN_FILES = new Set([
  // Decompresses the Chromium build it ships from its `bin` directory, through a path it receives as an argument.
  '@sparticuz/chromium',
  // Returns its own directory for a web server (swagger-ui-express) to serve the files in it.
  'swagger-ui-dist'
]);

const SCRIPT_EXTENSIONS = ['.js', '.cjs', '.mjs'];
/**
 * Code, type, source map, configuration and documentation files: a package that ships only these has no data of its
 * own. JSON counts as code here: packages `require` their JSON data, which bundles. Counting it would send packages
 * such as es-abstract, which load hundreds of modules and read nothing, through the slower check.
 */
const CODE_AND_DOCUMENT_EXTENSIONS = new Set(
  '.js .cjs .mjs .jsx .ts .cts .mts .tsx .json .map .flow .coffee .md .markdown .txt .yml .yaml .lock .gyp .gypi .c .cc .cpp .h .hpp .sh .cmd .ps1 .bat'.split(
    ' '
  )
);
/** Export conditions whose files a Node.js bundle never loads. */
const NON_NODE_CONDITIONS = new Set(['browser', 'types', 'typings', 'react-native', 'deno', 'worker', 'workerd']);
/** A bound on the files followed in one package; a published entry point loads far fewer. */
const MAX_FILES = 2000;

const OWN_LOCATION = /\b(?:__dirname|__filename|import\.meta\.(?:url|dirname|filename))\b/;
/** `require.resolve('./x')` or `require.resolve('../x')`: a path in the package, which a bundle bakes in as absolute. */
const RELATIVE_REQUIRE_RESOLVE = /\brequire\.resolve\s*\(\s*(['"])(\.\.?\/[^'"\n]+)\1/g;
const FS_READ = /\b(?:readFileSync|readFile|createReadStream|readdirSync|readdir|openSync)\s*\(/;
const RELATIVE_IMPORT = /(?:\brequire\s*\(\s*|\bimport\s*\(\s*|\bfrom\s*|\bimport\s+)(['"])(\.\.?\/[^'"\n]*)\1/g;
/** A string literal that looks like a path to something named: a name with a slash or a file extension. */
const PATH_LITERAL = /(['"`])([\w@.-]*[/.][\w@./-]*)\1/g;
const NAMED = /\w/;

const isInside = (root: string, path: string) => {
  const relativePath = relative(root, path);
  return relativePath !== '' && !relativePath.startsWith('..') && !relativePath.split(sep).includes('node_modules');
};

const isFile = (path: string) => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

/** The script a relative specifier or an entry path loads, as Node.js resolves it; `undefined` for anything else. */
const resolveScript = (packageRoot: string, path: string) => {
  const candidates = [
    path,
    ...SCRIPT_EXTENSIONS.map((extension) => `${path}${extension}`),
    ...SCRIPT_EXTENSIONS.map((extension) => join(path, `index${extension}`))
  ];
  return candidates.find(
    (candidate) =>
      SCRIPT_EXTENSIONS.includes(extname(candidate)) && isInside(packageRoot, candidate) && isFile(candidate)
  );
};

/**
 * The files the package's main entry point (`exports['.']`) can be, except those under conditions a Node.js bundle
 * does not use. Other subpaths, such as a command-line tool, are not what an application imports.
 */
const collectEntryTargets = (exportsField: unknown, targets: string[]) => {
  if (typeof exportsField === 'string') {
    if (!exportsField.includes('*')) targets.push(exportsField);
    return;
  }
  if (Array.isArray(exportsField)) {
    for (const item of exportsField) collectEntryTargets(item, targets);
    return;
  }
  if (exportsField && typeof exportsField === 'object') {
    const entries = Object.entries(exportsField);
    if (entries.some(([key]) => key.startsWith('.'))) {
      collectEntryTargets((exportsField as Record<string, unknown>)['.'], targets);
      return;
    }
    for (const [condition, value] of entries) {
      if (!NON_NODE_CONDITIONS.has(condition)) collectEntryTargets(value, targets);
    }
  }
};

const getEntryScripts = async (packageRoot: string) => {
  const manifest = (await readPackageManifest(packageRoot)) as { main?: unknown; module?: unknown; exports?: unknown };
  const targets: string[] = [];
  collectEntryTargets(manifest.exports, targets);
  for (const field of [manifest.main, manifest.module]) {
    if (typeof field === 'string') targets.push(field);
  }
  if (!targets.length) targets.push('index.js');
  return targets
    .map((target) => resolveScript(packageRoot, resolve(packageRoot, target)))
    .filter((script): script is string => script !== undefined);
};

/** Whether a file builds a path from its own location, reads with `fs`, and names a file the package ships. */
const readsPackageFile = (packageRoot: string, script: string, contents: string) => {
  if (!FS_READ.test(contents)) return false;
  const directory = dirname(script);
  // uglify-js finds the sources it reads with `require.resolve`; a bundle has neither the path nor the files.
  for (const [, , specifier] of contents.matchAll(RELATIVE_REQUIRE_RESOLVE)) {
    const target = specifier && resolve(directory, specifier);
    if (target && isInside(packageRoot, target) && existsSync(target)) return true;
  }
  if (!OWN_LOCATION.test(contents)) return false;
  // A relative import names a module the bundle contains, not a file read from disk.
  const imports = new Set([...contents.matchAll(RELATIVE_IMPORT)].map(([, , specifier]) => specifier));
  for (const [, , literal] of contents.matchAll(PATH_LITERAL)) {
    if (!literal || !NAMED.test(literal) || imports.has(literal) || SCRIPT_EXTENSIONS.includes(extname(literal))) {
      continue;
    }
    const target = resolve(directory, literal.replace(/^\/+/, ''));
    if (isInside(packageRoot, target) && existsSync(target)) return true;
  }
  return false;
};

const isDataFile = (name: string) => {
  const extension = extname(name).toLowerCase();
  return extension !== '' && !CODE_AND_DOCUMENT_EXTENSIONS.has(extension);
};

/** Whether a directory of the package holds a file other than code and documentation, outside `node_modules`. */
const shipsDataFiles = async (directory: string): Promise<boolean> => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  if (entries.some((entry) => entry.isFile() && isDataFile(entry.name))) return true;
  const found = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && entry.name !== 'node_modules')
      .map((entry) => shipsDataFiles(join(directory, entry.name)))
  );
  return found.includes(true);
};

/**
 * Reads the entry scripts, and the scripts they import when `followImports` is set, breadth-first, one level at a
 * time, read in parallel.
 */
const findOwnFileRead = async (packageRoot: string, followImports: boolean): Promise<boolean> => {
  let wave = await getEntryScripts(packageRoot);
  const visited = new Set(wave);
  while (wave.length) {
    // oxlint-disable-next-line no-await-in-loop -- each level's imports are known only after the level is read.
    const scripts = await Promise.all(
      wave.map(async (script) => ({ script, contents: await readFile(script, 'utf8').catch(() => '') }))
    );
    if (scripts.some(({ script, contents }) => readsPackageFile(packageRoot, script, contents))) return true;
    if (!followImports) return false;
    wave = [];
    for (const { script, contents } of scripts) {
      for (const [, , specifier] of contents.matchAll(RELATIVE_IMPORT)) {
        const imported = specifier && resolveScript(packageRoot, resolve(dirname(script), specifier));
        if (imported && !visited.has(imported) && visited.size < MAX_FILES) {
          visited.add(imported);
          wave.push(imported);
        }
      }
    }
  }
  return false;
};

const resultsByPackage = new Map<string, Promise<boolean>>();

/** Whether the installed package at `packageRoot` reads its own files at run time. */
export const readsOwnFilesAtRunTime = (packageRoot: string): Promise<boolean> => {
  let result = resultsByPackage.get(packageRoot);
  if (!result) {
    result = (async () => {
      const { name } = await readPackageManifest(packageRoot);
      if (PACKAGES_READING_OWN_FILES.has(name ?? '')) return true;
      // A package that ships only code can still read its own scripts; its entry points are checked for that.
      return findOwnFileRead(packageRoot, await shipsDataFiles(packageRoot));
    })().catch(() => false);
    resultsByPackage.set(packageRoot, result);
  }
  return result;
};
