/**
 * `<ApiReference />`: a resource's configuration properties as one list of rows.
 *
 * Every row shows what a reader comes for without a click: the name, whether it is required, the type, the default
 * and the short description, plus the allowed values of an enum. Longer explanations and examples open in place, and
 * so do nested properties and the options of a union, indented under their parent. Each row has a stable link
 * (`#api-ref_<definition>--<path>`); opening such a link expands the rows above it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Search } from 'react-feather';
import type { ApiProperty, ApiTypeInfo, ApiUnionBranch } from '@/utils/api-reference-dto';
import { sanitizeHtml, stripHtml } from '@/utils/api-reference-text';
import { CodeBlockNew } from '../CodeBlockNew';
import {
  filterProperties,
  getAllowedValues,
  getDefinition,
  getPropertyChildren,
  getShortTypeInfo,
  sectionAnchorId,
  sortRequiredFirst,
  TypeView,
  type SharedRenderProps
} from './shared';

const MAX_DEPTH = 6;
/** Enums longer than this list their first values and fold the rest. */
const VALUES_SHOWN = 12;

type OpenState = { isOpen: (key: string) => boolean; toggle: (key: string) => void };

const rowId = (anchor: string, path: string[]) => `${anchor}--${path.join('.')}`;

const renderValues = (list: (string | number)[]) =>
  list.map((value) => <code key={String(value)}>{typeof value === 'string' ? `"${value}"` : String(value)}</code>);

function AllowedValues({ values }: { values: (string | number)[] }) {
  return (
    <div className="docs-prop-values">
      Allowed values: {renderValues(values.slice(0, VALUES_SHOWN))}
      {values.length > VALUES_SHOWN && (
        <details className="inline">
          <summary>{values.length - VALUES_SHOWN} more</summary> {renderValues(values.slice(VALUES_SHOWN))}
        </details>
      )}
    </div>
  );
}

function Toggle({ label, expanded, onClick }: { label: string; expanded: boolean; onClick: () => void }) {
  return (
    <button type="button" className="docs-prop-toggle" aria-expanded={expanded} onClick={onClick}>
      <ChevronRight size={14} aria-hidden />
      {label}
    </button>
  );
}

const examplesFirstTypescript = (property: ApiProperty) =>
  (property.examples ?? [])
    .map((example) => ({
      label: example.lang === 'yaml' ? 'YAML' : 'TypeScript',
      lang: example.lang,
      code: example.code
    }))
    .toSorted((a, b) => Number(a.lang === 'yaml') - Number(b.lang === 'yaml'));

function childrenLabel(typeInfo: ApiTypeInfo) {
  const children = getPropertyChildren(typeInfo);
  if (!children) return null;
  if (children.kind === 'union-branches') {
    const count = children.branches.length;
    return children.discriminator ? `${count} types` : `${count} options`;
  }
  const count = children.properties.length;
  return `${count} ${count === 1 ? 'property' : 'properties'}`;
}

