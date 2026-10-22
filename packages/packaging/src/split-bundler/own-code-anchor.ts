/**
 * Keeps the project's own shared code and installed packages in separate chunks.
 *
 * Bun puts modules reached by exactly the same entry points into one chunk, so a shared `lib/orders.ts` and the
 * `stripe` it imports usually share a chunk. The shared layer then changes, and must be published again, whenever
 * the project's own shared code changes. An extra entry point that uses what the own code uses from installed
 * packages makes every installed module reachable from one more entry than any own module, so no chunk holds both.
 * The anchor reads exactly the members the own code reads, so tree shaking keeps the same code. Its output is
 * discarded.
 *
 * Separate chunks run in import order: the packages' chunk runs before the own code that imports it. The anchor is
 * therefore used only when the own modules this moves behind packages declare things and run no setup code, such as
 * setting `process.env` or starting instrumentation that packages must see when they load.
 */
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import type { BunPlugin } from 'bun';
import type { BuildMetafile } from './types';

/** The anchor's entry point. No file has this name; the plugin below provides the module. */
export const OWN_CODE_ANCHOR_ENTRY = 'stacktape-own-code-anchor';

/** The anchor's emitted file or its source map, or its entry point as the metafile names it. */
export const isOwnCodeAnchorOutput = (path: string) =>
  basename(path).startsWith(`${OWN_CODE_ANCHOR_ENTRY}.`) || path.startsWith(`${OWN_CODE_ANCHOR_ENTRY}:`);

/** Serves the anchor entry point with the given source. */
export const createOwnCodeAnchorPlugin = (source: string): BunPlugin => ({
  name: 'stp-own-code-anchor',
  setup(build) {
    build.onResolve({ filter: new RegExp(`^${OWN_CODE_ANCHOR_ENTRY}$`) }, () => ({
      path: OWN_CODE_ANCHOR_ENTRY,
      namespace: OWN_CODE_ANCHOR_ENTRY
    }));
    build.onLoad({ filter: /.*/, namespace: OWN_CODE_ANCHOR_ENTRY }, () => ({ contents: source, loader: 'js' }));
  }
});

/** An installed package's file, by its path in the metafile. */
export const isInstalledPackagePath = (path: string) => /(?:^|[\\/])node_modules[\\/]/.test(path);

/** A module a plugin provides under its own namespace, such as `stacktape-bun-ffi-shim:bun:ffi`. */
const isVirtualModule = (path: string) => /^[\w-]+:/.test(path) && !/^[a-z]:[\\/]/i.test(path);

/** A source file of the project, rather than an installed package or a plugin's module. */
export const isOwnSourcePath = (path: string) => !isInstalledPackagePath(path) && !isVirtualModule(path);

/** A package module that runs where it is placed. Bun wraps CommonJS and runs it when it is first required. */
const runsInPlace = (metafile: BuildMetafile, path: string) =>
  isInstalledPackagePath(path) && metafile.inputs[path]?.format !== 'cjs' && !path.endsWith('.json');

/** The bytes of installed packages' code in a build's outputs, the anchor's own output left out. */
export const getPackageBytes = (metafile: BuildMetafile) =>
  Object.entries(metafile.outputs)
    .filter(
      ([path, { entryPoint }]) => !isOwnCodeAnchorOutput(path) && !(entryPoint && isOwnCodeAnchorOutput(entryPoint))
    )
    .flatMap(([, { inputs }]) => Object.entries(inputs))
    .reduce((sum, [path, { bytesInOutput }]) => sum + (isInstalledPackagePath(path) ? bytesInOutput : 0), 0);

/** Whether any chunk holds both own code and installed packages. */
export const hasMixedChunk = (metafile: BuildMetafile) =>
  Object.values(metafile.outputs).some(({ inputs, entryPoint }) => {
    const paths = Object.keys(inputs);
    return !entryPoint && paths.some(isOwnSourcePath) && paths.some(isInstalledPackagePath);
  });

/** What a source file takes from one specifier: whole bindings, or only some members of a binding. */
type ImportUse = { imported: string; members?: Set<string> };

type SourceSummary = {
  /** By specifier as written. `*` as `imported` is the namespace. */
  imports: Map<string, ImportUse[]>;
  /** The file runs statements other than declarations when it loads. */
  runsSetupCode: boolean;
};

