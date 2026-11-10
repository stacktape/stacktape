/**
 * The side panel the diagram opens when a node is clicked: what the resource is, what it connects to, an API's routes,
 * and a group's members with their own triggers and connections. It reads the scene only; actions go back to the
 * renderer (select another node, expand or collapse a group) or to the host (`onOpenResource`).
 */
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import type { IsoGroup, IsoGroupMember, IsoNode, IsoNodeConnection, IsoRoute } from './scene.js';
import { useId } from 'react';
import { BiX } from 'react-icons/bi';

/** Headings for each kind of connection, seen from the selected node. */
const CONNECTION_HEADINGS: Record<string, { in: string; out: string }> = {
  request: { in: 'Receives requests from', out: 'Sends requests to' },
  event: { in: 'Triggered by', out: 'Delivers events to' },
  security: { in: 'Protected by', out: 'Protects' },
  auth: { in: 'Checks callers for', out: 'Checks callers with' },
  dependency: { in: 'Used by', out: 'Connects to' },
  egress: { in: 'Outbound traffic from', out: 'Reaches the internet through' }
};

const SECTION_ORDER: Array<{ direction: 'in' | 'out'; semantic: string }> = [
  { direction: 'in', semantic: 'request' },
  { direction: 'in', semantic: 'event' },
  { direction: 'in', semantic: 'security' },
  { direction: 'in', semantic: 'auth' },
  { direction: 'in', semantic: 'dependency' },
  { direction: 'in', semantic: 'egress' },
  { direction: 'out', semantic: 'request' },
  { direction: 'out', semantic: 'event' },
  { direction: 'out', semantic: 'dependency' },
  { direction: 'out', semantic: 'auth' },
  { direction: 'out', semantic: 'security' },
  { direction: 'out', semantic: 'egress' }
];

const openAnything = () => true;

export type DiagramPanelProps = {
  node: IsoNode | undefined;
  group: IsoGroup | undefined;
  /** Whether the node at the other end of a connection can be selected. */
  canSelect: (nodeId: string) => boolean;
  onSelect: (nodeId: string) => void;
  onClose: () => void;
  onToggleGroup?: ((groupId: string) => void) | undefined;
  /** Shows a member of a collapsed group: expands the group and selects the member. */
  onShowMember?: ((groupId: string, memberId: string) => void) | undefined;
  onOpenResource?: ((resourceName: string) => void) | undefined;
  canOpenResource?: ((resourceName: string) => boolean) | undefined;
  headingRef: RefObject<HTMLHeadingElement | null>;
};

