/**
 * `<ApiReference />` — recursive tree nav (dominant) + focused leaf detail (sidebar).
 *
 * Layout: dual-pane. The nav IS the schema view — every property and its inline type live in
 * the tree, so the right pane no longer renders a `<CodeBlockNew />` of the containing type
 * (that just duplicated information already visible in the nav). Instead the right pane is a
 * compact detail card for whichever leaf the user clicked: name, required indicator, type,
 * default, then the full description (short + long markdown).
 *
 * Right-pane focus rules:
 *   - No selection (initial)        → friendly hint pointing the user at the tree
 *   - Selection on a primitive leaf → that leaf's detail card
 *
 * Branches and union/reference properties never become the "selection" because the tree only
 * selects leaves. They expand in place. The breadcrumb at the top of the detail pane lets the
 * user jump back up the path quickly.
 */
import clsx from 'clsx';
import { useState, type ReactNode } from 'react';
import type { NormalizedProperty } from '@/utils/api-reference-extractor';
import {
  PropertyDescription,
  TypeView,
  UnknownDefinition,
  VariantShell,
  VariantShellHeader,
  getDefinition,
  getPropertyChildren,
  isDiscriminatedUnion,
  narrowScrollbar,
  sanitizeHtml,
  stripHtml,
  tokens,
  unwrapToUnion,
  type SharedRenderProps
} from './shared';
import {
  TreeNav,
  pathKey,
  resolveSelection,
  useAutoOpenAncestors,
  type ResolvedNode,
  type SelectionPath
} from './tree-nav';

/* --------------------------------------------------------------------------------------------
 * Breadcrumb — surfaces the current path back through the tree without the user
 * having to scroll the nav. Each crumb is clickable.
 * -------------------------------------------------------------------------------------------- */

function Breadcrumb({
  rootName,
  resolved,
  onNavigate
}: {
  rootName: string;
  resolved: ResolvedNode | null;
  onNavigate: (path: SelectionPath) => void;
}) {
  if (!resolved) return null;
  return (
    <div className="font-sans flex flex-wrap items-center gap-[5px] mb-[14px] text-[11.5px]">
      <button type="button" onClick={() => onNavigate([])} className={crumbClass(false)}>
        {rootName}
      </button>
      {resolved.breadcrumb.map((crumb, idx) => {
        const isLast = idx === resolved.breadcrumb.length - 1;
        return (
          <span key={pathKey(crumb.path)} className="inline-flex items-center gap-[5px]">
            <span style={{ color: tokens.fadedText }}>›</span>
            <button
              type="button"
              onClick={() => onNavigate(crumb.path)}
              className={crumbClass(isLast)}
            >
              {crumb.kind === 'property' ? crumb.name : crumb.isDiscriminated ? `"${crumb.label}"` : crumb.label}
            </button>
          </span>
        );
      })}
    </div>
  );
}

const crumbClass = (isLast: boolean) =>
  clsx(
    'bg-transparent border-none font-mono text-[11.5px] cursor-pointer p-0 hover:text-[rgb(54_190_190)]',
    // Base color is a class (not inline style) so the :hover utility above can win.
    isLast ? 'font-semibold text-fc-primary' : 'font-medium text-[rgba(255,255,255,0.62)]'
  );

/* --------------------------------------------------------------------------------------------
 * Nested items — shown when the focused node has children (referenced type's properties,
 * union branches, or a branch's own properties). Each row is clickable and navigates the tree
 * to the corresponding nested node, so users can drill in without scrubbing the left rail.
 * -------------------------------------------------------------------------------------------- */

function NestedPropertyRow({ property, onClick }: { property: NormalizedProperty; onClick: () => void }) {
  const description = stripHtml(property.shortDescription);
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-sans block w-full text-left bg-transparent border-none rounded-[6px] px-[10px] py-2 cursor-pointer transition-[background] duration-[140ms] ease-[ease] hover:bg-[rgba(255,255,255,0.04)]"
      style={{ color: tokens.text }}
    >
      <div className="flex flex-wrap items-baseline min-w-0">
        <code className="font-mono text-[13px] font-medium flex-shrink-0" style={{ color: tokens.syntax.property }}>
          {property.name}
        </code>
        <span className="font-mono flex-shrink-0 mr-2" style={{ color: tokens.syntax.punct }}>
          :
        </span>
        {property.required && (
          <span className="text-[10.5px] font-semibold flex-shrink-0 mr-2" style={{ color: tokens.required }}>
            req
          </span>
        )}
        <span className="min-w-0 text-[12.5px]">
          <TypeView typeInfo={property.typeInfo} />
        </span>
      </div>
      {description && (
        <div className="mt-1 text-[12.5px] leading-[1.55]" style={{ color: tokens.mutedText }}>
          {description}
        </div>
      )}
    </button>
  );
}

