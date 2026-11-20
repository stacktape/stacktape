/**
 * The CLI's event stream, as something a person can watch.
 *
 * The stream is the documented JSONL protocol (`tui-manager/output/jsonl-types.ts`): phases contain tracked
 * operations, operations nest (a Next.js build, then each of its functions), and CloudFormation reports its progress
 * inside the DEPLOY phase. The CLI server folds that progress into one entry per AWS resource (`deployment.resources`),
 * because the event list it sends is capped and a long deploy pushes its oldest ticks out.
 *
 * This turns both into three views of one deploy: the phases with the steps each took, the AWS resources grouped by the
 * part of the app they belong to, and a log with times and levels.
 */

export type DeployEvent = {
  type: string;
  ts?: string;
  phase?: string;
  eventType?: string;
  status?: 'started' | 'running' | 'completed';
  message?: string;
  instanceId?: string;
  parentEventType?: string;
  parentInstanceId?: string;
  level?: string;
  source?: string;
  lines?: string[];
  ok?: boolean;
  code?: string;
  detail?: {
    kind?: string;
    stackAction?: string;
    percent?: number;
    completedCount?: number;
    totalPlanned?: number;
    inProgressResources?: string[];
    changeCounts?: { created: number; updated: number; deleted: number };
  };
};

/** One AWS resource, as the CLI server folded CloudFormation's progress (`DeployResource` in `deploy-resources.ts`). */
export type DeployResource = {
  id: string;
  type?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  status: 'in-progress' | 'complete';
  startedAt?: string;
  endedAt?: string;
};

export type StepStatus = 'pending' | 'running' | 'done' | 'failed';

/** One thing a phase did: an operation, or one workload's build or upload, with the parts it did as children. */
export type DeployStep = {
  key: string;
  label: string;
  /** What the CLI said when it finished, when that says more than the label: "Container image · 228 MB". */
  detail?: string;
  /** The workload or artifact it worked on, as the CLI names it: `app`, `app.serverFunction`. */
  instance?: string;
  status: Exclude<StepStatus, 'pending'>;
  startedAt?: number;
  endedAt?: number;
  children: DeployStep[];
};

export type DeployPhase = {
  id: string;
  label: string;
  status: StepStatus;
  /** When the phase's first event arrived, in epoch milliseconds. */
  startedAt?: number;
  /** When it was over: the next phase's start, or the deploy's last event for the last one. */
  endedAt?: number;
  /** The most recent thing this phase said it was doing. */
  message: string;
  steps: DeployStep[];
};

export type CloudFormationProgress = {
  action: 'create' | 'update' | 'delete' | 'rollback';
  percent: number;
  completed: number;
  total: number;
  inProgress: string[];
};

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'output';

/** One row of the deploy log. A section row starts a phase; the rows after it belong to it. */
export type LogEntry = {
  key: string;
  kind: 'section' | 'line';
  /** Epoch milliseconds, when the stream said. */
  time?: number;
  level: LogLevel;
  /** The phase the row belongs to. */
  phase?: string;
  /** What wrote it: a workload (`app`), an AWS resource's type, or nothing for the CLI itself. */
  source?: string;
  text: string;
};

export type DeployModel = {
  phases: DeployPhase[];
  /** The phase running now, or the last one that started. */
  current?: DeployPhase;
  cloudformation?: CloudFormationProgress;
  /** Every AWS resource the deploy reached, in the order it reached them. */
  resources: DeployResource[];
  /** Warnings and errors, which are the log lines a person actually needs during a deploy. */
  notices: Array<{ level: string; message: string }>;
  log: LogEntry[];
  /** When the first event arrived and when the last did, in epoch milliseconds. */
  startedAt?: number;
  endedAt?: number;
};

/** The phases of a deploy, in order. All are listed from the start, so the whole path is visible. */
const DEPLOY_PHASES = ['INITIALIZE', 'BUILD_AND_PACKAGE', 'UPLOAD', 'DEPLOY', 'POST_DEPLOY'];

const PHASE_LABELS: Record<string, string> = {
  INITIALIZE: 'Getting ready',
  BUILD_AND_PACKAGE: 'Building your code',
  UPLOAD: 'Uploading',
  DEPLOY: 'Creating AWS resources',
  POST_DEPLOY: 'Finishing up'
};

