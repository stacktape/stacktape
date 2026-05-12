/**
 * Shared helpers for the API reference variants.
 *
 * All variants in this folder are dual-pane (V4 silhouette) with a tree nav on the left where
 * discriminated-union branches AND nested type-properties references are first-class navigation
 * children. They share the data helpers, the visual tokens (aligned with console-app: glassy
 * surfaces, stacktape green accent, badge-style pills), and the small atoms. Layout and the
 * right-pane behavior are owned per-variant.
 *
 * Type names are kept verbatim (PascalCase). No humanization.
 */
import { kebabCase } from 'change-case';
import { Fragment, type ReactNode } from 'react';
import { apiReferenceData, type ApiReferenceGeneratedDefinition } from '@/generated/api-reference-data';
import { typographyCss } from '@/styles/global';
import { colors, fontFamilyMono } from '@/styles/variables';
import type { NormalizedProperty, NormalizedTypeInfo, NormalizedUnionBranch } from '@/utils/api-reference-extractor';

export const apiReferenceDefinitions = apiReferenceData as Record<string, ApiReferenceGeneratedDefinition>;

export const getDefinition = (name: string) => apiReferenceDefinitions[name] || null;

export const stripHtml = (value = '') =>
  value
    .replace(/<[^>]*>/g, '')
    .replaceAll('--stp-required--', '')
    .trim();

export const sanitizeHtml = (value = '') => value.replaceAll('--stp-required--', '');

export const getTypeSummary = (typeInfo: NormalizedTypeInfo): string => {
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

export type PropertyFilter = 'all' | 'required' | 'optional';

export const filterProperties = (
  properties: NormalizedProperty[],
  searchQuery: string,
  filter: PropertyFilter
): NormalizedProperty[] => {
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
    .sort((a, b) => {
      if (a.property.required !== b.property.required) return a.property.required ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ property }) => property);
};

/** Stable sort: required first, original order preserved within each bucket. */
export const sortRequiredFirst = (properties: NormalizedProperty[]): NormalizedProperty[] =>
  properties
    .map((property, index) => ({ property, index }))
    .sort((a, b) => {
      if (a.property.required !== b.property.required) return a.property.required ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ property }) => property);

export const propertyAnchorId = (definitionName: string, propertyPath: string) =>
  `api-ref_${kebabCase(definitionName)}_${kebabCase(propertyPath)}`;

export const sectionAnchorId = (definitionName: string) => `api-ref_${kebabCase(definitionName)}`;

/**
 * Tokens aligned with console-app's `surfaces.ts` / `tokens.ts`. Glassy dark surfaces, stacktape
 * green accent, badge styling that mirrors `Badge` from the console.
 */
export const tokens = {
  surface: colors.elementBackground, // rgb(34,40,40)
  surfaceRaised: 'rgb(36, 42, 42)',
  surfaceSunken: 'rgba(0, 0, 0, 0.22)',
  surfaceHover: 'rgba(255, 255, 255, 0.04)',
  surfaceSelected: 'rgba(54, 190, 190, 0.10)',
  subtleBorder: 'rgba(255, 255, 255, 0.07)',
  border: 'rgba(255, 255, 255, 0.10)',
  strongerBorder: 'rgba(255, 255, 255, 0.14)',
  text: colors.fontColorPrimary, // rgba(255,255,255,0.87)
  mutedText: 'rgba(255, 255, 255, 0.62)',
  dimText: 'rgba(255, 255, 255, 0.42)',
  fadedText: 'rgba(255, 255, 255, 0.30)',
  brand: colors.brandGreen,
  brandSoft: 'rgba(54, 190, 190, 0.26)',
  brandBg: 'rgba(54, 190, 190, 0.08)',
  brandBgStrong: 'rgba(54, 190, 190, 0.16)',
  brandBorder: 'rgba(54, 190, 190, 0.36)',
  brandBorderStrong: 'rgba(54, 190, 190, 0.9)',
  required: colors.orange,
  requiredBg: 'rgba(237, 139, 0, 0.30)',
  requiredBorder: 'rgba(237, 139, 0, 0.70)',
  monoFamily: fontFamilyMono,
  /**
   * Catppuccin Mocha syntax colors — same theme as `CodeBlockNew`'s Shiki output. Use these for
   * any inline "code-like" display (type names, discriminator values, property names) so the tree
   * nav and the right-pane code blocks visually agree.
   */
  syntax: {
    text: '#cdd6f4',
    comment: '#6c7086',
    keyword: '#cba6f7', // mauve — language keywords (`type`, `case`)
    type: '#f9e2af', // yellow — user-defined types / interfaces (`AuroraEngine`)
    primitive: '#89b4fa', // blue — built-in primitives (`string`, `number`, `boolean`)
    string: '#a6e3a1', // green — string literals
    number: '#fab387', // peach — number literals
    property: '#cdd6f4',
    variable: '#cdd6f4',
    operator: '#94e2d5', // teal
    punct: 'rgba(205, 214, 244, 0.6)'
  },
  /** Glassy panel matching console-app's `box`. */
  panelShadow:
    '0 2px 8px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.20)',
  /** Inset (input/sunken) shadow. */
  insetShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.30), 0 1px 0 rgba(255, 255, 255, 0.05)',
  /** Active-tab gradient (matches console-app `activeTabCss`). */
  activeGradient: 'linear-gradient(135deg, rgb(60, 64, 64), rgb(44, 47, 47))',
  activeShadow:
    '0 4px 12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(190, 190, 190, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.10)'
};

