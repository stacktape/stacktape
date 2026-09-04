/*
 * THE LOOP — the hero's right half, and the only thing on these pages that moves.
 *
 * Five beats in one window: the wizard writes the config, the architecture and its price appear, one
 * command deploys it, observability is already on, and then production breaks and the incident is
 * handled. It is a demonstration rather than a decoration — every frame is a miniature of a real
 * Stacktape surface, drawn small enough to stay legible beside a headline.
 *
 * Only the fifth beat differs between the three versions, and it differs in words alone (see
 * `loop-data.ts`), so the experiment measures the claim and not the picture.
 *
 * How it plays:
 *  - All five panes are in the DOM at once and crossfade, so the page is complete before hydration
 *    and a reader who never runs JavaScript still gets the whole story in source order.
 *  - Entering a beat bumps that beat's nonce, which is the React key of its contents, which replaces
 *    them — that is what replays its CSS entrance animations. The beat being left keeps its nonce
 *    and so fades out in its finished state instead of rewinding.
 *  - Within-beat motion is entirely CSS. Every animated element's static style IS its final state,
 *    so switching the animations off leaves the beat looking finished rather than empty.
 *
 * Hydration: `client:visible`. Before that the first beat is showing and nothing is lost.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ALL_CLEAR,
  ARCH_BLOCKS,
  ARCH_LINKS,
  ARCH_PRICE_CHIP,
  BEATS,
  DEPLOY_COMMAND,
  DEPLOY_ROWS,
  DEPLOY_SEGMENTS,
  DEPLOY_SUMMARY,
  LOOP_TITLE,
  OBSERVE_CHARTS,
  OBSERVE_CHIPS,
  SLAB,
  WRITE_CHIP,
  captionFor,
  incidentScript,
  type ArchBlock,
  type BeatId,
  type MiniChart
} from './loop-data';
import { PROJECT_NAME } from '../../surfaces/story';
import type { HeroVariant } from './copy';

/** macOS system colours, matching the shared window frames rather than re-tinting them. */
const TRAFFIC_LIGHTS = ['#ff5f57', '#febc2e', '#28c840'] as const;

/** SVG ids are document-global, so the diagram's accessible name gets a namespaced one. */
const ARCH_TITLE_ID = 'hl-arch-title';

type LoopWindowProps = {
  /** Which version of beat 5 to play. Everything else is identical across the three. */
  variant: HeroVariant;
  /** Shiki's HTML for `nextjs-postgres`, rendered in `.astro` frontmatter and passed down. */
  configHtml: string;
  /** So the editor can draw a gutter without parsing the HTML back. */
  configLineCount: number;
};

type LoopState = {
  index: number;
  /**
   * One counter per beat, incremented when that beat is entered. It is the only reason this is
   * state and not a plain index: the counter is what makes the key change, and the key is what
   * makes the CSS run again.
   */
  nonces: readonly number[];
};

export function LoopWindow({ variant, configHtml, configLineCount }: LoopWindowProps) {
  const [{ index, nonces }, setLoop] = useState<LoopState>(() => ({ index: 0, nonces: BEATS.map(() => 0) }));
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const isPaused = isHovered || isFocused;
  // Reduced motion means no autoplay at all: the step row below becomes the only way to advance.
  const isRunning = !prefersReducedMotion && !isPaused;
  const activeNonce = nonces[index] ?? 0;
  const activeBeat = BEATS[index] ?? BEATS[0];

  const goTo = useCallback((next: number) => {
    setLoop((previous) => ({
      index: next,
      nonces: previous.nonces.map((nonce, position) => (position === next ? nonce + 1 : nonce))
    }));
  }, []);

  useBeatClock({ index, nonce: activeNonce, isRunning, goTo });

  if (activeBeat === undefined) return null;

  return (
    <section
      className="hl-loop"
      aria-label={`${PROJECT_NAME}: what Stacktape does, in five steps`}
      data-step={index}
      data-paused={isPaused ? 'true' : 'false'}
      data-reduced={prefersReducedMotion ? 'true' : 'false'}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <header className="hl-loop__bar">
        <span className="hl-loop__lights" aria-hidden="true">
          {TRAFFIC_LIGHTS.map((color) => (
            <span key={color} style={{ background: color }} />
          ))}
        </span>
        <p className="hl-loop__title">{LOOP_TITLE}</p>
        <span className="hl-loop__pause" aria-hidden="true">
          Paused
        </span>
      </header>

      <StepRow activeIndex={index} activeNonce={activeNonce} onSelect={goTo} onFocusChange={setIsFocused} />

      <div className="hl-loop__content">
        {BEATS.map((beat, position) => (
          <div
            key={beat.id}
            className={`hl-loop__pane hl-loop__pane--${beat.id}${position === index ? ' is-active' : ''}`}
            aria-hidden={position === index ? undefined : 'true'}
          >
            {/* The pane element is keyed by beat and so survives the whole cycle, which is what lets
                its crossfade be a CSS transition. The contents are keyed by the nonce and so are
                replaced on entry, which is what replays the beat's own animations. */}
            <Beat
              key={nonces[position] ?? 0}
              id={beat.id}
              variant={variant}
              configHtml={configHtml}
              configLineCount={configLineCount}
            />
          </div>
        ))}
      </div>

      <p className="hl-loop__caption" key={`caption-${activeBeat.id}-${activeNonce}`}>
        {captionFor(activeBeat.id, variant)}
      </p>
    </section>
  );
}

