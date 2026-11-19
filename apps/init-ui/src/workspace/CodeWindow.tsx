import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject
} from 'react';
import { BiCheck, BiChevronDown } from 'react-icons/bi';
import type { FileView } from '../session';
import { FileIcon } from './FileIcon';
import { tokenizeFile } from './syntax';

/** Matches `.ws-line` and `.ws-code` padding in `workspace.css`. */
export const LINE_HEIGHT = 20;
const PADDING_TOP = 16;
/** A file this much shorter than the window leaves room for the list of files read under it. */
const ROOM_FOR_TRAIL = 150;

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
 * brighter than lines below, and idles at the end until the next file opens. A file shorter than the window sits at
 * the top, and the files read so far are listed under it. During the reveal the window instead points at the lines
 * that called for a resource: the rest steps back and those lines light up. The host scrolls them into place (through
 * `bodyRef`), level with the block being written beside them.
 *
 * `compact` is the phone's window: no tab row, the path and a "Files read" list that opens under it.
 */
export function CodeWindow({
  tabs,
  active,
  files,
  isScanning,
  focus,
  emptyState,
  reducedMotion,
  compact = false,
  isBare = false,
  bodyRef: hostBodyRef
}: {
  /** Paths in the order they were opened. */
  tabs: readonly string[];
  active: string | undefined;
  files: ReadonlyMap<string, FileView>;
  /** The scanner is sweeping (the analysis is reading). */
  isScanning: boolean;
  /** The lines the reveal points at, 1-based. */
  focus?: { lines: readonly number[] } | undefined;
  emptyState: ReactNode;
  reducedMotion: boolean;
  compact?: boolean;
  /** Nothing is opened file by file (the scan without an agent): no tab row or path, only the empty state. */
  isBare?: boolean;
  /** The scrolling body, for a host that lines the focused lines up with something else. */
  bodyRef?: RefObject<HTMLDivElement | null> | undefined;
}) {
  // A file that has just been opened shows once its text is here; until then the window keeps the one before it.
  const shownBefore = useRef<string | undefined>(undefined);
  const ready = active !== undefined && files.has(active);
  if (ready) shownBefore.current = active;
  const shown = ready ? active : (shownBefore.current ?? active);
  const view = shown === undefined ? undefined : files.get(shown);
  const lines = useMemo(() => (view?.status === 'shown' ? tokenizeFile(view.text, view.path) : undefined), [view]);

  const ownBodyRef = useRef<HTMLDivElement>(null);
  const bodyRef = hostBodyRef ?? ownBodyRef;
  const beamRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [bodyHeight, setBodyHeight] = useState(0);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    const body = bodyRef.current;
    if (body === null) return;
    const observer = new ResizeObserver(() => setBodyHeight(body.clientHeight));
    observer.observe(body);
    return () => observer.disconnect();
  }, [bodyRef]);

  /** Marks which ends of the tab row have tabs scrolled past them, so only those ends fade. */
  const markTabEdges = () => {
    const strip = tabsRef.current;
    if (strip === null) return;
    strip.dataset.clippedStart = String(strip.scrollLeft > 1);
    strip.dataset.clippedEnd = String(strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1);
  };

  // The active tab stays in view as more files open.
  useLayoutEffect(() => {
    markTabEdges();
    const tab = tabsRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    if (tab === null || tab === undefined || tabsRef.current === null) return;
    const strip = tabsRef.current;
    const right = tab.offsetLeft + tab.offsetWidth;
    if (right > strip.scrollLeft + strip.clientWidth || tab.offsetLeft < strip.scrollLeft) {
      strip.scrollTo({
        left: Math.max(0, right - strip.clientWidth + 40),
        behavior: reducedMotion ? 'auto' : 'smooth'
      });
    }
  }, [shown, tabs.length, reducedMotion]);

  // The sweep: from the first line to the last at reading pace, scrolling a long file under it, then an idle glow.
  useEffect(() => {
    const body = bodyRef.current;
    const beam = beamRef.current;
    const dim = dimRef.current;
    if (body === null || beam === null || dim === null) return;
    if (!isScanning || lines === undefined || reducedMotion) {
      beam.dataset.state = 'off';
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
      dim.style.height = `${Math.max(0, end - y)}px`;
      const target = Math.max(0, y - body.clientHeight * 0.62);
      if (Math.abs(body.scrollTop - target) > 0.5) body.scrollTop = target;
      if (progress < 1) frame = requestAnimationFrame(tick);
      else beam.dataset.state = 'idle';
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isScanning, lines, reducedMotion, bodyRef]);

  // Without a host lining them up (the phone), the focused lines come to about a third of the way down.
  const focusLine = focus?.lines[0];
  useEffect(() => {
    const body = bodyRef.current;
    if (hostBodyRef !== undefined || body === null || focusLine === undefined || lines === undefined) return;
    const y = PADDING_TOP + (focusLine - 1) * LINE_HEIGHT;
    body.scrollTo({ top: Math.max(0, y - body.clientHeight * 0.3), behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [focusLine, lines, reducedMotion, bodyRef, hostBodyRef]);

  const digits = String(lines?.length ?? 1).length;
  const lit = new Set(shown === active ? (focus?.lines ?? []) : []);
  const codeHeight = PADDING_TOP * 2 + (lines?.length ?? 0) * LINE_HEIGHT;
  const showTrail =
    isScanning && lines !== undefined && tabs.length > 1 && bodyHeight - codeHeight >= ROOM_FOR_TRAIL && !compact;

  return (
    <div
      className="ws-window"
      data-bare={isBare ? 'true' : undefined}
      data-compact={compact ? 'true' : undefined}
      data-focus={focus === undefined ? undefined : 'true'}
    >
      {!compact && (
        <div className="ws-window-tabs" onScroll={markTabEdges} ref={tabsRef}>
          {tabs.length === 0 && (
            // Before the first file opens: where its tab will be.
            <span aria-hidden className="ws-window-tab ws-window-tab-ghost">
              <span />
            </span>
          )}
          {tabs.map((path) => (
            <span className="ws-window-tab" data-active={path === shown ? 'true' : undefined} key={path} title={path}>
              <FileIcon path={path} />
              {path.split('/').at(-1)}
            </span>
          ))}
        </div>
      )}
      <div className="ws-window-path">
        {shown === undefined ? (
          <span className="ws-window-path-empty">{compact ? 'No file open yet' : ''}</span>
        ) : (
          <span className="ws-window-path-segments">
            {compact && <FileIcon path={shown} />}
            {shown.split('/').map((segment, index, all) => (
              // oxlint-disable-next-line react/no-array-index-key -- segments of one path; position is identity.
              <span key={`${segment}-${index}`}>
                {segment}
                {index < all.length - 1 && <span className="ws-window-path-sep">/</span>}
              </span>
            ))}
          </span>
        )}
        {view?.status === 'shown' && view.masked && <span className="ws-window-path-note">values hidden</span>}
        {compact && tabs.length > 0 && (
          <button
            aria-expanded={listOpen}
            className="ws-window-list-toggle"
            onClick={() => setListOpen((open) => !open)}
            type="button"
          >
            Files read · {tabs.length}
            <BiChevronDown aria-hidden size={16} />
          </button>
        )}
      </div>
      {compact && listOpen && (
        <FilesRead active={active} className="ws-window-list" isReading={isScanning} tabs={tabs} />
      )}
      <div aria-hidden className="ws-window-fade" />
      <div
        className="ws-window-body"
        ref={bodyRef}
        style={{ ['--ws-gutter-digits' as string]: digits, ['--ws-code-h' as string]: `${codeHeight}px` }}
      >
        {lines !== undefined ? (
          <div className="ws-code">
            {lines.map((tokens, index) => (
              <div
                className="ws-line"
                data-focus={lit.has(index + 1) ? 'true' : undefined}
                data-line={index + 1}
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
            {/* Room to scroll any line up level with the block beside it. */}
            {focus !== undefined && <div aria-hidden className="ws-window-runway" />}
          </div>
        ) : view?.status === 'not-shown' ? (
          <div className="ws-window-empty">
            <FileIcon path={view.path} size={18} />
            <span>
              <strong>{view.path}</strong> {NOT_SHOWN[view.reason]}
            </span>
          </div>
        ) : shown === undefined ? (
          <div className="ws-window-empty">{emptyState}</div>
        ) : null}
        {showTrail && (
          <FilesRead
            active={active}
            className="ws-window-trail"
            isReading
            style={{ top: codeHeight + 20 }}
            tabs={tabs}
          />
        )}
        <div aria-hidden className="ws-dim" ref={dimRef} />
        <div aria-hidden className="ws-beam" data-state="off" ref={beamRef} />
      </div>
    </div>
  );
}

/** The files read so far, the one being read last: under a short file, and the phone's "Files read" list. */
function FilesRead({
  tabs,
  active,
  className,
  isReading,
  style
}: {
  tabs: readonly string[];
  active: string | undefined;
  className: string;
  isReading: boolean;
  style?: CSSProperties;
}) {
  return (
    <div className={className} style={style}>
      <p className="ws-files-title">Read so far</p>
      <ul className="ws-files">
        {tabs.map((path) => (
          <li data-active={path === active ? 'true' : undefined} key={path}>
            <FileIcon path={path} />
            <span className="ws-files-path">{path}</span>
            {path === active && isReading ? (
              <span className="ws-files-state">reading</span>
            ) : (
              <BiCheck aria-label="read" className="ws-files-done" size={14} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
