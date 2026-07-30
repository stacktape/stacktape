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
import clsx from 'clsx';
import { useEffect, useMemo, type ReactNode } from 'react';
import { ChevronRight } from 'react-feather';
import type { ApiProperty, ApiUnionBranch } from '@/utils/api-reference-dto';
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

const ROW_BASE_INDENT = 10;
const DEPTH_STEP = 12;
const CHEVRON_SIZE = 14;
const COLLAPSE_DURATION_MS = 220;

type SelectionSegment = { kind: 'property'; name: string } | { kind: 'branch'; label: string };

export type SelectionPath = SelectionSegment[];

const segmentToString = (segment: SelectionSegment) =>
  segment.kind === 'property' ? `p:${segment.name}` : `b:${segment.label}`;

export const pathKey = (path: SelectionPath) => path.map(segmentToString).join('/');

const ancestorKeys = (path: SelectionPath): string[] => {
  const keys: string[] = [];
  for (let i = 1; i < path.length; i++) keys.push(pathKey(path.slice(0, i)));
  return keys;
};

type CommonProps = {
  selectionKey: string;
  openKeys: Set<string>;
  onToggleOpen: (key: string) => void;
  onSelect: (path: SelectionPath) => void;
};

/**
 * The row state every tree node shares. Clicking always selects, so the right pane shows the current
 * node's description; a node with children also toggles expansion (page-nav style — click again to
 * collapse).
 */
const treeNodeState = (path: SelectionPath, hasChildren: boolean, common: CommonProps) => {
  const key = pathKey(path);
  return {
    row: {
      isActive: common.selectionKey === key,
      hasChildren,
      isOpen: common.openKeys.has(key),
      onClick: () => {
        common.onSelect(path);
        if (hasChildren) common.onToggleOpen(key);
      }
    }
  };
};

const propertyTreeItems = (properties: ApiProperty[], parentPath: SelectionPath, level: number, common: CommonProps) =>
  sortRequiredFirst(properties).map((property) => (
    <PropertyTreeItem key={property.name} property={property} parentPath={parentPath} level={level} {...common} />
  ));

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
    <div className="block">
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          'font-sans relative flex w-auto items-center gap-[8px] min-h-[32px] my-px mx-2 py-[7px] pr-3 rounded-[7px] border-none bg-transparent text-left no-underline cursor-pointer',
          'transition-[background,box-shadow,color] duration-[140ms] ease-[ease]',
          "before:content-[''] before:absolute before:left-[6px] before:top-[20%] before:w-[3px] before:h-[60%] before:rounded-[999px] before:bg-[rgba(255,255,255,0.87)] before:transition-opacity before:duration-[150ms] before:ease-[ease]",
          isActive
            ? 'before:opacity-100 bg-[linear-gradient(135deg,rgb(60,64,64),rgb(44,47,47))] shadow-[0_4px_12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(190,190,190,0.16),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_5px_14px_rgba(0,0,0,0.49),0_0_0_1px_rgba(220,220,220,0.17),inset_0_1px_0_rgba(255,255,255,0.11)]'
            : 'before:opacity-0 hover:before:opacity-40 hover:bg-[rgba(255,255,255,0.06)] hover:shadow-[0_6px_14px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.05)]'
        )}
        style={{
          paddingLeft: `${indent}px`,
          color: tokens.text
        }}
      >
        <div className="flex flex-1 min-w-0 items-center gap-[8px] select-none overflow-hidden text-ellipsis whitespace-nowrap">
          {label}
        </div>
        {hasChildren && (
          <ChevronRight
            size={CHEVRON_SIZE}
            className="flex-shrink-0 opacity-55 transition-transform ease-[ease]"
            style={{
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transitionDuration: `${COLLAPSE_DURATION_MS}ms`
            }}
          />
        )}
      </button>
    </div>
  );
}

function NestedGroup({ isOpen, children }: { isOpen: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden={!isOpen}
      className="grid transition-[grid-template-rows] ease-[ease]"
      style={{
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        transitionDuration: `${COLLAPSE_DURATION_MS}ms`
      }}
    >
      <div className="overflow-hidden min-h-0">{children}</div>
    </div>
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
      className="font-sans text-[10.5px] font-semibold leading-none flex-shrink-0"
      style={{ color: tokens.required }}
    >
      req
    </span>
  );
}

