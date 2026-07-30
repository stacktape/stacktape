import type { ResourceClassName } from '../../src/config-sdk/class-config';
import type { JSDocComment, PropertyInfo } from './types';
import { existsSync, readFileSync } from 'node:fs';

import * as ts from 'typescript';
import { MISC_TYPES_CONVERTIBLE_TO_CLASSES, RESOURCES_CONVERTIBLE_TO_CLASSES } from '../../src/config-sdk/class-config';
import { resolveConfigSourceFile, SHARED_CONFIG_SOURCE } from './config-sources';

function extractJSDocFromNode(node: ts.Node): JSDocComment | undefined {
  const jsDocTags = ts.getJSDocTags(node);
  const jsDocComments = ts.getJSDocCommentsAndTags(node);

  if (jsDocComments.length === 0) {
    return undefined;
  }

  const firstComment = jsDocComments[0];
  if (!ts.isJSDoc(firstComment)) {
    return undefined;
  }

  const description = firstComment.comment
    ? typeof firstComment.comment === 'string'
      ? firstComment.comment
      : firstComment.comment.map((part) => part.text).join('')
    : '';

  const tags = jsDocTags.map((tag) => ({
    tag: tag.tagName.text,
    value: tag.comment ? (typeof tag.comment === 'string' ? tag.comment : tag.comment.map((p) => p.text).join('')) : ''
  }));

  return {
    description: description.trim(),
    tags
  };
}

function findInterfaceDeclaration(
  interfaceName: string,
  sourceFile: ts.SourceFile
): ts.InterfaceDeclaration | undefined {
  return sourceFile.statements.find(
    (statement): statement is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) && statement.name.text === interfaceName
  );
}

/** The interfaces an interface extends, in declaration order. */
function heritageNamesOf(declaration: ts.InterfaceDeclaration): string[] {
  return (declaration.heritageClauses ?? [])
    .filter((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword)
    .flatMap((clause) => clause.types)
    .map((type) => (ts.isIdentifier(type.expression) ? type.expression.text : undefined))
    .filter((name): name is string => name !== undefined);
}

/**
 * Finds a property on an interface, following `extends` the way the compiler resolves it.
 *
 * Authored resource properties are routinely inherited: every workload's `connectTo` and `iamRoleStatements`
 * are declared once on `ResourceAccessProps`. A direct-members-only lookup silently returns nothing for them,
 * and the npm class generator then falls back to generic prose instead of the documented text.
 */
function findPropertyInInterface(
  interfaceName: string,
  propertyName: string,
  sourceFile: ts.SourceFile,
  resolveHeritage: (name: string) => ts.SourceFile | undefined,
  seen: Set<string> = new Set()
): PropertyInfo | undefined {
  if (seen.has(interfaceName)) {
    return undefined;
  }
  seen.add(interfaceName);

  const declaration = findInterfaceDeclaration(interfaceName, sourceFile);
  if (!declaration) {
    return undefined;
  }

  for (const member of declaration.members) {
    if (!ts.isPropertySignature(member) || !member.name || !ts.isIdentifier(member.name)) continue;
    if (member.name.text !== propertyName) continue;
    return {
      name: propertyName,
      type: member.type ? member.type.getText(sourceFile) : 'any',
      optional: member.questionToken !== undefined,
      jsdoc: extractJSDocFromNode(member)
    };
  }

  for (const baseName of heritageNamesOf(declaration)) {
    const baseSourceFile = resolveHeritage(baseName) ?? sourceFile;
    const inherited = findPropertyInInterface(baseName, propertyName, baseSourceFile, resolveHeritage, seen);
    if (inherited) return inherited;
  }

  return undefined;
}

/**
 * Cache for parsed source files to avoid re-parsing
 */
const sourceFileCache = new Map<string, ts.SourceFile>();

/**
 * Gets a TypeScript source file, using cache if available
 */
function getSourceFile(filePath: string): ts.SourceFile | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }

  if (sourceFileCache.has(filePath)) {
    return sourceFileCache.get(filePath);
  }

  const content = readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  sourceFileCache.set(filePath, sourceFile);

  return sourceFile;
}

/**
 * Extracts property information (including JSDoc) from a type definition
 * @param typeName - The name of the type/interface (e.g., 'LambdaFunctionProps')
 * @param propertyName - The name of the property (e.g., 'connectTo')
 * @param searchPaths - Paths to search for the type definition
 */
export function extractPropertyInfo(
  typeName: string,
  propertyName: string,
  searchPaths: string[]
): PropertyInfo | undefined {
  // A base interface may be declared in a different module from the one that extends it, so heritage lookup
  // searches the same set of files.
  const resolveHeritage = (name: string) =>
    searchPaths.map(getSourceFile).find((sourceFile) => sourceFile && findInterfaceDeclaration(name, sourceFile));

  for (const searchPath of searchPaths) {
    const sourceFile = getSourceFile(searchPath);
    if (!sourceFile) {
      continue;
    }

    const propertyInfo = findPropertyInInterface(typeName, propertyName, sourceFile, resolveHeritage);
    if (propertyInfo) {
      return propertyInfo;
    }
  }

  return undefined;
}

