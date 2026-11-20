import { ResourceIcon } from '@stacktape/ui-react/resource-icon';
import { Spinner } from '@stacktape/ui-react/spinner';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BiLayer } from 'react-icons/bi';
import type { Session, TemplatePreview } from '../session';
import type { ResourceStory } from '../workspace/resource-story';
import { templateExcerpt, templateLayout, type TemplateResource } from './config-blocks';
import type { EditorSection } from './ConfigFileEditor';

const ConfigFileEditor = lazy(() => import('./ConfigFileEditor'));

/** Which resources the view shows: all of them, the ones one resource of the configuration creates, or the stack's own. */
export type TemplateGroup = { kind: 'all' } | { kind: 'resource'; name: string } | { kind: 'stack' };

const STACK = 'stack';

const keyOf = (group: TemplateGroup) => (group.kind === 'resource' ? `resource:${group.name}` : group.kind);

/** "5 AWS resources". */
const resourceCount = (count: number) => `${count} AWS ${count === 1 ? 'resource' : 'resources'}`;

/** The compiled template, kept while a newer one is on its way so the view never goes blank between edits. */
const useTemplate = (session: Session, source: string | undefined) => {
  const [template, setTemplate] = useState<TemplatePreview | undefined>(undefined);
  const [isLoading, setLoading] = useState(false);
  useEffect(() => {
    if (source === undefined) return;
    let isCurrent = true;
    setLoading(true);
    // The CLI compiles whatever configuration it holds now; the page asks again once it holds another.
    void (async () => {
      const next = await session.readTemplate().catch((): TemplatePreview => ({
        status: 'failed',
        config: source,
        error: 'stacktape init did not answer. Is it still running?'
      }));
      if (!isCurrent) return;
      setTemplate(next);
      setLoading(false);
    })();
    return () => {
      isCurrent = false;
    };
  }, [session, source]);
  return { template, isLoading };
};

/**
 * The CloudFormation template the configuration compiles to, read-only: what `stacktape deploy` would create, compiled
 * by the CLI on this machine without AWS, and compiled again after every change.
 *
 * Its resources are grouped by the resource of the configuration they are for, in the configuration's order, then the
 * stack's own (its network, the Lambda that runs Stacktape's custom resources). A row of chips shows one group at a
 * time, and picking a resource on the diagram (or, docked under the file, putting the cursor in its block) picks its
 * group.
 */
