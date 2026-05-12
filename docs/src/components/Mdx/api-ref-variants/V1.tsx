/**
 * V1 — Tree nav (dominant) + focused leaf detail (sidebar).
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
import { useState } from 'react';
import { typographyCss } from '@/styles/global';
import { onMaxW795 } from '@/styles/responsive';
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
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        flexWrap: 'wrap',
        marginBottom: '14px',
        fontSize: '11.5px',
        fontFamily: typographyCss.fontFamily
      }}
    >
      <button type="button" onClick={() => onNavigate([])} css={crumbCss(false)}>
        {rootName}
      </button>
      {resolved.breadcrumb.map((crumb, idx) => {
        const isLast = idx === resolved.breadcrumb.length - 1;
        return (
          <span key={pathKey(crumb.path)} css={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span css={{ color: tokens.fadedText }}>›</span>
            <button type="button" onClick={() => onNavigate(crumb.path)} css={crumbCss(isLast)}>
              {crumb.kind === 'property' ? crumb.name : crumb.isDiscriminated ? `"${crumb.label}"` : crumb.label}
            </button>
          </span>
        );
      })}
    </div>
  );
}

const crumbCss = (isLast: boolean) => ({
  background: 'transparent',
  border: 'none',
  color: isLast ? tokens.text : tokens.mutedText,
  fontFamily: tokens.monoFamily,
  fontSize: '11.5px',
  fontWeight: isLast ? 600 : 500,
  cursor: 'pointer',
  padding: 0,
  ':hover': { color: tokens.brand }
});

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
      css={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        borderRadius: '6px',
        padding: '8px 10px',
        cursor: 'pointer',
        color: tokens.text,
        fontFamily: typographyCss.fontFamily,
        transition: 'background 140ms ease',
        ':hover': { background: 'rgba(255, 255, 255, 0.04)' }
      }}
    >
      <div
        css={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '8px',
          flexWrap: 'wrap',
          minWidth: 0
        }}
      >
        <code
          css={{
            color: tokens.syntax.property,
            fontFamily: tokens.monoFamily,
            fontSize: '13px',
            fontWeight: 500,
            flexShrink: 0
          }}
        >
          {property.name}
        </code>
        <span css={{ color: tokens.syntax.punct, fontFamily: tokens.monoFamily, flexShrink: 0 }}>:</span>
        {property.required && (
          <span css={{ color: tokens.required, fontSize: '10.5px', fontWeight: 600, flexShrink: 0 }}>req</span>
        )}
        <span css={{ minWidth: 0, fontSize: '12.5px' }}>
          <TypeView typeInfo={property.typeInfo} />
        </span>
      </div>
      {description && (
        <div
          css={{
            marginTop: '4px',
            color: tokens.mutedText,
            fontSize: '12.5px',
            lineHeight: 1.55
          }}
        >
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
      css={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        borderRadius: '6px',
        padding: '8px 10px',
        cursor: 'pointer',
        color: tokens.text,
        fontFamily: typographyCss.fontFamily,
        transition: 'background 140ms ease',
        ':hover': { background: 'rgba(255, 255, 255, 0.04)' }
      }}
    >
      <div css={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
        {isDiscriminated ? (
          <span css={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px' }}>
            <code css={{ color: tokens.syntax.property, fontFamily: tokens.monoFamily, fontSize: '12.5px' }}>type</code>
            <code
              css={{
                color: tokens.syntax.string,
                fontFamily: tokens.monoFamily,
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              &quot;{branch.label}&quot;
            </code>
          </span>
        ) : (
          <code
            css={{
              color: tokens.syntax.type,
              fontFamily: tokens.monoFamily,
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            {branch.typeName ?? branch.label}
          </code>
        )}
        <span css={{ color: tokens.dimText, fontSize: '11.5px', flexShrink: 0 }}>
          {branch.properties.length} prop{branch.properties.length === 1 ? '' : 's'}
        </span>
      </div>
      {branch.shortDescription && (
        <div
          css={{
            marginTop: '4px',
            color: tokens.mutedText,
            fontSize: '12.5px',
            lineHeight: 1.55
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(branch.shortDescription) }}
        />
      )}
    </button>
  );
}

function NestedSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div css={{ marginTop: '18px' }}>
      <div
        css={{
          color: tokens.dimText,
          fontSize: '11.5px',
          fontFamily: typographyCss.fontFamily,
          marginBottom: '4px',
          paddingLeft: '10px'
        }}
      >
        {label}
      </div>
      <div css={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>{children}</div>
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
    <div css={{ fontFamily: typographyCss.fontFamily, fontSize: '13px', lineHeight: 1.65 }}>
      {/* Header row: property name + required marker (only when required — never show "optional"). */}
      <div css={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
        <code
          css={{
            color: tokens.text,
            fontSize: '17px',
            fontWeight: 600,
            fontFamily: tokens.monoFamily,
            lineHeight: 1.3,
            wordBreak: 'break-word'
          }}
        >
          {property.name}
        </code>
        {property.required && (
          <span
            css={{
              color: tokens.required,
              fontSize: '10.5px',
              fontWeight: 600
            }}
          >
            req
          </span>
        )}
      </div>

      {/* Type + default — plain inline labels, no surrounding box. */}
      <div
        css={{
          marginTop: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          fontSize: '13px',
          color: tokens.text
        }}
      >
        <div css={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <span css={{ color: tokens.dimText, flexShrink: 0 }}>type</span>
          <span css={{ minWidth: 0, lineHeight: 1.6 }}>
            <TypeView typeInfo={property.typeInfo} mode="pretty" />
          </span>
        </div>
        {property.defaultValue !== undefined && (
          <div css={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span css={{ color: tokens.dimText, flexShrink: 0 }}>default</span>
            <code
              css={{
                color: tokens.syntax.string,
                fontFamily: tokens.monoFamily
              }}
            >
              {property.defaultValue}
            </code>
          </div>
        )}
      </div>

      {/* Description — short + long, full markdown rendering. Same body size as the rest. */}
      {(stripHtml(property.shortDescription) || property.longDescription) && (
        <div css={{ marginTop: '14px' }}>
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
    <div css={{ fontFamily: typographyCss.fontFamily, fontSize: '13px', lineHeight: 1.65 }}>
      <div css={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
        <code
          css={{
            color: tokens.syntax.type,
            fontSize: '17px',
            fontWeight: 600,
            fontFamily: tokens.monoFamily,
            lineHeight: 1.3,
            wordBreak: 'break-word'
          }}
        >
          {branchTypeName}
        </code>
        {isDiscriminated && (
          <span css={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px' }}>
            <code css={{ color: tokens.syntax.property, fontFamily: tokens.monoFamily, fontSize: '12.5px' }}>
              {property.name}.type
            </code>
            <code
              css={{ color: tokens.syntax.string, fontFamily: tokens.monoFamily, fontSize: '12.5px', fontWeight: 600 }}
            >
              &quot;{branch.label}&quot;
            </code>
          </span>
        )}
      </div>

      {branch.shortDescription && (
        <div
          css={{
            marginTop: '12px',
            color: tokens.text,
            fontSize: '13px',
            lineHeight: 1.65
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(branch.shortDescription) }}
        />
      )}
    </div>
  );
}

function EmptyHint() {
  return (
    <div
      css={{
        color: tokens.dimText,
        fontSize: '13px',
        fontFamily: typographyCss.fontFamily,
        padding: '20px 4px',
        lineHeight: 1.6
      }}
    >
      Click a property in the tree to see its description, default value, and full type.
    </div>
  );
}

/* --------------------------------------------------------------------------------------------
 * Main component.
 * -------------------------------------------------------------------------------------------- */

export function ApiReferenceV1({ definitionName }: SharedRenderProps) {
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
        css={{
          display: 'grid',
          // Nav 55% / property info 45%. Nav shows the schema inline + needs the room.
          gridTemplateColumns: '11fr 9fr',
          minHeight: '600px',
          [onMaxW795]: { gridTemplateColumns: '1fr', minHeight: 0 }
        }}
      >
        <div
          css={{
            borderRight: `1px solid ${tokens.subtleBorder}`,
            background: tokens.surfaceSunken,
            maxHeight: '720px',
            overflowY: 'auto',
            ...narrowScrollbar,
            [onMaxW795]: {
              borderRight: 'none',
              borderBottom: `1px solid ${tokens.subtleBorder}`,
              maxHeight: '380px'
            }
          }}
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
        <div css={{ padding: '20px 22px', maxHeight: '720px', overflowY: 'auto', ...narrowScrollbar }}>
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
