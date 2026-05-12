/**
 * Recursive tree nav — page-nav UX. Visual language matches the docs sidebar
 * (`Navigation/SidebarNavigation/ContentTreeNode`):
 *   - pill-style rounded rows
 *   - chevron on the right
 *   - gradient + small left-indicator bar for the active row
 *   - hover with subtle elevation
 *
 * Behavior — strictly mirrors the page nav. Type names are kept verbatim (no humanization).
 * Discriminator values render with the same string color as the code block.
 */
import { useEffect, useMemo, type ReactNode } from 'react';
import { ChevronRight } from 'react-feather';
import { fontFamily } from '@/styles/variables';
import type { NormalizedProperty, NormalizedUnionBranch } from '@/utils/api-reference-extractor';
import {
  filterProperties,
  getPropertyChildren,
  isDiscriminatedUnion,
  sortRequiredFirst,
  tokens,
  TypeView,
  unwrapToUnion
} from './shared';

const MAX_DEPTH = 6;

const ROW_OUTER_MARGIN_X = 8;
const ROW_BASE_INDENT = 10;
const DEPTH_STEP = 12;
const ROW_PADDING_RIGHT = 12;
const ROW_PADDING_Y = 7;
const ROW_MIN_HEIGHT = 32;
const ROW_BORDER_RADIUS = 7;
const CHEVRON_SIZE = 14;
const COLLAPSE_DURATION_MS = 220;

export type SelectionSegment = { kind: 'property'; name: string } | { kind: 'branch'; label: string };

export type SelectionPath = SelectionSegment[];

const segmentToString = (segment: SelectionSegment) =>
  segment.kind === 'property' ? `p:${segment.name}` : `b:${segment.label}`;

export const pathKey = (path: SelectionPath) => path.map(segmentToString).join('/');

export const ancestorKeys = (path: SelectionPath): string[] => {
  const keys: string[] = [];
  for (let i = 1; i < path.length; i++) keys.push(pathKey(path.slice(0, i)));
  return keys;
};

export const pathEquals = (a: SelectionPath, b: SelectionPath) => pathKey(a) === pathKey(b);

type CommonProps = {
  selectionKey: string;
  openKeys: Set<string>;
  onToggleOpen: (key: string) => void;
  onSelect: (path: SelectionPath) => void;
};

