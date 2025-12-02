// from https://github.com/anatine/esbuildnx/tree/main/packages/esbuild-decorators

import type { Plugin } from 'esbuild';
import type { ParsedCommandLine } from 'typescript';
import { dirname, join } from 'node:path';
import { inspect } from 'node:util';
import { dynamicRequireLibraryFromUserNodeModules } from '@shared/utils/fs-utils';
import { getError } from '@shared/utils/misc';
import { readFile } from 'fs-extra';
import { strip } from './strip-it';

type EsbuildDecoratorsOptions = {
  // If empty, uses esbuild's tsconfig.json and falls back to the tsconfig.json in the $cwd
  tsconfig?: string;
  // If empty, uses the current working directory
  cwd?: string;
  // If true, force compilation with tsc
  force?: boolean;
  // If true, enables tsx file support
  tsx?: boolean;
};

// eslint-disable-next-line
const theFinder = new RegExp(/((?<![(\s]\s*['"])@\w[.[\]\w]*\s*(?!;)[(?=\s)])/);

const findDecorators = (fileContent) => theFinder.test(strip(fileContent));

//     throw stpErrors.e507({ missingLibs: ['aws-cdk-lib', 'construct'], feature: 'AWS CDK constructs' });

export const esbuildDecorators = (options: EsbuildDecoratorsOptions = {}): Plugin => ({
  name: 'emit-decorator-metadata',
  setup(build) {
    const cwd = options.cwd || process.cwd();
    let typescriptLib;
    try {
      typescriptLib = dynamicRequireLibraryFromUserNodeModules({ libraryName: 'typescript', searchFrom: cwd });
    } catch {
      throw getError({
        type: 'MISSING_PREREQUISITE',
        message: 'Using "emitDecoratorMetadata" requires "typescript" library to be installed in the project.'
      });
    }
    const { transpileModule, findConfigFile, sys, parseConfigFileTextToJson, parseJsonConfigFileContent } =
      typescriptLib;
    const tsconfigPath = options.tsconfig || build.initialOptions?.tsconfig || join(cwd, './tsconfig.json');
    const forceTsc = options.force ?? false;
    const tsx = options.tsx ?? true;

    let parsedTsConfig = null;

    build.onLoad({ filter: tsx ? /\.tsx?$/ : /\.ts$/ }, async (args) => {
      if (!parsedTsConfig) {
        parsedTsConfig = parseTsConfig(tsconfigPath, cwd, {
          findConfigFile,
          sys,
          parseConfigFileTextToJson,
          parseJsonConfigFileContent
        });
        if (parsedTsConfig.options.sourcemap) {
          parsedTsConfig.options.sourcemap = false;
          parsedTsConfig.options.inlineSources = true;
          parsedTsConfig.options.inlineSourceMap = true;
        }
      }

      // Just return if we don't need to search the file.
      if (!forceTsc && (!parsedTsConfig || !parsedTsConfig.options || !parsedTsConfig.options.emitDecoratorMetadata)) {
        return;
      }

      const ts = await readFile(args.path, 'utf8').catch((err) => printDiagnostics({ file: args.path, err }));

      // Find the decorator and if there isn't one, return out
      const hasDecorator = findDecorators(ts);
      if (!ts || !hasDecorator) {
        return;
      }

      const program = transpileModule(ts, {
        compilerOptions: parsedTsConfig.options
      });
      return { contents: program.outputText };
    });
  }
});

function parseTsConfig(
  tsconfig,
  cwd,
  { findConfigFile, sys, parseConfigFileTextToJson, parseJsonConfigFileContent }
): ParsedCommandLine {
  const fileName = findConfigFile(cwd, sys.fileExists, tsconfig);

  // if the value was provided, but no file, fail hard
  if (tsconfig !== undefined && !fileName) {
    throw new Error(`failed to open '${fileName}'`);
  }

  let loadedConfig = {};
  let baseDir = cwd;
  if (fileName) {
    const text = sys.readFile(fileName);
    if (text === undefined) {
      throw new Error(`failed to read '${fileName}'`);
    }

    const result = parseConfigFileTextToJson(fileName, text);

    if (result.error !== undefined) {
      printDiagnostics(result.error);
      throw new Error(`failed to parse '${fileName}'`);
    }

    loadedConfig = result.config;
    baseDir = dirname(fileName);
  }

  const parsedTsConfig = parseJsonConfigFileContent(loadedConfig, sys, baseDir);

  if (parsedTsConfig.errors[0]) {
    printDiagnostics(parsedTsConfig.errors);
  }

  return parsedTsConfig;
}

function printDiagnostics(...args) {
  console.error(inspect(args, false, 10, true));
}