/**
 * The clock.
 *
 * A setTimeout chain rather than a rAF loop: the beats are seconds long and nothing here needs a
 * frame-accurate tick. What it does need is to survive a pause without losing its place, so the
 * cleanup banks the time already spent and the next run gets the remainder — which keeps the timer
 * and the CSS progress bar (paused, not restarted) telling the same story.
 */
const useBeatClock = ({
  index,
  nonce,
  isRunning,
  goTo
}: {
  index: number;
  nonce: number;
  isRunning: boolean;
  goTo: (next: number) => void;
}) => {
  const remainingRef = useRef(BEATS[0]?.durationMs ?? 0);

  // Declared before the timer effect so that on a beat change it runs first and puts the new beat's
  // full duration on the clock; a pause leaves its deps untouched and so never resets anything.
  useEffect(() => {
    remainingRef.current = BEATS[index]?.durationMs ?? 0;
  }, [index, nonce]);

  useEffect(() => {
    if (!isRunning) return;

    const startedAt = performance.now();
    const timer = setTimeout(() => goTo((index + 1) % BEATS.length), remainingRef.current);

    return () => {
      clearTimeout(timer);
      remainingRef.current = Math.max(0, remainingRef.current - (performance.now() - startedAt));
    };
  }, [index, nonce, isRunning, goTo]);
};

/**
 * Whether this reader has asked for less motion.
 *
 * Starts `false` so the server render and the first client render agree; the effect corrects it
 * within the same commit, long before the first beat would have ended.
 */
const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(query.matches);

    const onChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return prefersReducedMotion;
};

/**
 * The five steps, as buttons.
 *
 * They are the manual stepper the reduced-motion path needs and the "let me see that again"
 * affordance everyone else needs, so they are the same control in both cases rather than a second
 * one that only appears sometimes. A fieldset rather than `role="group"`; its default chrome is
 * reset in the stylesheet.
 */
function StepRow({
  activeIndex,
  activeNonce,
  onSelect,
  onFocusChange
}: {
  activeIndex: number;
  activeNonce: number;
  onSelect: (index: number) => void;
  /**
   * Pausing on focus lives here rather than on the window, because these buttons are the only
   * things inside it that can hold focus — "focus is somewhere in the loop" and "a step button is
   * focused" are the same statement, and this is the one that is true of an interactive element.
   */
  onFocusChange: (isFocused: boolean) => void;
}) {
  return (
    <fieldset className="hl-loop__steps" aria-label="Loop step">
      {BEATS.map((beat, position) => (
        <button
          key={beat.id}
          type="button"
          className={`hl-loop__step${position === activeIndex ? ' is-active' : ''}`}
          aria-pressed={position === activeIndex}
          onClick={() => onSelect(position)}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
        >
          <span className="hl-loop__step-label">{beat.label}</span>
          {position === activeIndex && (
            // Remounted on every entry, which is what restarts the fill; its duration comes from the
            // `data-step` rules in the stylesheet, so the bar and the clock cannot disagree.
            <span className="hl-loop__step-fill" key={activeNonce} aria-hidden="true" />
          )}
        </button>
      ))}
    </fieldset>
  );
}

