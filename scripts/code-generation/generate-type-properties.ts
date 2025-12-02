import type { JSDocComment } from './types';
import { MISC_TYPES_CONVERTIBLE_TO_CLASSES } from '../../src/api/npm/ts/resource-metadata';
import { getTypePropertiesDescription } from './jsdoc-extractor';

/**
 * Formats a JSDoc comment for a constructor (with indentation)
 */
function formatConstructorJSDoc(description: JSDocComment | undefined, className: string): string {
  const lines: string[] = ['  /**'];

  if (description?.description) {
    // Split description into lines and add proper indentation
    const descriptionLines = description.description.split('\n');
    for (const line of descriptionLines) {
      lines.push(`   * ${line}`);
    }
  } else {
    lines.push(`   * Create a ${className}`);
  }

  // Add tags if any
  if (description?.tags) {
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
  return MISC_TYPES_CONVERTIBLE_TO_CLASSES.map(({ className, typeValue, propsType }) => {
    const description = getTypePropertiesDescription(className);
    const constructorJsDoc = formatConstructorJSDoc(description, className);

    return `
export declare class ${className} extends BaseTypeProperties {
${constructorJsDoc}
  constructor(properties: ${propsType});
  readonly type: '${typeValue}';
}`;
  }).join('\n');
}

/**
 * Get unique props types from type properties (for importing from SDK)
 */
export function getTypePropertiesImports(sdkPropsWithAugmentation: string[]): string[] {
  const typePropertiesAlreadyImported: string[] = [];
  const imports = MISC_TYPES_CONVERTIBLE_TO_CLASSES.map(({ propsType }) => {
    // Skip script props as they're being augmented (imported with Sdk prefix)
    if (sdkPropsWithAugmentation.includes(propsType)) {
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