function ConnectionList({
  connections,
  canSelect,
  onSelect,
  selfId
}: {
  connections: IsoNodeConnection[];
  canSelect: (nodeId: string) => boolean;
  onSelect: (nodeId: string) => void;
  selfId: string;
}) {
  const sections = SECTION_ORDER.map(({ direction, semantic }) => ({
    direction,
    semantic,
    items: connections.filter((connection) => connection.direction === direction && connection.semantic === semantic)
  })).filter((section) => section.items.length > 0);
  if (sections.length === 0) return <p className="stp-diagram__panel-muted">Not connected to anything drawn here.</p>;

  return (
    <>
      {sections.map((section) => (
        <section key={`${section.direction}-${section.semantic}`} className="stp-diagram__panel-section">
          <h3 className="stp-diagram__panel-section-title">
            {CONNECTION_HEADINGS[section.semantic]?.[section.direction] ?? section.semantic}
          </h3>
          <ul className="stp-diagram__panel-list">
            {section.items.map((connection) => (
              <li
                key={`${connection.nodeId}-${connection.name}-${connection.text ?? ''}`}
                className="stp-diagram__panel-item"
              >
                {connection.nodeId !== selfId && canSelect(connection.nodeId) ? (
                  <button type="button" className="stp-diagram__panel-link" onClick={() => onSelect(connection.nodeId)}>
                    {connection.name}
                  </button>
                ) : (
                  <span className="stp-diagram__panel-name">{connection.name}</span>
                )}
                {connection.text && <span className="stp-diagram__panel-muted">{connection.text}</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function MemberRow({
  member,
  group,
  onShowMember,
  onOpenResource
}: {
  member: IsoGroupMember;
  group: IsoGroup;
  onShowMember?: ((groupId: string, memberId: string) => void) | undefined;
  onOpenResource?: ((resourceName: string) => void) | undefined;
}) {
  const uses = member.connections.filter((connection) => connection.direction === 'out');
  return (
    <li className="stp-diagram__panel-member">
      <div className="stp-diagram__panel-member-head">
        {onShowMember ? (
          <button
            type="button"
            className="stp-diagram__panel-link"
            title="Show on the diagram"
            onClick={() => onShowMember(group.id, member.id)}
          >
            {member.label}
          </button>
        ) : (
          <span className="stp-diagram__panel-name">{member.label}</span>
        )}
        {onOpenResource && (
          <button
            type="button"
            className="stp-diagram__panel-mini-action"
            aria-label={`Open ${member.label}`}
            onClick={() => onOpenResource(member.id)}
          >
            Open
          </button>
        )}
      </div>
      {member.triggers.length > 0 && <p className="stp-diagram__panel-code">{member.triggers.join(', ')}</p>}
      {uses.length > 0 && (
        <p className="stp-diagram__panel-muted">→ {uses.map((connection) => connection.name).join(', ')}</p>
      )}
    </li>
  );
}

export function DiagramPanel({
  node,
  group,
  canSelect,
  onSelect,
  onClose,
  onToggleGroup,
  onShowMember,
  onOpenResource,
  canOpenResource = openAnything,
  headingRef
}: DiagramPanelProps) {
  const headingId = useId();
  if (!node && !group) return null;

  const title = group && (!node || node.id === group.id) ? group.label : (node?.label ?? '');
  const subtitle = node
    ? [node.typeName, node.typeLabel, node.isImplicit ? 'created automatically' : null].filter(Boolean).join(' · ')
    : group?.typeLabel;
  const isGroupSelected = Boolean(group && (!node || node.id === group.id));
  /** A member drawn on its own because its group is expanded. */
  const parentGroup = !isGroupSelected ? group : undefined;
  const canOpen = Boolean(onOpenResource && node && !node.isImplicit && !node.memberCount && canOpenResource(node.id));

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    onClose();
  };

  return (
    <aside
      className="stp-diagram__panel"
      aria-labelledby={headingId}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="stp-diagram__panel-header">
        <div className="stp-diagram__panel-heading">
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className="stp-diagram__panel-title">
            {title}
          </h2>
          {subtitle && <p className="stp-diagram__panel-subtitle">{subtitle}</p>}
        </div>
        <button
          type="button"
          className="stp-diagram__panel-close"
          aria-label="Close details"
          title="Close (Esc)"
          onClick={onClose}
        >
          <BiX aria-hidden="true" size={20} />
        </button>
      </header>

      {(isGroupSelected || parentGroup || canOpen) && (
        <div className="stp-diagram__panel-actions">
          {isGroupSelected && group && onToggleGroup && (
            <button type="button" className="stp-diagram__panel-button" onClick={() => onToggleGroup(group.id)}>
              {group.expanded ? 'Collapse group' : `Show all ${group.typeLabel}`}
            </button>
          )}
          {parentGroup && onToggleGroup && (
            <button type="button" className="stp-diagram__panel-button" onClick={() => onToggleGroup(parentGroup.id)}>
              Collapse {parentGroup.label}
            </button>
          )}
          {canOpen && node && (
            <button
              type="button"
              className="stp-diagram__panel-button stp-diagram__panel-button--primary"
              onClick={() => onOpenResource?.(node.id)}
            >
              Open resource
            </button>
          )}
        </div>
      )}

      <div className="stp-diagram__panel-body">
        {node?.summary && <p className="stp-diagram__panel-summary">{node.summary}</p>}
        {node?.details && <p className="stp-diagram__panel-details">{node.details}</p>}
        {node?.accessNote && <p className="stp-diagram__panel-note">{node.accessNote}</p>}

        {isGroupSelected && group && (
          <section className="stp-diagram__panel-section">
            <h3 className="stp-diagram__panel-section-title">Members ({group.members.length})</h3>
            <ul className="stp-diagram__panel-list">
              {group.members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  group={group}
                  onShowMember={onShowMember}
                  onOpenResource={onOpenResource && canOpenResource(member.id) ? onOpenResource : undefined}
                />
              ))}
            </ul>
          </section>
        )}

        {node?.routes && node.routes.length > 0 && (
          <RouteTable routes={node.routes} canSelect={canSelect} onSelect={onSelect} />
        )}

        {node && (
          <ConnectionList connections={node.connections} canSelect={canSelect} onSelect={onSelect} selfId={node.id} />
        )}
      </div>
    </aside>
  );
}

function RouteTable({
  routes,
  canSelect,
  onSelect
}: {
  routes: IsoRoute[];
  canSelect: (nodeId: string) => boolean;
  onSelect: (nodeId: string) => void;
}) {
  const hasAuthorizer = routes.some((route) => route.authorizer);
  return (
    <section className="stp-diagram__panel-section">
      <h3 className="stp-diagram__panel-section-title">Routes ({routes.length})</h3>
      <table className="stp-diagram__panel-routes">
        <thead>
          <tr>
            <th scope="col">Method</th>
            <th scope="col">Path</th>
            <th scope="col">Target</th>
            {hasAuthorizer && <th scope="col">Authorizer</th>}
          </tr>
        </thead>
        <tbody>
          {routes.map((route) => (
            <tr key={`${route.method} ${route.path} ${route.target}`}>
              <td className="stp-diagram__panel-code">{route.method}</td>
              <td className="stp-diagram__panel-code">{route.path}</td>
              <td>
                {canSelect(route.targetNodeId) ? (
                  <button
                    type="button"
                    className="stp-diagram__panel-link"
                    onClick={() => onSelect(route.targetNodeId)}
                  >
                    {route.target}
                  </button>
                ) : (
                  route.target
                )}
              </td>
              {hasAuthorizer && <td className="stp-diagram__panel-muted">{route.authorizer ?? '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
