import { pascalCase } from 'change-case';
import type { NormalizedDefinition, NormalizedTypeInfo } from './api-reference-extractor';

const stripHtml = (value = '') =>
  value
    .replace(/<[^>]*>/g, '')
    .replaceAll('--stp-required--', '')
    .trim();

const typeInfoToTypescript = (
  typeInfo: NormalizedTypeInfo,
  aliases = new Map<NormalizedTypeInfo, string>()
): string => {
  const alias = aliases.get(typeInfo);
  if (alias) return alias;
  if (typeInfo.kind === 'array') return `Array<${typeInfoToTypescript(typeInfo.itemType, aliases)}>`;
  if (typeInfo.kind === 'reference') return typeInfo.typeName;
  if (typeInfo.kind === 'union') {
    return typeInfo.branches
      .map((branch) => branch.typeName || JSON.stringify(branch.label))
      .filter(Boolean)
      .join(' | ');
  }
  if (typeInfo.kind === 'primitive') {
    if (typeInfo.constValue !== undefined) return JSON.stringify(typeInfo.constValue);
    if (typeInfo.enumValues?.length) return typeInfo.enumValues.map((value) => JSON.stringify(value)).join(' | ');
    return typeInfo.types.map((type) => (type === 'integer' ? 'number' : type)).join(' | ');
  }
  return 'unknown';
};

const formatTsPropertyName = (name: string) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name));

const collectReferencedTypeNames = (typeInfo: NormalizedTypeInfo, result = new Set<string>()) => {
  if (typeInfo.kind === 'array') {
    collectReferencedTypeNames(typeInfo.itemType, result);
    return result;
  }
  if (typeInfo.kind === 'reference') {
    result.add(typeInfo.typeName);
    return result;
  }
  if (typeInfo.kind === 'union') {
    for (const branch of typeInfo.branches) {
      if (branch.typeName) result.add(branch.typeName);
    }
  }
  return result;
};

const getRootUnionTypeInfo = (typeInfo: NormalizedTypeInfo): NormalizedTypeInfo | null => {
  if (typeInfo.kind === 'union') return typeInfo;
  if (typeInfo.kind === 'array' && typeInfo.itemType.kind === 'union') return typeInfo.itemType;
  return null;
};

const getUniqueTypeAliasName = (preferredName: string, usedNames: Set<string>) => {
  let candidate = preferredName;
  let i = 2;
  while (usedNames.has(candidate)) {
    candidate = `${preferredName}Choices${i === 2 ? '' : i}`;
    i += 1;
  }
  usedNames.add(candidate);
  return candidate;
};

export const buildApiReferenceTypeDeclaration = (definition: NormalizedDefinition) => {
  const imports = new Set<string>();
  const aliases = new Map<NormalizedTypeInfo, string>();
  const rootName = definition.definitionName.replace(/Props$/, '');

  for (const property of definition.properties) {
    collectReferencedTypeNames(property.typeInfo, imports);
  }

  const usedNames = new Set([...imports, definition.definitionName]);
  for (const property of definition.properties) {
    const unionType = getRootUnionTypeInfo(property.typeInfo);
    if (unionType) {
      aliases.set(unionType, getUniqueTypeAliasName(`${rootName}${pascalCase(property.name)}`, usedNames));
    }
  }

  for (const alias of aliases.values()) {
    imports.delete(alias);
  }
  imports.delete(definition.definitionName);

  const lines = [`type ${definition.definitionName} = {`];
  for (const property of definition.properties) {
    const description = stripHtml(property.shortDescription);
    if (description) lines.push(`  /** ${description.replaceAll('*/', '* /')} */`);
    lines.push(
      `  ${formatTsPropertyName(property.name)}${property.required ? '' : '?'}: ${typeInfoToTypescript(
        property.typeInfo,
        aliases
      )};`
    );
  }
  lines.push('};');

  if (aliases.size > 0) {
    lines.push('');
    lines.push('/** Union choices used by the properties above. */');
    for (const [typeInfo, aliasName] of aliases.entries()) {
      if (typeInfo.kind !== 'union') continue;
      const members = typeInfo.branches
        .map((branch) => branch.typeName || JSON.stringify(branch.label))
        .filter(Boolean);
      lines.push(`type ${aliasName} =`);
      members.forEach((member) => lines.push(`  | ${member}`));
      lines[lines.length - 1] += ';';
      lines.push('');
    }
    if (lines[lines.length - 1] === '') lines.pop();
  }

  const importLine =
    imports.size > 0 ? `import type { ${Array.from(imports).sort().join(', ')} } from 'stacktape';\n\n` : '';

  return `${importLine}// [!code focus-start]\n${lines.join('\n')}\n// [!code focus-end]`;
};