const SCRIPT_KINDS: Record<string, 'TS' | 'TSX' | 'JS' | 'JSX'> = {
  '.ts': 'TS',
  '.mts': 'TS',
  '.cts': 'TS',
  '.tsx': 'TSX',
  '.js': 'JS',
  '.mjs': 'JS',
  '.cjs': 'JS',
  '.jsx': 'JSX'
};

/** The imports and top-level behavior of a source file, or `undefined` when it is not a script this can read. */
const readSource = async (path: string): Promise<SourceSummary | undefined> => {
  const scriptKind = SCRIPT_KINDS[extname(path)];
  if (!scriptKind) return undefined;
  const { default: ts } = await import('typescript');
  const text = await readFile(path, 'utf8').catch(() => undefined);
  if (text === undefined) return undefined;
  const sourceFile = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind[scriptKind]);

  const imports = new Map<string, ImportUse[]>();
  const add = (specifier: string, use: ImportUse) => imports.set(specifier, [...(imports.get(specifier) ?? []), use]);
  // Local names bound to package imports, whose uses decide whether members suffice.
  const locals = new Map<string, ImportUse>();
  // Names the file declares at the top level. Setting a property of one, as Prisma's generated client fills in its
  // `config`, changes only the module itself.
  const declared = new Set(
    sourceFile.statements.flatMap((statement) =>
      ts.isVariableStatement(statement)
        ? statement.declarationList.declarations.flatMap(({ name }) => (ts.isIdentifier(name) ? [name.text] : []))
        : (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name
          ? [statement.name.text]
          : []
    )
  );
  const rootOf = (expression: import('typescript').Expression): import('typescript').Expression =>
    ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)
      ? rootOf(expression.expression)
      : expression;
  const propertyName = (expression: import('typescript').Expression) =>
    ts.isPropertyAccessExpression(expression)
      ? expression.name.text
      : ts.isElementAccessExpression(expression) && ts.isStringLiteral(expression.argumentExpression)
        ? expression.argumentExpression.text
        : undefined;
  /** Assigns to a property of the module's own declaration, or sets the CommonJS path globals an ESM build shims. */
  const changesOnlyItself = (expression: import('typescript').Expression) => {
    if (!ts.isBinaryExpression(expression)) return false;
    const { left, operatorToken } = expression;
    if (operatorToken.kind < ts.SyntaxKind.FirstAssignment || operatorToken.kind > ts.SyntaxKind.LastAssignment) {
      return false;
    }
    const root = rootOf(left);
    if (root === left || !ts.isIdentifier(root)) return false;
    if (declared.has(root.text)) return true;
    return root.text === 'globalThis' && ['__dirname', '__filename'].includes(propertyName(left) ?? '');
  };
  let runsSetupCode = false;
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      const clause = statement.importClause;
      if (!clause || clause.isTypeOnly) continue;
      if (clause.name) {
        const use = { imported: 'default', members: new Set<string>() };
        locals.set(clause.name.text, use);
        add(specifier, use);
      }
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        const use = { imported: '*', members: new Set<string>() };
        locals.set(bindings.name.text, use);
        add(specifier, use);
      } else if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          if (element.isTypeOnly) continue;
          const use = { imported: (element.propertyName ?? element.name).text, members: new Set<string>() };
          locals.set(element.name.text, use);
          add(specifier, use);
        }
      }
    } else if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      if (statement.isTypeOnly) continue;
      const clause = statement.exportClause;
      if (!clause || ts.isNamespaceExport(clause)) add(statement.moduleSpecifier.text, { imported: '*' });
      else {
        for (const element of clause.elements) {
          if (!element.isTypeOnly)
            add(statement.moduleSpecifier.text, { imported: (element.propertyName ?? element.name).text });
        }
      }
    } else if (
      !ts.isImportDeclaration(statement) &&
      !ts.isExportDeclaration(statement) &&
      !ts.isExportAssignment(statement) &&
      !ts.isImportEqualsDeclaration(statement) &&
      !ts.isFunctionDeclaration(statement) &&
      !ts.isClassDeclaration(statement) &&
      !ts.isVariableStatement(statement) &&
      !ts.isInterfaceDeclaration(statement) &&
      !ts.isTypeAliasDeclaration(statement) &&
      !ts.isEnumDeclaration(statement) &&
      !ts.isModuleDeclaration(statement) &&
      !ts.isEmptyStatement(statement) &&
      !(
        ts.isExpressionStatement(statement) &&
        (ts.isStringLiteral(statement.expression) || changesOnlyItself(statement.expression))
      )
    ) {
      runsSetupCode = true;
    }
  }

  // A binding read only as `binding.member` needs only those members. Any other use needs the binding itself.
  const visit = (node: import('typescript').Node) => {
    if (ts.isIdentifier(node) && locals.has(node.text)) {
      const use = locals.get(node.text)!;
      const parent = node.parent;
      if (ts.isPropertyAccessExpression(parent) && parent.expression === node) use.members?.add(parent.name.text);
      // `z.infer<typeof schema>` and `typeof z` name types, which leave no code.
      else if (ts.isQualifiedName(parent) || ts.isTypeQueryNode(parent)) {
        // Types only.
      } else if (
        !ts.isImportClause(parent) &&
        !ts.isImportSpecifier(parent) &&
        !ts.isNamespaceImport(parent) &&
        !(ts.isPropertyAccessExpression(parent) && parent.name === node) &&
        !(ts.isPropertyAssignment(parent) && parent.name === node)
      ) {
        delete use.members;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { imports, runsSetupCode };
};

/**
 * The source of the anchor entry for a build whose metafile is given. `undefined` when no own source shares a chunk
 * with an installed package, or when separating them could change the order in which setup code runs.
 * `resolveInput` turns a metafile path into an absolute path.
 */
export const createOwnCodeAnchorSource = async ({
  metafile,
  resolveInput
}: {
  metafile: BuildMetafile;
  resolveInput: (path: string) => string;
}): Promise<string | undefined> => {
  const mixedChunks = Object.values(metafile.outputs)
    .filter(({ entryPoint }) => !entryPoint)
    .map(({ inputs }) => Object.keys(inputs))
    .filter((paths) => paths.some(isOwnSourcePath) && paths.some(isInstalledPackagePath));
  // The metafile lists a chunk's inputs in the order the chunk runs them. Own modules followed by package modules
  // that run in place will run after those packages once the two are separated.
  const movedBehindPackages = new Set(
    mixedChunks.flatMap((paths) => {
      const lastInPlacePackage = paths.findLastIndex((path) => runsInPlace(metafile, path));
      return paths.slice(0, Math.max(lastInPlacePackage, 0)).filter(isOwnSourcePath);
    })
  );
  const ownSources = mixedChunks.flat().filter(isOwnSourcePath);
  const summaries = new Map(
    await Promise.all(ownSources.map(async (path) => [path, await readSource(resolveInput(path))] as const))
  );
  // A file this cannot read could run anything.
  if ([...movedBehindPackages].some((path) => summaries.get(path)?.runsSetupCode !== false)) return undefined;

  let index = 0;
  const statements = ownSources.flatMap((path) => {
    const summary = summaries.get(path);
    return metafile.inputs[path]!.imports.filter(
      ({ path: imported, kind, external }) =>
        !external && kind === 'import-statement' && isInstalledPackagePath(imported) && !imported.endsWith('.json')
    ).flatMap(({ path: imported, original }) => {
      // Windows paths keep backslashes, which an import specifier would read as escapes.
      const target = JSON.stringify(resolveInput(imported).replaceAll('\\', '/'));
      const uses = (original && summary?.imports.get(original)) || [{ imported: '*' }];
      // A binding the code never reads as a value, such as one used only in types, needs nothing.
      return uses.flatMap(({ imported: name, members }) => {
        if (members && !members.size) return [];
        const exported = `__stp${index++}`;
        if (members?.size) {
          const local = `${exported}_binding`;
          const binding = name === '*' ? `* as ${local}` : `{ ${name} as ${local} }`;
          return `import ${binding} from ${target};\nexport const ${exported} = [${[...members].map((member) => `${local}.${member}`).join(', ')}];`;
        }
        return name === '*'
          ? `export * as ${exported} from ${target};`
          : `export { ${name} as ${exported} } from ${target};`;
      });
    });
  });
  return statements.length ? statements.join('\n') : undefined;
};