/**
 * Narrow custom scrollbar — apply to any scrollable api-ref pane so it doesn't compete with
 * the content. Webkit + Firefox. Track stays transparent; thumb is a thin muted bar.
 */
export const narrowScrollbar = {
  scrollbarWidth: 'thin' as const,
  scrollbarColor: 'rgba(255, 255, 255, 0.18) transparent',
  '&::-webkit-scrollbar': { width: '5px', height: '5px' },
  '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: '999px'
  },
  '&::-webkit-scrollbar-thumb:hover': { backgroundColor: 'rgba(255, 255, 255, 0.32)' },
  '&::-webkit-scrollbar-button': { display: 'none' }
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
  return [...values].sort((a, b) => (a as number) - (b as number));
};

export const getReadableTypeSummary = (typeInfo: NormalizedTypeInfo): string => {
  if (typeInfo.kind === 'array') return `${getReadableTypeSummary(typeInfo.itemType)}[]`;
  if (typeInfo.kind === 'reference') return typeInfo.typeName;
  if (typeInfo.kind === 'union') {
    return typeInfo.branches
      .map((branch) => (branch.label.includes('-') ? `"${branch.label}"` : (branch.typeName ?? branch.label)))
      .join(' | ');
  }
  if (typeInfo.kind === 'primitive') {
    if (typeInfo.constValue !== undefined) {
      return typeof typeInfo.constValue === 'string' ? `"${typeInfo.constValue}"` : String(typeInfo.constValue);
    }
    if (typeInfo.enumValues?.length) {
      return sortEnumValuesForDisplay(typeInfo.enumValues)
        .map((v) => (typeof v === 'string' ? `"${v}"` : String(v)))
        .join(' | ');
    }
    return typeInfo.types.map((t) => (t === 'integer' ? 'number' : t)).join(' | ');
  }
  return 'unknown';
};

/** True if this property's typeInfo is (or wraps an array of) a discriminated union. */
export const isDiscriminatedUnion = (typeInfo: NormalizedTypeInfo) => {
  if (typeInfo.kind === 'union') return Boolean(typeInfo.discriminator);
  if (typeInfo.kind === 'array' && typeInfo.itemType.kind === 'union') {
    return Boolean(typeInfo.itemType.discriminator);
  }
  return false;
};

/** Unwrap a property typeInfo to a union if it (or its array item) is one. */
export const unwrapToUnion = (typeInfo: NormalizedTypeInfo) => {
  if (typeInfo.kind === 'union') return typeInfo;
  if (typeInfo.kind === 'array' && typeInfo.itemType.kind === 'union') return typeInfo.itemType;
  return null;
};

/** Unwrap a property typeInfo to a referenced type name if it (or its array item) is a reference. */
export const unwrapToReferenceName = (typeInfo: NormalizedTypeInfo): string | null => {
  if (typeInfo.kind === 'reference') return typeInfo.typeName;
  if (typeInfo.kind === 'array' && typeInfo.itemType.kind === 'reference') return typeInfo.itemType.typeName;
  return null;
};

