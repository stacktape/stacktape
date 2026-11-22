import { createElement, type CSSProperties } from 'react';
import { ChevronRight } from 'react-feather';
import { ContentTreeNode, navIndentStyle } from './ContentTreeNode';
import { useExpansionToggle, useIsExpanded } from './expansion-store';
import type { NavGroup } from './navigation-data';

/**
 * A top-level sidebar section. Its heading is the disclosure control: a full-width row with the chevron at the right
 * edge, like every expandable row below it. Collapsed children are `inert`, so they leave the tab order.
 */
export function ContentTreeGroup({ group }: { group: NavGroup }) {
  const groupKey = `group:${group.id}`;
  const isExpanded = useIsExpanded(groupKey);
  const toggle = useExpansionToggle();
  const childrenId = `docs-nav-${group.id}`;

  // The root group holds the Introduction entry only: no heading, always open.
  if (group.id === '__root') {
    return (
      <ul className="docs-nav-list docs-nav-group">
        {group.children.map((child) => (
          <ContentTreeNode key={child.key} item={child} depth={0} />
        ))}
      </ul>
    );
  }

  return (
    <div className="docs-nav-group">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={childrenId}
        onClick={() => toggle(groupKey)}
        className="docs-nav-row is-group"
        style={navIndentStyle(0)}
      >
        {group.icon && <span className="docs-nav-icon">{createElement(group.icon, { size: 16 })}</span>}
        <span className="docs-nav-label">{group.title}</span>
        <ChevronRight size={14} className="docs-nav-chevron" aria-hidden />
      </button>
      <div
        id={childrenId}
        className={isExpanded ? 'docs-nav-children is-open' : 'docs-nav-children'}
        inert={!isExpanded}
      >
        <ul className="docs-nav-list" style={{ '--docs-guide-x': '20px' } as CSSProperties}>
          {group.children.map((child) => (
            <ContentTreeNode key={child.key} item={child} depth={1} />
          ))}
        </ul>
      </div>
    </div>
  );
}
