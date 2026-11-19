import { useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { BiCheck, BiChevronDown, BiChevronRight, BiFolder } from 'react-icons/bi';
import { FileIcon } from './FileIcon';
import { fitTree, moreLabel, type TreeDirectory, type TreeRow } from './file-tree';
import type { Token } from './syntax';

/** Matches `.ws-tree-row` in `workspace.css`. */
export const TREE_ROW = 24;
/** The room a focused file's lines take under its row: `.ws-tree-excerpt`, two 20 px lines with padding and margin. */
export const EXCERPT_HEIGHT = 3 * TREE_ROW;

/** What the analysis did with a file: reading it now, read it, or (in the reveal) cited it for a resource. */
export type TreeMark = 'reading' | 'read' | 'cited';

/** The lines under the file in focus: the ones that called for the resource being written, as the file has them. */
export type TreeFocus = {
  path: string;
  lines: ReadonlyArray<{ number: number; tokens: readonly Token[]; lit: boolean }>;
};

/**
 * The project as a file tree, in an editor-like window: the scan's left pane.
 *
 * It fits the rows the window has (`fitTree`): at most two files a folder, the files the analysis opened or cited
 * always among them. While the analysis reads, a scanner line sweeps down the tree, the file being read is lit and
 * files read keep a check. In the reveal, the file a resource came from is lit, with the lines that called for it right
 * under its row; the host scrolls those lines level with the block written beside them (through `bodyRef`).
 */
export function TreeWindow({
  title,
  meta,
  tree,
  pinned,
  marks,
  notes,
  focus,
  isScanning,
  reducedMotion,
  emptyState,
  budget: fixedBudget,
  compact = false,
  reserve = EXCERPT_HEIGHT,
  hasRunway = false,
  bodyRef: hostBodyRef
}: {
  /** The window's header: the project's folder name. */
  title: ReactNode;
  /** The header's end: "55 files · Read-only · 0:06". */
  meta?: ReactNode;
  /** Undefined while the file names load. */
  tree: TreeDirectory | undefined;
  /** Files that must be on screen. */
  pinned: ReadonlySet<string>;
  marks: ReadonlyMap<string, TreeMark>;
  /** What a cited file became, at the end of its row: "Next.js site, Postgres database". */
  notes?: ReadonlyMap<string, string>;
  focus?: TreeFocus | undefined;
  isScanning: boolean;
  reducedMotion: boolean;
  /** Shown when the project has no files at all. */
  emptyState: ReactNode;
  /** Rows to fit, instead of as many as the window's height has room for. */
  budget?: number;
  compact?: boolean;
  /**
   * Pixels kept free of rows: for a focused file's lines, and for whatever arrives under the window later, so the tree
   * does not refold when the reveal begins.
   */
  reserve?: number;
  /** Room under the tree, so the host can scroll any file up level with the block it is writing beside it. */
  hasRunway?: boolean;
  bodyRef?: RefObject<HTMLDivElement | null> | undefined;
}) {
  const ownBodyRef = useRef<HTMLDivElement>(null);
  const bodyRef = hostBodyRef ?? ownBodyRef;
  const [bodyHeight, setBodyHeight] = useState(0);
  const measured = Math.floor((bodyHeight - 16 - reserve) / TREE_ROW);
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (fixedBudget !== undefined || body === null) return;
    const measure = () => setBodyHeight(body.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, [bodyRef, fixedBudget]);
  const budget = Math.max(6, fixedBudget === undefined ? measured : fixedBudget - Math.ceil(reserve / TREE_ROW));
  const rows = useMemo(
    () => (tree === undefined || (fixedBudget === undefined && measured <= 0) ? [] : fitTree(tree, { pinned, budget })),
    [tree, pinned, budget, fixedBudget, measured]
  );

  // A file the analysis opens comes into view, if the tree is taller than the window; so does a focused file, unless
  // the host lines it up itself.
  const reading = [...marks].find(([, mark]) => mark === 'reading')?.[0];
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const target = focus === undefined ? (reading === undefined ? undefined : 'reading') : 'focus';
    if (body === null || target === undefined || (target === 'focus' && hostBodyRef !== undefined)) return;
    const row = body.querySelector<HTMLElement>(target === 'reading' ? '[data-mark="reading"]' : '.ws-tree-excerpt');
    if (row === null) return;
    const top = row.offsetTop;
    if (top < body.scrollTop + 8 || top + row.offsetHeight > body.scrollTop + body.clientHeight - 8) {
      body.scrollTo({ top: Math.max(0, top - body.clientHeight * 0.35), behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [reading, focus, rows, bodyRef, hostBodyRef, reducedMotion]);

  const contentHeight = rows.length * TREE_ROW + (focus === undefined ? 0 : EXCERPT_HEIGHT);
  const isEmpty = tree !== undefined && tree.fileCount === 0;

  return (
    <div
      className="ws-window ws-tree-window"
      data-compact={compact ? 'true' : undefined}
      data-focus={focus === undefined ? undefined : 'true'}
    >
      <div className="ws-tree-head">
        <span className="ws-tree-title">
          <BiFolder aria-hidden size={15} />
          <span className="ws-tree-title-text">{title}</span>
        </span>
        {meta !== undefined && <span className="ws-window-meta">{meta}</span>}
      </div>
      <div aria-hidden className="ws-window-fade" />
      <div
        className="ws-window-body ws-tree-body"
        ref={bodyRef}
        style={{
          // Down the rows the window shows, not past its bottom edge.
          ['--ws-sweep-h' as string]: `${Math.max(TREE_ROW, Math.min(contentHeight, bodyHeight - TREE_ROW) - TREE_ROW / 2)}px`,
          // About a tenth of a second a row: a calm pass over a short tree, never a crawl over a long one.
          ['--ws-sweep-ms' as string]: `${Math.min(4800, Math.max(2200, rows.length * 110))}ms`
        }}
      >
        {isEmpty ? (
          <div className="ws-window-empty">{emptyState}</div>
        ) : tree === undefined ? (
          <GhostRows />
        ) : (
          <div className="ws-tree" role="tree" aria-label="Project files">
            {rows.map((row) => (
              <Row
                focus={focus}
                key={row.key}
                mark={row.kind === 'file' ? marks.get(row.path) : undefined}
                note={row.kind === 'file' ? notes?.get(row.path) : undefined}
                row={row}
              />
            ))}
            {hasRunway && <div aria-hidden className="ws-window-runway" />}
          </div>
        )}
        {isScanning && !reducedMotion && rows.length > 0 && <div aria-hidden className="ws-beam ws-tree-beam" />}
      </div>
    </div>
  );
}

function Row({
  row,
  mark,
  note,
  focus
}: {
  row: TreeRow;
  mark: TreeMark | undefined;
  note: string | undefined;
  focus: TreeFocus | undefined;
}) {
  const style = { ['--ws-depth' as string]: row.depth };
  if (row.kind === 'directory') {
    return (
      <div aria-expanded={row.open} className="ws-tree-row" data-kind="directory" role="treeitem" style={style}>
        {row.open ? (
          <BiChevronDown aria-hidden className="ws-tree-chevron" size={14} />
        ) : (
          <BiChevronRight aria-hidden className="ws-tree-chevron" size={14} />
        )}
        <span className="ws-tree-name">{row.label}</span>
        {!row.open && (
          <span className="ws-tree-count">
            {row.fileCount} {row.fileCount === 1 ? 'file' : 'files'}
          </span>
        )}
      </div>
    );
  }
  if (row.kind === 'more') {
    return (
      <div className="ws-tree-row" data-kind="more" role="treeitem" style={style}>
        <span className="ws-tree-more">{moreLabel(row)}</span>
      </div>
    );
  }
  const isFocus = focus?.path === row.path;
  return (
    <>
      <div
        className="ws-tree-row"
        data-focus={isFocus ? 'true' : undefined}
        data-kind="file"
        data-mark={mark}
        data-path={row.path}
        role="treeitem"
        style={style}
        title={row.path}
      >
        <FileIcon path={row.path} />
        <span className="ws-tree-name">{row.name}</span>
        {mark === 'reading' ? (
          <span className="ws-tree-state">
            <span aria-hidden className="ws-pulse" />
            reading
          </span>
        ) : mark === 'read' || mark === 'cited' ? (
          <BiCheck aria-label={mark} className="ws-tree-check" size={15} />
        ) : null}
        {note !== undefined && (
          <span className="ws-tree-note">
            <span aria-hidden>→</span> {note}
          </span>
        )}
      </div>
      {isFocus && focus.lines.length > 0 && (
        <div className="ws-tree-excerpt" style={style}>
          {focus.lines.map((line) => (
            <div className="ws-tree-excerpt-row" data-focus={line.lit ? 'true' : undefined} key={line.number}>
              <span className="ws-tree-excerpt-number">{line.number}</span>
              <span className="ws-tree-excerpt-text">
                {line.tokens.length === 0
                  ? ' '
                  : line.tokens.map((token, index) =>
                      token.kind === 'plain' ? (
                        token.text
                      ) : (
                        // oxlint-disable-next-line react/no-array-index-key -- runs of one line; position is identity.
                        <span className={`ws-tok-${token.kind}`} key={index}>
                          {token.text}
                        </span>
                      )
                    )}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Before the file names arrive (a moment): faint rows where the tree will be. */
function GhostRows() {
  return (
    <div aria-hidden className="ws-tree">
      {[
        [0, 9],
        [1, 14],
        [1, 11],
        [0, 7],
        [1, 16],
        [0, 12],
        [0, 10]
      ].map(([depth, width], index) => (
        <div
          className="ws-tree-row"
          // oxlint-disable-next-line react/no-array-index-key -- a fixed set of placeholder rows.
          key={index}
          style={{ ['--ws-depth' as string]: depth }}
        >
          <span className="ws-ghost-row" style={{ width: `${width}ch`, animationDelay: `${index * 90}ms` }} />
        </div>
      ))}
    </div>
  );
}
