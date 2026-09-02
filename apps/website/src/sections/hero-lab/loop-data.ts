/*
 * Everything the loop plays, as data.
 *
 * The loop is one product story told in five beats — write, review, deploy, observe, incident — and
 * only the last one changes between the three claims. Holding the whole script here means the
 * component is a player rather than a screenplay, and it means the three versions provably differ in
 * exactly one beat.
 *
 * Browser-safe on purpose: plain arrays and the shared story cast, nothing that touches the config
 * schema or the filesystem. The island imports it directly.
 */
import { PROJECT_NAME, REGION, RESOURCES } from '../../surfaces/story';
import type { HeroVariant } from './copy';

export type BeatId = 'write' | 'review' | 'deploy' | 'observe' | 'incident';

export type Beat = {
  id: BeatId;
  /** What the step row prints. One word, so five of them fit above a 600 px window. */
  label: string;
  durationMs: number;
};

/**
 * The cycle: about sixteen seconds, weighted towards the two beats that carry information the
 * reader has not seen on another infrastructure homepage — the config being written, and the
 * incident being handled.
 */
export const BEATS: readonly Beat[] = [
  { id: 'write', label: 'Write', durationMs: 3000 },
  { id: 'review', label: 'Review', durationMs: 2500 },
  { id: 'deploy', label: 'Deploy', durationMs: 2500 },
  { id: 'observe', label: 'Observe', durationMs: 2500 },
  { id: 'incident', label: 'Incident', durationMs: 4500 }
];

export const LOOP_TITLE = `${PROJECT_NAME} — first deploy to day 2`;

/* ── Captions ─────────────────────────────────────────────────────────────────────────────────── */

/*
 * The status bar. One line per beat, saying what the picture above it means — the four shared ones
 * describe the product and are the same everywhere; the fifth is the claim under test and is given
 * per version.
 */
const SHARED_CAPTIONS: Record<Exclude<BeatId, 'incident'>, string> = {
  write: 'The wizard read the repository and wrote the config. Nothing exists on AWS yet.',
  review: 'The architecture and the monthly price, before a single resource is created.',
  deploy: 'One command. Plain CloudFormation, in an AWS account you own.',
  observe: 'Metrics, traces, logs and alarms arrived with the deploy.'
};

const INCIDENT_CAPTIONS: Record<HeroVariant, string> = {
  bold: 'The agent saw the release diff, the trace and the config — and shipped the fix.',
  balanced: 'The agent brings the diagnosis and the fix. A human stays on the trigger.',
  safe: 'Everything needed to fix it, already in one view.'
};

export const captionFor = (beat: BeatId, variant: HeroVariant): string =>
  beat === 'incident' ? INCIDENT_CAPTIONS[variant] : SHARED_CAPTIONS[beat];

/* ── Beat 1 · Write ───────────────────────────────────────────────────────────────────────────── */

/** How many lines type in one at a time before the remainder settles in as a block. */
export const TYPED_LINES = 14;

export const WRITE_CHIP = 'written by the wizard from your repo';

/* ── Beat 2 · Review ──────────────────────────────────────────────────────────────────────────── */

/**
 * The architecture impression: six slabs on a flat-isometric plane, hand-placed in screen units of
 * the 600 × 420 viewBox rather than projected from a grid. Placement is by legibility — no label
 * overlaps a slab, no connector passes under one — which a strict projection of this cast does not
 * give you at this size.
 *
 * `tone` selects the AWS-category colour the stylesheet paints the slab with; the names are the
 * shared cast's, so this is the same application the terminal and the metrics below show.
 */
export type ArchBlock = {
  name: string;
  tone: 'firewall' | 'web' | 'api' | 'worker' | 'cache' | 'database';
  x: number;
  y: number;
};

/** Assembly order, top of the request path first — the diagram builds the way traffic flows. */
export const ARCH_BLOCKS: readonly ArchBlock[] = [
  { name: 'firewall', tone: 'firewall', x: 168, y: 74 },
  { name: 'web', tone: 'web', x: 392, y: 62 },
  { name: 'apiService', tone: 'api', x: 262, y: 186 },
  { name: 'worker', tone: 'worker', x: 470, y: 172 },
  { name: 'cache', tone: 'cache', x: 150, y: 296 },
  { name: 'mainDatabase', tone: 'database', x: 368, y: 290 }
];