function PropertyLabel({ property, showRequired = true }: { property: ApiProperty; showRequired?: boolean }) {
  // The `:` hugs the property name (no gap) so the row reads like an actual TS property
  // declaration. The required tag and type display still get breathing room.
  return (
    <span className="inline-flex items-center min-w-0 overflow-hidden text-[12.5px]">
      <code
        title={property.name}
        // Don't cap the name width — it should render in full whenever it fits. If the row
        // gets too tight, the type display (which has `minWidth: 0`) shrinks first.
        className="font-mono text-[13.5px] font-medium flex-shrink-0 whitespace-nowrap"
        style={{ color: tokens.syntax.property }}
      >
        {property.name}
      </code>
      <span className="font-mono flex-shrink-0 mr-[6px]" style={{ color: tokens.syntax.punct }}>
        :
      </span>
      {showRequired && property.required && (
        <span className="mr-[6px] inline-flex items-center">
          <RequiredMark />
        </span>
      )}
      <span className="min-w-0 overflow-hidden opacity-90">
        <TypeView typeInfo={property.typeInfo} />
      </span>
    </span>
  );
}

function DiscriminatorBranchLabel({ branch }: { branch: ApiUnionBranch }) {
  // `type "value"` — no colon, no badge. `type` reads as a plain dim label; the value is the
  // focus, in string-green to match the code block.
  return (
    <span className="inline-flex items-baseline gap-[8px] min-w-0 overflow-hidden">
      <code
        className="font-mono text-[12.5px] font-medium flex-shrink-0 leading-[1.3]"
        style={{ color: tokens.syntax.property }}
      >
        type
      </code>
      <code
        className="font-mono text-[12.5px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ color: tokens.syntax.string }}
      >
        &quot;{branch.label}&quot;
      </code>
    </span>
  );
}

function NonDiscriminatedBranchTreeLabel({ branch }: { branch: ApiUnionBranch }) {
  const display = branch.typeName ?? branch.label;
  return (
    <code
      className="font-mono text-[12.5px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
      style={{ color: tokens.syntax.type }}
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
  property: ApiProperty;
  parentPath: SelectionPath;
  level: number;
} & CommonProps) {
  const path: SelectionPath = [...parentPath, { kind: 'property', name: property.name }];
  const children = level + 1 <= MAX_DEPTH ? getPropertyChildren(property.typeInfo) : null;
  const node = treeNodeState(path, children !== null, common);

  return (
    <>
      <NodeRow {...node.row} depth={level} label={<PropertyLabel property={property} />} />
      {children && (
        <NestedGroup isOpen={node.row.isOpen}>
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
            : propertyTreeItems(children.properties, path, level + 1, common)}
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
  branch: ApiUnionBranch;
  parentPath: SelectionPath;
  level: number;
  isDiscriminated: boolean;
} & CommonProps) {
  const path: SelectionPath = [...parentPath, { kind: 'branch', label: branch.label }];
  const hasChildren = branch.properties.length > 0 && level + 1 <= MAX_DEPTH;
  const node = treeNodeState(path, hasChildren, common);

  return (
    <>
      <NodeRow
        {...node.row}
        depth={level}
        label={
          isDiscriminated ? (
            <DiscriminatorBranchLabel branch={branch} />
          ) : (
            <NonDiscriminatedBranchTreeLabel branch={branch} />
          )
        }
      />
      {hasChildren && (
        <NestedGroup isOpen={node.row.isOpen}>
          {propertyTreeItems(branch.properties, path, level + 1, common)}
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
  properties: ApiProperty[];
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
    <nav aria-label="Properties" className="py-2">
      {visible.length === 0 ? (
        <div className="font-sans px-4 py-5 text-[12.5px]" style={{ color: tokens.mutedText }}>
          {emptyHint}
        </div>
      ) : (
        <div>
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
        </div>
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
      property: ApiProperty;
      parentTypeName: string;
      breadcrumb: BreadcrumbItem[];
    }
  | {
      kind: 'branch';
      property: ApiProperty;
      branch: ApiUnionBranch;
      isDiscriminated: boolean;
      parentTypeName: string;
      breadcrumb: BreadcrumbItem[];
    };

export type BreadcrumbItem =
  | { kind: 'property'; name: string; path: SelectionPath }
  | { kind: 'branch'; label: string; isDiscriminated: boolean; path: SelectionPath };

export function resolveSelection(
  rootProperties: ApiProperty[],
  rootTypeName: string,
  path: SelectionPath
): ResolvedNode | null {
  if (path.length === 0) return null;

  let currentProperties: ApiProperty[] | null = rootProperties;
  let currentTypeName = rootTypeName;
  let currentProperty: ApiProperty | null = null;
  let currentBranch: ApiUnionBranch | null = null;
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
