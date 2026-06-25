/**
 * Shared helpers for the API reference.
 *
 * The reference is dual-pane:  a tree nav on the left where
 * discriminated-union branches AND nested type-properties references are first-class navigation
 * children. They share the data helpers, the visual tokens (aligned with console-app: glassy
 * surfaces, stacktape green accent, badge-style pills), and the small atoms. Layout and the
 * right-pane behavior are owned per-variant.
 *
 * Type names are kept verbatim (PascalCase). No humanization.
 */
import { kebabCase } from 'change-case';
import clsx from 'clsx';
import { Fragment, type ReactNode } from 'react';
import { apiReferenceData, type ApiReferenceGeneratedDefinition } from '@/generated/api-reference-data';
import { colors, fontFamilyMono } from '@/styles/variables';
import type { NormalizedProperty, NormalizedTypeInfo, NormalizedUnionBranch } from '@/utils/api-reference-extractor';
import { CodeBlockNew } from '../CodeBlockNew';

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
 * Class defined in `global.css` (`@layer components`).
 */
export const narrowScrollbar = 'stp-api-narrow-scrollbar';

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

const Punct = ({ children }: { children: ReactNode }) => (
  <span style={{ color: tokens.syntax.punct }}>{children}</span>
);

const renderLiteral = (value: string | number): ReactNode => {
  if (typeof value === 'string') {
    return <span style={{ color: tokens.syntax.string }}>{`"${value}"`}</span>;
  }
  return <span style={{ color: tokens.syntax.number }}>{String(value)}</span>;
};

