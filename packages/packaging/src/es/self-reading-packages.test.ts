import { afterAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { readsOwnFilesAtRunTime } from './self-reading-packages';

const root = await mkdtemp(join(tmpdir(), 'stp-self-reading-'));
afterAll(() => rm(root, { recursive: true, force: true }));

/** Writes an installed package: its manifest plus the given files, relative to the package directory. */
const installPackage = async (name: string, manifest: Record<string, unknown>, files: Record<string, string>) => {
  const packageRoot = join(root, 'node_modules', name);
  await Promise.all(
    Object.entries({ 'package.json': JSON.stringify({ name, ...manifest }), ...files }).map(
      async ([path, contents]) => {
        await mkdir(dirname(join(packageRoot, path)), { recursive: true });
        await writeFile(join(packageRoot, path), contents);
      }
    )
  );
  return packageRoot;
};

describe('packages that read their own files at run time', () => {
  // Each case mirrors how a real package reads, or does not read, its files.
  test.each([
    {
      label: 'pdfkit: font metrics read next to the build',
      manifest: { main: 'js/pdfkit.js' },
      files: {
        'js/pdfkit.js':
          "const fs = require('fs');\nmodule.exports = () => fs.readFileSync(__dirname + '/data/Helvetica.afm', 'utf8');",
        'js/data/Helvetica.afm': 'StartFontMetrics 4.1'
      },
      reads: true
    },
    {
      label: 'figlet: a fonts directory held in a variable',
      manifest: {
        type: 'module',
        exports: { '.': { node: { import: './dist/node-figlet.mjs' }, browser: './dist/figlet.mjs' } }
      },
      files: {
        'dist/node-figlet.mjs': [
          "import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';",
          'const moduleDirname = path.dirname(fileURLToPath(import.meta.url));',
          "const fontPath = path.join(moduleDirname, '/../fonts/');",
          "export const text = (font) => fs.readFileSync(path.join(fontPath, font + '.flf'), 'utf8');"
        ].join('\n'),
        'dist/figlet.mjs': 'export const text = () => "";',
        'fonts/Standard.flf': 'flf2a$'
      },
      reads: true
    },
    {
      label: 'tiktoken: WebAssembly loaded by a module the entry requires',
      manifest: { main: 'tiktoken.cjs' },
      files: {
        'tiktoken.cjs': "module.exports = require('./tiktoken_bg.cjs');",
        'tiktoken_bg.cjs':
          "const fs = require('fs'); const path = require('path');\nconst bytes = fs.readFileSync(path.join(__dirname, './tiktoken_bg.wasm'));\nmodule.exports = bytes;",
        'tiktoken_bg.wasm': '\0asm'
      },
      reads: true
    },
    {
      label: 'fontkit: a self-contained build beside sources that read data files',
      manifest: { main: 'dist/main.cjs', exports: { node: { require: './dist/main.cjs' } } },
      files: {
        'dist/main.cjs': "const trie = 'inlined data';\nmodule.exports = { trie };",
        'src/shaper.js': "import fs from 'fs';\nconst data = fs.readFileSync(__dirname + '/data.trie');",
        'src/data.trie': 'trie'
      },
      reads: false
    },
    {
      label: 'a command-line tool among the subpath exports',
      manifest: { exports: { '.': './lib/index.js', './bin/tool': './bin/tool.js' } },
      files: {
        'lib/index.js': 'module.exports = (text) => text.toUpperCase();',
        'bin/tool.js':
          "const fs = require('fs');\nconsole.log(fs.readFileSync(__dirname + '/../templates/usage.hbs', 'utf8'));",
        'templates/usage.hbs': 'Usage: {{name}}'
      },
      reads: false
    },
    {
      label: "a loader that reads the application's files, not its own",
      manifest: { main: 'lib/main.js' },
      files: {
        'lib/main.js': [
          "const fs = require('fs'); const path = require('path');",
          "const version = require('./version');",
          "module.exports = () => fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8') + __dirname;"
        ].join('\n'),
        'lib/version.js': "module.exports = '1.0.0';",
        'lib/defaults.ini': 'level=info'
      },
      reads: false
    }
  ])('$label', async ({ label, manifest, files, reads }) => {
    const packageRoot = await installPackage(label.split(':')[0]!.replace(/\W+/g, '-'), manifest, files);
    expect(await readsOwnFilesAtRunTime(packageRoot)).toBe(reads);
  });

  test('a package known to read its files without a sign of it', async () => {
    const packageRoot = await installPackage(
      '@sparticuz/chromium',
      { main: 'build/index.js' },
      {
        'build/index.js': 'module.exports = { executablePath: async (input) => input };'
      }
    );
    expect(await readsOwnFilesAtRunTime(packageRoot)).toBe(true);
  });
});
