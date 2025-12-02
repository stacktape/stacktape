import type { ChildResourceMetadata, ChildResourcesMap } from './types';
import { getResourcesWithOverrides } from '../../src/api/npm/ts/resource-metadata';
import { cfTypeToInterface, getPropertyNameFromLogicalName } from './cloudform-utils';

/**
 * Generates override property declarations for a resource's child resources
 */
function generateOverrideProperties(childResources: ChildResourceMetadata[]): string[] {
  const properties: string[] = [];

  for (const childResource of childResources) {
    // Skip unresolvable resources
    if (childResource.unresolvable) {
      continue;
    }

    const mapping = cfTypeToInterface(childResource.resourceType);
    if (!mapping) {
      console.warn(`[generate-overrides] Could not map CloudFormation type: ${childResource.resourceType}`);
      continue;
    }

    const propertyName = getPropertyNameFromLogicalName(childResource.logicalName);
    if (!propertyName) {
      console.warn(`[generate-overrides] Could not extract property name for: ${childResource.resourceType}`);
      continue;
    }

    properties.push(`  ${propertyName}?: Partial<${mapping.typeName}>;`);
  }

  return properties;
}

/**
 * Generates transform property declarations for a resource's child resources
 * Transforms are functions that receive props and return modified props
 */
function generateTransformProperties(childResources: ChildResourceMetadata[]): string[] {
  const properties: string[] = [];

  for (const childResource of childResources) {
    // Skip unresolvable resources
    if (childResource.unresolvable) {
      continue;
    }

    const mapping = cfTypeToInterface(childResource.resourceType);
    if (!mapping) {
      continue;
    }

    const propertyName = getPropertyNameFromLogicalName(childResource.logicalName);
    if (!propertyName) {
      continue;
    }

    properties.push(`  ${propertyName}?: (props: Partial<${mapping.typeName}>) => Partial<${mapping.typeName}>;`);
  }

  return properties;
}

/**
 * Generates a single override type declaration
 */
function generateOverrideType(typeName: string, properties: string[]): string {
  if (properties.length === 0) {
    return '';
  }

  const lines = [
    `export type ${typeName} = {`,
    ...properties,
    '  // Allow any additional CloudFormation properties',
    '  [key: string]: { [propName: string]: any } | undefined;',
    '};',
    ''
  ];

  return lines.join('\n');
}

/**
 * Generates a single transforms type declaration
 */
function generateTransformsType(typeName: string, properties: string[]): string {
  if (properties.length === 0) {
    return '';
  }

  const lines = [
    `export type ${typeName} = {`,
    ...properties,
    '  // Allow any additional transform functions',
    '  [key: string]: ((props: any) => any) | undefined;',
    '};',
    ''
  ];

  return lines.join('\n');
}

/**
 * Generate override types for all child resources
 */
export function generateOverrideTypes(CHILD_RESOURCES: ChildResourcesMap): string {
  const results: string[] = [];
  const resourcesWithOverrides = getResourcesWithOverrides();

  for (const resource of resourcesWithOverrides) {
    const childResourcesArray = CHILD_RESOURCES[resource.resourceType];

    if (!childResourcesArray || childResourcesArray.length === 0) {
      console.warn(`[generate-overrides] No child resources found for: ${resource.resourceType}`);
      continue;
    }

    const overrideTypeName = `${resource.className}Overrides`;
    const properties = generateOverrideProperties(childResourcesArray);
    const overrideType = generateOverrideType(overrideTypeName, properties);

    if (overrideType) {
      results.push(overrideType);
    }
  }

  return results.join('\n');
}

/**
 * Generate transforms types for all child resources
 */
export function generateTransformsTypes(CHILD_RESOURCES: ChildResourcesMap): string {
  const results: string[] = [];
  const resourcesWithOverrides = getResourcesWithOverrides();

  for (const resource of resourcesWithOverrides) {
    const childResourcesArray = CHILD_RESOURCES[resource.resourceType];

    if (!childResourcesArray || childResourcesArray.length === 0) {
      continue;
    }

    const transformsTypeName = `${resource.className}Transforms`;
    const properties = generateTransformProperties(childResourcesArray);
    const transformsType = generateTransformsType(transformsTypeName, properties);

    if (transformsType) {
      results.push(transformsType);
    }
  }

  return results.join('\n');
}
