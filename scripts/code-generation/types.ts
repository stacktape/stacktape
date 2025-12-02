/**
 * Metadata about a child resource from CHILD_RESOURCES
 */
export type ChildResourceMetadata = {
  logicalName: (...args: any[]) => string;
  resourceType: string;
  conditional?: boolean;
  unresolvable?: boolean;
};

/**
 * Referenceable parameter for a resource
 */
export type ReferenceableParam = {
  name: string;
  description: string;
};

/**
 * Map of resource types to their child resources
 */
export type ChildResourcesMap = Record<string, ChildResourceMetadata[]>;

/**
 * Map of resource types to their referenceable parameters
 */
export type ReferenceableParamsMap = Record<string, ReferenceableParam[]>;

/**
 * JSDoc comment extracted from a type definition
 */
export type JSDocComment = {
  description: string;
  tags: Array<{
    tag: string;
    value: string;
  }>;
};

/**
 * Property information including JSDoc
 */
export type PropertyInfo = {
  name: string;
  type: string;
  optional: boolean;
  jsdoc?: JSDocComment;
};
