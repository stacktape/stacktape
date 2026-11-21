/**
 * The AWS resources one deploy created, updated or removed, kept as one compact entry per resource.
 *
 * CloudFormation's progress arrives as ticks: who is in progress now, and who finished since the last tick. The page
 * shows each resource with its state and how long it took, so it needs every tick, but the event list it gets is capped
 * and a long deploy pushes its oldest ticks out. Folding the ticks here, where every one arrives, keeps the whole
 * picture at a size that does not grow with the deploy's length.
 */

export type DeployResource = {
  /** The logical ID in the template, e.g. `MainDatabaseDbInstance`. */
  id: string;
  /** The CloudFormation type, e.g. `AWS::RDS::DBInstance`, once the stream has named it. */
  type?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  status: 'in-progress' | 'complete';
  /** When CloudFormation started on it, or when the stream first reported it in progress. */
  startedAt?: string;
  endedAt?: string;
};

type ProgressDetail = {
  kind?: unknown;
  inProgressResources?: unknown;
  inProgressDetails?: unknown;
  recentlyCompleted?: unknown;
};

type ResourceMention = { name?: unknown; action?: unknown; resourceType?: unknown; since?: unknown };

/** Past this, a stack is far beyond anything the page can show row by row; the newest entries win. */
const MAX_RESOURCES = 1500;

const actionOf = (value: unknown): DeployResource['action'] | undefined =>
  value === 'CREATE' || value === 'UPDATE' || value === 'DELETE' ? value : undefined;

const isoTime = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : undefined;
};

/**
 * Applies one event to the resources seen so far, in place. Anything that is not CloudFormation progress leaves them as
 * they are. Returns whether anything changed.
 */
export const foldDeployResource = (resources: Map<string, DeployResource>, event: unknown): boolean => {
  if (typeof event !== 'object' || event === null) return false;
  const { type, ts, detail } = event as { type?: unknown; ts?: unknown; detail?: ProgressDetail };
  if (type !== 'event' || detail?.kind !== 'cloudformation-progress') return false;
  const at = isoTime(ts);
  let changed = false;

  const details = new Map<string, ResourceMention>();
  for (const mention of Array.isArray(detail.inProgressDetails)
    ? (detail.inProgressDetails as ResourceMention[])
    : []) {
    if (typeof mention?.name === 'string') details.set(mention.name, mention);
  }
  const inProgress = Array.isArray(detail.inProgressResources)
    ? (detail.inProgressResources as unknown[]).filter((name): name is string => typeof name === 'string')
    : [];
  for (const id of new Set([...inProgress, ...details.keys()])) {
    const mention = details.get(id);
    const action = actionOf(mention?.action);
    const existing = resources.get(id);
    // A resource done with one action and in progress with another (created, then removed by a rollback) starts over.
    const restarts =
      existing !== undefined && existing.status === 'complete' && action !== undefined && action !== existing.action;
    if (existing !== undefined && existing.status === 'in-progress' && !restarts) {
      if (existing.type === undefined && typeof mention?.resourceType === 'string') {
        existing.type = mention.resourceType;
        changed = true;
      }
      continue;
    }
    if (existing !== undefined && existing.status === 'complete' && !restarts) continue;
    const startedAt = isoTime(mention?.since) ?? at;
    const type = typeof mention?.resourceType === 'string' ? mention.resourceType : existing?.type;
    resources.delete(id);
    resources.set(id, {
      id,
      ...(type === undefined ? {} : { type }),
      action: action ?? existing?.action ?? 'CREATE',
      status: 'in-progress',
      ...(startedAt === undefined ? {} : { startedAt })
    });
    changed = true;
  }

  for (const mention of Array.isArray(detail.recentlyCompleted)
    ? (detail.recentlyCompleted as ResourceMention[])
    : []) {
    if (typeof mention?.name !== 'string') continue;
    const existing = resources.get(mention.name);
    const action = actionOf(mention.action) ?? existing?.action ?? 'CREATE';
    const type = typeof mention.resourceType === 'string' ? mention.resourceType : existing?.type;
    // Started under the same action: its start stands. Finished between two ticks: nobody saw it start.
    const startedAt = existing?.action === action && existing.status === 'in-progress' ? existing.startedAt : undefined;
    if (existing?.status === 'complete' && existing.action === action) continue;
    resources.delete(mention.name);
    resources.set(mention.name, {
      id: mention.name,
      ...(type === undefined ? {} : { type }),
      action,
      status: 'complete',
      ...(startedAt === undefined ? {} : { startedAt }),
      ...(at === undefined ? {} : { endedAt: at })
    });
    changed = true;
  }

  while (resources.size > MAX_RESOURCES) {
    const oldest = resources.keys().next().value;
    if (oldest === undefined) break;
    resources.delete(oldest);
  }
  return changed;
};

/** The resources in the order the deploy reached them, for the page. */
export const deployResourceList = (resources: Map<string, DeployResource>): DeployResource[] =>
  [...resources.values()].toSorted(
    (left, right) =>
      (left.startedAt ?? left.endedAt ?? '').localeCompare(right.startedAt ?? right.endedAt ?? '') ||
      left.id.localeCompare(right.id)
  );

/**
 * Whether an event can leave a full event list first. CloudFormation ticks are folded into the resources above, and a
 * build's own output is the most plentiful thing a deploy says; dropping those keeps the operations that say which
 * phase the deploy is in, however much a build prints.
 */
export const isExpendableDeployEvent = (event: unknown): boolean => {
  if (typeof event !== 'object' || event === null) return false;
  const { type, detail } = event as { type?: unknown; detail?: { kind?: unknown } };
  return type === 'output' || (type === 'event' && detail?.kind === 'cloudformation-progress');
};

/**
 * Appends an event to a capped list. When the list is full, the oldest expendable event leaves (never the newest
 * CloudFormation tick, which holds the current counts); only a list of nothing else loses its oldest entry.
 */
export const recordDeployEvent = (list: unknown[], event: unknown, cap: number): unknown[] => {
  list.push(event);
  while (list.length > cap) {
    const newestTick = list.findLastIndex(
      (entry) => isExpendableDeployEvent(entry) && (entry as { type?: unknown }).type === 'event'
    );
    const index = list.findIndex((entry, position) => position !== newestTick && isExpendableDeployEvent(entry));
    list.splice(index >= 0 ? index : 0, 1);
  }
  return list;
};
