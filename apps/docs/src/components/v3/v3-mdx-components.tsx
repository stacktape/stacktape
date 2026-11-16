import type { ReactNode } from 'react';
import jargon from '../../../archive/v3/data/jargon.json';
import propDescriptions from '../../../archive/v3/data/prop-descriptions.json';
import rdsEngineVersions from '../../../archive/v3/data/rds-engine-versions.json';
import referenceableParams from '../../../archive/v3/data/referenceable-params.json';
import resourceList from '../../../archive/v3/data/resource-list.json';
import { tokens } from '@/components/Mdx/api-reference/shared';
import { Info, Warning } from '@/components/Mdx/Highlighter';
import { MdxImage } from '@/components/Mdx/Image';
import { Link } from '@/components/Mdx/Link';
import { PreviousNext } from '@/components/Mdx/PreviousNext';
import { Table } from '@/components/Mdx/Table';
import { v3Html, type V3PageContext } from './v3-html';
import { V3PropertiesTable } from './V3PropertiesTable';

type CliArg = {
  name: string;
  required: boolean;
  shortDescription?: string;
  longDescription?: string;
  alias?: string;
  allowedValues?: string[];
  allowedTypes: string[];
};

const descriptionClassName =
  'text-[13px] leading-[1.7] [&_p]:my-[6px] [&_ul]:my-[6px] [&_ul]:pl-5 [&_li]:my-[3px] [&_code]:rounded-[3px] [&_code]:bg-[rgba(255,255,255,0.06)] [&_code]:px-[5px] [&_code]:font-mono [&_code]:text-[12.5px] [&_a]:text-[rgb(54_190_190)]';

const jargonEntries = jargon as Record<string, { longName?: string; description: string }>;
const stripTags = (html: string) => html.replace(/<[^>]*>/g, '');

/**
 * The MDX components of the v3 archive, bound to the page they render on.
 *
 * They keep the names and props the v3 pages use, so the frozen MDX stays as it was published; the
 * data comes from `archive/v3/data`, and the look is the current site's.
 */