function NestedBranchRow({
  branch,
  isDiscriminated,
  onClick
}: {
  branch: import('@/utils/api-reference-extractor').NormalizedUnionBranch;
  isDiscriminated: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-sans block w-full text-left bg-transparent border-none rounded-[6px] px-[10px] py-2 cursor-pointer transition-[background] duration-[140ms] ease-[ease] hover:bg-[rgba(255,255,255,0.04)]"
      style={{ color: tokens.text }}
    >
      <div className="flex flex-wrap items-baseline gap-2 min-w-0">
        {isDiscriminated ? (
          <span className="inline-flex items-baseline gap-[6px]">
            <code className="font-mono text-[12.5px]" style={{ color: tokens.syntax.property }}>
              type
            </code>
            <code className="font-mono text-[13px] font-semibold" style={{ color: tokens.syntax.string }}>
              &quot;{branch.label}&quot;
            </code>
          </span>
        ) : (
          <code className="font-mono text-[13px] font-semibold" style={{ color: tokens.syntax.type }}>
            {branch.typeName ?? branch.label}
          </code>
        )}
        <span className="text-[11.5px] flex-shrink-0" style={{ color: tokens.dimText }}>
          {branch.properties.length} prop{branch.properties.length === 1 ? '' : 's'}
        </span>
      </div>
      {branch.shortDescription && (
        <div
          className="mt-1 text-[12.5px] leading-[1.55]"
          style={{ color: tokens.mutedText }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(branch.shortDescription) }}
        />
      )}
    </button>
  );
}

function NestedSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-[18px]">
      <div className="font-sans text-[11.5px] mb-1 pl-[10px]" style={{ color: tokens.dimText }}>
        {label}
      </div>
      <div className="flex flex-col gap-[2px]">{children}</div>
    </div>
  );
}

function NestedItems({ resolved, onNavigate }: { resolved: ResolvedNode; onNavigate: (path: SelectionPath) => void }) {
  const lastPath = resolved.breadcrumb[resolved.breadcrumb.length - 1].path;

  if (resolved.kind === 'branch') {
    if (resolved.branch.properties.length === 0) return null;
    return (
      <NestedSection label="properties">
        {resolved.branch.properties.map((sub) => (
          <NestedPropertyRow
            key={sub.name}
            property={sub}
            onClick={() => onNavigate([...lastPath, { kind: 'property', name: sub.name }])}
          />
        ))}
      </NestedSection>
    );
  }

  // resolved.kind === 'property'
  const union = unwrapToUnion(resolved.property.typeInfo);
  if (union) {
    const isDisc = isDiscriminatedUnion(resolved.property.typeInfo);
    return (
      <NestedSection label={isDisc ? 'pick a type' : 'pick an option'}>
        {union.branches.map((branch) => (
          <NestedBranchRow
            key={branch.label}
            branch={branch}
            isDiscriminated={isDisc}
            onClick={() => onNavigate([...lastPath, { kind: 'branch', label: branch.label }])}
          />
        ))}
      </NestedSection>
    );
  }

  const childInfo = getPropertyChildren(resolved.property.typeInfo);
  if (childInfo?.kind === 'type-properties') {
    return (
      <NestedSection label={`properties of ${childInfo.typeName}`}>
        {childInfo.properties.map((sub) => (
          <NestedPropertyRow
            key={sub.name}
            property={sub}
            onClick={() => onNavigate([...lastPath, { kind: 'property', name: sub.name }])}
          />
        ))}
      </NestedSection>
    );
  }

  return null;
}

/* --------------------------------------------------------------------------------------------
 * Leaf detail — the focused view for any property selection. Shows name, type, default,
 * description, and (when the property has children) a clickable list of nested items.
 * -------------------------------------------------------------------------------------------- */

