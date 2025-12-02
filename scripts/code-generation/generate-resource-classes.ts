import type { JSDocComment, ReferenceableParam, ReferenceableParamsMap } from './types';
import { getResourcesWithAugmentedProps, RESOURCES_CONVERTIBLE_TO_CLASSES } from '../../src/api/npm/ts/resource-metadata';
import { getResourceClassDescription } from './jsdoc-extractor';

/**
 * Generates getter declarations for a resource's referenceable parameters
 */
function generateGetters(params: ReferenceableParam[]): string {
  if (params.length === 0) {
    return '';
  }

  return params
    .map((param) => {
      return `  /** ${param.description} */\n  readonly ${param.name}: string;`;
    })
    .join('\n');
}

/**
 * Determines the props type to use for a resource constructor
 */
function determinePropsType(propsType: string, hasAugmentedProps: boolean): string {
  return hasAugmentedProps ? propsType : `${propsType}WithOverrides`;
}

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
    lines.push(`   * Create a ${className} resource`);
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
 * Generates a single resource class declaration with constructor overloads.
 * Supports both:
 * - new Resource(properties) - name derived from object key
 * - new Resource(name, properties) - explicit name (backwards compatible)
 *
 * The description is added to the constructor so it shows when hovering over `new ClassName()`
 */
function generateResourceClass(
  className: string,
  propsType: string,
  resourceType: string,
  hasAugmentedProps: boolean,
  referenceableParams: ReferenceableParam[],
  description: JSDocComment | undefined
): string {
  const finalPropsType = determinePropsType(propsType, hasAugmentedProps);
  const getters = generateGetters(referenceableParams);
  const constructorJsDoc = formatConstructorJSDoc(description, className);

  const parts = [
    '',
    `export declare class ${className} extends BaseResource {`,
    constructorJsDoc,
    `  constructor(properties: ${finalPropsType});`,
    `  constructor(name: string, properties: ${finalPropsType});`,
    getters,
    '}'
  ];

  return parts.filter(Boolean).join('\n');
}

/**
 * Generate resource class declarations for all resources
 */
export function generateResourceClassDeclarations(REFERENCEABLE_PARAMS: ReferenceableParamsMap): string {
  const resourcesWithAugmented = getResourcesWithAugmentedProps();
  const augmentedPropsTypes = new Set(resourcesWithAugmented.map((r) => r.propsType));

  const classDeclarations = RESOURCES_CONVERTIBLE_TO_CLASSES.map(({ className, resourceType, propsType }) => {
    const params = REFERENCEABLE_PARAMS[resourceType] || [];
    const hasAugmentedProps = augmentedPropsTypes.has(propsType);
    const description = getResourceClassDescription(className);

    return generateResourceClass(className, propsType, resourceType, hasAugmentedProps, params, description);
  });

  return classDeclarations.join('\n');
}
