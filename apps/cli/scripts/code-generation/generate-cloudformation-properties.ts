import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { getCloudFormationTypes, type CloudFormationTypeInfo } from './cloudformation-type-metadata';

export type PropertiesInterfacesResult = {
  content: string;
  generatedTypes: ReadonlyMap<string, CloudFormationTypeInfo>;
};

function indentDeclaration(declaration: string): string {
  return declaration
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

function renderResourceProperties(info: CloudFormationTypeInfo): string {
  const sourceText = readFileSync(info.filePath, 'utf8');
  const sourceFile = ts.createSourceFile(info.filePath, sourceText, ts.ScriptTarget.Latest, true);
  const declarations = sourceFile.statements.filter(ts.isTypeAliasDeclaration);

  if (!declarations.some((declaration) => declaration.name.text === info.sourcePropertiesTypeName)) {
    throw new Error(`${info.filePath} does not export ${info.sourcePropertiesTypeName}`);
  }

  const namespaceBody = declarations
    .map((declaration) => indentDeclaration(declaration.getText(sourceFile)))
    .join('\n\n');
  return `export namespace ${info.namespaceName} {\n${namespaceBody}\n}\n\nexport type ${info.typeName} = ${
    info.namespaceName
  }.${info.sourcePropertiesTypeName};`;
}

/**
 * Copies the generated resource-property types exposed by the checked `cfnResource` helper.
 * Exact registry identifiers remain attached to their property types throughout generation.
 */
export function generatePropertiesInterfaces(): PropertiesInterfacesResult {
  const generatedTypes = getCloudFormationTypes();
  const sortedTypes = [...generatedTypes.values()].sort((left, right) =>
    left.resourceType.localeCompare(right.resourceType)
  );
  return {
    content: sortedTypes.map(renderResourceProperties).join('\n\n'),
    generatedTypes
  };
}
