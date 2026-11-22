/**
 * Data helpers and small atoms shared by the resource property reference and the CLI option reference.
 * Type names are kept verbatim (PascalCase). No humanization.
 */
import { kebabCase } from 'change-case';
import { Fragment, type ReactNode } from 'react';
import { apiReferenceDefinitions } from 'virtual:stacktape/api-reference-data';
import type { ApiProperty, ApiTypeInfo, ApiUnionBranch } from '@/utils/api-reference-dto';
import { stripHtml } from '@/utils/api-reference-text';

export const getDefinition = (name: string) => apiReferenceDefinitions[name] || null;

const getTypeSummary = (typeInfo: ApiTypeInfo): string => {
  if (typeInfo.kind === 'array') return `${getTypeSummary(typeInfo.itemType)}[]`;
  if (typeInfo.kind === 'reference') return typeInfo.typeName;
  if (typeInfo.kind === 'union') return typeInfo.branches.map((branch) => branch.label).join(' | ');
  if (typeInfo.kind === 'primitive') {
    if (typeInfo.constValue !== undefined) return String(typeInfo.constValue);
    if (typeInfo.enumValues?.length) return typeInfo.enumValues.map(String).join(' | ');
    return typeInfo.types.join(' | ');
  }
  return 'unknown';
};

type PropertyFilter = 'all' | 'required' | 'optional';

