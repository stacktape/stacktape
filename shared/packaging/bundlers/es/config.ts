import type { LayerConfig } from './split-bundler/types';

export const FILES_TO_INCLUDE_IN_DIGEST = [
  'pnpm-lock.yaml',
  'yarn.lock',
  'package-lock.json',
  'bun.lockb',
  'bun.lock',
  'deno.lockb',
  'deno.lock',
  'node_modules/.prisma/client/index.js',
  'prisma.schema',
  'prisma.config.ts',
  'tsconfig.json'
];

export const DEPENDENCIES_TO_IGNORE_FROM_DOCKER_INSTALLATION = 'pg';

export const DEPENDENCIES_TO_EXCLUDE_FROM_BUNDLE = ['next'];

export const IGNORED_OPTIONAL_PEER_DEPS_FROM_INSTALL_IN_DOCKER = ['supports-color', 'debug'];

export const DEPENDENCIES_WITH_BINARIES = [
  'pg-native',
  'chrome-aws-lambda',
  'puppeteer',
  'sqlite3',
  'bcrypt',
  'node-sass',
  'serialport',
  'phantomjs',
  'hiredis',
  'canvas',
  'websocket',
  'phantomjs-prebuilt',
  'deasync',
  'leveldown',
  'fibers',
  'nodegit',
  'zmq',
  'iconv',
  'electron-prebuilt',
  'libxmljs',
  'radium',
  'ffi',
  'microtime',
  '@tensorflow/tfjs-node',
  'sharp'
];

export const IGNORED_MODULES = [
  '@prisma/cli',
  '@prisma/bar',
  '@prisma/engines',
  '@prisma/engine-versions',
  'pnpapi',
  'fsevents'
];

export const LAYER_CHUNKS_PATH = '/opt/nodejs/chunks/';

export const DEFAULT_LAYER_CONFIG: LayerConfig = {
  minUsageCount: 2, // Chunk must be used by at least 2 lambdas
  minChunkSize: 1024, // At least 1KB
  maxLayers: 3, // Use up to 3 layers (leave 2 for user's custom layers)
  maxLayerSize: 50 * 1024 * 1024 // 50MB per layer (conservative limit)
};

export const IGNORED_FILES = [
  'query-engine-darwin',
  'makefile',
  'gulpfile.js',
  'gruntfile.js',
  '.tern-project',
  '.gitattributes',
  '.gitignore',
  '.npmignore',
  '.editorconfig',
  '.eslintrc',
  '.eslintignore',
  '.jshintrc',
  '.flowconfig',
  '.documentup.json',
  '.yarn-metadata.json',
  '.travis.yml',
  'authors',
  'contributors',
  'contributing',
  'changes',
  'changelog',
  '.yarn-integrity',
  'jsdoc.json',
  '.nvmrc',
  '.zuul.yml',
  '.doclets.yml',
  '.dockerignore',
  '.dir-locals.el',
  '.nyc_output',
  'Makefile',
  'Gulpfile.js',
  'Gruntfile.js',
  'appveyor.yml',
  'circle.yml',
  'codeship-services.yml',
  'codeship-steps.yml',
  'wercker.yml',
  '.tern-project',
  '.gitattributes',
  '.editorconfig',
  '.eslintrc',
  '.jshintrc',
  '.flowconfig',
  '.documentup.json',
  '.yarn-metadata.json',
  '.travis.yml',
  '.github',
  'usage.txt',
  '.nycrc',
  'USAGE.txt',
  'bower.json',
  '.lintstagedrc.yml',
  '.prettierrc',
  '.huskyrc',
  'prettier.config.js',
  'babel.config.js',
  'AUTHORS',
  'yarn.lock',
  '.babelrc.js',
  '.babelrc',
  '.prettierignore',
  '.eslintignore',
  'tslint.json',
  'webpack.config.js',
  'rollup.config.js',
  'tsconfig.json',
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc.yml',
  '.vscode',
  'help.txt',
  'Cakefile',
  'CODEOWN'
];

export const IGNORED_FOLDERS = [
  '__tests__',
  'test',
  'powered-test',
  '@types',
  'tests',
  'powered-test',
  'docs',
  'doc',
  'website',
  'images',
  'assets',
  'example',
  'demo',
  'examples',
  'coverage',
  '.nyc_output'
];

export const IGNORED_EXTENSIONS = ['.md', '.markdown', '.ts', '.map', '.d.ts', '.txt', '.html', '.htm'];
