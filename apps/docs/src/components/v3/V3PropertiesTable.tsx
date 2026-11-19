import { kebabCase } from 'change-case';
import { Fragment } from 'react';
import propertyTables from '../../../archive/v3/data/property-tables.json';
import { tokens } from '@/components/Mdx/api-reference/shared';
import { v3Html, type V3PageContext } from './v3-html';

type TypeEntry = { name: string; composite: boolean; exactValue?: string | number; isEnum?: boolean };
type Row = {
  name: string;
  required?: boolean;
  default?: string;
  isArray?: boolean;
  types: TypeEntry[];
  possibleValues?: string[];
  sd?: string;
  ld?: string;
};
type Table = { definitionName?: string; parents: string[]; rows: Row[] };

const tables = propertyTables as Record<string, Table>;
const renderedDefinitions = new Set(Object.keys(tables).map((key) => key.split('|')[0]));

/** False for definitions the 3.7.1 schema does not have; their tables render nothing. */
export const hasV3Table = (definitionName: string) => renderedDefinitions.has(definitionName);

/** Anchor id v3 gave each table; other pages and the type badges link to it. */
const v3TableAnchor = (definitionName: string) => `api-ref_${kebabCase(definitionName)}`;

const typeNameWithoutProps = (name: string) => (name.endsWith('Props') ? name.slice(0, -'Props'.length) : name);

const capitalizeFirstLetter = (html: string) =>
  html.startsWith('<p> ')
    ? `<p> ${html.charAt(4).toUpperCase()}${html.slice(5)}`
    : html.charAt(0).toUpperCase() + html.slice(1);

function TypeBadge({ type, href }: { type: TypeEntry; href?: string }) {
  const label = `${type.name}${type.isEnum ? ' ENUM' : ''}${type.exactValue ? ` "${type.exactValue}"` : ''}`;
  const className = 'inline-block rounded-[4px] px-[6px] py-px font-mono text-[12px] leading-[1.6] break-all';
  if (href) {
    return (
      <a
        href={href}
        className={className}
        style={{ color: tokens.syntax.type, background: tokens.brandBg, border: `1px solid ${tokens.brandBorder}` }}
      >
        {label}
      </a>
    );
  }
  return (
    <span
      className={className}
      style={{ color: type.composite ? tokens.syntax.type : tokens.syntax.primitive, background: tokens.surfaceSunken }}
    >
      {label}
    </span>
  );
}

function TypeLine({ types, linkFor }: { types: TypeEntry[]; linkFor: (typeName: string) => string | undefined }) {
  return (
    <Fragment>
      {types.map((type, index) => (
        <Fragment key={`${type.name}-${type.exactValue ?? ''}`}>
          {index > 0 && <span style={{ color: tokens.dimText }}> or </span>}
          <TypeBadge type={type} href={type.composite ? linkFor(type.name) : undefined} />
        </Fragment>
      ))}
    </Fragment>
  );
}

/**
 * A v3 configuration reference table, rendered from the frozen 3.7.1 schema data.
 *
 * Rows are `<details>` elements, so they expand like v3's rows without client JavaScript, and the
 * descriptions stay in the page for find-in-page.
 */
