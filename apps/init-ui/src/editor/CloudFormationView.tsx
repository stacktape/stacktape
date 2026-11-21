import { ResourceIcon } from '@stacktape/ui-react/resource-icon';
import { Select, type SelectOption } from '@stacktape/ui-react/select';
import { Spinner } from '@stacktape/ui-react/spinner';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BiFile, BiLayer } from 'react-icons/bi';
import type { Session, TemplatePreview } from '../session';
import type { ResourceStory } from '../workspace/resource-story';
import { templateExcerpt, templateLayout, type TemplateResource } from './config-blocks';
import type { EditorSection } from './ConfigFileEditor';

const ConfigFileEditor = lazy(() => import('./ConfigFileEditor'));

/**
 * Which AWS resources the view shows: all of them, the ones one resource of the configuration creates
 * (`resource:<name>`), or the stack's own.
 */
const ALL = 'all';
const STACK = 'stack';
const keyOf = (owner: string | undefined) => (owner === undefined ? STACK : `resource:${owner}`);

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

/** How far the template has got: being compiled, out of date with the file, not compiled, or compiled for a stage. */
export type TemplateStatus = 'compiling' | 'stale' | 'failed' | { stage: string; region: string };

/**
 * The CloudFormation template the configuration compiles to: what `stacktape deploy` would create, compiled by the CLI
 * on this machine without AWS, and compiled again after every change while it is shown.
 *
 * Its resources are grouped by the resource of the configuration they are for, in the configuration's order, then the
 * stack's own (its network, the Lambda that runs Stacktape's custom resources). One group is shown at a time, picked
 * in the panel's head (`TemplateGroupSelect`) or by picking a resource on the diagram.
 */
export const useCloudFormation = ({
  session,
  source,
  focus
}: {
  session: Session;
  /** The configuration the CLI holds, as YAML, while the template is shown and the file is valid: each compiles. */
  source: string | undefined;
  /** The resource picked on the diagram; undefined leaves the group the user picked. */
  focus: string | undefined;
}) => {
  const { template, isLoading } = useTemplate(session, source);
  const [picked, setPicked] = useState<string>(ALL);
  // A newly picked resource picks its group; the user's own choice stays until something else is picked.
  const lastFocus = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (focus === lastFocus.current) return;
    lastFocus.current = focus;
    if (focus !== undefined) setPicked(keyOf(focus));
  }, [focus]);

  const ready = template?.status === 'ready' ? template : undefined;
  const layout = useMemo(() => (ready === undefined ? undefined : templateLayout(ready.text, ready.owners)), [ready]);
  const groups = useMemo(() => {
    if (layout === undefined) return [];
    const byKey = new Map<string, { key: string; owner: string | undefined; resources: TemplateResource[] }>();
    for (const resource of layout.resources) {
      const key = keyOf(resource.owner);
      const group = byKey.get(key) ?? { key, owner: resource.owner, resources: [] };
      group.resources.push(resource);
      byKey.set(key, group);
    }
    return [...byKey.values()];
  }, [layout]);
  const group = groups.some((entry) => entry.key === picked) ? picked : ALL;
  const view = useMemo(() => {
    if (ready === undefined || layout === undefined) return undefined;
    if (group === ALL) return { text: ready.text, lineMap: undefined };
    return templateExcerpt(ready.text, layout, (resource) => keyOf(resource.owner) === group);
  }, [ready, layout, group]);

  const status: TemplateStatus =
    isLoading || (template === undefined && source !== undefined)
      ? 'compiling'
      : ready === undefined
        ? 'failed'
        : source === undefined || ready.config !== source
          ? 'stale'
          : { stage: ready.stage, region: ready.region };
  return {
    template,
    isLoading,
    ready,
    layout,
    groups,
    group,
    setGroup: setPicked,
    view,
    status,
    total: layout?.resources.length ?? 0
  };
};

export type CloudFormation = ReturnType<typeof useCloudFormation>;

/** The group's icon: the resource's own, the stack's layers, or the whole template. */
const groupIcon = (
  key: string,
  owner: string | undefined,
  stories: Readonly<Record<string, ResourceStory>>,
  size: number
): ReactNode =>
  key === ALL ? (
    <BiFile aria-hidden size={size} />
  ) : owner === undefined ? (
    <BiLayer aria-hidden size={size} />
  ) : (
    <ResourceIcon resourceType={stories[owner]?.type ?? ''} size={size} />
  );

