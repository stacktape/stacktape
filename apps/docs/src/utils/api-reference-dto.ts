/**
 * The shape of `apps/cli/@generated/schemas/api-reference-data.json`, as the renderer reads it.
 *
 * These are DTOs, not a second model. The CLI's `generate:llm-docs` owns the schema walk that
 * produces this data and renders the identical structure into the LLM corpus; this application only
 * paints it. Keeping the types here rather than importing CLI source preserves the app boundary —
 * and if the generator's shape changes, `astro check` fails against the emitted JSON.
 */

export type ApiTypeInfo =
  | { kind: 'primitive'; types: string[]; enumValues?: (string | number)[]; constValue?: string | number }
  | { kind: 'reference'; typeName: string }
  | { kind: 'union'; discriminator: string | null; branches: ApiUnionBranch[] }
  | { kind: 'array'; itemType: ApiTypeInfo }
  | { kind: 'unknown'; raw?: string };

export type ApiUnionBranch = {
  /** What the user picks in the selector: the discriminator value, or a derived type label. */
  label: string;
  typeName?: string;
  shortDescription?: string;
  properties: ApiProperty[];
};

export type ApiPropertyExample = { lang: string; code: string };

export type ApiProperty = {
  name: string;
  required: boolean;
  shortDescription: string;
  longDescription: string;
  defaultValue?: string;
  typeInfo: ApiTypeInfo;
  /** Set when the property came from a parent type via `allOf`/`extends`. */
  inheritedFrom?: string;
  /** Working YAML + TypeScript examples (with `[!code focus-*]` markers) for this property. */
  examples?: ApiPropertyExample[];
};

export type ApiDefinition = {
  definitionName: string;
  shortDescription?: string;
  properties: ApiProperty[];
  stats: { requiredCount: number; optionalCount: number };
  typeDeclaration: string;
};

export type ApiReferenceData = Record<string, ApiDefinition>;
