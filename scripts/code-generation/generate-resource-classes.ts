import type { ResourceClassName } from '@api/npm/ts/class-config';
import type { JSDocComment, ReferenceableParam, ReferenceableParamsMap } from './types';
import {
  getResourcesWithAugmentedProps,
  RESOURCES_CONVERTIBLE_TO_CLASSES
} from '../../src/api/npm/ts/resource-metadata';
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
 * - If hasAugmentedProps: use local augmented propsType (defined in types.d.ts)
 * - Else if supportsOverrides: use ${propsType}WithOverrides (defined in types.d.ts)
 * - Else: use plain propsType from ./plain (needs import() qualifier)
 */
function determinePropsType(propsType: string, hasAugmentedProps: boolean, supportsOverrides: boolean): string {
  if (hasAugmentedProps) {
    // Local augmented type defined in types.d.ts
    return propsType;
  }
  if (supportsOverrides) {
    // Local WithOverrides type defined in types.d.ts
    return `${propsType}WithOverrides`;
  }
  // Plain type from ./plain - needs import() qualifier
  return `import('./plain').${propsType}`;
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
  className: ResourceClassName,
  propsType: string,
  resourceType: string,
  hasAugmentedProps: boolean,
  supportsOverrides: boolean,
  referenceableParams: ReferenceableParam[],
  description: JSDocComment | undefined
): string {
  const finalPropsType = determinePropsType(propsType, hasAugmentedProps, supportsOverrides);
  const getters = generateGetters(referenceableParams);
  const constructorJsDoc = formatConstructorJSDoc(description, className as string);

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

  const classDeclarations = RESOURCES_CONVERTIBLE_TO_CLASSES.map(
    ({ className, resourceType, propsType, supportsOverrides }) => {
      const params = REFERENCEABLE_PARAMS[resourceType] || [];
      const hasAugmentedProps = augmentedPropsTypes.has(propsType);
      const description = getResourceClassDescription(className);
      // supportsOverrides defaults to true if not specified
      const hasOverrides = supportsOverrides !== false;

      return generateResourceClass(
        className,
        propsType,
        resourceType,
        hasAugmentedProps,
        hasOverrides,
        params,
        description
      );
    }
  );

  return classDeclarations.join('\n');
}