const renderPrimitiveType = (name: string): ReactNode => {
  // `string` / `number` / `boolean` etc. — built-in primitive, blue. Distinct from yellow
  // (which is reserved for user-defined interfaces / type references).
  return <span style={{ color: tokens.syntax.primitive }}>{name}</span>;
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
    return <span style={{ color: tokens.syntax.type }}>{typeInfo.typeName}</span>;
  }
  if (typeInfo.kind === 'union') {
    const items: ReactNode[] = typeInfo.branches.map((branch, i) => {
      if (branch.typeName)
        return (
          <span key={i} style={{ color: tokens.syntax.type }}>
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
  return <span style={{ color: tokens.syntax.type }}>unknown</span>;
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
          <span key={i} className="block">
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
      className={clsx(
        'font-mono',
        mode === 'inline'
          ? 'inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap align-bottom'
          : 'whitespace-normal break-words'
      )}
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
      className="font-sans inline-block rounded-[6px] border px-[7px] py-[2px] text-[10.5px] font-semibold leading-[1.2] tracking-[0.4px]"
      style={{
        backgroundColor: tokens.requiredBg,
        color: tokens.text,
        borderColor: tokens.requiredBorder
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
      className={clsx(
        'inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-[5px] border font-mono font-medium leading-[1.5]',
        compact ? 'px-[7px] py-px text-[11px]' : 'px-2 py-[2px] text-[11.5px]'
      )}
      style={{
        color: accent ? tokens.brand : tokens.mutedText,
        background: accent ? tokens.brandBg : 'rgba(255, 255, 255, 0.04)',
        borderColor: accent ? tokens.brandBorder : tokens.subtleBorder
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
    <div className="flex flex-wrap items-center gap-[10px]">
      <code
        className="font-mono font-semibold leading-[1.3]"
        style={{ color: tokens.text, fontSize }}
      >
        {property.name}
      </code>
      {property.required && <RequiredPill />}
      <TypeBadge typeInfo={property.typeInfo} />
      {property.defaultValue !== undefined && (
        <span className="font-sans text-[11.5px]" style={{ color: tokens.dimText }}>
          default{' '}
          <code className="font-mono text-[11.5px]" style={{ color: tokens.mutedText }}>
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
          className={clsx(
            'font-sans mt-2 mx-0 mb-0 leading-[1.65]',
            compact ? 'text-[13px]' : 'text-[13.5px]'
          )}
          style={{ color: tokens.text }}
        >
          {description}
        </p>
      )}
      {property.longDescription && !compact && (
        <div
          className="font-sans mt-2 text-[13px] leading-[1.7] [&_p]:my-[6px] [&_p]:mx-0 [&_ul]:my-[6px] [&_ul]:mx-0 [&_ul]:pl-5 [&_li]:my-[3px] [&_li]:mx-0 [&_code]:bg-[rgba(255,255,255,0.06)] [&_code]:px-[5px] [&_code]:py-px [&_code]:rounded-[3px] [&_code]:text-[12.5px] [&_code]:font-mono [&_a]:text-[rgb(54_190_190)]"
          style={{ color: tokens.mutedText }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(property.longDescription) }}
        />
      )}
      {property.examples && property.examples.length > 0 && !compact && (
        <div className="mt-[10px]">
          <CodeBlockNew
            tabs={property.examples.map((example) => ({
              label: example.lang === 'yaml' ? 'YAML' : 'TypeScript',
              lang: example.lang,
              code: example.code
            }))}
          />
        </div>
      )}
    </Fragment>
  );
}

export function BranchLabel({ branch, size = 'md' }: { branch: NormalizedUnionBranch; size?: 'sm' | 'md' | 'lg' }) {
  const padding = size === 'sm' ? '2px 7px' : size === 'lg' ? '3px 10px' : '2px 9px';
  const fontSize = size === 'sm' ? '11.5px' : size === 'lg' ? '13.5px' : '12.5px';
  return (
    <span className="inline-flex items-center gap-[6px]">
      <span className="font-sans text-[11px] font-medium leading-none" style={{ color: tokens.dimText }}>
        type =
      </span>
      <code
        className="font-mono font-semibold rounded-[6px] border leading-[1.3] tracking-[0.25px]"
        style={{
          color: tokens.text,
          background: tokens.brandSoft,
          borderColor: tokens.brandBorderStrong,
          padding,
          fontSize
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
      className="font-mono font-semibold rounded-[6px] border leading-[1.3] tracking-[0.25px]"
      style={{
        color: tokens.text,
        background: tokens.brandSoft,
        borderColor: tokens.brandBorderStrong,
        padding,
        fontSize
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
      className="flex flex-wrap items-center gap-[10px] border-b px-4 py-3"
      style={{ borderBottomColor: tokens.subtleBorder, background: tokens.surfaceSunken }}
    >
      <code className="font-mono text-[14px] font-semibold" style={{ color: tokens.syntax.type }}>
        {definitionName}
      </code>
      {/* Search lives at the far right of the header. `marginLeft: auto` pushes it past
          everything else without a dedicated spacer. */}
      <div className="relative ml-auto flex-[0_1_280px]">
        <input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search properties…"
          className="w-full rounded-[6px] border-none bg-[rgba(20,26,26,0.7)] px-3 py-[7px] text-[14px] font-sans outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.30),0_1px_0_rgba(255,255,255,0.05)] transition-shadow duration-[180ms] ease-[ease] placeholder:text-[14px] placeholder:text-[rgba(255,255,255,0.42)] focus:shadow-[inset_0_1px_3px_rgba(0,0,0,0.30),0_1px_0_rgba(255,255,255,0.05),0_0_0_3px_rgba(54,190,190,0.18)]"
          style={{ color: tokens.text }}
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
      className="mt-6 mb-7 overflow-hidden rounded-[10px]"
      style={{ background: tokens.surface, boxShadow: tokens.panelShadow }}
    >
      {children}
    </section>
  );
}

export function UnknownDefinition({ name }: { name: string }) {
  return (
    <div
      className="mt-6 rounded-[8px] p-[14px]"
      style={{ color: tokens.text, background: tokens.surface, boxShadow: tokens.panelShadow }}
    >
      Unknown definition <code>{name}</code>.
    </div>
  );
}