const PHASE_ORDER = [...DEPLOY_PHASES, 'SUMMARY'];

const humanize = (value: string): string => {
  const words = value.toLowerCase().replaceAll('_', ' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};

const labelForPhase = (phase: string, action?: CloudFormationProgress['action']): string =>
  phase === 'DEPLOY' && action === 'update'
    ? 'Updating AWS resources'
    : phase === 'DEPLOY' && (action === 'rollback' || action === 'delete')
      ? 'Rolling back AWS resources'
      : (PHASE_LABELS[phase] ?? humanize(phase));

/**
 * What each operation is called in the steps. The CLI's own words name the action it started ("Loading
 * configuration") and often repeat it when done, so the steps use their own and keep the CLI's when it adds something.
 */
const STEP_LABELS: Record<string, string> = {
  LOAD_AWS_CREDENTIALS: 'AWS credentials',
  LOAD_USER_DATA: 'Stacktape account',
  LOAD_CONFIG_FILE: 'Configuration',
  LOAD_METADATA_FROM_AWS: 'What is deployed now',
  INSTALL_DEPENDENCIES: 'Dependencies',
  RESOLVE_CONFIG: 'CloudFormation template',
  CREATE_RESOURCES_FOR_ARTIFACTS: 'Storage for the build',
  SYNC_BUCKET: 'Site files',
  UPDATE_STACK: 'CloudFormation stack',
  ROLLBACK_STACK: 'Rollback',
  REFETCH_STACK_DATA: 'Deployed stack',
  INVALIDATE_CACHE: 'CDN cache',
  RUN_RELEASE_COMMAND: 'Release command',
  DELETE_OBSOLETE_ARTIFACTS: 'Old build artifacts',
  RUN_SCRIPT: 'Script'
};

/** What a workload's operations make, for its row: the last one it reported wins. */
const WORK_KINDS: Record<string, string> = {
  BUILD_NEXTJS_PROJECT: 'Next.js build',
  BUNDLING_NEXTJS_FUNCTIONS: 'Next.js functions',
  BUILD_SSR_WEB_PROJECT: 'Site build',
  BUILD_HOSTING_BUCKET: 'Static site build',
  BUILD_IMAGE: 'Docker image',
  BUILD_CODE: 'Code bundle',
  UPLOAD_IMAGE: 'Container image',
  UPLOAD_PACKAGE: 'Package'
};

/** Operations whose own rows would only repeat their parent's. */
const FOLDED_INTO_PARENT = new Set([
  'FETCH_STACK_DATA',
  'FETCH_BUDGET_INFO',
  'FETCH_DOMAIN_STATUSES',
  'FETCH_PREVIOUS_ARTIFACTS'
]);

/** The CLI's finishing words, when they say more than "done": a size, a count, a profile. */
const usefulDetail = (
  eventType: string,
  started: string | undefined,
  message: string | undefined
): string | undefined => {
  if (message === undefined || message === '' || message === started) return undefined;
  if (eventType === 'LOAD_AWS_CREDENTIALS') {
    return message.replace(/^AWS credentials loaded\s*/i, '').replace(/^\((.*)\)$/, '$1') || undefined;
  }
  if (eventType === 'RESOLVE_CONFIG') return /\((\d+ AWS resources?)\)/.exec(message)?.[1];
  if (eventType === 'INVALIDATE_CACHE') return 'Invalidation started';
  if (
    /^(Building code|Artifact uploaded|Container image uploaded|Deployment artifacts uploaded|Stack data refreshed|AWS metadata loaded|Deployment successful\.)$/.test(
      message
    )
  ) {
    return undefined;
  }
  return message;
};

const timeOf = (event: DeployEvent): number | undefined => {
  if (event.ts === undefined) return undefined;
  const time = Date.parse(event.ts);
  return Number.isNaN(time) ? undefined : time;
};

const epoch = (iso: string | undefined): number | undefined => {
  if (iso === undefined) return undefined;
  const time = Date.parse(iso);
  return Number.isNaN(time) ? undefined : time;
};

/** "app.serverFunction" belongs to "app": a Next.js app's functions are parts of its build. */
const rootInstance = (instance: string) => instance.split('.')[0]!;

type MutableStep = DeployStep & { started?: string | undefined; kinds: string[] };

const stepOf = (key: string, label: string, time: number | undefined, instance?: string): MutableStep => ({
  key,
  label,
  status: 'running',
  ...(time === undefined ? {} : { startedAt: time }),
  ...(instance === undefined ? {} : { instance }),
  children: [],
  kinds: []
});

/** "BUILD_CODE" done, "BUILD_IMAGE" running: the step is as far as its least finished operation. */
const settle = (step: MutableStep, open: Set<string>) => {
  step.status = open.size > 0 ? 'running' : 'done';
};

export const buildDeployModel = (
  events: readonly DeployEvent[],
  lines: readonly string[],
  /**
   * How the deploy stopped, once it has: the only way to know the last phase is over, and whether it is where the
   * deploy broke.
   */
  stopped?: 'succeeded' | 'failed',
  resources: readonly DeployResource[] = []
): DeployModel => {
  const phases = new Map<string, DeployPhase>();
  const notices: Array<{ level: string; message: string }> = [];
  const log: LogEntry[] = [];
  let latestPhaseId: string | undefined;
  let firstTime: number | undefined;
  let lastTime: number | undefined;
  let cloudformation: CloudFormationProgress | undefined;
  /** Per phase: its steps by key, and which operations of each are still open. */
  const steps = new Map<string, Map<string, MutableStep>>();
  const open = new Map<string, Set<string>>();
  let logPhase: string | undefined;

  const phaseOf = (id: string, time: number | undefined): DeployPhase => {
    const existing = phases.get(id);
    if (existing !== undefined) return existing;
    const phase: DeployPhase = {
      id,
      label: labelForPhase(id),
      status: 'running',
      message: '',
      steps: [],
      ...(time === undefined ? {} : { startedAt: time })
    };
    phases.set(id, phase);
    return phase;
  };

  const line = (entry: Omit<LogEntry, 'key' | 'kind' | 'phase'>) => {
    log.push({ key: `l${log.length}`, kind: 'line', ...(logPhase === undefined ? {} : { phase: logPhase }), ...entry });
  };

  for (const event of events) {
    const time = timeOf(event);
    if (time !== undefined) {
      firstTime ??= time;
      lastTime = time;
    }

    if (event.type === 'log') {
      if (event.message === undefined) continue;
      const level: LogLevel = event.level === 'warn' ? 'warn' : event.level === 'error' ? 'error' : 'info';
      if (level === 'warn' || level === 'error') notices.push({ level: event.level!, message: event.message });
      line({ ...(time === undefined ? {} : { time }), level, text: event.message });
      continue;
    }

    if (event.type === 'output') {
      for (const text of event.lines ?? []) {
        if (text.trim() === '') continue;
        line({
          ...(time === undefined ? {} : { time }),
          level: 'output',
          ...(event.instanceId === undefined ? {} : { source: event.instanceId }),
          text
        });
      }
      continue;
    }

    if (event.type === 'result') {
      line({
        ...(time === undefined ? {} : { time }),
        level: event.ok === true ? 'success' : 'error',
        text: event.ok === true ? 'Deploy finished' : (event.message ?? 'The deploy failed.')
      });
      continue;
    }

    if (event.type !== 'event' || event.phase === undefined || event.eventType === undefined) continue;

    const phase = phaseOf(event.phase, time);
    latestPhaseId = event.phase;
    if (event.message !== undefined && event.status !== 'running') phase.message = event.message;

    if (event.detail?.kind === 'cloudformation-progress') {
      const action = event.detail.stackAction;
      cloudformation = {
        action: action === 'update' || action === 'delete' || action === 'rollback' ? action : 'create',
        percent: Number(event.detail.percent ?? 0),
        completed: Number(event.detail.completedCount ?? 0),
        total: Number(event.detail.totalPlanned ?? 0),
        inProgress: event.detail.inProgressResources ?? []
      };
      phase.message = event.message ?? phase.message;
      // Each tick is folded per resource by the CLI server; the log shows the resources instead.
      continue;
    }

    if (logPhase !== event.phase) {
      logPhase = event.phase;
      log.push({
        key: `s${log.length}`,
        kind: 'section',
        phase: event.phase,
        level: 'info',
        ...(time === undefined ? {} : { time }),
        text: phase.label
      });
    }
    if (event.status !== 'running' && event.message !== undefined && !FOLDED_INTO_PARENT.has(event.eventType)) {
      line({
        ...(time === undefined ? {} : { time }),
        level: event.status === 'completed' ? 'success' : 'info',
        ...(event.instanceId === undefined ? {} : { source: event.instanceId }),
        text: event.message
      });
    }

    // ── Steps ──
    if (FOLDED_INTO_PARENT.has(event.eventType) && event.parentEventType !== undefined) continue;
    const phaseSteps = steps.get(event.phase) ?? new Map<string, MutableStep>();
    steps.set(event.phase, phaseSteps);
    const operation = `${event.eventType}::${event.instanceId ?? ''}`;

    if (event.instanceId !== undefined && event.parentEventType !== undefined) {
      // A workload's operation: one row per workload, with its functions as rows under it.
      const root = rootInstance(event.instanceId);
      const rowKey = `${event.parentEventType}::${root}`;
      const row = phaseSteps.get(rowKey) ?? stepOf(rowKey, root, time, root);
      phaseSteps.set(rowKey, row);
      let target = row;
      if (event.instanceId !== root) {
        const childKey = `${rowKey}::${event.instanceId}`;
        target =
          (row.children.find((child) => child.key === childKey) as MutableStep | undefined) ??
          stepOf(childKey, event.instanceId.slice(root.length + 1), time, event.instanceId);
        if (!row.children.includes(target)) row.children.push(target);
      }
      const kind = WORK_KINDS[event.eventType];
      if (kind !== undefined && target.kinds.at(-1) !== kind) target.kinds.push(kind);
      const openSet = open.get(target.key) ?? new Set<string>();
      open.set(target.key, openSet);
      if (event.status === 'started') {
        openSet.add(operation);
        target.started = event.message;
      } else if (event.status === 'completed') {
        openSet.delete(operation);
        const detail = usefulDetail(event.eventType, target.started, event.message);
        if (detail !== undefined) target.detail = detail;
        if (time !== undefined) target.endedAt = time;
      }
      settle(target, openSet);
      if (target !== row) {
        const rowOpen = open.get(row.key) ?? new Set<string>();
        const childrenOpen = row.children.some((child) => child.status === 'running');
        row.status = childrenOpen || rowOpen.size > 0 ? 'running' : 'done';
        if (!childrenOpen && time !== undefined) row.endedAt = Math.max(row.endedAt ?? 0, time);
      }
      continue;
    }

    // A top-level operation. Its children (PACKAGE_ARTIFACTS's workloads) carry the detail; it is their container.
    if (event.eventType === 'PACKAGE_ARTIFACTS' || event.eventType === 'UPLOAD_DEPLOYMENT_ARTIFACTS') continue;
    const key = operation;
    const step =
      phaseSteps.get(key) ??
      stepOf(key, STEP_LABELS[event.eventType] ?? humanize(event.eventType), time, event.instanceId);
    phaseSteps.set(key, step);
    if (event.status === 'started') step.started = event.message;
    if (event.status === 'completed') {
      step.status = 'done';
      const detail = usefulDetail(event.eventType, step.started, event.message);
      if (detail !== undefined) step.detail = detail;
      if (time !== undefined) step.endedAt = time;
    }
  }

  // ── The resources' own lines in the log, where they happened ──
  const resourceLines: LogEntry[] = [];
  for (const resource of resources) {
    const verb =
      resource.action === 'DELETE'
        ? ['Removing', 'Removed']
        : resource.action === 'UPDATE'
          ? ['Updating', 'Updated']
          : ['Creating', 'Created'];
    const started = epoch(resource.startedAt);
    const ended = epoch(resource.endedAt);
    const source = resource.type;
    if (started !== undefined) {
      resourceLines.push({
        key: `r-${resource.id}-start`,
        kind: 'line',
        phase: 'DEPLOY',
        time: started,
        level: 'info',
        ...(source === undefined ? {} : { source }),
        text: `${verb[0]} ${resource.id}`
      });
    }
    if (resource.status === 'complete' && ended !== undefined) {
      resourceLines.push({
        key: `r-${resource.id}-end`,
        kind: 'line',
        phase: 'DEPLOY',
        time: ended,
        level: 'success',
        ...(source === undefined ? {} : { source }),
        // A time under a second says nothing about the resource; the log leaves it out.
        text: `${verb[1]} ${resource.id}${started === undefined || ended - started < 1000 ? '' : ` in ${spokenDuration(ended - started)}`}`
      });
    }
  }
  const merged = mergeByTime(log, resourceLines);
  for (const text of lines) {
    if (text.trim() !== '')
      merged.push({ key: `x${merged.length}`, kind: 'line', level: 'output', source: 'stderr', text });
  }

  // ── Phases: every deploy phase, done once a later one has started ──
  const failedPhase = stopped === 'failed' ? latestPhaseId : undefined;
  const ids = [...phases.keys()];
  const listed =
    ids.every((id) => PHASE_ORDER.includes(id)) && stopped === undefined
      ? [...new Set([...ids, ...DEPLOY_PHASES])]
      : ids;
  const ordered = listed
    .filter((id) => id !== 'SUMMARY')
    .map((id) => phases.get(id) ?? { id, label: labelForPhase(id), status: 'pending' as const, message: '', steps: [] })
    .toSorted((left, right) => {
      const leftIndex = PHASE_ORDER.indexOf(left.id);
      const rightIndex = PHASE_ORDER.indexOf(right.id);
      return (leftIndex < 0 ? PHASE_ORDER.length : leftIndex) - (rightIndex < 0 ? PHASE_ORDER.length : rightIndex);
    });
  const currentIndex = ordered.findIndex((phase) => phase.id === latestPhaseId);

  for (const [index, phase] of ordered.entries()) {
    if (phase.id === 'DEPLOY') phase.label = labelForPhase('DEPLOY', cloudformation?.action);
    if (phase.startedAt === undefined && index > currentIndex) {
      phase.status = 'pending';
      continue;
    }
    const next = ordered.slice(index + 1).find((later) => later.startedAt !== undefined)?.startedAt;
    const ended = next ?? (stopped === undefined ? undefined : lastTime);
    if (ended !== undefined && phase.startedAt !== undefined) phase.endedAt = Math.max(phase.startedAt, ended);
    phase.status =
      phase.id === failedPhase
        ? 'failed'
        : stopped !== undefined || index < currentIndex
          ? 'done'
          : index === currentIndex
            ? 'running'
            : 'pending';
    const phaseSteps = [...(steps.get(phase.id)?.values() ?? [])];
    // A phase that is over has no step still running: the CLI does not always report the end of what it started.
    phase.steps = phaseSteps.map((step) => finishStep(step, phase.status, phase.endedAt));
  }

  const current =
    ordered.find((phase) => phase.status === 'running') ?? ordered.findLast((phase) => phase.status !== 'pending');
  return {
    phases: ordered,
    ...(current === undefined ? {} : { current }),
    ...(cloudformation === undefined ? {} : { cloudformation }),
    resources: [...resources],
    notices,
    log: merged,
    ...(firstTime === undefined ? {} : { startedAt: firstTime }),
    ...(lastTime === undefined ? {} : { endedAt: lastTime })
  };
};

const finishStep = (step: MutableStep, phaseStatus: StepStatus, phaseEnd: number | undefined): DeployStep => {
  const { started: _started, kinds, ...rest } = step;
  const status: DeployStep['status'] =
    rest.status === 'running' && phaseStatus === 'failed'
      ? 'failed'
      : rest.status === 'running' && phaseStatus === 'done'
        ? 'done'
        : rest.status;
  const endedAt = status !== 'running' && rest.endedAt === undefined ? phaseEnd : rest.endedAt;
  const { detail, ...withoutDetail } = rest;
  const shownDetail = detail ?? (kinds.length > 0 && rest.children.length === 0 ? kinds.at(-1) : undefined);
  return {
    ...withoutDetail,
    // A workload's row says what it made when the CLI did not: "Next.js build", "Docker image".
    ...(shownDetail === undefined ? {} : { detail: shownDetail }),
    status,
    ...(endedAt === undefined ? {} : { endedAt }),
    children: rest.children.map((child) => finishStep(child as MutableStep, phaseStatus, phaseEnd))
  };
};

/** The event log and the resources' lines as one list in time order; lines without a time stay where they are. */
const mergeByTime = (base: LogEntry[], timed: LogEntry[]): LogEntry[] => {
  if (timed.length === 0) return [...base];
  const sorted = timed.toSorted((left, right) => (left.time ?? 0) - (right.time ?? 0));
  const result: LogEntry[] = [];
  let next = 0;
  let deploySeen = false;
  for (const entry of base) {
    if (entry.phase === 'DEPLOY') deploySeen = true;
    // Resource lines belong to the CloudFormation phase: never before its section starts.
    const before = entry.time;
    if (deploySeen && before !== undefined) {
      while (next < sorted.length && (sorted[next]!.time ?? 0) < before) {
        result.push(sorted[next]!);
        next += 1;
      }
    }
    result.push(entry);
  }
  return [...result, ...sorted.slice(next)];
};

/** "4 s", "1 min 12 s", "1 h 2 min": how long something took, said aloud. Under a second is "<1 s". */
export const spokenDuration = (milliseconds: number): string => {
  if (milliseconds < 1000) return '<1 s';
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return seconds % 60 === 0 ? `${minutes} min` : `${minutes} min ${seconds % 60} s`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

/** A running time as a clock: "0:42", "3:12", "1:02:05". */
export const clock = (milliseconds: number): string => {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
};

const pascal = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;

/** The stack's own resources (its network, roles and Stacktape's helpers) are grouped under this name. */
export const SHARED_GROUP = '';

export type ResourceGroup = {
  /** The resource's name in the configuration, or `SHARED_GROUP`. */
  name: string;
  resources: DeployResource[];
  status: 'running' | 'done' | 'failed';
  done: number;
  running: number;
  startedAt?: number;
  endedAt?: number;
};

/**
 * Which part of the app a logical ID belongs to. Stacktape builds logical IDs from the resource's name in PascalCase,
 * mostly at the start (`MainDatabaseDbInstance`) and sometimes inside (`DatabaseFreeStorageForMainDatabase0Alarm`).
 * Longer names are tried first, so `apiGateway` is not taken for `api`.
 */
export const ownerOf = (id: string, names: readonly string[]): string => {
  const ordered = names.toSorted((left, right) => right.length - left.length);
  return (
    ordered.find((name) => id.startsWith(pascal(name))) ??
    ordered.find((name) => name.length >= 3 && id.includes(pascal(name))) ??
    SHARED_GROUP
  );
};

/** The resources by part of the app, in the configuration's order, with the stack's shared ones last. */
export const groupResources = (
  resources: readonly DeployResource[],
  names: readonly string[],
  failed = false
): ResourceGroup[] => {
  const groups = new Map<string, DeployResource[]>();
  for (const resource of resources) {
    const owner = ownerOf(resource.id, names);
    groups.set(owner, [...(groups.get(owner) ?? []), resource]);
  }
  return [...names, SHARED_GROUP]
    .filter((name) => groups.has(name))
    .map((name) => {
      const members = groups.get(name)!;
      const running = members.filter((resource) => resource.status === 'in-progress').length;
      const starts = members
        .map((resource) => epoch(resource.startedAt) ?? epoch(resource.endedAt))
        .filter((time) => time !== undefined);
      const ends = members.map((resource) => epoch(resource.endedAt)).filter((time) => time !== undefined);
      const group: ResourceGroup = {
        name,
        resources: members,
        status: running > 0 ? (failed ? 'failed' : 'running') : 'done',
        done: members.length - running,
        running
      };
      if (starts.length > 0) group.startedAt = Math.min(...starts);
      if (running === 0 && ends.length > 0) group.endedAt = Math.max(...ends);
      return group;
    });
};