export function CloudFormationView({
  session,
  source,
  sourceError,
  stories,
  focus,
  compact = false,
  onTemplate
}: {
  session: Session;
  /** The configuration the CLI holds, as YAML: a new one compiles the template again. */
  source: string | undefined;
  /** The file does not parse or run: the last template stays, said to be out of date. */
  sourceError: boolean;
  stories: Readonly<Record<string, ResourceStory>>;
  /** The resource to show, when one is picked; undefined leaves the chip the user picked. */
  focus: string | undefined;
  /** Docked under the file: a shorter head, no stage line. */
  compact?: boolean;
  /** Hands the compiled template up, for the panel's copy button and status line. */
  onTemplate?: (template: { text: string; stage: string; region: string } | undefined) => void;
}) {
  const { template, isLoading } = useTemplate(session, sourceError ? undefined : source);
  const [group, setGroup] = useState<TemplateGroup>({ kind: 'all' });
  // A newly picked resource picks its group; the user's own chip stays until something else is picked.
  const lastFocus = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (focus === lastFocus.current) return;
    lastFocus.current = focus;
    if (focus !== undefined) setGroup({ kind: 'resource', name: focus });
    else if (compact) setGroup({ kind: 'all' });
  }, [focus, compact]);

  const ready = template?.status === 'ready' ? template : undefined;
  const layout = useMemo(() => (ready === undefined ? undefined : templateLayout(ready.text, ready.owners)), [ready]);
  const groups = useMemo(() => {
    if (layout === undefined) return [];
    const byOwner = new Map<string, TemplateResource[]>();
    for (const resource of layout.resources) {
      const owner = resource.owner ?? STACK;
      byOwner.set(owner, [...(byOwner.get(owner) ?? []), resource]);
    }
    return [...byOwner].map(([owner, resources]) => ({ owner, resources }));
  }, [layout]);
  const shownGroup =
    group.kind === 'resource' && !groups.some((entry) => entry.owner === group.name) ? { kind: 'all' as const } : group;
  const shownKind = shownGroup.kind;
  const shownName = shownGroup.kind === 'resource' ? shownGroup.name : undefined;
  const view = useMemo(() => {
    if (ready === undefined || layout === undefined) return undefined;
    if (shownKind === 'all') return { text: ready.text, lineMap: undefined };
    // Docked under the file, a resource's own AWS resources are all there is room for.
    return templateExcerpt(ready.text, layout, (resource) => resource.owner === shownName, { head: !compact });
  }, [ready, layout, shownKind, shownName, compact]);

  useEffect(
    () =>
      onTemplate?.(ready === undefined ? undefined : { text: ready.text, stage: ready.stage, region: ready.region }),
    [ready, onTemplate]
  );

  // A heading above each group, in the template itself: what the next resources are for.
  const sections = useMemo((): EditorSection[] => {
    if (view === undefined) return [];
    const lineOf = (line: number) => (view.lineMap === undefined ? line : view.lineMap.indexOf(line) + 1);
    return groups.flatMap(({ owner, resources }) => {
      const at = lineOf(resources[0]!.from);
      if (at < 1) return [];
      const story = owner === STACK ? undefined : stories[owner];
      return [
        {
          line: at,
          content: (
            <span className="ws-cf-section">
              {story === undefined ? (
                <BiLayer aria-hidden size={14} />
              ) : (
                <ResourceIcon resourceType={story.type} size={14} />
              )}
              <strong>{owner === STACK ? 'Shared by the stack' : owner}</strong>
              {story !== undefined && <span>{story.plainName}</span>}
              <span className="ws-cf-section-count">{resourceCount(resources.length)}</span>
            </span>
          )
        }
      ];
    });
  }, [view, groups, stories]);

  if (template === undefined || (template.status !== 'ready' && ready === undefined && isLoading)) {
    return (
      <div className="ws-editor-loading">
        <Spinner /> Compiling the CloudFormation template…
      </div>
    );
  }
  if (ready === undefined || view === undefined || layout === undefined) {
    return (
      <div className="ws-cf-empty">
        <strong>No template to show</strong>
        <span>
          {template.status === 'failed' ? template.error : template.status === 'unavailable' ? template.detail : ''}
        </span>
      </div>
    );
  }

  const stale = sourceError || template.status !== 'ready' || (source !== undefined && ready.config !== source);
  return (
    <div className="ws-cf" data-compact={compact ? 'true' : undefined}>
      <div aria-label="Show the AWS resources of" className="ws-cf-groups" role="toolbar">
        <GroupChip
          isActive={shownGroup.kind === 'all'}
          label="All"
          count={layout.resources.length}
          onClick={() => setGroup({ kind: 'all' })}
        />
        {groups.map(({ owner, resources }) => (
          <GroupChip
            count={resources.length}
            icon={
              owner === STACK ? (
                <BiLayer aria-hidden size={13} />
              ) : (
                <ResourceIcon resourceType={stories[owner]?.type ?? ''} size={13} />
              )
            }
            isActive={owner === STACK ? shownGroup.kind === 'stack' : keyOf(shownGroup) === `resource:${owner}`}
            key={owner}
            label={owner === STACK ? 'Stack' : owner}
            onClick={() => setGroup(owner === STACK ? { kind: 'stack' } : { kind: 'resource', name: owner })}
            title={
              owner === STACK
                ? 'What every Stacktape stack has: its network and the Lambda function that runs its custom resources'
                : stories[owner]?.plainName
            }
          />
        ))}
        {(isLoading || stale) && (
          <span
            className="ws-cf-updating"
            title={stale ? 'The template is compiled again once the file is fixed' : undefined}
          >
            {isLoading ? <Spinner /> : null}
            {isLoading ? 'Compiling' : 'Out of date'}
          </span>
        )}
      </div>
      <div className="ws-cf-body">
        <Suspense fallback={null}>
          <ConfigFileEditor
            folding
            key={keyOf(shownGroup)}
            language="yaml"
            {...(view.lineMap === undefined ? {} : { lineNumberMap: view.lineMap })}
            modelPath={`file:///cloudformation-${keyOf(shownGroup).replace(/\W/g, '-')}.yaml`}
            readOnly
            readOnlyMessage="This is what the configuration compiles to. Change the configuration instead."
            sections={sections}
            stickyScroll
            value={view.text}
          />
        </Suspense>
      </div>
    </div>
  );
}

function GroupChip({
  label,
  count,
  icon,
  isActive,
  onClick,
  title
}: {
  label: string;
  count: number;
  icon?: ReactNode;
  isActive: boolean;
  onClick: () => void;
  title?: string | undefined;
}) {
  return (
    <button aria-pressed={isActive} className="ws-cf-chip" onClick={onClick} title={title} type="button">
      {icon}
      <span className="ws-cf-chip-label">{label}</span>
      <span className="ws-cf-chip-count">{count}</span>
    </button>
  );
}