/** Half-width, half-height and depth of one slab, in viewBox units. A 2:1 top face reads isometric. */
export const SLAB = { halfWidth: 56, halfHeight: 28, depth: 15 } as const;

/** Centre-to-centre, drawn under the slabs. Indices into `ARCH_BLOCKS`. */
export const ARCH_LINKS: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [2, 4],
  [2, 5],
  [3, 5]
];

export const ARCH_PRICE_CHIP = '$118/mo estimated';

/* ── Beat 3 · Deploy ──────────────────────────────────────────────────────────────────────────── */

export const DEPLOY_COMMAND = `stacktape deploy --stage production --region ${REGION}`;

/** The meter is drawn cell by cell, the way CloudFormation reports whole resources. */
export const DEPLOY_SEGMENTS = 24;

export const DEPLOY_SUMMARY = '33 resources · 4m 11s';

/**
 * The three rows the miniature has room for, taken from the shared cast so the engine names match
 * what every other Stacktape surface prints for the same resource.
 */
export const DEPLOY_ROWS: readonly { name: string; detail: string }[] = ['web', 'apiService', 'mainDatabase'].map(
  (name) => ({
    name,
    detail: RESOURCES.find((resource) => resource.name === name)?.terminalLabel ?? name
  })
);

/* ── Beat 4 · Observe ─────────────────────────────────────────────────────────────────────────── */

export type MiniChart = {
  label: string;
  resource: string;
  /** Hand-authored, calm, and plausible — this is the beat where nothing is wrong yet. */
  values: readonly number[];
  max: number;
};

export const OBSERVE_CHARTS: readonly MiniChart[] = [
  {
    label: 'CPU utilization (%)',
    resource: 'apiService',
    values: [31, 34, 29, 36, 41, 38, 44, 52, 49, 45, 42, 39],
    max: 100
  },
  {
    label: 'Invocations (count)',
    resource: 'worker',
    values: [420, 380, 455, 510, 470, 530, 610, 585, 640, 700, 660, 612],
    max: 900
  }
];

export const OBSERVE_CHIPS: readonly string[] = ['traces on', 'alarms armed'];

/* ── Beat 5 · Incident ────────────────────────────────────────────────────────────────────────── */

/**
 * `agent` lines are the ones that name an actor doing the work; `context` lines describe what is on
 * screen without claiming anybody did it. Which of the two a version uses is the experiment.
 */
export type IncidentLine = {
  kind: 'alarm' | 'agent' | 'context' | 'approval' | 'resolved';
  text: string;
};

const ALARM_LINE: IncidentLine = { kind: 'alarm', text: 'ALARM worker · error rate 4.7% (threshold 1%)' };

const INCIDENT_SCRIPTS: Record<HeroVariant, readonly IncidentLine[]> = {
  bold: [
    ALARM_LINE,
    { kind: 'agent', text: 'agent: correlating with release v2.4.1 — diff, traces, logs' },
    { kind: 'agent', text: 'agent: root cause — checkout items can be empty since v2.4.1' },
    { kind: 'agent', text: 'agent: fix deployed · hot-swap 4.0s' },
    { kind: 'resolved', text: '✓ Incident resolved — no human involved · 14 min' }
  ],
  balanced: [
    ALARM_LINE,
    { kind: 'agent', text: 'agent: root cause — checkout items can be empty since v2.4.1' },
    { kind: 'agent', text: 'agent: proposed fix ready — review diff' },
    { kind: 'approval', text: '✓ Approved by dana' },
    { kind: 'resolved', text: '✓ Incident resolved · 14 min' }
  ],
  safe: [
    ALARM_LINE,
    { kind: 'context', text: 'correlated with release v2.4.1 · diff attached' },
    { kind: 'context', text: 'trace: POST /api/checkout → worker · items = []' },
    { kind: 'context', text: 'one view: release, trace, logs, config' },
    { kind: 'resolved', text: '✓ Resolved · 14 min' }
  ]
};

export const incidentScript = (variant: HeroVariant): readonly IncidentLine[] => INCIDENT_SCRIPTS[variant];

/** The green breath at the end of the cycle, before the config is written again. */
export const ALL_CLEAR = 'All clear';
