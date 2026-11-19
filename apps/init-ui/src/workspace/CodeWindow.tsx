import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import type { FileView } from '../session';
import { FileIcon } from './FileIcon';
import { tokenizeFile } from './syntax';

/** Matches `.ws-line` and `.ws-code` padding in `workspace.css`. */
const LINE_HEIGHT = 20;
const PADDING_TOP = 12;

const NOT_SHOWN: Readonly<Record<Extract<FileView, { status: 'not-shown' }>['reason'], string>> = {
  'not-seen': 'not shown',
  outside: 'outside the project, not shown',
  missing: 'not on disk any more',
  'not-a-file': 'not a file, not shown',
  'too-large': 'too large to show',
  binary: 'not text, not shown'
};

/**
 * An editor-like window onto the files the analysis read: a tab per file, line numbers, the file's real text.
 *
 * While the analysis reads, a scanner line sweeps down the active file at reading pace, lines above it a touch
 * brighter than lines below, and idles at the end until the next file opens. During the reveal the window instead
 * points at one line: the rest dims, the line lights up, and a callout under it says what it led to.
 */
export function CodeWindow({
  tabs,
  active,
  files,
  isScanning,
  focus,
  emptyState,
  reducedMotion
}: {
  /** Paths in the order they were opened. */
  tabs: readonly string[];
  active: string | undefined;
  files: ReadonlyMap<string, FileView>;
  /** The scanner is sweeping (the analysis is reading). */
  isScanning: boolean;
  /** The line the reveal points at, 1-based, and what it says about it. */
  focus?: { line: number; callout: ReactNode } | undefined;
  emptyState: ReactNode;
  reducedMotion: boolean;
}) {
  const view = active === undefined ? undefined : files.get(active);
  const lines = useMemo(() => (view?.status === 'shown' ? tokenizeFile(view.text, view.path) : undefined), [view]);

  const bodyRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // The active tab stays in view as more files open.
  useLayoutEffect(() => {
    const tab = tabsRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    if (tab === null || tab === undefined || tabsRef.current === null) return;
    const strip = tabsRef.current;
    const right = tab.offsetLeft + tab.offsetWidth;
    if (right > strip.scrollLeft + strip.clientWidth || tab.offsetLeft < strip.scrollLeft) {
      strip.scrollTo({
        left: Math.max(0, right - strip.clientWidth + 24),
        behavior: reducedMotion ? 'auto' : 'smooth'
      });
    }
  }, [active, tabs.length, reducedMotion]);

  // The sweep: from the first line to the last at reading pace, scrolling a long file under it, then an idle glow.
  useEffect(() => {
    const body = bodyRef.current;
    const beam = beamRef.current;
    const dim = dimRef.current;
    if (body === null || beam === null || dim === null) return;
    if (!isScanning || lines === undefined || reducedMotion) {
      // Before the first file opens, the beam drifts slowly over the empty window: working, not frozen.
      beam.dataset.state = isScanning && lines === undefined && !reducedMotion ? 'waiting' : 'off';
      beam.style.transform = '';
      dim.style.height = '0px';
      return;
    }
    const count = lines.length;
    const end = PADDING_TOP + count * LINE_HEIGHT;
    const duration = Math.min(4200, Math.max(1400, count * 38));
    const started = performance.now();
    body.scrollTop = 0;
    beam.dataset.state = 'sweeping';
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      // Eased at both ends, so the beam settles onto a file rather than starting at full speed.
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
      const y = PADDING_TOP + eased * (end - PADDING_TOP);
      beam.style.transform = `translateY(${y}px)`;
      dim.style.transform = `translateY(${y}px)`;
      dim.style.height = `${Math.max(0, end + PADDING_TOP - y)}px`;
      const target = Math.max(0, y - body.clientHeight * 0.62);
      if (Math.abs(body.scrollTop - target) > 0.5) body.scrollTop = target;
      if (progress < 1) frame = requestAnimationFrame(tick);
      else beam.dataset.state = 'idle';
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isScanning, lines, reducedMotion]);

  // The reveal brings its line to about a third of the way down.
  const focusLine = focus?.line;
  useEffect(() => {
    const body = bodyRef.current;
    if (body === null || focusLine === undefined || lines === undefined) return;
    const y = PADDING_TOP + (focusLine - 1) * LINE_HEIGHT;
    body.scrollTo({ top: Math.max(0, y - body.clientHeight * 0.36), behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [focusLine, lines, reducedMotion]);

  const digits = String(lines?.length ?? 1).length;

  return (
    <div className="ws-window" data-focus={focus === undefined ? undefined : 'true'}>
      <div className="ws-window-tabs" ref={tabsRef}>
        {tabs.map((path) => (
          <span className="ws-window-tab" data-active={path === active ? 'true' : undefined} key={path} title={path}>
            <FileIcon path={path} />
            {path.split('/').at(-1)}
          </span>
        ))}
      </div>
      {active !== undefined && (
        <div className="ws-window-path">
          {active.split('/').map((segment, index, all) => (
            // oxlint-disable-next-line react/no-array-index-key -- segments of one path; position is identity.
            <span key={`${segment}-${index}`}>
              {segment}
              {index < all.length - 1 && <span className="ws-window-path-sep">/</span>}
            </span>
          ))}
          {view?.status === 'shown' && view.masked && <span className="ws-window-path-note">values hidden</span>}
        </div>
      )}
      <div className="ws-window-body" ref={bodyRef}>
        {lines !== undefined ? (
          <div className="ws-code" style={{ ['--ws-gutter-digits' as string]: digits }}>
            {lines.map((tokens, index) => (
              <div
                className="ws-line"
                data-focus={focus?.line === index + 1 ? 'true' : undefined}
                // oxlint-disable-next-line react/no-array-index-key -- lines of one file; position is identity.
                key={index}
              >
                <span className="ws-line-number">{index + 1}</span>
                <span className="ws-line-text">
                  {tokens.length === 0
                    ? ' '
                    : tokens.map((token, tokenIndex) =>
                        token.kind === 'plain' ? (
                          token.text
                        ) : (
                          // oxlint-disable-next-line react/no-array-index-key -- runs of one line; position is identity.
                          <span className={`ws-tok-${token.kind}`} key={tokenIndex}>
                            {token.text}
                          </span>
                        )
                      )}
                </span>
              </div>
            ))}
            {view?.status === 'shown' && view.truncated && (
              <div className="ws-window-more">The first 2,000 of {view.lineCount.toLocaleString('en-US')} lines</div>
            )}
            {focus !== undefined && (
              <div className="ws-callout" style={{ top: PADDING_TOP + focus.line * LINE_HEIGHT + 6 }}>
                {focus.callout}
              </div>
            )}
          </div>
        ) : view?.status === 'not-shown' ? (
          <div className="ws-window-empty">
            <FileIcon path={view.path} size={18} />
            <span>
              <strong>{view.path}</strong> {NOT_SHOWN[view.reason]}
            </span>
          </div>
        ) : active === undefined ? (
          <div className="ws-window-empty">{emptyState}</div>
        ) : null}
        <div aria-hidden className="ws-dim" ref={dimRef} />
        <div aria-hidden className="ws-beam" data-state="off" ref={beamRef} />
      </div>
    </div>
  );
}
