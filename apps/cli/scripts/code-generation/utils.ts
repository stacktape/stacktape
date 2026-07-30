import type { JsonSchemaGenerator } from 'typescript-json-schema';
import { dirname, join, resolve } from 'node:path';
import { CONFIG_PACKAGE_SRC_PATH, CONFIG_SCHEMA_PATH } from '@shared/naming/project-fs-paths';
import { logInfo } from '@shared/utils/logging';
import fastGlob from 'fast-glob';
import { readJson, writeJSON } from 'fs-extra';
import { compile as compileJsonSchemaToTypescript } from 'json-schema-to-typescript';
import * as ts from 'typescript';
import { buildGenerator, getProgramFromFiles } from 'typescript-json-schema';

/**
 * File-system enumeration order differs between operating systems. TypeScript assigns internal type IDs while
 * constructing the program, and typescript-json-schema can reflect that order in emitted unions. Compare normalized
 * relative paths explicitly so the same canonical inputs produce the same schema on Windows and Linux.
 */
export const sortConfigSchemaSourcePaths = (paths: string[]) =>
  [...paths].sort((left, right) => {
    const normalizedLeft = left.replaceAll('\\', '/');
    const normalizedRight = right.replaceAll('\\', '/');
    return normalizedLeft < normalizedRight ? -1 : normalizedLeft > normalizedRight ? 1 : 0;
  });

/**
 * The files the published config schema is generated from: `@stacktape/config`, which owns the authored
 * configuration model, plus the CLI's remaining ambient declarations.
 *
 * The CLI's `src/**` used to be part of this program because the ambient model reached back into it through
 * `typeof import('../../src/...')`. Those back-edges are gone, and the implementation never described the
 * configuration format, so it is no longer compiled here. Dropping it takes the program from 568 files to 112
 * and produces the same schema.
 *
 * Discovery fails closed. An empty match used to mean "generate whatever the remaining files happen to
 * describe", which silently produces a smaller schema; the model moving out of `types/` is exactly the kind
 * of change that would otherwise pass unnoticed.
 */
export const findConfigSchemaSourceFiles = async (rootDir = process.cwd()) => {
  const groups = [
    { name: 'CLI ambient declarations', cwd: rootDir, pattern: 'types/**/*' },
    { name: '@stacktape/config', cwd: CONFIG_PACKAGE_SRC_PATH, pattern: '**/*' }
  ];

  const matched = await Promise.all(
    groups.map(async ({ name, cwd, pattern }) => {
      const files = sortConfigSchemaSourcePaths(
        (await fastGlob(pattern, { cwd, dot: true })).filter(
          (file) => file.endsWith('.ts') && !file.endsWith('.acceptance.ts')
        )
      ).map((file) => resolve(cwd, file));
      if (files.length === 0) {
        throw new Error(`No TypeScript files found for ${name} (${pattern} in ${cwd}).`);
      }
      return files;
    })
  );

  return matched.flat();
};

export const getJsonSchemaGenerator = async (rootDir = process.cwd()) => {
  const sourceFiles = await findConfigSchemaSourceFiles(rootDir);
  const compilerOptions = { ...(await readJson(join(rootDir, 'tsconfig.json'))).compilerOptions };

  logInfo('Building JSON schema generator');
  assertConfigPackageCompiles();

  const tsProgram = getProgramFromFiles(sourceFiles, compilerOptions);

  // `ignoreErrors` covers the CLI sources, which are compiled here without their path aliases and have never
  // been diagnostic-clean in this program. It must not hide a broken configuration model, so the package is
  // checked separately above. The check uses its own program on purpose: requesting diagnostics from the
  // generator's program reorders the unions it emits.
  return buildGenerator(tsProgram, {
    required: true,
    ignoreErrors: true,
    noExtraProps: true
  });
};

/**
 * Fails on any error inside `@stacktape/config`; errors elsewhere are the pre-existing `ignoreErrors` baseline.
 *
 * The package is compiled with its own `tsconfig.json` — its real file list and its real options, including the
 * deliberate `exactOptionalPropertyTypes: false` — rather than an approximation maintained in two places.
 *
 * It builds its own program rather than reusing the generator's for two reasons: `typescript-json-schema` bundles
 * its own older TypeScript, whose programs cannot be inspected with this repository's compiler, and asking the
 * generator's program for diagnostics reorders the unions it emits.
 */
const assertConfigPackageCompiles = () => {
  const configPath = join(CONFIG_PACKAGE_SRC_PATH, '..', 'tsconfig.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(`Cannot read ${configPath}: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, ' ')}`);
  }
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, dirname(configPath));
  if (parsed.errors.length > 0) {
    throw new Error(
      `Cannot parse ${configPath}: ${parsed.errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, ' ')).join('; ')}`
    );
  }
  if (parsed.fileNames.length === 0) {
    throw new Error(`${configPath} resolves to no source files. Refusing to generate a schema from nothing.`);
  }

  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
  const packageErrors = ts
    .getPreEmitDiagnostics(program)
    .map(
      (diagnostic) =>
        `${diagnostic.file?.fileName ?? '<program>'}: TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`
    );

  if (packageErrors.length > 0) {
    throw new Error(`@stacktape/config does not compile:\n${packageErrors.slice(0, 20).join('\n')}`);
  }
};

export const generateConfigSchema = async ({ jsonSchemaGenerator }: { jsonSchemaGenerator?: JsonSchemaGenerator }) => {
  const typescriptGenerator = jsonSchemaGenerator || (await getJsonSchemaGenerator());
  const jsonSchema = typescriptGenerator.getSchemaForSymbol('StacktapeConfig');
  await writeJSON(CONFIG_SCHEMA_PATH, jsonSchema);

  return jsonSchema;
};

export const getTsTypeDef = async ({
  newTypeName,
  typeName,
  jsonSchemaGenerator
}: {
  typeName: string;
  newTypeName: string;
  jsonSchemaGenerator?: JsonSchemaGenerator;
}) => {
  const generator = jsonSchemaGenerator || (await getJsonSchemaGenerator());
  const jsonSchema = generator.getSchemaForSymbol(typeName);
  const res = await compileJsonSchemaToTypescript(jsonSchema as any, newTypeName, {
    unknownAny: false // Use 'any' instead of '{ [k: string]: unknown }' for untyped fields
  });
  return res.split('\n').slice(7).join('\n');
};
