/**
 * Schema reader for the new <ApiReference /> component.
 *
 * Responsibility: take a definitionName (e.g. "LambdaFunctionProps"), walk the JSON Schema in
 * @generated/schemas/config-schema.json, and produce a normalized tree the renderer can consume
 * without re-walking the schema. The renderer is dumb — it just paints what this gives it.
 *
 * Design notes:
 * - Inheritance (allOf with $refs) is flattened. Each property carries an optional `inheritedFrom`
 *   tag so the UI can show a small "from X" hint.
 * - Discriminated unions are detected by every branch having a `type` property with a unique
 *   `const` value. Non-discriminated unions fall back to using the underlying type name as the
 *   branch label.
 * - Arrays unwrap their item type; the `isArray` flag is propagated to the renderer.
 * - We don't recurse into composite types — the renderer links to them by name and renders
 *   them as sub-trees on demand. This keeps the data model finite for cycles and arbitrary depth.
 */

type RawSchema = {
  $ref?: string;
  anyOf?: RawSchema[];
  oneOf?: RawSchema[];
  allOf?: RawSchema[];
  type?: string | string[];
  enum?: (string | number | boolean)[];
  const?: string | number | boolean;
  properties?: Record<string, RawSchema>;
  items?: RawSchema;
  required?: string[];
  description?: string;
  default?: unknown;
  additionalProperties?: unknown;
  _MdxDesc?: { sd?: string; ld?: string };
  _examples?: { lang: string; code: string }[];
};

export type PropertyExample = { lang: string; code: string };

type Definitions = Record<string, RawSchema>;

const refToName = (ref: string) => ref.replace('#/definitions/', '');

const PRIMITIVE_TYPES = new Set(['string', 'number', 'boolean', 'integer', 'null']);

export type NormalizedTypeInfo =
  | { kind: 'primitive'; types: string[]; enumValues?: (string | number)[]; constValue?: string | number }
  | { kind: 'reference'; typeName: string }
  | { kind: 'union'; discriminator: string | null; branches: NormalizedUnionBranch[] }
  | { kind: 'array'; itemType: NormalizedTypeInfo }
  | { kind: 'unknown'; raw?: string };

export type NormalizedUnionBranch = {
  /** What the user picks in the selector. For discriminated unions: the discriminator value
   *  (e.g. "stacktape-lambda-buildpack"). For non-discriminated unions: a derived label from
   *  the underlying type name (e.g. "EsLanguageSpecificConfig" → "Es"). */
  label: string;
  /** The underlying type name, if this branch resolves to a single named type. */
  typeName?: string;
  /** Short description pulled from the branch type's JSDoc, if available. */
  shortDescription?: string;
  /** The properties available when this branch is selected. */
  properties: NormalizedProperty[];
};

export type NormalizedProperty = {
  name: string;
  required: boolean;
  shortDescription: string;
  longDescription: string;
  defaultValue?: string;
  typeInfo: NormalizedTypeInfo;
  /** Set if this property was inherited from a parent type via allOf or `extends`. */
  inheritedFrom?: string;
  /** Working YAML + TypeScript config examples (with `[!code focus-*]` markers) for this property. */
  examples?: PropertyExample[];
};

export type NormalizedDefinition = {
  /** The original definition name passed in. */
  definitionName: string;
  /** Optional short description for the type itself. */
  shortDescription?: string;
  /** All direct + inherited properties, flattened. */
  properties: NormalizedProperty[];
};

const isPrimitive = (schema: RawSchema): boolean => {
  if (typeof schema.type === 'string') return PRIMITIVE_TYPES.has(schema.type);
  if (Array.isArray(schema.type)) return schema.type.every((t) => PRIMITIVE_TYPES.has(t));
  return false;
};

const tryReadDiscriminatorValue = (branch: RawSchema, definitions: Definitions): string | null => {
  // Resolve a branch to its underlying object schema.
  let resolved = branch;
  if (resolved.$ref) {
    const target = definitions[refToName(resolved.$ref)];
    if (!target) return null;
    resolved = target;
  }
  const typeProp = resolved.properties?.type;
  if (!typeProp) return null;
  if (typeof typeProp.const === 'string') return typeProp.const;
  if (Array.isArray(typeProp.enum) && typeProp.enum.length === 1 && typeof typeProp.enum[0] === 'string') {
    return typeProp.enum[0];
  }
  return null;
};

