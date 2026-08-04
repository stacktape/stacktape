import type { CloudFormationTypeInfo } from './cloudformation-type-metadata';

/** Emits the exact registry-resource-to-properties relationship used by the checked resource helper. */
export function generateCloudFormationResourceMap(generatedTypes: ReadonlyMap<string, CloudFormationTypeInfo>): string {
  const entries = [...generatedTypes.values()]
    .sort((left, right) => left.resourceType.localeCompare(right.resourceType))
    .map(({ resourceType, typeName }) => `  '${resourceType}': ${typeName};`)
    .join('\n');

  return `export type CloudFormationResourceProperties = {\n${entries}\n};\n\nexport type KnownCloudFormationResourceType = keyof CloudFormationResourceProperties;`;
}
