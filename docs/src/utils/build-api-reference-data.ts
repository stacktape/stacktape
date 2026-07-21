import { normalizeDefinition, type NormalizedDefinition, type NormalizedTypeInfo } from './api-reference-extractor';
import { buildApiReferenceTypeDeclaration } from './api-reference-typescript';

export type ApiReferenceGeneratedDefinition = NormalizedDefinition & {
  stats: {
    requiredCount: number;
    optionalCount: number;
  };
  typeDeclaration: string;
};

const collectReferencedTypeNames = (typeInfo: NormalizedTypeInfo, result = new Set<string>()) => {
  if (typeInfo.kind === 'array') {
    collectReferencedTypeNames(typeInfo.itemType, result);
  } else if (typeInfo.kind === 'reference') {
    result.add(typeInfo.typeName);
  } else if (typeInfo.kind === 'union') {
    for (const branch of typeInfo.branches) {
      if (branch.typeName) result.add(branch.typeName);
      for (const property of branch.properties) collectReferencedTypeNames(property.typeInfo, result);
    }
  }
  return result;
};

export const buildApiReferenceData = (configSchema: { definitions: Record<string, unknown> }) => {
  const definitions = configSchema.definitions as Record<string, any>;
  const generated: Record<string, ApiReferenceGeneratedDefinition> = {};

  for (const definitionName of Object.keys(definitions).sort()) {
    const definition = normalizeDefinition(definitionName, definitions);
    if (!definition || definition.properties.length === 0) continue;
    const requiredCount = definition.properties.filter((property) => property.required).length;
    generated[definitionName] = {
      ...definition,
      stats: {
        requiredCount,
        optionalCount: definition.properties.length - requiredCount
      },
      typeDeclaration: buildApiReferenceTypeDeclaration(definition)
    };
  }

  const unresolvedReferences: string[] = [];
  for (const definition of Object.values(generated)) {
    for (const property of definition.properties) {
      for (const referencedTypeName of collectReferencedTypeNames(property.typeInfo)) {
        if (!generated[referencedTypeName] && !definitions[referencedTypeName]) {
          unresolvedReferences.push(`${definition.definitionName} -> ${referencedTypeName}`);
        }
      }
    }
  }

  if (unresolvedReferences.length > 0) {
    throw new Error(
      `API reference data has unresolved referenced types:\n${unresolvedReferences.slice(0, 50).join('\n')}`
    );
  }

  return generated;
};