const labelFromTypeName = (typeName: string): string => {
  // Trim common suffixes like "LanguageSpecificConfig" → "Es" / "Py" / "Java" / etc.
  const trimmed = typeName.replace(/(LanguageSpecificConfig|Props|Config|Configuration)$/, '');
  return trimmed || typeName;
};

const getPropertyShortLong = (schema: RawSchema): { sd: string; ld: string } => {
  const sd = schema._MdxDesc?.sd ?? '';
  const ld = schema._MdxDesc?.ld ?? '';
  if (sd || ld) return { sd, ld };
  // Fallback: split the description on the "---" separator the source uses.
  if (typeof schema.description === 'string') {
    const [shortPart = '', ...rest] = schema.description.split('---');
    return {
      sd: shortPart.replace(/^####\s*/, '').trim(),
      ld: rest.join('---').trim()
    };
  }
  return { sd: '', ld: '' };
};

const stringifyDefault = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
};

const resolveBranchProperties = (
  branch: RawSchema,
  definitions: Definitions
): { typeName?: string; shortDescription?: string; properties: NormalizedProperty[] } => {
  // A "branch" of a discriminated union typically has shape:
  //   { type: 'object', properties: { type: { const: 'X' }, properties: { $ref: 'XProps' } }, required: [...] }
  // The user-facing properties live behind that nested `properties.properties.$ref`.
  let resolved = branch;
  let typeName: string | undefined;
  let shortDescription: string | undefined;
  if (resolved.$ref) {
    typeName = refToName(resolved.$ref);
    const target = definitions[typeName];
    if (target) {
      resolved = target;
      shortDescription = getPropertyShortLong(target).sd || undefined;
    }
  }

  const innerProperties = resolved.properties?.properties;
  if (innerProperties?.$ref) {
    const innerTypeName = refToName(innerProperties.$ref);
    const innerDef = definitions[innerTypeName];
    if (innerDef) {
      return {
        typeName,
        shortDescription,
        properties: extractDirectProperties(innerDef, definitions, undefined)
      };
    }
  }

  // Some branches have no nested properties wrapper — their properties are at top level
  // (e.g. a plain object schema with direct properties).
  return {
    typeName,
    shortDescription,
    properties: extractDirectProperties(resolved, definitions, undefined)
  };
};

const buildTypeInfo = (schema: RawSchema, definitions: Definitions): NormalizedTypeInfo => {
  // Array
  if (schema.type === 'array' && schema.items) {
    return { kind: 'array', itemType: buildTypeInfo(schema.items, definitions) };
  }
  // Reference — possibly to a union, possibly to an object/primitive
  if (schema.$ref) {
    const typeName = refToName(schema.$ref);
    const target = definitions[typeName];
    if (target) {
      // A bare named union like LambdaPackaging → unwrap into kind: 'union'.
      const refBranches = target.anyOf || target.oneOf;
      if (Array.isArray(refBranches) && refBranches.length > 1) {
        return buildUnionTypeInfo(refBranches, definitions);
      }
      // Primitive aliased type (e.g. 'type SupportedNodeVersion = 16 | 18 | 20').
      if (isPrimitive(target)) {
        return {
          kind: 'primitive',
          types: Array.isArray(target.type) ? target.type : [target.type as string],
          enumValues: Array.isArray(target.enum) ? (target.enum as (string | number)[]) : undefined
        };
      }
    }
    return { kind: 'reference', typeName };
  }
  // Inline union
  const inlineBranches = schema.anyOf || schema.oneOf;
  if (Array.isArray(inlineBranches) && inlineBranches.length > 1) {
    return buildUnionTypeInfo(inlineBranches, definitions);
  }
  // Primitive
  if (isPrimitive(schema)) {
    return {
      kind: 'primitive',
      types: Array.isArray(schema.type) ? schema.type : [schema.type as string],
      enumValues: Array.isArray(schema.enum) ? (schema.enum as (string | number)[]) : undefined,
      constValue: typeof schema.const === 'string' || typeof schema.const === 'number' ? schema.const : undefined
    };
  }
  return { kind: 'unknown' };
};

