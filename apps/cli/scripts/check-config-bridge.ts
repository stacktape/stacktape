import { readFileSync } from 'node:fs';
import { join, normalize, relative, resolve, sep } from 'node:path';
import {
  CONFIG_BRIDGE_PATH,
  CONFIG_PACKAGE_SRC_PATH,
  RETAINED_AMBIENT_CONFIG_PATH
} from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '@shared/utils/logging';
import * as ts from 'typescript';
import { buildConfigBridge, readPackageDeclarations } from './generate-config-bridge';

/**
 * Progress metric and invariant for the temporary ambient bridge.
 *
 * A file depends on the bridge when one of its identifiers resolves to a symbol whose declaration is in the
 * generated bridge file. That is a compiler question, so it is answered with a compiler: the previous
 * token-matching version counted comments, string literals and same-named locals, and skipped a whole file as
 * soon as it contained a single explicit config import even when other names were still global.
 */
export type BridgeUsage = {
  /** Files that resolve at least one identifier to the bridge, keyed by top-level CLI directory. */
  filesByCluster: Map<string, string[]>;
  /** Distinct configuration type names still reached through the global scope. */
  referencedNames: Set<string>;
};

const CLI_CLUSTERS = ['src', 'shared', 'helper-lambdas', 'scripts', 'tests', 'types'];

/** Builds the CLI program exactly as `tsc -p tsconfig.json` would, so symbols resolve the way they really do. */
export const createCliProgram = (projectRoot: string): ts.Program => {
  const configPath = join(projectRoot, 'tsconfig.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, ' '));
  }
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, projectRoot);
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, ' ')).join('\n'));
  }
  return ts.createProgram(parsed.fileNames, parsed.options);
};

/**
 * Resolves every identifier in the CLI program and records the ones whose declaration lives in the bridge.
 */
export const measureBridgeUsage = (program: ts.Program, bridgePath: string, projectRoot: string): BridgeUsage => {
  const checker = program.getTypeChecker();
  const bridge = resolve(bridgePath);
  const filesByCluster = new Map<string, string[]>();
  const referencedNames = new Set<string>();

  for (const sourceFile of program.getSourceFiles()) {
    // Repository-owned declaration files count too: `types/**` is full of resolved-model declarations written
    // against the configuration types, and skipping them reported "delete the bridge" while dozens of `.d.ts`
    // consumers still resolved its symbols. Only the bridge itself, third-party packages and the TypeScript
    // default libraries are excluded.
    if (resolve(sourceFile.fileName) === bridge) continue;
    if (sourceFile.fileName.includes('node_modules')) continue;
    if (program.isSourceFileDefaultLibrary(sourceFile)) continue;
    if (!resolve(sourceFile.fileName).startsWith(resolve(projectRoot))) continue;

    const namesInFile = new Set<string>();
    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node)) {
        const symbol = checker.getSymbolAtLocation(node);
        const declaredInBridge = symbol
          ?.getDeclarations()
          ?.some((declaration) => resolve(declaration.getSourceFile().fileName) === bridge);
        if (declaredInBridge) namesInFile.add(node.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    if (namesInFile.size === 0) continue;
    for (const name of namesInFile) referencedNames.add(name);

    const relativePath = relative(projectRoot, sourceFile.fileName);
    const cluster = relativePath.split(sep)[0] ?? '.';
    filesByCluster.set(cluster, [...(filesByCluster.get(cluster) ?? []), relativePath]);
  }

  return { filesByCluster, referencedNames };
};

/** Names still declared by hand in the retained ambient configuration declarations. */
export const readRetainedAmbientNames = (directoryPath: string): Map<string, string[]> => {
  const declared = new Map<string, string[]>();
  const files = ts.sys.readDirectory(directoryPath, ['.ts'], undefined, undefined, 1);
  for (const file of files) {
    const sourceFile = ts.createSourceFile(file, readFileSync(file, 'utf-8'), ts.ScriptTarget.Latest, true);
    for (const statement of sourceFile.statements) {
      const named =
        ts.isTypeAliasDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement);
      if (!named || !statement.name) continue;
      const name = statement.name.text;
      declared.set(name, [...(declared.get(name) ?? []), relative(directoryPath, file)]);
    }
  }
  return declared;
};