function NodeRow({
  isActive,
  depth,
  hasChildren,
  isOpen,
  onClick,
  label
}: {
  isActive: boolean;
  depth: number;
  hasChildren: boolean;
  isOpen: boolean;
  /** Single click handler — page-nav style. Non-leaf clicks toggle open; leaf clicks select. */
  onClick: () => void;
  label: ReactNode;
}) {
  const indent = ROW_BASE_INDENT + depth * DEPTH_STEP;

  return (
    <li css={{ listStyle: 'none', display: 'block', padding: 0, margin: 0 }}>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        css={{
          fontFamily,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minHeight: `${ROW_MIN_HEIGHT}px`,
          margin: `1px ${ROW_OUTER_MARGIN_X}px`,
          paddingTop: `${ROW_PADDING_Y}px`,
          paddingBottom: `${ROW_PADDING_Y}px`,
          paddingLeft: `${indent}px`,
          paddingRight: `${ROW_PADDING_RIGHT}px`,
          borderRadius: `${ROW_BORDER_RADIUS}px`,
          background: isActive ? tokens.activeGradient : 'transparent',
          boxShadow: isActive ? tokens.activeShadow : 'none',
          color: tokens.text,
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'background 140ms ease, box-shadow 140ms ease, color 140ms ease',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: '6px',
            top: '20%',
            width: '3px',
            height: '60%',
            borderRadius: '999px',
            background: tokens.text,
            opacity: isActive ? 1 : 0,
            transition: 'opacity 150ms ease'
          },
          '&:hover': isActive
            ? {
                boxShadow:
                  '0 5px 14px rgba(0, 0, 0, 0.49), 0 0 0 1px rgba(220, 220, 220, 0.17), inset 0 1px 0 rgba(255, 255, 255, 0.11)'
              }
            : {
                background: 'rgba(255, 255, 255, 0.06)',
                boxShadow: '0 6px 14px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              },
          '&:hover::before': isActive ? undefined : { opacity: 0.4 }
        }}
      >
        <div
          css={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            userSelect: 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {label}
        </div>
        {hasChildren && (
          <ChevronRight
            size={CHEVRON_SIZE}
            css={{
              flexShrink: 0,
              opacity: 0.55,
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: `transform ${COLLAPSE_DURATION_MS}ms ease`
            }}
          />
        )}
      </div>
    </li>
  );
}

function NestedGroup({ isOpen, children }: { isOpen: boolean; children: ReactNode }) {
  return (
    <li
      aria-hidden={!isOpen}
      css={{
        listStyle: 'none',
        display: 'grid',
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        transition: `grid-template-rows ${COLLAPSE_DURATION_MS}ms ease`
      }}
    >
      <ul
        css={{
          overflow: 'hidden',
          minHeight: 0,
          padding: 0,
          margin: 0
        }}
      >
        {children}
      </ul>
    </li>
  );
}

/* --------------------------------------------------------------------------------------------
 * Row labels — use code-block colors so the tree visually agrees with the right-pane code.
 * -------------------------------------------------------------------------------------------- */

function RequiredMark() {
  // Small uppercase tag in the orange "required" hue. Reads as a label, not punctuation —
  // less visually noisy than an asterisk while still scannable.
  return (
    <span
      title="Required"
      aria-label="Required"
      css={{
        color: tokens.required,
        fontFamily,
        fontSize: '10.5px',
        fontWeight: 600,
        lineHeight: 1,
        flexShrink: 0
      }}
    >
      req
    </span>
  );
}

function PropertyLabel({ property, showRequired = true }: { property: NormalizedProperty; showRequired?: boolean }) {
  // The `:` hugs the property name (no gap) so the row reads like an actual TS property
  // declaration. The required tag and type display still get breathing room.
  return (
    <span
      css={{
        display: 'inline-flex',
        alignItems: 'center',
        minWidth: 0,
        overflow: 'hidden',
        fontSize: '12.5px'
      }}
    >
      <code
        title={property.name}
        css={{
          color: tokens.syntax.property,
          fontSize: '13.5px',
          fontWeight: 500,
          fontFamily: tokens.monoFamily,
          // Don't cap the name width — it should render in full whenever it fits. If the row
          // gets too tight, the type display (which has `minWidth: 0`) shrinks first.
          flexShrink: 0,
          whiteSpace: 'nowrap'
        }}
      >
        {property.name}
      </code>
      <span css={{ color: tokens.syntax.punct, fontFamily: tokens.monoFamily, flexShrink: 0, marginRight: '6px' }}>
        :
      </span>
      {showRequired && property.required && (
        <span css={{ marginRight: '6px', display: 'inline-flex', alignItems: 'center' }}>
          <RequiredMark />
        </span>
      )}
      <span
        css={{
          minWidth: 0,
          overflow: 'hidden',
          opacity: 0.9
        }}
      >
        <TypeView typeInfo={property.typeInfo} />
      </span>
    </span>
  );
}

function DiscriminatorBranchLabel({ branch }: { branch: NormalizedUnionBranch }) {
  // `type "value"` — no colon, no badge. `type` reads as a plain dim label; the value is the
  // focus, in string-green to match the code block.
  return (
    <span css={{ display: 'inline-flex', alignItems: 'baseline', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
      <code
        css={{
          color: tokens.syntax.property,
          fontFamily: tokens.monoFamily,
          fontSize: '12.5px',
          fontWeight: 500,
          flexShrink: 0,
          lineHeight: 1.3
        }}
      >
        type
      </code>
      <code
        css={{
          color: tokens.syntax.string,
          fontSize: '12.5px',
          fontFamily: tokens.monoFamily,
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        &quot;{branch.label}&quot;
      </code>
    </span>
  );
}

function NonDiscriminatedBranchTreeLabel({ branch }: { branch: NormalizedUnionBranch }) {
  const display = branch.typeName ?? branch.label;
  return (
    <code
      css={{
        color: tokens.syntax.type,
        fontSize: '12.5px',
        fontFamily: tokens.monoFamily,
        fontWeight: 600,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}
    >
      {display}
    </code>
  );
}

/* --------------------------------------------------------------------------------------------
 * Recursive items.
 * -------------------------------------------------------------------------------------------- */

function PropertyTreeItem({
  property,
  parentPath,
  level,
  ...common
}: {
  property: NormalizedProperty;
  parentPath: SelectionPath;
  level: number;
} & CommonProps) {
  const path: SelectionPath = [...parentPath, { kind: 'property', name: property.name }];
  const key = pathKey(path);
  const isActive = common.selectionKey === key;
  const children = level + 1 <= MAX_DEPTH ? getPropertyChildren(property.typeInfo) : null;
  const hasChildren = children !== null;
  const isOpen = common.openKeys.has(key);

  return (
    <>
      <NodeRow
        isActive={isActive}
        depth={level}
        hasChildren={hasChildren}
        isOpen={isOpen}
        onClick={() => {
          // Always select so the right pane shows the current node's description; for
          // non-leaves also toggle expand (page-nav-style — click again to collapse).
          common.onSelect(path);
          if (hasChildren) common.onToggleOpen(key);
        }}
        label={<PropertyLabel property={property} />}
      />
      {hasChildren && children && (
        <NestedGroup isOpen={isOpen}>
          {children.kind === 'union-branches'
            ? children.branches.map((branch) => (
                <BranchTreeItem
                  key={`${branch.label}-${branch.typeName ?? ''}`}
                  branch={branch}
                  parentPath={path}
                  level={level + 1}
                  isDiscriminated={children.discriminator !== null}
                  {...common}
                />
              ))
            : sortRequiredFirst(children.properties).map((subProperty) => (
                <PropertyTreeItem
                  key={subProperty.name}
                  property={subProperty}
                  parentPath={path}
                  level={level + 1}
                  {...common}
                />
              ))}
        </NestedGroup>
      )}
    </>
  );
}

function BranchTreeItem({
  branch,
  parentPath,
  level,
  isDiscriminated,
  ...common
}: {
  branch: NormalizedUnionBranch;
  parentPath: SelectionPath;
  level: number;
  isDiscriminated: boolean;
} & CommonProps) {
  const path: SelectionPath = [...parentPath, { kind: 'branch', label: branch.label }];
  const key = pathKey(path);
  const isActive = common.selectionKey === key;
  const hasChildren = branch.properties.length > 0 && level + 1 <= MAX_DEPTH;
  const isOpen = common.openKeys.has(key);

  return (
    <>
      <NodeRow
        isActive={isActive}
        depth={level}
        hasChildren={hasChildren}
        isOpen={isOpen}
        onClick={() => {
          // Always select so the right pane shows the current node's description; for
          // non-leaves also toggle expand (page-nav-style — click again to collapse).
          common.onSelect(path);
          if (hasChildren) common.onToggleOpen(key);
        }}
        label={
          isDiscriminated ? (
            <DiscriminatorBranchLabel branch={branch} />
          ) : (
            <NonDiscriminatedBranchTreeLabel branch={branch} />
          )
        }
      />
      {hasChildren && (
        <NestedGroup isOpen={isOpen}>
          {sortRequiredFirst(branch.properties).map((subProperty) => (
            <PropertyTreeItem
              key={subProperty.name}
              property={subProperty}
              parentPath={path}
              level={level + 1}
              {...common}
            />
          ))}
        </NestedGroup>
      )}
    </>
  );
}

export function TreeNav({
  properties,
  selectionPath,
  openKeys,
  searchQuery,
  onToggleOpen,
  onSelect,
  emptyHint = 'No matching properties.'
}: {
  properties: NormalizedProperty[];
  selectionPath: SelectionPath;
  openKeys: Set<string>;
  searchQuery: string;
  onToggleOpen: (key: string) => void;
  onSelect: (path: SelectionPath) => void;
  emptyHint?: string;
}) {
  // Filter chips removed — required-first sort is always on (handled inside `filterProperties`).
  const visible = useMemo(() => filterProperties(properties, searchQuery, 'all'), [properties, searchQuery]);
  const selectionKey = pathKey(selectionPath);

  return (
    <nav aria-label="Properties" css={{ paddingTop: '8px', paddingBottom: '8px' }}>
      {visible.length === 0 ? (
        <div
          css={{
            padding: '20px 16px',
            color: tokens.mutedText,
            fontSize: '12.5px',
            fontFamily
          }}
        >
          {emptyHint}
        </div>
      ) : (
        <ul css={{ padding: 0, margin: 0 }}>
          {visible.map((property) => (
            <PropertyTreeItem
              key={property.name}
              property={property}
              parentPath={[]}
              level={0}
              selectionKey={selectionKey}
              openKeys={openKeys}
              onToggleOpen={onToggleOpen}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </nav>
  );
}

export function useAutoOpenAncestors(
  selectionPath: SelectionPath,
  setOpenKeys: (updater: (prev: Set<string>) => Set<string>) => void
) {
  const key = pathKey(selectionPath);
  useEffect(() => {
    if (selectionPath.length === 0) return;
    const ancestors = ancestorKeys(selectionPath);
    if (ancestors.length === 0) return;
    setOpenKeys((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const ancestor of ancestors) {
        if (!next.has(ancestor)) {
          next.add(ancestor);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/**
 * Resolve a selection path against a definition: returns the leaf property/branch and the
 * full chain of ancestors (so renderers can show a breadcrumb).
 */
export type ResolvedNode =
  | {
      kind: 'property';
      property: NormalizedProperty;
      parentTypeName: string;
      breadcrumb: BreadcrumbItem[];
    }
  | {
      kind: 'branch';
      property: NormalizedProperty;
      branch: NormalizedUnionBranch;
      isDiscriminated: boolean;
      parentTypeName: string;
      breadcrumb: BreadcrumbItem[];
    };

export type BreadcrumbItem =
  | { kind: 'property'; name: string; path: SelectionPath }
  | { kind: 'branch'; label: string; isDiscriminated: boolean; path: SelectionPath };

export function resolveSelection(
  rootProperties: NormalizedProperty[],
  rootTypeName: string,
  path: SelectionPath
): ResolvedNode | null {
  if (path.length === 0) return null;

  let currentProperties: NormalizedProperty[] | null = rootProperties;
  let currentTypeName = rootTypeName;
  let currentProperty: NormalizedProperty | null = null;
  let currentBranch: NormalizedUnionBranch | null = null;
  let currentDiscriminated = false;

  const breadcrumb: BreadcrumbItem[] = [];

  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    const subPath = path.slice(0, i + 1);

    if (seg.kind === 'property') {
      if (!currentProperties) return null;
      const found = currentProperties.find((p) => p.name === seg.name);
      if (!found) return null;
      currentProperty = found;
      currentBranch = null;
      breadcrumb.push({ kind: 'property', name: found.name, path: subPath });
      const children = getPropertyChildren(found.typeInfo);
      if (children?.kind === 'type-properties') {
        currentProperties = children.properties;
        currentTypeName = children.typeName;
      } else if (children?.kind === 'union-branches') {
        currentProperties = null;
      } else {
        currentProperties = null;
      }
    } else {
      if (!currentProperty) return null;
      const union = unwrapToUnion(currentProperty.typeInfo);
      if (!union) return null;
      const branch = union.branches.find((b) => b.label === seg.label);
      if (!branch) return null;
      currentBranch = branch;
      currentDiscriminated = isDiscriminatedUnion(currentProperty.typeInfo);
      breadcrumb.push({ kind: 'branch', label: branch.label, isDiscriminated: currentDiscriminated, path: subPath });
      currentProperties = branch.properties;
      if (branch.typeName) currentTypeName = branch.typeName;
    }
  }

  if (currentBranch && currentProperty) {
    return {
      kind: 'branch',
      property: currentProperty,
      branch: currentBranch,
      isDiscriminated: currentDiscriminated,
      parentTypeName: currentTypeName,
      breadcrumb
    };
  }
  if (currentProperty) {
    return {
      kind: 'property',
      property: currentProperty,
      parentTypeName: currentTypeName,
      breadcrumb
    };
  }
  return null;
}