export type PropertyChildren =
  | { kind: 'union-branches'; branches: NormalizedUnionBranch[]; discriminator: string | null }
  | { kind: 'type-properties'; typeName: string; properties: NormalizedProperty[] };

/**
 * Resolve a property's "navigable children": either branches of a discriminated/non-discriminated
 * union, or the properties of a referenced named type. Returns null if the property is a leaf.
 * This is what makes nested type-properties first-class.
 */
export const getPropertyChildren = (typeInfo: NormalizedTypeInfo): PropertyChildren | null => {
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

export const isArrayType = (typeInfo: NormalizedTypeInfo) => typeInfo.kind === 'array';

/* --------------------------------------------------------------------------------------------
 * TypeView — render a `NormalizedTypeInfo` as JSX with per-token Catppuccin Mocha colors.
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

export type TypeViewMode = 'inline' | 'pretty';

const PRETTY_BREAK_THRESHOLD = 2;

const Punct = ({ children }: { children: ReactNode }) => <span css={{ color: tokens.syntax.punct }}>{children}</span>;

const renderLiteral = (value: string | number): ReactNode => {
  if (typeof value === 'string') {
    return <span css={{ color: tokens.syntax.string }}>{`"${value}"`}</span>;
  }
  return <span css={{ color: tokens.syntax.number }}>{String(value)}</span>;
};

const renderPrimitiveType = (name: string): ReactNode => {
  // `string` / `number` / `boolean` etc. — built-in primitive, blue. Distinct from yellow
  // (which is reserved for user-defined interfaces / type references).
  return <span css={{ color: tokens.syntax.primitive }}>{name}</span>;
};

const isLiteralUnion = (typeInfo: NormalizedTypeInfo): boolean => {
  if (typeInfo.kind === 'primitive' && typeInfo.enumValues?.length) return true;
  if (typeInfo.kind === 'union') {
    return typeInfo.branches.every((b) => !b.typeName);
  }
  return false;
};

const renderTypeNode = (typeInfo: NormalizedTypeInfo, mode: TypeViewMode): ReactNode => {
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
    return <span css={{ color: tokens.syntax.type }}>{typeInfo.typeName}</span>;
  }
  if (typeInfo.kind === 'union') {
    const items: ReactNode[] = typeInfo.branches.map((branch, i) => {
      if (branch.typeName)
        return (
          <span key={i} css={{ color: tokens.syntax.type }}>
            {branch.typeName}
          </span>
        );
      // Non-typeName branch → discriminator value; render as string literal
      return <Fragment key={i}>{renderLiteral(branch.label)}</Fragment>;
    });
    return joinUnion(items, mode);
  }
  if (typeInfo.kind === 'primitive') {
    if (typeInfo.constValue !== undefined) return renderLiteral(typeInfo.constValue);
    if (typeInfo.enumValues?.length) {
      const items = sortEnumValuesForDisplay(typeInfo.enumValues).map((v, i) => (
        <Fragment key={i}>{renderLiteral(v)}</Fragment>
      ));
      return joinUnion(items, mode);
    }
    return joinUnion(
      typeInfo.types.map((t, i) => <Fragment key={i}>{renderPrimitiveType(t === 'integer' ? 'number' : t)}</Fragment>),
      'inline'
    );
  }
  return <span css={{ color: tokens.syntax.type }}>unknown</span>;
};

const joinUnion = (items: ReactNode[], mode: TypeViewMode): ReactNode => {
  if (items.length === 0) return null;
  const breakOneByOne = mode === 'pretty' && items.length > PRETTY_BREAK_THRESHOLD;
  if (breakOneByOne) {
    // Prettier-style: every item on its own line, every line prefixed by `| ` — including the
    // first one. Reads as a vertical list rather than "first item is special".
    return (
      <>
        {items.map((item, i) => (
          <span key={i} css={{ display: 'block' }}>
            <Punct>{'| '}</Punct>
            {item}
          </span>
        ))}
      </>
    );
  }
  return (
    <>
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <Punct>{' | '}</Punct>}
          {item}
        </Fragment>
      ))}
    </>
  );
};

export function TypeView({ typeInfo, mode = 'inline' }: { typeInfo: NormalizedTypeInfo; mode?: TypeViewMode }) {
  const fullText = getReadableTypeSummary(typeInfo);
  const usePretty = mode === 'pretty' && isLiteralUnion(typeInfo);
  return (
    <span
      title={fullText}
      css={
        mode === 'inline'
          ? {
              fontFamily: tokens.monoFamily,
              display: 'inline-block',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              verticalAlign: 'bottom'
            }
          : {
              fontFamily: tokens.monoFamily,
              whiteSpace: 'normal',
              wordBreak: 'break-word'
            }
      }
    >
      {renderTypeNode(typeInfo, usePretty ? 'pretty' : 'inline')}
    </span>
  );
}

/* --------------------------------------------------------------------------------------------
 * Visual atoms shared by every variant. These mirror `Badge` from console-app.
 * -------------------------------------------------------------------------------------------- */

export function RequiredPill() {
  return (
    <span
      css={{
        fontFamily: typographyCss.fontFamily,
        backgroundColor: tokens.requiredBg,
        color: tokens.text,
        border: `1px solid ${tokens.requiredBorder}`,
        borderRadius: '6px',
        fontWeight: 600,
        padding: '2px 7px',
        display: 'inline-block',
        fontSize: '10.5px',
        letterSpacing: '0.4px',
        lineHeight: 1.2
      }}
    >
      required
    </span>
  );
}

export function TypeBadge({ typeInfo, compact = false }: { typeInfo: NormalizedTypeInfo; compact?: boolean }) {
  const text = getReadableTypeSummary(typeInfo);
  const isRef = unwrapToReferenceName(typeInfo) !== null;
  const isUnion = unwrapToUnion(typeInfo) !== null;
  const accent = isRef || isUnion;
  return (
    <code
      css={{
        color: accent ? tokens.brand : tokens.mutedText,
        background: accent ? tokens.brandBg : 'rgba(255, 255, 255, 0.04)',
        border: `1px solid ${accent ? tokens.brandBorder : tokens.subtleBorder}`,
        padding: compact ? '1px 7px' : '2px 8px',
        borderRadius: '5px',
        fontSize: compact ? '11px' : '11.5px',
        fontFamily: tokens.monoFamily,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%',
        display: 'inline-block',
        lineHeight: 1.5
      }}
      title={text}
    >
      {text}
    </code>
  );
}

export function PropertyHeading({ property, level = 1 }: { property: NormalizedProperty; level?: number }) {
  const fontSize = level === 1 ? '18px' : level === 2 ? '15px' : '13.5px';
  return (
    <div css={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <code
        css={{
          color: tokens.text,
          fontSize,
          fontWeight: 600,
          fontFamily: tokens.monoFamily,
          lineHeight: 1.3
        }}
      >
        {property.name}
      </code>
      {property.required && <RequiredPill />}
      <TypeBadge typeInfo={property.typeInfo} />
      {property.defaultValue !== undefined && (
        <span css={{ color: tokens.dimText, fontSize: '11.5px', fontFamily: typographyCss.fontFamily }}>
          default{' '}
          <code css={{ color: tokens.mutedText, fontFamily: tokens.monoFamily, fontSize: '11.5px' }}>
            {property.defaultValue}
          </code>
        </span>
      )}
    </div>
  );
}

export function PropertyDescription({
  property,
  compact = false
}: {
  property: NormalizedProperty;
  compact?: boolean;
}) {
  const description = stripHtml(property.shortDescription);
  return (
    <Fragment>
      {description && (
        <p
          css={{
            color: tokens.text,
            fontSize: compact ? '13px' : '13.5px',
            lineHeight: 1.65,
            margin: '8px 0 0',
            fontFamily: typographyCss.fontFamily
          }}
        >
          {description}
        </p>
      )}
      {property.longDescription && !compact && (
        <div
          css={{
            marginTop: '8px',
            color: tokens.mutedText,
            fontSize: '13px',
            lineHeight: 1.7,
            fontFamily: typographyCss.fontFamily,
            p: { margin: '6px 0' },
            ul: { margin: '6px 0', paddingLeft: '20px' },
            li: { margin: '3px 0' },
            code: {
              background: 'rgba(255, 255, 255, 0.06)',
              padding: '1px 5px',
              borderRadius: '3px',
              fontSize: '12.5px',
              fontFamily: tokens.monoFamily
            },
            a: { color: tokens.brand }
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(property.longDescription) }}
        />
      )}
    </Fragment>
  );
}

export function BranchLabel({ branch, size = 'md' }: { branch: NormalizedUnionBranch; size?: 'sm' | 'md' | 'lg' }) {
  const padding = size === 'sm' ? '2px 7px' : size === 'lg' ? '3px 10px' : '2px 9px';
  const fontSize = size === 'sm' ? '11.5px' : size === 'lg' ? '13.5px' : '12.5px';
  return (
    <span css={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span
        css={{
          color: tokens.dimText,
          fontSize: '11px',
          fontWeight: 500,
          fontFamily: typographyCss.fontFamily,
          lineHeight: 1
        }}
      >
        type =
      </span>
      <code
        css={{
          color: tokens.text,
          background: tokens.brandSoft,
          border: `1px solid ${tokens.brandBorderStrong}`,
          padding,
          borderRadius: '6px',
          fontSize,
          fontWeight: 600,
          fontFamily: tokens.monoFamily,
          lineHeight: 1.3,
          letterSpacing: '0.25px'
        }}
      >
        &quot;{branch.label}&quot;
      </code>
    </span>
  );
}

export function NonDiscriminatedBranchLabel({
  branch,
  size = 'md'
}: {
  branch: NormalizedUnionBranch;
  size?: 'sm' | 'md' | 'lg';
}) {
  const padding = size === 'sm' ? '2px 7px' : size === 'lg' ? '3px 10px' : '2px 9px';
  const fontSize = size === 'sm' ? '11.5px' : size === 'lg' ? '13.5px' : '12.5px';
  const display = branch.typeName ?? branch.label;
  return (
    <code
      css={{
        color: tokens.text,
        background: tokens.brandSoft,
        border: `1px solid ${tokens.brandBorderStrong}`,
        padding,
        borderRadius: '6px',
        fontSize,
        fontWeight: 600,
        fontFamily: tokens.monoFamily,
        lineHeight: 1.3,
        letterSpacing: '0.25px'
      }}
    >
      {display}
    </code>
  );
}

export function VariantShellHeader({
  definitionName,
  searchQuery,
  onSearchChange,
  rightSlot
}: {
  definitionName: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  rightSlot?: ReactNode;
}) {
  return (
    <div
      css={{
        padding: '12px 16px',
        borderBottom: `1px solid ${tokens.subtleBorder}`,
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexWrap: 'wrap',
        background: tokens.surfaceSunken
      }}
    >
      <code
        css={{
          color: tokens.syntax.type,
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: tokens.monoFamily
        }}
      >
        {definitionName}
      </code>
      {/* Search lives at the far right of the header. `marginLeft: auto` pushes it past
          everything else without a dedicated spacer. */}
      <div css={{ position: 'relative', flex: '0 1 280px', marginLeft: 'auto' }}>
        <input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search properties…"
          css={{
            width: '100%',
            padding: '7px 12px',
            border: 'none',
            borderRadius: '6px',
            background: 'rgba(20, 26, 26, 0.7)',
            color: tokens.text,
            outline: 'none',
            fontSize: '14px',
            fontFamily: typographyCss.fontFamily,
            boxShadow: tokens.insetShadow,
            transition: 'box-shadow 180ms ease',
            '&::placeholder': { fontSize: '14px', color: tokens.dimText },
            ':focus': {
              boxShadow: `${tokens.insetShadow}, 0 0 0 3px rgba(54, 190, 190, 0.18)`
            }
          }}
        />
      </div>
      {rightSlot}
    </div>
  );
}

export function VariantShell({ definitionName, children }: { definitionName: string; children: ReactNode }) {
  return (
    <section
      id={sectionAnchorId(definitionName)}
      css={{
        marginTop: '24px',
        marginBottom: '28px',
        borderRadius: '10px',
        background: tokens.surface,
        boxShadow: tokens.panelShadow,
        overflow: 'hidden'
      }}
    >
      {children}
    </section>
  );
}

export function UnknownDefinition({ name }: { name: string }) {
  return (
    <div
      css={{
        padding: '14px',
        color: tokens.text,
        background: tokens.surface,
        boxShadow: tokens.panelShadow,
        borderRadius: '8px',
        marginTop: '24px'
      }}
    >
      Unknown definition <code>{name}</code>.
    </div>
  );
}
