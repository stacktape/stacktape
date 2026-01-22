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

// Script props types that have local augmented versions (with connectTo accepting class instances)
const AUGMENTED_SCRIPT_PROPS = ['LocalScriptProps', 'BastionScriptProps', 'LocalScriptWithBastionTunnelingProps'];

/**
 * Props type names that need to extract the 'properties' field from the discriminated union type
 * These are integration/event types where the schema generates { type: '...', properties: {...} }
 * but we need just the properties part for the class constructor
 */
const PROPS_TO_PLAIN_PROPERTIES_MAP: Record<string, string> = {
  // Lambda event integration types - need ['properties'] accessor
  HttpApiIntegrationProps: "HttpApiIntegration['properties']",
  S3IntegrationProps: "S3Integration['properties']",
  ScheduleIntegrationProps: "ScheduleIntegration['properties']",
  SnsIntegrationProps: "SnsIntegration['properties']",
  SqsIntegrationProps: "SqsIntegration['properties']",
  KinesisIntegrationProps: "KinesisIntegration['properties']",
  DynamoDbIntegrationProps: "DynamoDbIntegration['properties']",
  CloudwatchLogIntegrationProps: "CloudwatchLogIntegration['properties']",
  ApplicationLoadBalancerIntegrationProps: "ApplicationLoadBalancerIntegration['properties']",
  EventBusIntegrationProps: "EventBusIntegration['properties']",
  KafkaTopicIntegrationProps: "KafkaTopicIntegration['properties']",
  AlarmIntegrationProps: "AlarmIntegration['properties']",
  // Container workload integration types
  SqsQueueEventBusIntegrationProps: "SqsQueueEventBusIntegration['properties']",
  ContainerWorkloadHttpApiIntegrationProps: "ContainerWorkloadHttpApiIntegration['properties']",
  ContainerWorkloadLoadBalancerIntegrationProps: "ContainerWorkloadLoadBalancerIntegration['properties']",
  ContainerWorkloadNetworkLoadBalancerIntegrationProps: "ContainerWorkloadNetworkLoadBalancerIntegration['properties']",
  ContainerWorkloadInternalIntegrationProps: "ContainerWorkloadInternalIntegration['properties']",
  ContainerWorkloadServiceConnectIntegrationProps: "ContainerWorkloadServiceConnectIntegration['properties']"
};

/**
 * Props type names that map directly to a different type name (no properties extraction)
 */
const PROPS_TO_PLAIN_TYPE_MAP: Record<string, string> = {
  // EFS mount types - these don't have type/properties structure
  ContainerEfsMountProps: 'ContainerEfsMount',
  LambdaEfsMountProps: 'LambdaEfsMount'
};

/**
 * Props types that don't exist at all and need placeholder definitions (any)
 */
const MISSING_PROPS_TYPES = ['IotIntegrationProps'];

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

    // Determine the correct props type reference
    let propsTypeRef: string;
    if (AUGMENTED_SCRIPT_PROPS.includes(propsType)) {
      // Script props have local augmented versions that accept class instances for connectTo
      propsTypeRef = propsType;
    } else if (MISSING_PROPS_TYPES.includes(propsType)) {
      // Types that don't exist use any
      propsTypeRef = 'Record<string, unknown>';
    } else if (propsType in PROPS_TO_PLAIN_PROPERTIES_MAP) {
      // Types that need to extract the 'properties' field from discriminated union
      propsTypeRef = `import('./plain').${PROPS_TO_PLAIN_PROPERTIES_MAP[propsType]}`;
    } else if (propsType in PROPS_TO_PLAIN_TYPE_MAP) {
      // Types that need mapping to different names in plain.d.ts
      propsTypeRef = `import('./plain').${PROPS_TO_PLAIN_TYPE_MAP[propsType]}`;
    } else {
      // Default: use the propsType directly from plain.d.ts
      propsTypeRef = `import('./plain').${propsType}`;
    }

    return `
export declare class ${className} extends BaseTypeProperties {
${constructorJsDoc}
  constructor(properties: ${propsTypeRef});
  readonly type: '${typeValue}';
}`;
  }).join('\n');
}

/**
 * Get unique props types from type properties (for importing from plain types)
 * Excludes types where propsType === className since those conflict with the generated class declarations
 */
export function getTypePropertiesImports(propsWithAugmentation: string[]): string[] {
  const typePropertiesAlreadyImported: string[] = [];
  const imports = MISC_TYPES_CONVERTIBLE_TO_CLASSES.map(({ propsType, className }) => {
    // Skip script props as they're being augmented (imported with Plain prefix)
    if (propsWithAugmentation.includes(propsType)) {
      return null;
    }
    // Skip types where propsType === className (e.g., SqsQueueNotEmptyTrigger)
    // These would conflict with the class declaration
    if (propsType === className) {
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
