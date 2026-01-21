import type { JSDocComment } from './types';
import { MISC_TYPES_CONVERTIBLE_TO_CLASSES } from '../../src/api/npm/ts/resource-metadata';
import { getTypePropertiesDescription } from './jsdoc-extractor';

/**
 * Formats a JSDoc comment for a constructor (with indentation)
 * @param description - JSDoc extracted from interface, or undefined
 * @param className - Class name for fallback
 * @param customJsdoc - Custom JSDoc string from class-config (takes priority)
 */
function formatConstructorJSDoc(
  description: JSDocComment | undefined,
  className: string,
  customJsdoc?: string
): string {
  const lines: string[] = ['  /**'];

  // Custom JSDoc from class-config takes priority
  if (customJsdoc) {
    lines.push(`   * ${customJsdoc}`);
  } else if (description?.description) {
    // Split description into lines and add proper indentation
    const descriptionLines = description.description.split('\n');
    for (const line of descriptionLines) {
      lines.push(`   * ${line}`);
    }
  } else {
    lines.push(`   * Create a ${className}`);
  }

  // Add tags if any (only if using extracted description)
  if (!customJsdoc && description?.tags) {
    for (const tag of description.tags) {
      if (tag.value) {
        lines.push(`   * @${tag.tag} ${tag.value}`);
      } else {
        lines.push(`   * @${tag.tag}`);
      }
    }
  }

  lines.push('   */');
  return lines.join('\n');
}

/**
 * Generate type/properties class declarations
 */
export function generateTypePropertiesClassDeclarations(): string {
  return MISC_TYPES_CONVERTIBLE_TO_CLASSES.map(({ className, typeValue, propsType, typeOnly, jsdoc }) => {
    const description = getTypePropertiesDescription(className);
    const constructorJsDoc = formatConstructorJSDoc(description, className, jsdoc);

    // For type-only classes, extend BaseTypeOnly and have no constructor params
    if (typeOnly) {
      return `
export declare class ${className} extends BaseTypeOnly {
${constructorJsDoc}
  constructor();
  readonly type: '${typeValue}';
}`;
    }

    return `
export declare class ${className} extends BaseTypeProperties {
${constructorJsDoc}
  constructor(properties: import('./plain').${propsType});
  readonly type: '${typeValue}';
}`;
  }).join('\n');
}

/**
 * Get unique props types from type properties (for importing from plain types)
 */
export function getTypePropertiesImports(propsWithAugmentation: string[]): string[] {
  const typePropertiesAlreadyImported: string[] = [];
  const imports = MISC_TYPES_CONVERTIBLE_TO_CLASSES.map(({ propsType }) => {
    // Skip script props as they're being augmented (imported with Plain prefix)
    if (propsWithAugmentation.includes(propsType)) {
      return null;
    }
    if (typePropertiesAlreadyImported.includes(propsType)) {
      return null;
    }
    typePropertiesAlreadyImported.push(propsType);
    return propsType;
  }).filter(Boolean) as string[];

  return imports;
}