export function V3PropertiesTable({
  definitionName,
  searchForReferencesInDefinition,
  rewriteLinksForReferencedCompositeTypes,
  page
}: {
  definitionName?: string;
  searchForReferencesInDefinition?: string;
  rewriteLinksForReferencedCompositeTypes?: Record<string, string>;
  page: V3PageContext;
}) {
  // 3.7.1 rendered nothing when the definition was missing; the archive does the same.
  if (!definitionName) return null;
  const table = tables[`${definitionName}|${searchForReferencesInDefinition ?? ''}`];
  if (!table) return null;

  const linkFor = (typeName: string) => {
    const rewritten = rewriteLinksForReferencedCompositeTypes?.[typeName];
    if (rewritten) return v3Html.href(rewritten, page);
    return page.tableDefinitions.has(typeName) ? `#${v3TableAnchor(typeName)}` : undefined;
  };

  return (
    <section
      id={v3TableAnchor(definitionName)}
      className="mt-[30px] mb-[30px] overflow-hidden rounded-[10px]"
      style={{ background: tokens.surface, boxShadow: tokens.panelShadow }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-[10px] border-b border-solid px-[16px] py-[10px] text-[14px]"
        style={{ borderBottomColor: tokens.subtleBorder, background: tokens.surfaceSunken }}
      >
        <span>
          <code className="font-mono font-semibold" style={{ color: tokens.syntax.type }}>
            {typeNameWithoutProps(table.definitionName ?? definitionName)}
          </code>
          <span className="ml-[8px]" style={{ color: tokens.mutedText }}>
            API reference
          </span>
        </span>
        {table.parents.length > 0 && (
          <span className="flex flex-wrap items-center gap-[4px] max-[650px]:hidden">
            <span style={{ color: tokens.mutedText }}>Parent:</span>
            <TypeLine
              types={table.parents.map((name) => ({ name: typeNameWithoutProps(name), composite: true }))}
              linkFor={linkFor}
            />
          </span>
        )}
      </div>
      {table.rows.map((row, index) => (
        <details
          key={row.name}
          className="group"
          style={index > 0 ? { borderTop: `1px solid ${tokens.subtleBorder}` } : undefined}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-[10px] px-[16px] py-[9px] [&::-webkit-details-marker]:hidden">
            <code className="font-mono text-[13.5px] font-semibold break-all" style={{ color: tokens.text }}>
              {row.name}
            </code>
            <span className="flex shrink-0 items-center gap-[8px] text-[11.5px]">
              {row.default !== undefined && (
                <span style={{ color: tokens.dimText }}>
                  Default:{' '}
                  <code className="font-mono" style={{ color: tokens.mutedText }}>
                    {row.default}
                  </code>
                </span>
              )}
              {row.required && (
                <span
                  className="rounded-[4px] px-[6px] py-px font-semibold uppercase tracking-[0.4px]"
                  style={{
                    color: tokens.text,
                    background: tokens.requiredBg,
                    border: `1px solid ${tokens.requiredBorder}`
                  }}
                >
                  Required
                </span>
              )}
              <span
                aria-hidden="true"
                className="transition-transform group-open:rotate-180"
                style={{ color: tokens.mutedText }}
              >
                ▾
              </span>
            </span>
          </summary>
          <div className="px-[16px] pt-[2px] pb-[14px] text-[13.5px] leading-[1.6]" style={{ color: tokens.text }}>
            <div
              className="font-semibold [&_p]:m-0"
              dangerouslySetInnerHTML={{
                __html: v3Html(row.sd ? capitalizeFirstLetter(row.sd) : 'No description', page)
              }}
            />
            <p className="mt-[10px] mb-0">
              <span style={{ color: tokens.mutedText }}>Type: </span>
              {row.isArray && <span>Array of </span>}
              <TypeLine types={row.types} linkFor={linkFor} />
            </p>
            {row.possibleValues && (
              <p className="mt-[10px] mb-0 flex flex-wrap items-center gap-[4px]">
                <span style={{ color: tokens.mutedText }}>Possible values: </span>
                {row.possibleValues.map((value) => (
                  <code
                    key={value}
                    className="rounded-[4px] px-[5px] py-px font-mono text-[12px]"
                    style={{ color: tokens.syntax.string, background: tokens.surfaceSunken }}
                  >
                    {value}
                  </code>
                ))}
              </p>
            )}
            {row.ld && (
              <div
                className="mt-[10px] text-[13px] leading-[1.7] [&_p]:my-[6px] [&_ul]:my-[6px] [&_ul]:pl-5 [&_li]:my-[3px] [&_code]:rounded-[3px] [&_code]:bg-[rgba(255,255,255,0.06)] [&_code]:px-[5px] [&_code]:font-mono [&_code]:text-[12.5px] [&_pre]:overflow-x-auto [&_pre]:rounded-[6px] [&_pre]:bg-[rgba(0,0,0,0.25)] [&_pre]:p-[10px] [&_pre_code]:bg-transparent [&_a]:text-[rgb(54_190_190)]"
                style={{ color: tokens.mutedText }}
                dangerouslySetInnerHTML={{ __html: v3Html(row.ld, page) }}
              />
            )}
          </div>
        </details>
      ))}
    </section>
  );
}