function Beat({
  id,
  variant,
  configHtml,
  configLineCount
}: {
  id: BeatId;
  variant: HeroVariant;
  configHtml: string;
  configLineCount: number;
}) {
  switch (id) {
    case 'write':
      return <WriteBeat html={configHtml} lineCount={configLineCount} />;
    case 'review':
      return <ReviewBeat />;
    case 'deploy':
      return <DeployBeat />;
    case 'observe':
      return <ObserveBeat />;
    case 'incident':
      return <IncidentBeat variant={variant} />;
  }
}

/* ── Beat 1 · Write ───────────────────────────────────────────────────────────────────────────── */

/**
 * The config being written, in a miniature editor.
 *
 * The YAML is the real `nextjs-postgres` snippet, highlighted at build time by the same pipeline the
 * homepage editor uses — not a hand-typed imitation of one. The reveal is per `.line`, driven by
 * `nth-child` delays in the stylesheet, because the markup belongs to Shiki and there is nowhere to
 * hang a per-line prop.
 */
function WriteBeat({ html, lineCount }: { html: string; lineCount: number }) {
  return (
    <div className="hl-write">
      <div className="hl-write__pane">
        <div className="hl-write__gutter" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, line) => (
            <span key={line}>{line + 1}</span>
          ))}
        </div>
        <div className="hl-write__code stp-code" dangerouslySetInnerHTML={{ __html: html }} />
        <span className="hl-write__cursor" aria-hidden="true" />
      </div>
      <p className="hl-write__chip">{WRITE_CHIP}</p>
    </div>
  );
}

/* ── Beat 2 · Review ──────────────────────────────────────────────────────────────────────────── */

/**
 * What the config means, as a flat-isometric impression.
 *
 * Purpose-drawn for this window: six slabs, six connectors, six words. The real diagram island is a
 * different job — it is explorable, it is 900 px wide, and it would be unreadable here.
 */