/**
 * Formats a JSDoc comment for code generation
 */
export function formatJSDoc(jsdoc: JSDocComment, indent: string = '  '): string {
  const lines: string[] = [];

  lines.push(`${indent}/**`);

  if (jsdoc.description) {
    // Split description into lines and add proper indentation
    const descriptionLines = jsdoc.description.split('\n');
    for (const line of descriptionLines) {
      lines.push(`${indent} * ${line}`);
    }
  }

  // Add tags if any
  for (const tag of jsdoc.tags) {
    if (tag.value) {
      lines.push(`${indent} * @${tag.tag} ${tag.value}`);
    } else {
      lines.push(`${indent} * @${tag.tag}`);
    }
  }

  lines.push(`${indent} */`);

  return lines.join('\n');
}

/**
 * Gets property info with JSDoc from SDK types
 * Searches common locations for SDK type definitions
 */
const PROPS_TYPE_SOURCES: Record<string, string> = {
  LambdaFunctionProps: 'functions.d.ts',
  WebServiceProps: 'web-services.d.ts',
  PrivateServiceProps: 'private-services.d.ts',
  WorkerServiceProps: 'worker-services.d.ts',
  ContainerWorkloadProps: 'multi-container-workloads.d.ts',
  BatchJobProps: 'batch-jobs.d.ts',
  StateMachineProps: 'state-machines.d.ts',
  // The script props are declared alongside the other shared authored types, not in a module of their own.
  LocalScriptProps: '__helpers.d.ts',
  BastionScriptProps: '__helpers.d.ts',
  LocalScriptWithBastionTunnelingProps: '__helpers.d.ts'
};

/**
 * Where a props interface is declared, plus the shared module, which is where the base interfaces that carry
 * inherited authored properties live.
 *
 * Every logical `.d.ts` name goes through `resolveConfigSourceFile`: the model is `.ts` modules in
 * `@stacktape/config` now, and joining the historical names onto that directory silently found nothing.
 */
export function getSDKPropertyInfo(typeName: string, propertyName: string): PropertyInfo | undefined {
  const declaringSource = PROPS_TYPE_SOURCES[typeName];
  const searchPaths = [...new Set([declaringSource, SHARED_CONFIG_SOURCE].filter(Boolean) as string[])].map(
    resolveConfigSourceFile
  );

  return extractPropertyInfo(typeName, propertyName, searchPaths);
}

/**
 * Finds an interface declaration and extracts its JSDoc
 */
function findInterfaceJSDoc(interfaceName: string, sourceFile: ts.SourceFile): JSDocComment | undefined {
  let result: JSDocComment | undefined;

  function visit(node: ts.Node) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      result = extractJSDocFromNode(node);
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return result;
}

// Build RESOURCE_INTERFACE_MAP from class-config (single source of truth)
const RESOURCE_INTERFACE_MAP: Record<string, { interfaceName: string; file: string }> = Object.fromEntries(
  RESOURCES_CONVERTIBLE_TO_CLASSES.map((r) => [
    // Use LambdaFunction for Function (exported name)
    r.className === 'Function' ? 'LambdaFunction' : r.className,
    { interfaceName: r.interfaceName, file: r.sourceFile }
  ])
);

/**
 * Extracts the JSDoc description for a resource class from its interface definition
 * @param className - The resource class name (e.g., 'LambdaFunction')
 * @returns The JSDoc comment or undefined if not found
 */
export function getResourceClassDescription(className: ResourceClassName): JSDocComment | undefined {
  const mapping = RESOURCE_INTERFACE_MAP[className as string];
  if (!mapping) {
    return undefined;
  }

  const filePath = resolveConfigSourceFile(mapping.file);
  const sourceFile = getSourceFile(filePath);

  if (!sourceFile) {
    return undefined;
  }

  return findInterfaceJSDoc(mapping.interfaceName, sourceFile);
}

// Build TYPE_PROPERTIES_INTERFACE_MAP from class-config (single source of truth)
const TYPE_PROPERTIES_INTERFACE_MAP: Record<string, { interfaceName: string; file: string }> = Object.fromEntries(
  MISC_TYPES_CONVERTIBLE_TO_CLASSES.map((t) => [t.className, { interfaceName: t.interfaceName, file: t.sourceFile }])
);

/**
 * Extracts the JSDoc description for a type-properties class from its interface definition
 * @param className - The type-properties class name (e.g., 'StacktapeLambdaBuildpackPackaging')
 * @returns The JSDoc comment or undefined if not found
 */
export function getTypePropertiesDescription(className: string): JSDocComment | undefined {
  const mapping = TYPE_PROPERTIES_INTERFACE_MAP[className];
  if (!mapping) {
    return undefined;
  }

  const filePath = resolveConfigSourceFile(mapping.file);
  const sourceFile = getSourceFile(filePath);

  if (!sourceFile) {
    return undefined;
  }

  return findInterfaceJSDoc(mapping.interfaceName, sourceFile);
}