function PropertyRow({
  property,
  path,
  anchor,
  depth,
  open
}: {
  property: ApiProperty;
  path: string[];
  anchor: string;
  depth: number;
  open: OpenState;
}) {
  const id = rowId(anchor, path);
  const children = depth < MAX_DEPTH ? getPropertyChildren(property.typeInfo) : null;
  const allowedValues = getAllowedValues(property.typeInfo);
  const examples = examplesFirstTypescript(property);
  const hasDetails = Boolean(stripHtml(property.longDescription)) || examples.length > 0;
  const detailsKey = `${id}:details`;
  const childrenKey = `${id}:children`;
  const detailsOpen = open.isOpen(detailsKey);
  const childrenOpen = open.isOpen(childrenKey);
  const shortDescription = sanitizeHtml(property.shortDescription);

  return (
    <li id={id} className="docs-prop">
      <div className="docs-prop-main">
        <div className="docs-prop-head">
          <a href={`#${id}`} className="docs-prop-name docs-unstyled-link">
            {property.name}
          </a>
          {property.required && <span className="docs-prop-badge">Required</span>}
          <span className="docs-prop-type">
            <TypeView typeInfo={getShortTypeInfo(property.typeInfo)} />
          </span>
          {property.defaultValue !== undefined && (
            <span className="docs-prop-default">
              Default <code>{property.defaultValue}</code>
            </span>
          )}
        </div>
        {stripHtml(shortDescription) && (
          <div className="docs-prop-description" dangerouslySetInnerHTML={{ __html: shortDescription }} />
        )}
        {allowedValues && allowedValues.length > 3 && <AllowedValues values={allowedValues} />}
        {(hasDetails || children) && (
          <div className="docs-prop-toggles">
            {hasDetails && (
              <Toggle
                label={examples.length > 0 ? 'Details and example' : 'Details'}
                expanded={detailsOpen}
                onClick={() => open.toggle(detailsKey)}
              />
            )}
            {children && (
              <Toggle
                label={childrenLabel(property.typeInfo) ?? 'Properties'}
                expanded={childrenOpen}
                onClick={() => open.toggle(childrenKey)}
              />
            )}
          </div>
        )}
        {hasDetails && detailsOpen && (
          <div className="docs-prop-details">
            {stripHtml(property.longDescription) && (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(property.longDescription) }} />
            )}
            {examples.length > 0 && <CodeBlockNew tabs={examples} />}
          </div>
        )}
      </div>
      {children && childrenOpen && (
        <div className="docs-prop-children">
          {children.kind === 'union-branches' ? (
            <BranchList
              branches={children.branches}
              discriminator={children.discriminator}
              path={path}
              anchor={anchor}
              depth={depth + 1}
              open={open}
            />
          ) : (
            <>
              <div className="docs-prop-children-label">
                Properties of <code>{children.typeName}</code>
              </div>
              <PropertyList
                properties={sortRequiredFirst(children.properties)}
                path={path}
                anchor={anchor}
                depth={depth + 1}
                open={open}
              />
            </>
          )}
        </div>
      )}
    </li>
  );
}

function PropertyList({
  properties,
  path,
  anchor,
  depth,
  open
}: {
  properties: ApiProperty[];
  path: string[];
  anchor: string;
  depth: number;
  open: OpenState;
}) {
  return (
    <ul className="docs-ref-list">
      {properties.map((property) => (
        <PropertyRow
          key={property.name}
          property={property}
          path={[...path, property.name]}
          anchor={anchor}
          depth={depth}
          open={open}
        />
      ))}
    </ul>
  );
}