export function createV3MdxComponents(page: V3PageContext) {
  const href = (url: string) => v3Html.href(url, page);

  return {
    table: Table,
    img: MdxImage,
    // v3 explained jargon terms in a tooltip on emphasised words.
    em: ({ children }: { children?: ReactNode }) => {
      const entry = typeof children === 'string' ? jargonEntries[children] : undefined;
      if (!entry) return <em>{children}</em>;
      const title = `${children}${entry.longName ? ` (${entry.longName})` : ''}: ${stripTags(entry.description)}`;
      return (
        <em title={title} className="cursor-help underline decoration-dotted underline-offset-[3px]">
          {children}
        </em>
      );
    },
    Warning,
    Info,
    Divider: () => <hr />,
    // A v3 spacing tweak with no content.
    NegativeMargin: () => null,
    PropertiesTable: (props: {
      definitionName?: string;
      searchForReferencesInDefinition?: string;
      rewriteLinksForReferencedCompositeTypes?: Record<string, string>;
    }) => <V3PropertiesTable {...props} page={page} />,
    PropDescription: ({
      definitionName,
      propertyName,
      descType = 'ld'
    }: {
      definitionName: string;
      propertyName: string;
      descType?: 'ld' | 'sd';
    }) => {
      const html = (propDescriptions as Record<string, string>)[`${definitionName}|${propertyName}|${descType}`];
      return (
        <div className="stp-typography" dangerouslySetInnerHTML={{ __html: v3Html(html ?? 'No description', page) }} />
      );
    },
    CliCommandsApiReference: ({ command, sortedArgs }: { command: string; sortedArgs: CliArg[] }) => (
      <section
        id={`v3-cli-options-${command}`}
        className="mt-[24px] mb-[28px] overflow-hidden rounded-[10px]"
        style={{ background: tokens.surface, boxShadow: tokens.panelShadow }}
      >
        <div
          className="border-b border-solid px-[16px] py-[10px] text-[14px] font-semibold"
          style={{ borderBottomColor: tokens.subtleBorder, background: tokens.surfaceSunken, color: tokens.text }}
        >
          Options
        </div>
        {sortedArgs.length === 0 && (
          <p className="px-[16px] py-[12px] text-[13.5px]" style={{ color: tokens.mutedText }}>
            No available options.
          </p>
        )}
        {sortedArgs.map((arg, index) => (
          <details
            key={arg.name}
            className="group"
            style={index > 0 ? { borderTop: `1px solid ${tokens.subtleBorder}` } : undefined}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-[10px] px-[16px] py-[9px] [&::-webkit-details-marker]:hidden">
              <code className="font-mono text-[13.5px] font-semibold" style={{ color: tokens.text }}>
                {arg.alias ? `${arg.name} (--${arg.alias})` : arg.name}
              </code>
              <span className="flex items-center gap-[8px] text-[11.5px]">
                {arg.required && (
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
                dangerouslySetInnerHTML={{ __html: v3Html(arg.shortDescription || 'No description', page) }}
              />
              <p className="mt-[10px] mb-0">
                <span style={{ color: tokens.mutedText }}>Type: </span>
                <code className="font-mono text-[12px]" style={{ color: tokens.syntax.primitive }}>
                  {arg.allowedTypes[0]}
                </code>
              </p>
              {arg.allowedValues && arg.allowedValues.length > 1 && (
                <p className="mt-[10px] mb-0 flex flex-wrap items-center gap-[4px]">
                  <span style={{ color: tokens.mutedText }}>Possible values: </span>
                  {arg.allowedValues.map((value) => (
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
              {arg.longDescription && (
                <div
                  className={`mt-[10px] ${descriptionClassName}`}
                  style={{ color: tokens.mutedText }}
                  dangerouslySetInnerHTML={{ __html: v3Html(arg.longDescription, page) }}
                />
              )}
            </div>
          </details>
        ))}
      </section>
    ),
    ReferenceableParams: ({ resource }: { resource: string }) => {
      const params = (referenceableParams as Record<string, Record<string, string> | null>)[resource];
      if (!params) return null;
      return (
        <div>
          <p>
            The following parameters can be easily referenced using{' '}
            <Link href={href('/configuration/directives/#resource-param')}>$ResourceParam directive</Link> directive.
          </p>
          <p>
            To learn more about referencing parameters, refer to{' '}
            <Link href={href('/configuration/referencing-parameters/')}>referencing parameters</Link>.
          </p>
          {Object.entries(params).map(([paramName, description]) => (
            <div key={paramName} className="mt-[18px] stp-typography">
              <span className="font-bold">{paramName}</span>
              <ul>
                <li
                  className="[&_a]:font-bold [&_p]:m-0"
                  dangerouslySetInnerHTML={{ __html: v3Html(description, page) }}
                />
                <li>
                  Usage: <code>{`$ResourceParam('<<resource-name>>', '${paramName}')`}</code>
                </li>
              </ul>
            </div>
          ))}
        </div>
      );
    },
    EngineVersionsList: ({ resourceType }: { resourceType: 'rds' }) => (
      <div>
        {resourceType === 'rds' &&
          Object.entries(rdsEngineVersions as Record<string, string[]>).map(([engine, versions]) => (
            <details key={engine} className="my-[6px]">
              <summary className="cursor-pointer font-mono text-[14px]">{engine}</summary>
              <ul className="mt-[6px]">
                {versions.map((version) => (
                  <li key={version}>
                    <code>{version}</code>
                  </li>
                ))}
              </ul>
            </details>
          ))}
      </div>
    ),
    NavBoxGrid: ({ children }: { children?: ReactNode; columns?: number }) => (
      <div className="my-[20px] grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[12px]">{children}</div>
    ),
    NavBox: ({ text, url, description }: { text: ReactNode; url: string; description?: string; icon?: ReactNode }) => (
      <a
        href={href(url)}
        className="stp-clickable-box block rounded-[8px] px-[18px] py-[12px] no-underline"
        style={{ color: tokens.text }}
      >
        <span className="block font-semibold">{text}</span>
        {description && (
          <span className="mt-[4px] block text-[13.5px]" style={{ color: tokens.mutedText }}>
            {description}
          </span>
        )}
      </a>
    ),
    ResourceList: () => (
      <div className="my-[20px] grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[12px]">
        {resourceList.map((resource) => {
          const target = href(resource.url);
          return target.startsWith('/v3/') ? (
            <a
              key={resource.url}
              href={target}
              className="stp-clickable-box block rounded-[8px] px-[18px] py-[12px] font-semibold no-underline"
              style={{ color: tokens.text }}
            >
              {resource.title}
            </a>
          ) : (
            // v3 linked these cards to pages it never had; keep the name without a broken link.
            <span
              key={resource.url}
              className="stp-clickable-box block rounded-[8px] px-[18px] py-[12px] font-semibold"
            >
              {resource.title}
            </span>
          );
        })}
      </div>
    ),
    PreviousNext: ({
      left,
      right
    }: {
      left?: { url: string; title: string };
      right?: { url: string; title: string };
    }) => (
      <PreviousNext
        left={left && { ...left, url: href(left.url) }}
        right={right && { ...right, url: href(right.url) }}
      />
    )
  };
}