export const filterProperties = (
  properties: ApiProperty[],
  searchQuery: string,
  filter: PropertyFilter
): ApiProperty[] => {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filtered = properties.filter((property) => {
    if (filter === 'required' && !property.required) return false;
    if (filter === 'optional' && property.required) return false;
    if (!normalizedQuery) return true;
    return [
      property.name,
      stripHtml(property.shortDescription),
      stripHtml(property.longDescription),
      getTypeSummary(property.typeInfo),
      property.inheritedFrom || ''
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
  // Required properties always first; otherwise preserve source order (which is the schema's own
  // intentional ordering — putting `username` before `password` etc.). Use a stable sort.
  return filtered
    .map((property, index) => ({ property, index }))
    .toSorted((a, b) => {
      if (a.property.required !== b.property.required) return a.property.required ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ property }) => property);
};

/** Stable sort: required first, original order preserved within each bucket. */
export const sortRequiredFirst = (properties: ApiProperty[]): ApiProperty[] =>
  properties
    .map((property, index) => ({ property, index }))
    .toSorted((a, b) => {
      if (a.property.required !== b.property.required) return a.property.required ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ property }) => property);

export const sectionAnchorId = (definitionName: string) => `api-ref_${kebabCase(definitionName)}`;

/**
 * Colour roles for the v3 archive's property tables, as docs-token references (tokens.css). The current reference
 * styles itself with the `docs-ref` / `docs-prop` classes instead.
 */
export const tokens = {
  surface: 'var(--docs-bg-raised)',
  surfaceSunken: 'var(--docs-bg-sunken)',
  subtleBorder: 'var(--docs-border)',
  text: 'var(--docs-text)',
  mutedText: 'var(--docs-text-muted)',
  dimText: 'var(--docs-text-faint)',
  brandBg: 'var(--docs-accent-soft)',
  brandBorder: 'var(--docs-accent-line)',
  requiredBg: 'color-mix(in oklab, var(--docs-required) 18%, transparent)',
  requiredBorder: 'color-mix(in oklab, var(--docs-required) 55%, transparent)',
  panelShadow: 'none',
  syntax: {
    type: 'var(--docs-syntax-type)',
    primitive: 'var(--docs-syntax-primitive)',
    string: 'var(--docs-syntax-string)'
  }
};

export type SharedRenderProps = {
  definitionName: string;
};

/* --------------------------------------------------------------------------------------------
 * Type-info helpers.
 * -------------------------------------------------------------------------------------------- */

/**
 * Sort enum values for display. When every value is a number, sort numerically (so `1, 14, 90,
 * 120` doesn't get shuffled lexicographically). Otherwise preserve original schema order.
 */
const sortEnumValuesForDisplay = (values: (string | number)[]): (string | number)[] => {
  const allNumeric = values.length > 0 && values.every((v) => typeof v === 'number');
  if (!allNumeric) return values;
  return [...values].toSorted((a, b) => (a as number) - (b as number));
};

/** True if this property's typeInfo is (or wraps an array of) a discriminated union. */
export const isDiscriminatedUnion = (typeInfo: ApiTypeInfo) => {
  if (typeInfo.kind === 'union') return Boolean(typeInfo.discriminator);
  if (typeInfo.kind === 'array' && typeInfo.itemType.kind === 'union') {
    return Boolean(typeInfo.itemType.discriminator);
  }
  return false;
};

/** Unwrap a property typeInfo to a union if it (or its array item) is one. */
export const unwrapToUnion = (typeInfo: ApiTypeInfo) => {
  if (typeInfo.kind === 'union') return typeInfo;
  if (typeInfo.kind === 'array' && typeInfo.itemType.kind === 'union') return typeInfo.itemType;
  return null;
};

/** Unwrap a property typeInfo to a referenced type name if it (or its array item) is a reference. */
const unwrapToReferenceName = (typeInfo: ApiTypeInfo): string | null => {
  if (typeInfo.kind === 'reference') return typeInfo.typeName;
  if (typeInfo.kind === 'array' && typeInfo.itemType.kind === 'reference') return typeInfo.itemType.typeName;
  return null;
};

type PropertyChildren =
  | { kind: 'union-branches'; branches: ApiUnionBranch[]; discriminator: string | null }
  | { kind: 'type-properties'; typeName: string; properties: ApiProperty[] };

/**
 * Resolve a property's "navigable children": either branches of a discriminated/non-discriminated
 * union, or the properties of a referenced named type. Returns null if the property is a leaf.
 * This is what makes nested type-properties first-class.
 */
export const getPropertyChildren = (typeInfo: ApiTypeInfo): PropertyChildren | null => {
  const union = unwrapToUnion(typeInfo);
  if (union) {
    return { kind: 'union-branches', branches: union.branches, discriminator: union.discriminator };
  }
  const refName = unwrapToReferenceName(typeInfo);
  if (refName) {
    const def = getDefinition(refName);
    if (def && def.properties.length > 0) {
      return { kind: 'type-properties', typeName: refName, properties: def.properties };
    }
  }
  return null;
};

/* --------------------------------------------------------------------------------------------
 * TypeView — render a `ApiTypeInfo` as JSX with per-token Catppuccin Mocha colors.
 *
 * Two modes:
 *   - `inline`  → single line, truncates with ellipsis. The wrapper carries `title=fullText`
 *                 so the browser's default tooltip surfaces the whole thing on hover.
 *   - `pretty`  → wraps; long literal/branch unions break one-per-line so they read like a
 *                 prettier-formatted TS source.
 *
 * Tokens are colored:
 *   - type names  → yellow (`syntax.type`)
 *   - strings     → green  (`syntax.string`)
 *   - numbers     → peach  (`syntax.number`)
 *   - punct, `[]`, `|`, `:` etc. → muted (`syntax.punct`)
 *   - primitives  → text-color
 * -------------------------------------------------------------------------------------------- */

type TypeViewMode = 'inline' | 'pretty';

const PRETTY_BREAK_THRESHOLD = 2;

const Punct = ({ children }: { children: ReactNode }) => <span className="docs-syn-punct">{children}</span>;

const renderLiteral = (value: string | number | boolean): ReactNode => {
  if (typeof value === 'string') {
    return <span className="docs-syn-string">{`"${value}"`}</span>;
  }
  return <span className="docs-syn-number">{String(value)}</span>;
};

const renderPrimitiveType = (name: string): ReactNode => {
  // `string` / `number` / `boolean` etc. — built-in primitive, blue. Distinct from yellow
  // (which is reserved for user-defined interfaces / type references).
  return <span className="docs-syn-primitive">{name}</span>;
};

const isLiteralUnion = (typeInfo: ApiTypeInfo): boolean => {
  if (typeInfo.kind === 'primitive' && typeInfo.enumValues?.length) return true;
  if (typeInfo.kind === 'union') {
    return typeInfo.branches.every((b) => !b.typeName);
  }
  return false;
};

const renderTypeNode = (typeInfo: ApiTypeInfo, mode: TypeViewMode): ReactNode => {
  if (typeInfo.kind === 'array') {
    const itemNeedsParens =
      typeInfo.itemType.kind === 'union' ||
      (typeInfo.itemType.kind === 'primitive' && (typeInfo.itemType.enumValues?.length ?? 0) > 0);
    const item = renderTypeNode(typeInfo.itemType, mode);
    return (
      <>
        {itemNeedsParens && <Punct>(</Punct>}
        {item}
        {itemNeedsParens && <Punct>)</Punct>}
        <Punct>[]</Punct>
      </>
    );
  }
  if (typeInfo.kind === 'reference') {
    return <span className="docs-syn-type">{typeInfo.typeName}</span>;
  }
  if (typeInfo.kind === 'union') {
    return joinUnion(
      typeInfo.branches.map((branch) =>
        branch.typeName
          ? {
              key: branch.typeName,
              node: <span className="docs-syn-type">{branch.typeName}</span>
            }
          : // Non-typeName branch → discriminator value; render as string literal.
            { key: branch.label, node: renderLiteral(branch.label) }
      ),
      mode
    );
  }
  if (typeInfo.kind === 'primitive') {
    if (typeInfo.constValue !== undefined) return renderLiteral(typeInfo.constValue);
    if (typeInfo.enumValues?.length) {
      return joinUnion(
        sortEnumValuesForDisplay(typeInfo.enumValues).map((value) => ({
          key: String(value),
          node: renderLiteral(value)
        })),
        mode
      );
    }
    return joinUnion(
      typeInfo.types.map((type) => ({
        key: type,
        node: renderPrimitiveType(type === 'integer' ? 'number' : type)
      })),
      'inline'
    );
  }
  return <span className="docs-syn-type">unknown</span>;
};

/** A union member and the value it was derived from, which is what makes its React key stable. */
type UnionItem = { key: string; node: ReactNode };

const joinUnion = (items: UnionItem[], mode: TypeViewMode): ReactNode => {
  if (items.length === 0) return null;
  const breakOneByOne = mode === 'pretty' && items.length > PRETTY_BREAK_THRESHOLD;
  if (breakOneByOne) {
    // Prettier-style: every item on its own line, every line prefixed by `| ` — including the
    // first one. Reads as a vertical list rather than "first item is special".
    return (
      <>
        {items.map((item) => (
          <span key={item.key} className="block">
            <Punct>{'| '}</Punct>
            {item.node}
          </span>
        ))}
      </>
    );
  }
  return (
    <>
      {items.map((item, index) => (
        <Fragment key={item.key}>
          {index > 0 && <Punct>{' | '}</Punct>}
          {item.node}
        </Fragment>
      ))}
    </>
  );
};

/** A type rendered in the code theme's colours. It wraps rather than truncating, so nothing is hidden. */
export function TypeView({ typeInfo, mode = 'inline' }: { typeInfo: ApiTypeInfo; mode?: TypeViewMode }) {
  const usePretty = mode === 'pretty' && isLiteralUnion(typeInfo);
  return <span>{renderTypeNode(typeInfo, usePretty ? 'pretty' : 'inline')}</span>;
}

/** The literal values a property accepts, when it is an enum or a union of literals. */
export const getAllowedValues = (typeInfo: ApiTypeInfo): (string | number)[] | null => {
  const inner = typeInfo.kind === 'array' ? typeInfo.itemType : typeInfo;
  if (inner.kind === 'primitive' && inner.enumValues?.length) return sortEnumValuesForDisplay(inner.enumValues);
  if (inner.kind === 'union' && inner.branches.length > 0 && inner.branches.every((branch) => !branch.typeName)) {
    return inner.branches.map((branch) => branch.label);
  }
  return null;
};

/** A short type for the property's first line: enums show their base type, and their values are listed below. */
export const getShortTypeInfo = (typeInfo: ApiTypeInfo): ApiTypeInfo => {
  if (typeInfo.kind === 'array') return { kind: 'array', itemType: getShortTypeInfo(typeInfo.itemType) };
  if (typeInfo.kind === 'primitive' && typeInfo.enumValues?.length && typeInfo.enumValues.length > 3) {
    return { kind: 'primitive', types: typeInfo.types };
  }
  if (typeInfo.kind === 'union' && typeInfo.branches.length > 3 && typeInfo.branches.every((b) => !b.typeName)) {
    return { kind: 'primitive', types: ['string'] };
  }
  return typeInfo;
};