function ReviewBeat() {
  return (
    <div className="hl-arch">
      {/* Named by a `<title>` rather than by `role="img"` + `aria-label`: same accessible name, and
          the one screen readers have agreed on for inline SVG the longest. */}
      <svg className="hl-arch__svg" viewBox="0 0 600 420" aria-labelledby={ARCH_TITLE_ID}>
        <title id={ARCH_TITLE_ID}>
          Six resources on an isometric plane — firewall, web, apiService, worker, cache and mainDatabase — wired
          together
        </title>

        <g className="hl-arch__links">
          {ARCH_LINKS.map(([from, to]) => {
            const start = ARCH_BLOCKS[from];
            const end = ARCH_BLOCKS[to];
            if (start === undefined || end === undefined) return null;
            return (
              // `pathLength="1"` normalises every connector, so one dash animation draws a short
              // link and a long one in exactly the same time.
              <line key={`${start.name}-${end.name}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} pathLength={1} />
            );
          })}
        </g>

        <g className="hl-arch__blocks">
          {ARCH_BLOCKS.map((block) => (
            <Slab key={block.name} block={block} />
          ))}
        </g>
      </svg>

      <p className="hl-arch__price">{ARCH_PRICE_CHIP}</p>
    </div>
  );
}

/** One resource: a rhombus top face and the two side faces that give it thickness. */
function Slab({ block }: { block: ArchBlock }) {
  const { halfWidth, halfHeight, depth } = SLAB;
  const { x, y } = block;

  const top = `${x},${y - halfHeight} ${x + halfWidth},${y} ${x},${y + halfHeight} ${x - halfWidth},${y}`;
  const left = `${x - halfWidth},${y} ${x},${y + halfHeight} ${x},${y + halfHeight + depth} ${x - halfWidth},${y + depth}`;
  const right = `${x},${y + halfHeight} ${x + halfWidth},${y} ${x + halfWidth},${y + depth} ${x},${y + halfHeight + depth}`;

  return (
    <g className={`hl-arch__block is-${block.tone}`}>
      <polygon className="hl-arch__side" points={left} />
      <polygon className="hl-arch__side is-lit" points={right} />
      <polygon className="hl-arch__top" points={top} />
      <text className="hl-arch__label" x={x} y={y + halfHeight + depth + 20}>
        {block.name}
      </text>
    </g>
  );
}

/* ── Beat 3 · Deploy ──────────────────────────────────────────────────────────────────────────── */

/**
 * One command, and what it prints.
 *
 * The meter is two identical rows of cells — a dim track and a brand-coloured fill stacked on top —
 * and the fill is revealed by a stepped clip. That is what makes it advance a whole cell at a time,
 * which is how CloudFormation actually reports progress.
 */
function DeployBeat() {
  const cells = Array.from({ length: DEPLOY_SEGMENTS }, (_, cell) => <i key={cell} />);

  return (
    <div className="hl-deploy">
      <p className="hl-deploy__command">
        <span className="hl-deploy__prompt" aria-hidden="true">
          $
        </span>
        {DEPLOY_COMMAND}
      </p>

      <p className="hl-deploy__meter-row">
        <span className="hl-deploy__meter" aria-hidden="true">
          <span className="hl-deploy__meter-track">{cells}</span>
          <span className="hl-deploy__meter-fill">{cells}</span>
        </span>
        <span className="hl-deploy__percent">100%</span>
      </p>

      <p className="hl-deploy__summary">{DEPLOY_SUMMARY}</p>

      <ul className="hl-deploy__rows">
        {DEPLOY_ROWS.map((row) => (
          <li key={row.name}>
            <span className="hl-deploy__tick" aria-hidden="true">
              ✓
            </span>
            <span className="hl-deploy__name">{row.name}</span>
            <span className="hl-deploy__detail">{row.detail}</span>
            <span className="hl-deploy__state">created</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Beat 4 · Observe ─────────────────────────────────────────────────────────────────────────── */

/** Two charts and two chips. Everything calm, because this is the beat before anything is wrong. */
function ObserveBeat() {
  return (
    <div className="hl-observe">
      <div className="hl-observe__charts">
        {OBSERVE_CHARTS.map((chart) => (
          <MiniAreaChart key={chart.label} chart={chart} />
        ))}
      </div>

      <p className="hl-observe__chips">
        {OBSERVE_CHIPS.map((chip) => (
          <span className="hl-observe__chip" key={chip}>
            {chip}
          </span>
        ))}
      </p>
    </div>
  );
}

const CHART_W = 100;
const CHART_H = 40;

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * Straight segments with rounded joins rather than a smoothed curve: across twelve samples in a
 * 230 px plot the difference is invisible, and a polyline cannot invent a value between two samples.
 */
const chartLine = (values: readonly number[], max: number): string =>
  values
    .map((value, index) => {
      const x = round((index / Math.max(1, values.length - 1)) * CHART_W);
      const y = round(CHART_H - (Math.min(value, max) / max) * CHART_H);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

function MiniAreaChart({ chart }: { chart: MiniChart }) {
  const line = chartLine(chart.values, chart.max);
  const gradientId = `hl-observe-fill-${chart.resource}`;

  return (
    <figure className="hl-observe__chart">
      <figcaption className="hl-observe__chart-head">
        <span className="hl-observe__chart-resource">{chart.resource}</span>
        <span className="hl-observe__chart-label">{chart.label}</span>
      </figcaption>

      {/* The wipe is on this box, not on the SVG: an HTML element has a border box for `inset()` to
          measure against, and an SVG element does not. */}
      <div className="hl-observe__plot">
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.34" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={`${line} L ${CHART_W} ${CHART_H} L 0 ${CHART_H} Z`} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </figure>
  );
}

/* ── Beat 5 · Incident ────────────────────────────────────────────────────────────────────────── */

/**
 * The beat the experiment is about.
 *
 * Structurally identical in all three versions — an alarm, three lines, a resolution, a breath of
 * green — so that what a reader reacts to is the wording and not a different picture.
 */
function IncidentBeat({ variant }: { variant: HeroVariant }) {
  return (
    <div className="hl-incident">
      <p className="hl-incident__head">
        <span className="hl-incident__head-kicker">Incident</span>
        <span className="hl-incident__head-target">{PROJECT_NAME} / production</span>
      </p>

      <ul className="hl-incident__lines">
        {incidentScript(variant).map((line) => (
          <li className={`hl-incident__line is-${line.kind}`} key={line.text}>
            {line.text}
          </li>
        ))}
      </ul>

      <p className="hl-incident__clear">
        <span className="hl-incident__clear-dot" aria-hidden="true" />
        {ALL_CLEAR}
      </p>
    </div>
  );
}