/** The only cluster that contains declarations still allowed to reach configuration types through the global scope. */
export const DECLARATION_CLUSTER = 'types';

/**
 * The invariant for this phase: ordinary sources import `@stacktape/config` directly, and only the ambient
 * declarations in `types/**` still resolve through the bridge.
 *
 * Those declaration files have global semantics — adding an import would turn them into modules, and an inline
 * `import(...)` type is not legal everywhere they need one (heritage clauses in particular) — so they migrate
 * in the slice that gives their declarations real owners. Until then this stops the source clusters from
 * silently growing a new global dependency.
 */
export const assertBridgeIsDeclarationOnly = (filesByCluster: Map<string, string[]>) => {
  const sourceConsumers = [...filesByCluster].flatMap(([cluster, files]) =>
    files.filter((file) => cluster !== DECLARATION_CLUSTER || !normalize(file).endsWith('.d.ts'))
  );

  if (sourceConsumers.length > 0) {
    throw new Error(
      `${sourceConsumers.length} ordinary source file(s) resolve a configuration type from the ambient bridge. ` +
        `Import it directly instead, for example \`import type { LambdaFunction } from '@stacktape/config/functions'\`:\n  ` +
        sourceConsumers.sort().slice(0, 20).join('\n  ')
    );
  }
};

const checkConfigBridge = () => {
  const declarations = readPackageDeclarations(CONFIG_PACKAGE_SRC_PATH);
  const owned = new Set(declarations.map(({ name }) => name));

  if (readFileSync(CONFIG_BRIDGE_PATH, 'utf-8') !== buildConfigBridge(declarations)) {
    throw new Error('The config bridge is stale. Run `bun run gen:config:bridge`.');
  }

  // A configuration type declared by hand in `types/` again would shadow the package and silently re-fork the
  // model, which is how packages/packaging drifted in the first place.
  const reDeclared = [...readRetainedAmbientNames(RETAINED_AMBIENT_CONFIG_PATH)]
    .filter(([name]) => owned.has(name))
    .map(([name, files]) => `${files.join(', ')}: ${name}`);
  if (reDeclared.length > 0) {
    throw new Error(
      `These ambient declarations re-declare types @stacktape/config already owns:\n  ${reDeclared.join('\n  ')}`
    );
  }

  const { filesByCluster, referencedNames } = measureBridgeUsage(
    createCliProgram(process.cwd()),
    CONFIG_BRIDGE_PATH,
    process.cwd()
  );
  const dependentFiles = [...filesByCluster.values()].reduce((total, files) => total + files.length, 0);

  logInfo(`@stacktape/config owns ${owned.size} declarations; the bridge aliases all of them.`);
  for (const cluster of CLI_CLUSTERS) {
    const files = filesByCluster.get(cluster) ?? [];
    if (files.length > 0)
      logInfo(`  ${cluster}: ${files.length} files still resolve configuration types from the bridge`);
  }
  logInfo(`  ${referencedNames.size} of ${owned.size} bridged names are still referenced globally.`);

  if (dependentFiles === 0) {
    logSuccess(
      'No repository source or declaration file resolves a configuration type from the bridge. Delete it, this check and the generator.'
    );
    return;
  }

  assertBridgeIsDeclarationOnly(filesByCluster);
  logSuccess(
    `The bridge is declaration-only: ${dependentFiles} ambient declaration files in \`${DECLARATION_CLUSTER}\` still resolve configuration types from it.`
  );
};

if (import.meta.main) {
  checkConfigBridge();
}
