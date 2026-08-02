import type { CreatePackagingError } from '../../runtime-contracts';
import type { BunPlugin } from 'bun';
import { dirname } from 'node:path';
import { readFile } from 'fs-extra';
import ts from 'typescript';
import { isFileAccessible } from '../../fs/files';

const TYPESCRIPT_SOURCE_FILE = /\.[cm]?tsx?$/;

const containsDecorator = ({ filePath, source }: { filePath: string; source: string }): boolean => {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (ts.canHaveDecorators(node) && (ts.getDecorators(node)?.length ?? 0) > 0) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
};

const formatDiagnostics = (diagnostics: readonly ts.Diagnostic[]): string =>
  ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n'
  });

const readCompilerOptions = ({
  createPackagingError,
  tsConfigPath
}: {
  createPackagingError: CreatePackagingError;
  tsConfigPath?: string | undefined;
}): ts.CompilerOptions => {
  if (!tsConfigPath) {
    return {};
  }
  const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw createPackagingError({
      type: 'BUILD_CODE',
      message: `Failed to read TypeScript configuration for decorator metadata.\n${formatDiagnostics([configFile.error])}`
    });
  }
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    dirname(tsConfigPath),
    undefined,
    tsConfigPath
  );
  const errors = parsedConfig.errors.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (errors.length > 0) {
    throw createPackagingError({
      type: 'BUILD_CODE',
      message: `Failed to parse TypeScript configuration for decorator metadata.\n${formatDiagnostics(errors)}`
    });
  }
  return parsedConfig.options;
};

/**
 * Bun does not emit legacy TypeScript design metadata, and the tsconfig handed to `Bun.build` does not change that.
 * When the option is requested, decorated TypeScript modules are therefore transformed by TypeScript itself, using
 * the project's own compiler options, before the bundler sees them; undecorated modules remain on Bun's native path
 * so ordinary builds retain their existing output and source-map behavior. A transformed module is still attributed
 * to its own file, but its source map describes the TypeScript-emitted code rather than the original source.
 */
export const createDecoratorMetadataPlugin = ({
  createPackagingError,
  tsConfigPath
}: {
  createPackagingError: CreatePackagingError;
  tsConfigPath?: string | undefined;
}): BunPlugin => {
  const projectCompilerOptions = readCompilerOptions({ createPackagingError, tsConfigPath });
  const compilerOptions: ts.CompilerOptions = {
    ...projectCompilerOptions,
    declaration: false,
    emitDeclarationOnly: false,
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
    ignoreDeprecations: projectCompilerOptions.ignoreDeprecations ?? '6.0',
    // Decorator helpers are inlined: importing them from `tslib` would add a runtime dependency the workload does
    // not declare, while the bundler inlines its own helpers for every file it transforms itself.
    importHelpers: false,
    // Emitting a source map here would be dropped anyway: the bundler does not chain an input map handed to it by
    // a plugin, so a transformed file is mapped to its transformed text under the original file name.
    inlineSourceMap: false,
    module: projectCompilerOptions.module ?? ts.ModuleKind.ESNext,
    noEmit: false,
    sourceMap: false
  };

  return {
    name: 'stacktape-typescript-decorator-metadata',
    setup(build) {
      build.onLoad({ filter: TYPESCRIPT_SOURCE_FILE }, async ({ path }) => {
        if (!isFileAccessible(path)) {
          return undefined;
        }
        const source = await readFile(path, 'utf8');
        if (!containsDecorator({ filePath: path, source })) {
          return undefined;
        }
        const transpiled = ts.transpileModule(source, {
          compilerOptions,
          fileName: path,
          reportDiagnostics: true
        });
        // Only diagnostics about the source itself are fatal. Complaints about the project's compiler options are
        // not: the bundler accepts those options, so requesting metadata must not start rejecting a project that
        // packages successfully without it.
        const errors = transpiled.diagnostics?.filter(
          (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error && diagnostic.file !== undefined
        );
        if (errors?.length) {
          throw createPackagingError({
            type: 'BUILD_CODE',
            message: `Failed to emit TypeScript decorator metadata for ${path}.\n${formatDiagnostics(errors)}`
          });
        }
        return {
          contents: transpiled.outputText,
          loader: path.endsWith('x') ? 'jsx' : 'js'
        };
      });
    }
  };
};
