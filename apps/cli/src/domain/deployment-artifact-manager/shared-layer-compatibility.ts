import ts from 'typescript';
import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import type AdmZip from 'adm-zip';

export const archiveFiles = (zip: AdmZip, root: string): Map<string, Buffer> =>
  new Map(
    zip
      .getEntries()
      .filter((entry) => !entry.isDirectory)
      .map((entry) => [posix.join(root, entry.entryName), entry.getData()])
  );

type Module = { exports: Set<string>; imports: { path: string; names: string[] | null }[]; uncertain: boolean };

const scan = (path: string, data: Buffer): Module => {
  // TypeScript exposes parser diagnostics on the returned node, but omits them from its public SourceFile type.
  const source = ts.createSourceFile(
    path,
    data.toString(),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  ) as ts.SourceFile & {
    parseDiagnostics: readonly ts.Diagnostic[];
  };
  const result: Module = { exports: new Set(), imports: [], uncertain: source.parseDiagnostics.length > 0 };
  const local = (name: string) => name.startsWith('.') || name.startsWith('/opt/nodejs/chunks/');
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const target = statement.moduleSpecifier.text;
      if (!local(target)) continue;
      const clause = statement.importClause;
      const bindings = clause?.namedBindings;
      result.imports.push({
        path: target,
        names:
          bindings && ts.isNamespaceImport(bindings)
            ? null
            : [
                ...(clause?.name ? ['default'] : []),
                ...(bindings && ts.isNamedImports(bindings)
                  ? bindings.elements.map((element) => (element.propertyName ?? element.name).text)
                  : [])
              ]
      });
    } else if (ts.isExportDeclaration(statement)) {
      // Bun emits local export lists. Re-exports require full ESM binding resolution, so keep the bridge for them.
      if (statement.moduleSpecifier || !statement.exportClause || !ts.isNamedExports(statement.exportClause))
        result.uncertain = true;
      else for (const element of statement.exportClause.elements) result.exports.add(element.name.text);
    } else if (ts.isExportAssignment(statement)) result.exports.add('default');
    else if (
      ts.canHaveModifiers(statement) &&
      ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      if (ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword))
        result.exports.add('default');
      else if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name)
        result.exports.add(statement.name.text);
      else if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) result.exports.add(declaration.name.text);
          else result.uncertain = true;
        }
      } else result.uncertain = true;
    }
  }
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      const argument = node.arguments[0];
      if (!argument || !ts.isStringLiteralLike(argument)) result.uncertain = true;
      else if (local(argument.text)) result.imports.push({ path: argument.text, names: null });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
};

/** Prove module linking for both crossed generations, including imports between chunks and local function chunks. */
export const createSharedLayerCompatibilityCheck = () => {
  const modules = new Map<string, Module>();
  const fingerprints = new WeakMap<Buffer, string>();
  const moduleOf = (path: string, data: Buffer): Module => {
    let identity = fingerprints.get(data);
    if (!identity) {
      identity = createHash('sha256').update(data).digest('hex');
      fingerprints.set(data, identity);
    }
    let module = modules.get(identity);
    if (!module) {
      module = scan(path, data);
      modules.set(identity, module);
    }
    return module;
  };
  return ({
    oldFunction,
    nextFunction,
    oldLayers,
    nextLayers
  }: {
    oldFunction: Map<string, Buffer>;
    nextFunction: Map<string, Buffer>;
    oldLayers: Map<string, Buffer>;
    nextLayers: Map<string, Buffer>;
  }): { layerFirst: boolean; rollbackCompatible: boolean } => {
    const links = (
      functionFiles: Map<string, Buffer>,
      layerFiles: Map<string, Buffer>,
      referenceLayers: Map<string, Buffer>
    ) => {
      const files = new Map([...functionFiles, ...layerFiles]);
      const reference = new Map([...functionFiles, ...referenceLayers]);
      const pending = [...functionFiles.keys()].filter((path) => /\.(?:mjs|c?js)$/.test(path));
      const visited = new Set<string>();
      while (pending.length) {
        const path = pending.pop()!;
        if (visited.has(path)) continue;
        visited.add(path);
        const data = files.get(path)!;
        const module = moduleOf(path, data);
        if (module.uncertain) return false;
        for (const imported of module.imports) {
          const target = posix.isAbsolute(imported.path)
            ? imported.path
            : posix.resolve(posix.dirname(path), imported.path);
          const contents = files.get(target);
          if (!contents) return false;
          const dependency = moduleOf(target, contents);
          if (dependency.uncertain) return false;
          if (imported.names === null) {
            // Namespace consumers (including literal dynamic imports) may read any export. Their entire interface must
            // stay identical across generations; following the edge also checks the deferred chunk's dependencies.
            const original = reference.get(target);
            if (!original) return false;
            const previous = moduleOf(target, original);
            if (
              previous.uncertain ||
              previous.exports.size !== dependency.exports.size ||
              [...previous.exports].some((name) => !dependency.exports.has(name))
            )
              return false;
          } else if (imported.names.some((name) => !dependency.exports.has(name))) return false;
          pending.push(target);
        }
      }
      return true;
    };
    return {
      layerFirst: links(oldFunction, nextLayers, oldLayers),
      rollbackCompatible: links(nextFunction, oldLayers, nextLayers)
    };
  };
};

export const canUpdateSharedLayersFirst = (
  input: Parameters<ReturnType<typeof createSharedLayerCompatibilityCheck>>[0]
): boolean => createSharedLayerCompatibilityCheck()(input).layerFirst;
