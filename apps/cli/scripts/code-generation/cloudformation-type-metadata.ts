import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export type CloudFormationTypeInfo = {
  /** The exact registry identifier, for example `AWS::ElasticLoadBalancingV2::TargetGroup`. */
  resourceType: string;
  /** Absolute path to the generated file containing the resource's property declarations. */
  filePath: string;
  /** Name exported by the generated per-resource file. */
  sourcePropertiesTypeName: string;
  /** Stable public alias emitted into `stacktape/cloudformation`. */
  typeName: string;
  /** Namespace containing this resource's reachable nested property types. */
  namespaceName: string;
};

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const resourceTypesPath = resolve(repositoryRoot, 'packages', 'cloudformation', 'generated', 'resource-types.ts');

let cachedTypes: ReadonlyMap<string, CloudFormationTypeInfo> | undefined;

function publicTypeName(importAlias: string): string {
  const withoutPropertiesSuffix = importAlias.replace(/Properties$/, '');
  return withoutPropertiesSuffix.replace(/^AWS/, 'Aws');
}

function loadCloudFormationTypes(): ReadonlyMap<string, CloudFormationTypeInfo> {
  if (cachedTypes) {
    return cachedTypes;
  }

  const sourceText = readFileSync(resourceTypesPath, 'utf8');
  const sourceFile = ts.createSourceFile(resourceTypesPath, sourceText, ts.ScriptTarget.Latest, true);
  const importedTypes = new Map<string, { modulePath: string; exportedName: string }>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const namedImports = statement.importClause?.namedBindings;
    if (!namedImports || !ts.isNamedImports(namedImports)) {
      continue;
    }
    for (const element of namedImports.elements) {
      importedTypes.set(element.name.text, {
        modulePath: statement.moduleSpecifier.text,
        exportedName: element.propertyName?.text ?? element.name.text
      });
    }
  }

  const propertyMap = sourceFile.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) && statement.name.text === 'CloudFormationResourceProperties'
  );
  if (!propertyMap || !ts.isTypeLiteralNode(propertyMap.type)) {
    throw new Error(`Could not find CloudFormationResourceProperties in ${resourceTypesPath}`);
  }

  const types = new Map<string, CloudFormationTypeInfo>();
  const publicNames = new Map<string, string>();
  for (const member of propertyMap.type.members) {
    if (
      !ts.isPropertySignature(member) ||
      !member.name ||
      !ts.isStringLiteral(member.name) ||
      !member.type ||
      !ts.isTypeReferenceNode(member.type) ||
      !ts.isIdentifier(member.type.typeName)
    ) {
      throw new Error(`Unsupported CloudFormation resource map entry: ${member.getText(sourceFile)}`);
    }

    const resourceType = member.name.text;
    const importAlias = member.type.typeName.text;
    const importedType = importedTypes.get(importAlias);
    if (!importedType) {
      throw new Error(`Missing import metadata for ${resourceType} (${importAlias})`);
    }

    const typeName = publicTypeName(importAlias);
    const previousResourceType = publicNames.get(typeName);
    if (previousResourceType) {
      throw new Error(
        `CloudFormation public type name ${typeName} is shared by ${previousResourceType} and ${resourceType}`
      );
    }
    publicNames.set(typeName, resourceType);

    types.set(resourceType, {
      resourceType,
      filePath: resolve(dirname(resourceTypesPath), `${importedType.modulePath}.ts`),
      sourcePropertiesTypeName: importedType.exportedName,
      typeName,
      namespaceName: `${typeName}Types`
    });
  }

  cachedTypes = types;
  return types;
}

export function getCloudFormationTypeInfo(cfType: string): CloudFormationTypeInfo | null {
  return loadCloudFormationTypes().get(cfType) ?? null;
}

export function getCloudFormationTypes(): ReadonlyMap<string, CloudFormationTypeInfo> {
  return loadCloudFormationTypes();
}

export function getPropertyNameFromLogicalName(logicalNameFunction: unknown): string | null {
  if (typeof logicalNameFunction === 'function' && logicalNameFunction.name) {
    return logicalNameFunction.name;
  }
  return null;
}