/**
 * Which AWS resources the template shows: the whole template, one resource of the configuration with what it is and
 * how many AWS resources it makes, or what the stack itself has. In the panel's head; a panel too narrow for it there
 * (a phone) shows it across the top of the template instead (`CloudFormationView`).
 */
export function TemplateGroupSelect({
  cf,
  stories,
  placement = 'head'
}: {
  cf: CloudFormation;
  stories: Readonly<Record<string, ResourceStory>>;
  placement?: 'head' | 'bar';
}) {
  if (cf.layout === undefined) return null;
  const option = (
    key: string,
    owner: string | undefined,
    label: string,
    description: string,
    count: number
  ): SelectOption<string> => ({
    value: key,
    label,
    searchText: label,
    description: `${description}${description === '' ? '' : ' · '}${resourceCount(count)}`,
    icon: groupIcon(key, owner, stories, 18),
    valueLabel: (
      <span className="ws-cf-value">
        <span className="ws-cf-value-name">{key === ALL ? 'All' : key === STACK ? 'Stack' : label}</span>
        <span className="ws-cf-value-count">{count}</span>
      </span>
    )
  });
  const options = [
    option(ALL, undefined, 'Whole template', '', cf.total),
    ...cf.groups.map(({ key, owner, resources }) =>
      owner === undefined
        ? option(key, owner, 'Shared by the stack', 'Network and helpers', resources.length)
        : option(key, owner, owner, stories[owner]?.plainName ?? '', resources.length)
    )
  ];
  return (
    <Select
      className={`ws-cf-select is-${placement}`}
      hideLabel
      label="Show the AWS resources of"
      menuAlignment={placement === 'head' ? 'end' : 'start'}
      name={`template-group-${placement}`}
      onChange={(selected) => {
        if (selected !== null && !Array.isArray(selected)) cf.setGroup((selected as SelectOption<string>).value);
      }}
      options={options}
      reserveMessageSpace={false}
      searchable={false}
      value={options.find((entry) => entry.value === cf.group) ?? null}
    />
  );
}

/** The template itself, read-only, a heading above each group saying what its resources are for. */
export function CloudFormationView({
  cf,
  stories
}: {
  cf: CloudFormation;
  stories: Readonly<Record<string, ResourceStory>>;
}) {
  const { template, view, groups, layout } = cf;
  // A heading above each group, in the template itself: what the next resources are for.
  const sections = useMemo((): EditorSection[] => {
    if (view === undefined) return [];
    const lineOf = (line: number) => (view.lineMap === undefined ? line : view.lineMap.indexOf(line) + 1);
    return groups.flatMap(({ key, owner, resources }) => {
      const at = lineOf(resources[0]!.from);
      if (at < 1) return [];
      const story = owner === undefined ? undefined : stories[owner];
      return [
        {
          line: at,
          content: (
            <span className="ws-cf-section">
              {groupIcon(key, owner, stories, 14)}
              <strong>{owner ?? 'Shared by the stack'}</strong>
              {story !== undefined && <span className="ws-cf-section-name">{story.plainName}</span>}
              <span className="ws-cf-section-count">{resourceCount(resources.length)}</span>
            </span>
          )
        }
      ];
    });
  }, [view, groups, stories]);

  if (template === undefined || (cf.ready === undefined && cf.isLoading)) {
    return (
      <div className="ws-editor-loading">
        <Spinner /> Compiling the CloudFormation template…
      </div>
    );
  }
  if (cf.ready === undefined || view === undefined || layout === undefined) {
    return (
      <div className="ws-cf-empty">
        <strong>No template to show</strong>
        <span>
          {template.status === 'failed' ? template.error : template.status === 'unavailable' ? template.detail : ''}
        </span>
      </div>
    );
  }
  return (
    <div className="ws-cf">
      <div className="ws-cf-bar">
        <TemplateGroupSelect cf={cf} placement="bar" stories={stories} />
      </div>
      <div className="ws-cf-body">
        <Suspense fallback={null}>
          <ConfigFileEditor
            folding
            key={cf.group}
            language="yaml"
            {...(view.lineMap === undefined ? {} : { lineNumberMap: view.lineMap })}
            modelPath={`file:///cloudformation-${cf.group.replace(/\W/g, '-')}.yaml`}
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