function LeafDetail({ property }: { property: NormalizedProperty }) {
  return (
    <div className="font-sans text-[13px] leading-[1.65]">
      {/* Header row: property name + required marker (only when required — never show "optional"). */}
      <div className="flex flex-wrap items-baseline gap-2">
        <code className="font-mono text-[17px] font-semibold leading-[1.3] break-words" style={{ color: tokens.text }}>
          {property.name}
        </code>
        {property.required && (
          <span className="text-[10.5px] font-semibold" style={{ color: tokens.required }}>
            req
          </span>
        )}
      </div>

      {/* Type + default — plain inline labels, no surrounding box. */}
      <div className="mt-[10px] flex flex-col gap-1 text-[13px]" style={{ color: tokens.text }}>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="flex-shrink-0" style={{ color: tokens.dimText }}>
            type
          </span>
          <span className="min-w-0 leading-[1.6]">
            <TypeView typeInfo={property.typeInfo} mode="pretty" />
          </span>
        </div>
        {property.defaultValue !== undefined && (
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="flex-shrink-0" style={{ color: tokens.dimText }}>
              default
            </span>
            <code className="font-mono" style={{ color: tokens.syntax.string }}>
              {property.defaultValue}
            </code>
          </div>
        )}
      </div>

      {/* Description — short + long, full markdown rendering. Same body size as the rest. */}
      {(stripHtml(property.shortDescription) || property.longDescription) && (
        <div className="mt-[14px]">
          <PropertyDescription property={property} />
        </div>
      )}
    </div>
  );
}

/**
 * Branch detail — shown when the selection ends on a discriminated/non-discriminated branch.
 * Mirrors `LeafDetail`'s shape so the right pane stays visually consistent.
 */
function BranchDetail({
  property,
  branch,
  isDiscriminated
}: {
  property: NormalizedProperty;
  branch: import('@/utils/api-reference-extractor').NormalizedUnionBranch;
  isDiscriminated: boolean;
}) {
  const branchTypeName = branch.typeName ?? branch.label;
  return (
    <div className="font-sans text-[13px] leading-[1.65]">
      <div className="flex flex-wrap items-baseline gap-[10px]">
        <code
          className="font-mono text-[17px] font-semibold leading-[1.3] break-words"
          style={{ color: tokens.syntax.type }}
        >
          {branchTypeName}
        </code>
        {isDiscriminated && (
          <span className="inline-flex items-baseline gap-[6px]">
            <code className="font-mono text-[12.5px]" style={{ color: tokens.syntax.property }}>
              {property.name}.type
            </code>
            <code className="font-mono text-[12.5px] font-semibold" style={{ color: tokens.syntax.string }}>
              &quot;{branch.label}&quot;
            </code>
          </span>
        )}
      </div>

      {branch.shortDescription && (
        <div
          className="mt-3 text-[13px] leading-[1.65]"
          style={{ color: tokens.text }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(branch.shortDescription) }}
        />
      )}
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="font-sans text-[13px] leading-[1.6] px-1 py-5" style={{ color: tokens.dimText }}>
      Click a property in the tree to see its description, default value, and full type.
    </div>
  );
}

/* --------------------------------------------------------------------------------------------
 * Main component.
 * -------------------------------------------------------------------------------------------- */

export function ApiReference({ definitionName }: SharedRenderProps) {
  const definition = getDefinition(definitionName);
  const [selectionPath, setSelectionPath] = useState<SelectionPath>([]);
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useAutoOpenAncestors(selectionPath, setOpenKeys);

  if (!definition) return <UnknownDefinition name={definitionName} />;

  const resolved = resolveSelection(definition.properties, definition.definitionName, selectionPath);

  return (
    <VariantShell definitionName={definition.definitionName}>
      <VariantShellHeader
        definitionName={definition.definitionName}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <div
        // Nav 55% / property info 45%. Nav shows the schema inline + needs the room.
        className="grid [grid-template-columns:11fr_9fr] min-h-[600px] max-[795px]:[grid-template-columns:1fr] max-[795px]:min-h-0"
      >
        <div
          className={clsx(
            'border-r border-solid max-h-[720px] overflow-y-auto',
            'max-[795px]:border-r-0 max-[795px]:border-b max-[795px]:max-h-[380px]',
            narrowScrollbar
          )}
          style={{ borderColor: tokens.subtleBorder, background: tokens.surfaceSunken }}
        >
          <TreeNav
            properties={definition.properties}
            selectionPath={selectionPath}
            openKeys={openKeys}
            searchQuery={searchQuery}
            onToggleOpen={(key) =>
              setOpenKeys((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })
            }
            onSelect={setSelectionPath}
          />
        </div>
        <div className={clsx('px-[22px] py-5 max-h-[720px] overflow-y-auto', narrowScrollbar)}>
          <Breadcrumb rootName={definition.definitionName} resolved={resolved} onNavigate={setSelectionPath} />
          {!resolved ? (
            <EmptyHint />
          ) : (
            <>
              {resolved.kind === 'branch' ? (
                <BranchDetail
                  property={resolved.property}
                  branch={resolved.branch}
                  isDiscriminated={resolved.isDiscriminated}
                />
              ) : (
                <LeafDetail property={resolved.property} />
              )}
              <NestedItems resolved={resolved} onNavigate={setSelectionPath} />
            </>
          )}
        </div>
      </div>
    </VariantShell>
  );
}

export default ApiReference;