const buildUnionTypeInfo = (branches: RawSchema[], definitions: Definitions): NormalizedTypeInfo => {
  // Detect whether this union is discriminated. It is iff every branch resolves to an object
  // schema with a `type` property whose value is a unique const string.
  const discriminatorValues: (string | null)[] = branches.map((b) => tryReadDiscriminatorValue(b, definitions));
  const allDiscriminated = discriminatorValues.every((v) => typeof v === 'string');
  const allUnique = allDiscriminated && new Set(discriminatorValues).size === discriminatorValues.length;
  const isDiscriminated = allDiscriminated && allUnique;

  const normalizedBranches: NormalizedUnionBranch[] = branches.map((branch, i) => {
    const branchInfo = resolveBranchProperties(branch, definitions);
    const discriminatorValue = discriminatorValues[i];
    if (isDiscriminated && typeof discriminatorValue === 'string') {
      return {
        label: discriminatorValue,
        typeName: branchInfo.typeName,
        shortDescription: branchInfo.shortDescription,
        properties: branchInfo.properties
      };
    }
    return {
      label: branchInfo.typeName ? labelFromTypeName(branchInfo.typeName) : `option-${i + 1}`,
      typeName: branchInfo.typeName,
      shortDescription: branchInfo.shortDescription,
      properties: branchInfo.properties
    };
  });

  return {
    kind: 'union',
    discriminator: isDiscriminated ? 'type' : null,
    branches: normalizedBranches
  };
};

const extractDirectProperties = (
  definition: RawSchema,
  definitions: Definitions,
  inheritedFrom: string | undefined
): NormalizedProperty[] => {
  const required = new Set<string>(definition.required || []);
  const result: NormalizedProperty[] = [];
  if (!definition.properties) return result;
  for (const [name, propSchema] of Object.entries(definition.properties)) {
    // Hide the discriminator field itself from rendered properties — the union selector already
    // surfaces this.
    if (name === 'type' && (propSchema.const !== undefined || (propSchema.enum?.length === 1))) {
      continue;
    }
    const { sd, ld } = getPropertyShortLong(propSchema);
    result.push({
      name,
      required: required.has(name),
      shortDescription: sd,
      longDescription: ld,
      defaultValue: stringifyDefault(propSchema.default),
      typeInfo: buildTypeInfo(propSchema, definitions),
      inheritedFrom,
      ...(propSchema._examples?.length ? { examples: propSchema._examples } : {})
    });
  }
  return result;
};

const collectInheritedProperties = (
  definition: RawSchema,
  definitions: Definitions,
  visited: Set<string>
): NormalizedProperty[] => {
  if (!definition.allOf) return [];
  const inherited: NormalizedProperty[] = [];
  for (const part of definition.allOf) {
    if (part.$ref) {
      const parentName = refToName(part.$ref);
      if (visited.has(parentName)) continue;
      visited.add(parentName);
      const parentDef = definitions[parentName];
      if (!parentDef) continue;
      inherited.push(...extractDirectProperties(parentDef, definitions, parentName));
      inherited.push(...collectInheritedProperties(parentDef, definitions, visited));
    } else if (part.properties) {
      // Inline allOf segment with its own properties (rare).
      inherited.push(...extractDirectProperties(part, definitions, undefined));
    }
  }
  return inherited;
};

export const normalizeDefinition = (
  definitionName: string,
  definitions: Definitions
): NormalizedDefinition | null => {
  const definition = definitions[definitionName];
  if (!definition) return null;

  const own = extractDirectProperties(definition, definitions, undefined);
  const inherited = collectInheritedProperties(definition, definitions, new Set([definitionName]));

  // De-dupe: if a child re-declares an inherited property, the child's wins.
  const seenNames = new Set(own.map((p) => p.name));
  const filteredInherited = inherited.filter((p) => !seenNames.has(p.name));

  // Stable order: required first (own → inherited), then optional (own → inherited), each group alphabetical.
  const sortGroup = (props: NormalizedProperty[]) => [...props].sort((a, b) => a.name.localeCompare(b.name));
  const ownReq = sortGroup(own.filter((p) => p.required));
  const ownOpt = sortGroup(own.filter((p) => !p.required));
  const inhReq = sortGroup(filteredInherited.filter((p) => p.required));
  const inhOpt = sortGroup(filteredInherited.filter((p) => !p.required));

  return {
    definitionName,
    shortDescription: getPropertyShortLong(definition).sd || undefined,
    properties: [...ownReq, ...inhReq, ...ownOpt, ...inhOpt]
  };
};

/** Helper used by the renderer to render a referenced composite type as a sub-section. */
export const normalizeReferencedType = (typeName: string, definitions: Definitions): NormalizedDefinition | null =>
  normalizeDefinition(typeName, definitions);
