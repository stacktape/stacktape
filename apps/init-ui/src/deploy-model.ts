/**
 * The CLI's event stream, as something a person can watch.
 *
 * The stream is the documented JSONL protocol (`tui-manager/output/jsonl-types.ts`): phases contain
 * tracked operations, operations nest, and CloudFormation reports its own progress inside the DEPLOY
 * phase. This turns that into a flat list of phases with a current operation each, which is what a
 * first-time deploy needs — "what is happening now, and how far through are we".
 *
 * Console renders the same stream in more depth for people debugging a deploy. This is deliberately
 * the shallower view: someone deploying for the first time is not debugging, and a wall of nested
 * operations reads as something having gone wrong.
 */

export type DeployEvent = {
  type: string;
  ts?: string;
  phase?: string;
  eventType?: string;
  status?: 'started' | 'running' | 'completed';
  message?: string;
  instanceId?: string;
  level?: string;
  source?: string;
  lines?: string[];
  ok?: boolean;
  code?: string;
  detail?: {
    kind?: string;
    percent?: number;
    completedCount?: number;
    totalPlanned?: number;
    inProgressResources?: string[];
    changeCounts?: { created: number; updated: number; deleted: number };
  };
};

type DeployPhase = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done';
  /** The most recent thing this phase said it was doing. */
  message: string;
  /** CloudFormation's own progress, when this phase is the one talking to it. */
  cloudformation?: {
    percent: number;
    completed: number;
    total: number;
    inProgress: string[];
    changeCounts?: { created: number; updated: number; deleted: number };
  };
};

/** The phases a deploy goes through, in the order the CLI reports them. */
const PHASE_LABELS: Record<string, string> = {
  INITIALIZE: 'Getting ready',
  BUILD_AND_PACKAGE: 'Building your code',
  UPLOAD: 'Uploading',
  DEPLOY: 'Creating AWS resources',
  POST_DEPLOY: 'Finishing up',
  SUMMARY: 'Summary'
};

const PHASE_ORDER = ['INITIALIZE', 'BUILD_AND_PACKAGE', 'UPLOAD', 'DEPLOY', 'POST_DEPLOY', 'SUMMARY'];

const labelFor = (phase: string): string =>
  PHASE_LABELS[phase] ??
  phase
    .toLowerCase()
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');

export type DeployModel = {
  phases: DeployPhase[];
  /** Warnings and errors, which are the log lines a person actually needs during a deploy. */
  notices: Array<{ level: string; message: string }>;
  /** Everything the CLI said, for the disclosure at the bottom. */
  log: string[];
};

export const buildDeployModel = (
  events: readonly DeployEvent[],
  lines: readonly string[],
  /** True once the deploy has stopped, which is the only way to know the last phase is over. */
  finished = false
): DeployModel => {
  const phases = new Map<string, DeployPhase>();
  const notices: Array<{ level: string; message: string }> = [];
  const log: string[] = [];
  let latestPhaseId: string | undefined;

  for (const event of events) {
    if (event.type === 'log') {
      if (event.message !== undefined) {
        log.push(event.message);
        if (event.level === 'warn' || event.level === 'error') {
          notices.push({ level: event.level, message: event.message });
        }
      }
      continue;
    }

    if (event.type === 'output') {
      log.push(...(event.lines ?? []));
      continue;
    }

    if (event.type !== 'event' || event.phase === undefined) continue;

    latestPhaseId = event.phase;
    const existing = phases.get(event.phase) ?? {
      id: event.phase,
      label: labelFor(event.phase),
      status: 'running' as const,
      message: ''
    };

    existing.message = event.message ?? existing.message;
    if (event.message !== undefined) log.push(event.message);

    // CloudFormation is the long part, and the only part with a real percentage. Everything else is
    // "started" and then "completed", which is a spinner, not a bar.
    if (event.detail?.kind === 'cloudformation-progress') {
      existing.cloudformation = {
        percent: Number(event.detail.percent ?? 0),
        completed: Number(event.detail.completedCount ?? 0),
        total: Number(event.detail.totalPlanned ?? 0),
        inProgress: event.detail.inProgressResources ?? [],
        ...(event.detail.changeCounts === undefined ? {} : { changeCounts: event.detail.changeCounts })
      };
    }

    phases.set(event.phase, existing);
  }

  // A phase is done when a later one has started. The CLI marks individual operations completed, but
  // "this phase is over" is only ever knowable from the next phase beginning.
  const ordered = [...phases.values()].toSorted((left, right) => {
    const leftIndex = PHASE_ORDER.indexOf(left.id);
    const rightIndex = PHASE_ORDER.indexOf(right.id);
    return (leftIndex < 0 ? PHASE_ORDER.length : leftIndex) - (rightIndex < 0 ? PHASE_ORDER.length : rightIndex);
  });
  const currentIndex = ordered.findIndex((phase) => phase.id === latestPhaseId);

  for (const [index, phase] of ordered.entries()) {
    phase.status =
      finished || (currentIndex >= 0 && index < currentIndex) ? 'done' : index === currentIndex ? 'running' : 'pending';
  }

  return { phases: ordered, notices, log: [...log, ...lines] };
};

/**
 * The URLs a finished deploy produced.
 *
 * Pulled out of the log rather than out of a structured field because the CLI prints its stack
 * overview as text. It is the first thing anyone wants after a deploy finishes, and a link they can
 * click beats a line they have to find.
 */
export const extractUrls = (log: readonly string[]): string[] => {
  const found = new Set<string>();
  for (const line of log) {
    for (const match of line.matchAll(/https?:\/\/[^\s"'<>)\]]+/g)) {
      const url = match[0].replace(/[.,;]$/, '');
      // Console links and AWS consoles are not what the user deployed; their own endpoints are.
      if (/amazonaws\.com\/(console|cloudformation)|console\.aws|stacktape\.com/.test(url)) continue;
      found.add(url);
    }
  }
  return [...found];
};