function BranchList({
  branches,
  discriminator,
  path,
  anchor,
  depth,
  open
}: {
  branches: ApiUnionBranch[];
  discriminator: string | null;
  path: string[];
  anchor: string;
  depth: number;
  open: OpenState;
}) {
  return (
    <>
      <div className="docs-prop-children-label">
        {discriminator ? (
          <>
            One of these types, chosen by <code>{discriminator}</code>
          </>
        ) : (
          'One of these options'
        )}
      </div>
      <ul className="docs-ref-list">
        {branches.map((branch) => {
          const branchPath = [...path, branch.label];
          const id = rowId(anchor, branchPath);
          const key = `${id}:children`;
          const isOpen = open.isOpen(key);
          const description = sanitizeHtml(branch.shortDescription ?? '');
          const count = branch.properties.length;
          return (
            <li key={`${branch.label}-${branch.typeName ?? ''}`} id={id} className="docs-prop">
              <div className="docs-prop-main">
                <div className="docs-prop-head">
                  <a href={`#${id}`} className="docs-prop-name docs-unstyled-link">
                    {discriminator ? (
                      <>
                        {discriminator}: <span className="docs-syn-string">&quot;{branch.label}&quot;</span>
                      </>
                    ) : (
                      (branch.typeName ?? branch.label)
                    )}
                  </a>
                  {discriminator && branch.typeName && (
                    <span className="docs-prop-type">
                      <span className="docs-syn-type">{branch.typeName}</span>
                    </span>
                  )}
                </div>
                {stripHtml(description) && (
                  <div className="docs-prop-description" dangerouslySetInnerHTML={{ __html: description }} />
                )}
                {count > 0 && depth < MAX_DEPTH && (
                  <div className="docs-prop-toggles">
                    <Toggle
                      label={`${count} ${count === 1 ? 'property' : 'properties'}`}
                      expanded={isOpen}
                      onClick={() => open.toggle(key)}
                    />
                  </div>
                )}
              </div>
              {isOpen && count > 0 && (
                <div className="docs-prop-children">
                  <PropertyList
                    properties={sortRequiredFirst(branch.properties)}
                    path={branchPath}
                    anchor={anchor}
                    depth={depth + 1}
                    open={open}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * The keys to open so the row at `segments` is rendered: each ancestor property's children (and, at a union, the
 * chosen branch's children). Segments name properties, or a branch label right after a union property.
 */
const keysForPath = (properties: ApiProperty[], anchor: string, segments: string[]): string[] => {
  const keys: string[] = [];
  let current: ApiProperty[] | null = properties;
  let pendingUnion: ApiUnionBranch[] | null = null;
  const walked: string[] = [];
  for (const segment of segments.slice(0, -1)) {
    walked.push(segment);
    if (pendingUnion) {
      const branch: ApiUnionBranch | undefined = pendingUnion.find((candidate) => candidate.label === segment);
      if (!branch) break;
      keys.push(`${rowId(anchor, walked)}:children`);
      current = branch.properties;
      pendingUnion = null;
      continue;
    }
    const property: ApiProperty | undefined = current?.find((candidate) => candidate.name === segment);
    if (!property) break;
    keys.push(`${rowId(anchor, walked)}:children`);
    const children = getPropertyChildren(property.typeInfo);
    if (children?.kind === 'union-branches') {
      pendingUnion = children.branches;
      current = null;
    } else {
      current = children?.kind === 'type-properties' ? children.properties : null;
    }
  }
  return keys;
};

export function ApiReference({ definitionName }: SharedRenderProps) {
  const definition = getDefinition(definitionName);
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const anchor = sectionAnchorId(definitionName);
  const scrollTarget = useRef<string | null>(null);

  const open = useMemo<OpenState>(
    () => ({
      isOpen: (key) => openKeys.has(key),
      toggle: (key) =>
        setOpenKeys((previous) => {
          const next = new Set(previous);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        })
    }),
    [openKeys]
  );

  // A link to a nested row opens the rows above it, then scrolls to it.
  useEffect(() => {
    if (!definition) return;
    const prefix = `#${anchor}--`;
    const reveal = () => {
      const hash = decodeURIComponent(window.location.hash);
      if (!hash.startsWith(prefix)) return;
      const keys = keysForPath(definition.properties, anchor, hash.slice(prefix.length).split('.'));
      if (keys.length === 0) return;
      scrollTarget.current = hash.slice(1);
      setOpenKeys((previous) => new Set([...previous, ...keys]));
    };
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, [anchor, definition]);

  // Scroll once the opened rows have rendered the target.
  useEffect(() => {
    const target = scrollTarget.current && document.getElementById(scrollTarget.current);
    if (!target) return;
    scrollTarget.current = null;
    target.scrollIntoView({ block: 'start' });
  }, [openKeys]);

  if (!definition) {
    return (
      <p className="docs-ref-empty">
        Unknown definition <code>{definitionName}</code>.
      </p>
    );
  }

  const visible = filterProperties(definition.properties, query, 'all');
  const total = definition.properties.length;

  return (
    <section id={anchor} className="docs-ref" aria-label={`${definition.definitionName} properties`}>
      <div className="docs-ref-header">
        <div className="docs-ref-title">
          <code>{definition.definitionName}</code>
          <span>
            {total} {total === 1 ? 'property' : 'properties'}
          </span>
        </div>
        {total > 6 && (
          <label className="docs-ref-search">
            <Search size={14} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter properties"
              aria-label={`Filter ${definition.definitionName} properties`}
            />
          </label>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="docs-ref-empty">No property matches “{query}”.</p>
      ) : (
        <PropertyList properties={visible} path={[]} anchor={anchor} depth={0} open={open} />
      )}
    </section>
  );
}
