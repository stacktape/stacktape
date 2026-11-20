import type { SettingChange } from '@stacktape/config-inference/compose/resource-settings';
import { Button } from '@stacktape/ui-react/button';
import { ResourceIcon } from '@stacktape/ui-react/resource-icon';
import { Spinner } from '@stacktape/ui-react/spinner';
import { Tabs } from '@stacktape/ui-react/tabs';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BiInfoCircle, BiKey, BiLinkExternal } from 'react-icons/bi';
import { parse as parseYaml } from 'yaml';
import { ActionBar, MonthlyPrice } from '../components/ActionBar';
import { AnimatedPrice } from '../components/AnimatedPrice';
import type { ConfigEditorHandle, EditorLens, EditorProblems } from '../editor/ConfigFileEditor';
import type { FileView, RepositoryTree, Session, WizardState } from '../session';
import { ReviewPane } from '../steps/ReviewStep';
import { filenameFor, monthlySuffix, summarise } from '../steps/review-model';
import { reviewLayout } from '../steps/review-version';
import { FileIcon } from './FileIcon';
import { buildTree, fileCountLabel } from './file-tree';
import {
  allChips,
  citationOf,
  lineRange,
  quoteLabel,
  resourcePrice,
  revealPlan,
  runningPrice,
  storiesOf,
  tellingOrder,
  yamlSegments,
  type Chip,
  type Citation,
  type RevealPlan,
  type ResourceStory
} from './resource-story';
import { EvidenceLine } from './EvidenceLine';
import { scanActivity } from './scan-activity';
import { tokenizeFile, type Token } from './syntax';
import { EXCERPT_HEIGHT, TreeWindow, type TreeFocus, type TreeMark } from './TreeWindow';
import { useMediaQuery } from './use-media-query';
import './workspace.css';

const ConfigFileEditor = lazy(() => import('../editor/ConfigFileEditor'));
// The diagram is shown the moment the reveal ends; start loading it while the analysis runs.
const loadDiagram = () => import('../components/Diagram');

type Resources = Record<string, { type: string; properties: Record<string, unknown> }>;
type Phase = 'scan' | 'reveal' | 'review';

/** The width at which the two panes stack (`.ws` in `workspace.css`). */
const STACKED = '(max-width: 1020px)';
/** Matches the editor's line height (`monaco-setup.ts`). */
const LINE_HEIGHT = 20;
/** The strip of chips the reveal adds under the tree, with the gap above it (`.ws-chips`, `.ws-scan`). */
const CHIPS_HEIGHT = 28 + 14;
/** The phone's reveal fits the tree in this many rows, under the finding and over its YAML. */
const PHONE_REVEAL_ROWS = 12;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
const lineCount = (text: string) => text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

/** The first lines of stacktape.yml, known before anything is found: what the scan shows above the waiting rows. */
const fileHeader = (state: WizardState) =>
  `projectName: ${state.projectName}\n${state.region === undefined ? '' : `region: ${state.region}\n`}resources:\n`;

/**
 * Analyze and Review as one screen, so the page never jumps between them.
 *
 * One head row spans both panes and says what is happening: the file being read, then each finding, then what the
 * app is. While the analysis runs, the left pane shows the project's file tree with a scanner line sweeping down it,
 * the file the agent is reading lit and the files it read checked; the right one is stacktape.yml with its first lines
 * and room for what comes. When the result arrives it is told one resource at a time: the head names the finding, the
 * file it came from lights up in the tree with the lines that called for it right under it, level with its block being
 * typed on the right, and the price counts up. Then the tree gives way to the diagram, the settings rise in under it
 * and the file becomes editable.
 *
 * The reveal plays once, for the page that watched the analysis: a reload lands on Review directly, and so does
 * anyone who prefers reduced motion.
 */
export function Workspace({
  state,
  session,
  startedAt,
  busy,
  isLocked,
  format,
  onFormatChange,
  onSetting,
  onDecision,
  onRegion,
  onConfigText,
  onContinue,
  onRevealing
}: {
  state: WizardState;
  session: Session;
  startedAt: number;
  busy: string | undefined;
  /** Disconnected from the CLI, or a deploy is running: nothing can be changed. */
  isLocked: boolean;
  format: 'yaml' | 'typescript';
  onFormatChange: (format: 'yaml' | 'typescript') => void;
  onSetting: (change: SettingChange) => void;
  onDecision: (id: string, value: string) => void;
  onRegion: (region: string) => void;
  onConfigText: (yaml: string | null) => void;
  onContinue: () => void;
  /** The reveal is playing: the step navigation still says Analyze. */
  onRevealing: (isRevealing: boolean) => void;
}) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const stacked = useMediaQuery(STACKED);
  // Nothing to hover with: a tap on a key opens its docs.
  const isTouch = useMediaQuery('(hover: none), (max-width: 760px)');
  const stackedRef = useRef(stacked);
  stackedRef.current = stacked;

  // ── Phase ───────────────────────────────────────────────────────────────────────────────────────
  const watchedAnalysis = useRef(state.phase === 'analysing');
  if (state.phase === 'analysing') watchedAnalysis.current = true;
  const [revealDone, setRevealDone] = useState(false);
  const plan = useRef<RevealPlan | undefined>(undefined);
  if (state.phase === 'reviewing' && watchedAnalysis.current && plan.current === undefined && !revealDone) {
    plan.current = revealPlan(state);
  }
  const phase: Phase =
    state.phase === 'analysing'
      ? 'scan'
      : watchedAnalysis.current && !revealDone && !reducedMotion && plan.current !== undefined
        ? 'reveal'
        : 'review';
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  /** The review arrived through the reveal, so it enters with motion rather than just being there. */
  const [arrived, setArrived] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    onRevealing(phase === 'reveal');
  }, [phase, onRevealing]);
  useEffect(() => {
    void loadDiagram();
  }, []);

  // ── Files the analysis read ─────────────────────────────────────────────────────────────────────
  const [files, setFiles] = useState<ReadonlyMap<string, FileView>>(() => new Map());
  const requested = useRef(new Set<string>());
  const load = useCallback(
    (path: string) => {
      if (requested.current.has(path)) return;
      requested.current.add(path);
      session
        .readFile(path)
        .catch((): FileView => ({ path, status: 'not-shown', reason: 'missing' }))
        .then((view) => setFiles((current) => new Map(current).set(path, view)));
    },
    [session]
  );
  const opened = useMemo(
    () => [
      ...new Set(
        state.timeline
          .filter((entry) => entry.kind === 'tool' && entry.label.startsWith('read_file '))
          .map((entry) => entry.label.slice('read_file '.length))
      )
    ],
    [state.timeline]
  );
  useEffect(() => {
    for (const step of plan.current?.steps ?? []) if (step.story.evidence) load(step.story.evidence.file);
  }, [phase, load]);

  // ── The project's file tree, while it is read and told ──────────────────────────────────────────
  const [listing, setListing] = useState<RepositoryTree | undefined>(undefined);
  /** Read once, for the scan and the reveal that follows it; a page that opens on Review never draws the tree. */
  const needsTree = useRef(phase !== 'review');
  useEffect(() => {
    if (!needsTree.current) return;
    let isCurrent = true;
    void (async () => {
      // Without the listing the tree still has the files the analysis opened and cited.
      const tree = await session.readTree().catch((): RepositoryTree => ({ files: [], truncated: false }));
      if (isCurrent) setListing(tree);
    })();
    return () => {
      isCurrent = false;
    };
  }, [session]);
  /** The files a resource came from, in telling order: the reveal lights them in the tree. */
  const evidenceFiles = useMemo(
    () =>
      phase === 'scan'
        ? []
        : [
            ...new Set(
              (plan.current?.steps ?? []).flatMap((entry) =>
                entry.story.evidence === undefined || entry.story.designChoice !== undefined
                  ? []
                  : [entry.story.evidence.file]
              )
            )
          ],
    [phase]
  );
  const pinned = useMemo(() => new Set([...opened, ...evidenceFiles]), [opened, evidenceFiles]);
  const tree = useMemo(
    () => (listing === undefined ? undefined : buildTree([...listing.files, ...pinned])),
    [listing, pinned]
  );
  const tokenized = useRef(new Map<string, Token[][]>());
  const tokensOf = (view: Extract<FileView, { status: 'shown' }>): Token[][] => {
    let lines = tokenized.current.get(view.path);
    if (lines === undefined) {
      lines = tokenizeFile(view.text, view.path);
      tokenized.current.set(view.path, lines);
    }
    return lines;
  };

  // ── The file, as the user edits it ──────────────────────────────────────────────────────────────
  const composition = state.composition;
  const generated = composition?.configText;
  const edit = state.configEdit;
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const sendTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const editorText = draft ?? edit?.yaml ?? generated?.yaml;
  const isEdited = edit !== undefined || (draft !== undefined && draft !== generated?.yaml);
  const changeText = (next: string) => {
    // The reveal types into the editor itself; only the user's own typing is an edit.
    if (phaseRef.current !== 'review') return;
    setDraft(next);
    clearTimeout(sendTimer.current);
    sendTimer.current = setTimeout(() => onConfigText(next === generated?.yaml ? null : next), 500);
  };
  const discardEdits = () => {
    if (!window.confirm('Discard your edits and go back to the generated file?')) return;
    clearTimeout(sendTimer.current);
    setDraft(undefined);
    onConfigText(null);
  };
  useEffect(() => () => clearTimeout(sendTimer.current), []);
  useEffect(() => {
    // The server has the same text now; the draft has done its job.
    if (draft !== undefined && (draft === edit?.yaml || (edit === undefined && draft === generated?.yaml))) {
      setDraft(undefined);
    }
  }, [draft, edit, generated?.yaml]);

  // The diagram, lenses and settings follow the edited file when it parses.
  const resources: Resources = useMemo(() => {
    const text = draft ?? edit?.yaml;
    if (text !== undefined) {
      try {
        const parsed = parseYaml(text) as { resources?: unknown } | null;
        if (parsed !== null && typeof parsed === 'object' && typeof parsed.resources === 'object') {
          return (parsed.resources ?? {}) as Resources;
        }
      } catch {
        // Keeps the last good picture while the text does not parse.
      }
    }
    return composition?.resources ?? {};
  }, [draft, edit?.yaml, composition?.resources]);
  const stories = useMemo(() => storiesOf(state, resources), [state, resources]);
  // Every resource's "why" reads its file, so the lines it shows are the file's own, checked.
  useEffect(() => {
    if (phase !== 'review') return;
    for (const story of Object.values(stories)) if (story.evidence !== undefined) load(story.evidence.file);
  }, [phase, stories, load]);
  const citations = useMemo(() => {
    const all: Record<string, Citation> = {};
    for (const [name, story] of Object.entries(stories)) {
      const citation = story.evidence === undefined ? undefined : citationOf(story, files.get(story.evidence.file));
      if (citation !== undefined) all[name] = citation;
    }
    return all;
  }, [stories, files]);
  const filesRef = useRef(files);
  filesRef.current = files;

  // ── The reveal ──────────────────────────────────────────────────────────────────────────────────
  const [editorHandle, setEditorHandle] = useState<ConfigEditorHandle | undefined>(undefined);
  const [step, setStep] = useState(-1);
  const [written, setWritten] = useState(0);
  const [nodeProgress, setNodeProgress] = useState<Record<string, 'pending' | 'ready'> | undefined>(undefined);
  const cancelTyping = useRef<(() => void) | undefined>(undefined);
  const codeBodyRef = useRef<HTMLDivElement>(null);
  /** The YAML being typed for the current step, as the phone's reveal shows it beside its source lines. */
  const [typedBlock, setTypedBlock] = useState('');

  // While the analysis reads, the file already has the lines it will start with.
  const header = fileHeader(state);
  useEffect(() => {
    if (phase !== 'scan' || editorHandle === undefined) return;
    const model = editorHandle.editor.getModel();
    if (model !== null && model.getValue() !== header) model.setValue(header);
    // The waiting rows start where the text does.
    const node = editorHandle.editor.getDomNode()?.closest<HTMLElement>('.ws-editor-body');
    node?.style.setProperty('--ws-content-left', `${editorHandle.editor.getLayoutInfo().contentLeft}px`);
  }, [phase, editorHandle, header]);

  const finishReveal = useCallback(
    (handle: ConfigEditorHandle | undefined, text: string | undefined) => {
      const model = handle?.editor.getModel();
      if (model !== null && model !== undefined && text !== undefined && model.getValue() !== text) {
        model.applyEdits([{ range: model.getFullModelRange(), text }]);
      }
      handle?.clearMarks();
      // The review starts at the top of the file, where its first lens is.
      handle?.editor.setScrollTop(0, 0 as Parameters<ConfigEditorHandle['editor']['setScrollTop']>[1]);
      setWritten(plan.current?.steps.length ?? 0);
      setLeaving(true);
      setArrived(true);
      setRevealDone(true);
      // The diagram's nodes arrive in the order the reveal told them.
      const order = tellingOrder(state.composition?.resources ?? {});
      setNodeProgress(Object.fromEntries(order.map((name) => [name, 'pending' as const])));
      order.forEach((name, index) =>
        setTimeout(
          () => setNodeProgress((current) => (current === undefined ? current : { ...current, [name]: 'ready' })),
          260 + index * 140
        )
      );
      setTimeout(() => setNodeProgress(undefined), 400 + order.length * 140);
      setTimeout(() => setLeaving(false), 520);
    },
    [state.composition?.resources]
  );
  const finishRevealRef = useRef(finishReveal);
  finishRevealRef.current = finishReveal;

  useEffect(() => {
    if (phase !== 'reveal' || editorHandle === undefined || plan.current === undefined) return;
    const current = plan.current;
    const editor = editorHandle.editor;
    const model = editor.getModel();
    if (model === null) return;
    const run = { cancelled: false };
    cancelTyping.current = () => {
      run.cancelled = true;
    };
    // The reveal is a sequence in time: each frame and each step waits for the one before it.
    /* oxlint-disable no-await-in-loop */
    const insert = (at: number, text: string) => {
      const position = model.getPositionAt(at);
      model.applyEdits([
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          },
          text
        }
      ]);
    };
    /**
     * Brings the cited line under its file in the tree and the block's first line on the right to the same height,
     * together: about a third of the way down, higher when the block would not fit under it, and never lower than
     * either can come.
     */
    const align = async (cites: boolean, blockLine: number, blockLines: number) => {
      const body = codeBodyRef.current;
      const editorNode = editor.getDomNode();
      if (stackedRef.current || editorNode === null) return;
      const editorTop = editorNode.getBoundingClientRect().top;
      const height = editor.getLayoutInfo().height;
      const blockAt = editor.getTopForLineNumber(blockLine);
      const lineNode =
        !cites || body === null ? null : body.querySelector<HTMLElement>('.ws-tree-excerpt-row[data-focus]');
      const bodyTop = body?.getBoundingClientRect().top ?? editorTop;
      // Where the line sits in the tree's content, whatever the tree is scrolled to now.
      const lineAt =
        lineNode === null || body === null
          ? undefined
          : lineNode.getBoundingClientRect().top - bodyTop + body.scrollTop;
      const top = Math.max(editorTop, bodyTop) + 12;
      // A block that fits starts where all of it shows; a longer one a few lines down, the rest typed below the fold.
      const room = Math.max(top + 3 * LINE_HEIGHT, editorTop + height - blockLines * LINE_HEIGHT - 16);
      const wanted = Math.max(
        top,
        Math.min(
          editorTop + height * 0.3,
          room,
          editorTop + blockAt,
          lineAt === undefined ? Number.POSITIVE_INFINITY : bodyTop + lineAt
        )
      );
      // Both panes then run on one 20 px line grid through `y`. It is set so a line starts just under their top edge:
      // the line above it shows no letters, rather than half of them pressed against the header.
      const grid = Math.max(editorTop, bodyTop) + 4;
      const snapped = grid + Math.round((wanted - grid) / LINE_HEIGHT) * LINE_HEIGHT;
      const y = snapped < top ? snapped + LINE_HEIGHT : snapped;
      const fromEditor = editor.getScrollTop();
      const toEditor = Math.max(0, blockAt - (y - editorTop));
      const fromCode = body?.scrollTop ?? 0;
      const toCode = lineAt === undefined ? fromCode : Math.max(0, lineAt - (y - bodyTop));
      const started = performance.now();
      const duration = 380;
      for (;;) {
        const now = await nextFrame();
        if (run.cancelled) return;
        const progress = Math.min(1, (now - started) / duration);
        const eased = easeOut(progress);
        editor.setScrollTop(
          fromEditor + (toEditor - fromEditor) * eased,
          1 as Parameters<ConfigEditorHandle['editor']['setScrollTop']>[1]
        );
        if (body !== null) body.scrollTop = fromCode + (toCode - fromCode) * eased;
        if (progress >= 1) return;
      }
    };
    /**
     * Types `text` at `offset` over `duration`, a few characters a frame. A block that ends in a newline gets its own
     * empty line first, so the text below it moves down once and is never pulled onto the line being typed. The view
     * stays where `align` put it, level with the code, so the end of a long block is typed below the fold; on the
     * phone the card shows the block's first lines instead.
     */
    const type = async (
      whole: string,
      offset: number,
      duration: number,
      onLine?: (line: number) => void,
      before?: (firstLine: number) => Promise<void>
    ) => {
      // A skip may have finished the file while this step waited: nothing more goes into it.
      if (run.cancelled) return;
      const text = whole.endsWith('\n') ? whole.slice(0, -1) : whole;
      if (whole.endsWith('\n')) insert(offset, '\n');
      await before?.(model.getPositionAt(offset).lineNumber);
      const started = performance.now();
      let done = 0;
      while (done < text.length && !run.cancelled) {
        const now = await nextFrame();
        if (run.cancelled) return;
        const target = Math.min(text.length, Math.ceil(((now - started) / duration) * text.length));
        if (target <= done) continue;
        insert(offset + done, text.slice(done, target));
        done = target;
        // The line of the last character typed, not the line after a trailing newline (the next block's).
        const line = model.getPositionAt(offset + done - 1).lineNumber;
        onLine?.(line);
        if (stackedRef.current) setTypedBlock(text.slice(0, done));
      }
    };
    void (async () => {
      // The first finding is lined up with its code, so its file is read first (it is local: a moment at most).
      const deadline = performance.now() + 900;
      while (
        performance.now() < deadline &&
        current.steps.some((entry) => entry.story.evidence && !filesRef.current.has(entry.story.evidence.file))
      ) {
        await sleep(40);
      }
      if (run.cancelled) return;
      // The scan already wrote the file's first lines; the reveal starts from them when they match.
      if (model.getValue() !== current.header) {
        if (model.getValueLength() > 0) model.applyEdits([{ range: model.getFullModelRange(), text: '' }]);
        await sleep(350);
        await type(current.header, 0, 420);
      }
      const typed: number[] = [];
      for (const [index, entry] of current.steps.entries()) {
        if (run.cancelled) return;
        setStep(index);
        setTypedBlock('');
        // The left window opens the cited file before anything is lined up with it.
        await nextFrame();
        await nextFrame();
        if (run.cancelled) return;
        const block = current.blocks[entry.blockIndex]!;
        // The block goes where it sits in the file: after the header and the blocks above it typed so far.
        const offset = current.blocks.reduce(
          (sum, text, blockIndex) =>
            sum + (blockIndex < entry.blockIndex && typed.includes(blockIndex) ? text.length : 0),
          current.header.length
        );
        const firstLine = model.getPositionAt(offset).lineNumber;
        await type(
          block,
          offset,
          Math.max(420, entry.durationMs - 560),
          (line) => editorHandle.markWriting(firstLine, Math.max(firstLine, line)),
          async (line) => {
            editorHandle.markWriting(line, line);
            const cites = entry.story.evidence !== undefined && entry.story.designChoice === undefined;
            await align(cites, line, lineCount(block));
          }
        );
        if (run.cancelled) return;
        editorHandle.markWriting(firstLine, firstLine + lineCount(block) - 1);
        editorHandle.markWritten();
        typed.push(entry.blockIndex);
        setWritten(index + 1);
        await sleep(420);
      }
      if (run.cancelled) return;
      await type(current.trailer, model.getValueLength(), 300);
      if (run.cancelled) return;
      await sleep(500);
      if (!run.cancelled) finishRevealRef.current(editorHandle, current.text);
    })();
    /* oxlint-enable no-await-in-loop */
    return () => {
      run.cancelled = true;
      cancelTyping.current = undefined;
    };
    // The reveal plays once: a new state while it plays (the price arriving) must not start it over.
  }, [phase, editorHandle]);

  const editorHandleRef = useRef(editorHandle);
  editorHandleRef.current = editorHandle;
  const skipReveal = useCallback(() => {
    if (phaseRef.current !== 'reveal') return;
    cancelTyping.current?.();
    finishRevealRef.current(editorHandleRef.current, plan.current?.text);
  }, []);
  // An editor that has not loaded after a few seconds does not hold the review back.
  useEffect(() => {
    if (phase !== 'reveal' || editorHandle !== undefined) return;
    const timer = setTimeout(skipReveal, 4000);
    return () => clearTimeout(timer);
  }, [phase, editorHandle, skipReveal]);

  // Esc skips the reveal, like the "Skip to review" button.
  useEffect(() => {
    if (phase !== 'reveal') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') skipReveal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, skipReveal]);

  // ── Review: selection, lenses, the evidence peek ─────────────────────────────────────────────────
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [peek, setPeek] = useState<string | undefined>(undefined);
  /** Stacked screens show the picture or the file, one at a time. */
  const [stackedView, setStackedView] = useState<'architecture' | 'file'>('architecture');
  const segments = useMemo(() => (editorText === undefined ? undefined : yamlSegments(editorText)), [editorText]);
  const blockLines = useMemo(() => {
    const lines: Record<string, { from: number; to: number }> = {};
    if (segments === undefined) return lines;
    let line = lineCount(segments.header) + 1;
    for (const block of segments.blocks) {
      const count = lineCount(block.text);
      lines[block.name] = { from: line, to: line + count - 1 };
      line += count;
    }
    return lines;
  }, [segments]);
  const select = useCallback(
    (name: string) => setSelected((current) => (current === name || resources[name] === undefined ? undefined : name)),
    [resources]
  );
  /** Bumped to bring the picked block into view again, after the user scrolled away from it. */
  const [revealCount, setRevealCount] = useState(0);
  const showInFile = useCallback((name: string) => {
    setSelected(name);
    setRevealCount((count) => count + 1);
    if (stackedRef.current) setStackedView('file');
  }, []);
  const lenses = useMemo((): EditorLens[] => {
    if (phase !== 'review') return [];
    const all: EditorLens[] = [];
    for (const [name, lines] of Object.entries(blockLines)) {
      const story = stories[name];
      if (story === undefined) continue;
      const head = `${story.plainName}${story.priceLabel === undefined ? '' : ` · ${story.priceLabel}`}`;
      all.push({ line: lines.from, title: head, onClick: () => select(name) });
      const evidence = story.designChoice === undefined ? story.evidence : undefined;
      if (evidence !== undefined) {
        all.push({
          line: lines.from,
          title: `why: ${evidence.file}:${lineRange(citations[name], evidence)}`,
          onClick: () => {
            setPeek((current) => (current === name ? undefined : name));
            load(evidence.file);
          }
        });
      }
    }
    return all;
  }, [phase, blockLines, stories, citations, select, load]);
  const peekStory = peek === undefined ? undefined : stories[peek];
  const peekLines = peek === undefined ? undefined : blockLines[peek];

  // ── Layout ──────────────────────────────────────────────────────────────────────────────────────
  // The tree keeps the last finding's light while it fades out, so it never jumps to another file on the way.
  const plannedStep = phase === 'scan' ? undefined : plan.current?.steps[step];
  const agent = state.agents?.find((option) => option.id === state.choice?.agentId);
  const usesAgent = agent !== undefined && agent.id !== 'none';
  const lastTool = state.timeline.findLast((entry) => entry.kind === 'tool');
  // The file the agent is reading this moment: the last thing it did was open it.
  const liveFile =
    phase === 'scan' && lastTool?.label.startsWith('read_file ') === true
      ? lastTool.label.slice('read_file '.length)
      : undefined;
  const focusedStory = plannedStep?.story;
  const focusedCitation = focusedStory === undefined ? undefined : citations[focusedStory.name];
  // A resource Stacktape adds for another points at no code of its own: the last highlight goes out.
  const focusedEvidence = focusedStory?.designChoice === undefined ? focusedStory?.evidence : undefined;
  const focusedView = focusedEvidence === undefined ? undefined : files.get(focusedEvidence.file);
  /** The one or two lines under the file in the tree: the ones that called for the resource, as the file has them. */
  const treeFocus = useMemo((): TreeFocus | undefined => {
    if (focusedEvidence === undefined) return undefined;
    if (focusedView?.status !== 'shown') {
      // Not readable (too large, binary): the cited quote on its line number, as the analysis recorded it.
      return focusedView === undefined
        ? { path: focusedEvidence.file, lines: [] }
        : {
            path: focusedEvidence.file,
            lines: [
              {
                number: focusedEvidence.line,
                tokens: [{ text: quoteLabel(focusedEvidence.quote), kind: 'plain' }],
                lit: true
              }
            ]
          };
    }
    const tokens = tokensOf(focusedView);
    const numbers = (focusedCitation?.lines ?? [focusedEvidence.line]).slice(0, 2);
    const shown = numbers.map((number) => tokens[number - 1] ?? []);
    // The lines start right after their numbers: the indentation they share is the file's, not the finding's.
    const indent = Math.min(
      ...shown.map((line) => /^[ \t]*/.exec(line.map((token) => token.text).join(''))![0].length)
    );
    return {
      path: focusedEvidence.file,
      lines: numbers.map((number, index) => ({ number, tokens: dropLeading(shown[index]!, indent), lit: true }))
    };
    // `tokensOf` reads a cache keyed by the file; the view and citation are what change the lines.
  }, [focusedEvidence, focusedView, focusedCitation]);
  const marks = useMemo(() => {
    const all = new Map<string, TreeMark>();
    for (const path of opened) all.set(path, 'read');
    for (const entry of (plan.current?.steps ?? []).slice(0, phase === 'scan' ? 0 : step + 1)) {
      if (entry.story.evidence !== undefined && entry.story.designChoice === undefined) {
        all.set(entry.story.evidence.file, 'cited');
      }
    }
    if (liveFile !== undefined) all.set(liveFile, 'reading');
    return all;
  }, [opened, phase, step, liveFile]);
  /** What each file cited so far became, in telling order: "Next.js site, Postgres database". */
  const notes = useMemo(() => {
    const all = new Map<string, string[]>();
    for (const entry of (plan.current?.steps ?? []).slice(0, phase === 'scan' ? 0 : step + 1)) {
      const evidence = entry.story.designChoice === undefined ? entry.story.evidence : undefined;
      if (evidence !== undefined) all.set(evidence.file, [...(all.get(evidence.file) ?? []), entry.story.plainName]);
    }
    return new Map([...all].map(([path, names]) => [path, names.join(', ')]));
  }, [phase, step]);
  const phoneRevealPinned = useMemo(() => new Set(evidenceFiles), [evidenceFiles]);
  const treeTitle = state.repositoryPath?.split(/[/\\]/).findLast((segment) => segment !== '') ?? state.projectName;
  const treeCount =
    listing === undefined || listing.files.length === 0
      ? undefined
      : fileCountLabel(listing.files.length, listing.truncated);
  const chips = phase === 'scan' ? [] : allChips(plan.current).slice(0, chipCount(plan.current, step));
  const filename = filenameFor(isEdited ? 'yaml' : format, state.existingConfig !== undefined);
  const parseError = draft === undefined ? edit?.error : undefined;
  const [problems, setProblems] = useState<EditorProblems>({ count: 0 });
  const showTypeScript = phase === 'review' && format === 'typescript' && !isEdited;
  // One beat per resource: when its block is written, its own price shows beside it and the estimate takes it in. The
  // last one brings the estimate's own total, the number Review's bar shows.
  const wholePrice = state.composition?.price?.monthly;
  const price = useMemo(() => {
    const steps = plan.current?.steps ?? [];
    const sofar = steps.slice(0, written).map((entry) => stories[entry.story.name] ?? entry.story);
    return runningPrice(sofar, written >= steps.length && steps.length > 0 ? wholePrice : undefined);
  }, [written, stories, wholePrice]);
  const focusedPriced = phase === 'reveal' && written > step;
  const filesRead = new Set(opened).size;
  // What happened before this screen: the project was analyzed, by an agent or by Stacktape's own scan.
  const receipt = !usesAgent
    ? 'Analyzed without AI'
    : `Analyzed by ${agent.label}${filesRead > 0 ? ` · ${filesRead} ${filesRead === 1 ? 'file' : 'files'} read` : ''}`;
  const barNote = parseError !== undefined ? 'Fix the YAML to continue.' : `Saves ${filename}`;
  const showFile = !stacked || phase !== 'review' || stackedView === 'file';
  const showLeft = !stacked || phase !== 'review' || stackedView === 'architecture';

  const emptyState = <EmptyCode line="The folder is empty, or everything in it is ignored." title="No files to show" />;

  return (
    <>
      <div
        className="ws"
        data-arrived={arrived ? 'true' : undefined}
        data-phase={phase}
        data-reduced-motion={reducedMotion ? 'true' : undefined}
        data-reveal-steps={plan.current?.steps.length}
        data-reveal-written={phase === 'reveal' ? written : undefined}
        // The half second in which the code window gives way and the bar slides up: the page makes room for it slowly.
        data-settling={leaving ? 'true' : undefined}
        data-stacked={stacked ? 'true' : undefined}
        data-review-layout={phase === 'review' ? reviewLayout(window.location.search) : undefined}
      >
        <header className="ws-head" data-phase={phase}>
          {phase === 'scan' ? (
            <>
              <h1 className="ws-title">Reading {state.projectName}</h1>
              <ScanStatus agentLabel={usesAgent ? agent.label : undefined} lastTool={lastTool?.label} />
            </>
          ) : phase === 'reveal' ? (
            <>
              <h1 className="ws-title">Writing stacktape.yml</h1>
              <button className="ws-skip" onClick={skipReveal} type="button">
                Skip to review <kbd>Esc</kbd>
              </button>
              {focusedStory !== undefined && (
                <Finding
                  citation={focusedCitation}
                  isPriced={focusedPriced}
                  key={focusedStory.name}
                  story={stories[focusedStory.name] ?? focusedStory}
                />
              )}
            </>
          ) : (
            <>
              <h1 className="ws-title">{state.projectName} on AWS</h1>
              <p className="ws-head-line ws-summary" title={summarise(state, { external: false })}>
                {summarise(state, { external: false })}
              </p>
              <p className="ws-head-side ws-receipt">{receipt}</p>
            </>
          )}
        </header>

        {stacked && phase === 'review' && (
          <Tabs
            appearance="segmented"
            ariaLabel="Show"
            className="ws-switch"
            onValueChange={(value) => setStackedView(value as 'architecture' | 'file')}
            tabs={[
              { value: 'architecture', label: 'Architecture' },
              { value: 'file', label: filename }
            ]}
            value={stackedView}
            width="fill"
          />
        )}

        <div className="ws-left" hidden={!showLeft}>
          {(phase !== 'review' || leaving) && (
            <div className="ws-scan" data-leaving={phase === 'review' ? 'true' : undefined}>
              {stacked && phase === 'reveal' && focusedStory !== undefined ? (
                <PhoneFinding
                  citation={focusedCitation}
                  isPriced={focusedPriced}
                  story={stories[focusedStory.name] ?? focusedStory}
                  tree={
                    <TreeWindow
                      budget={PHONE_REVEAL_ROWS}
                      compact
                      emptyState={emptyState}
                      focus={treeFocus}
                      isScanning={false}
                      marks={marks}
                      // Only the files resources came from: the phone's tree is short.
                      pinned={phoneRevealPinned}
                      reducedMotion={reducedMotion}
                      title={treeTitle}
                      tree={tree}
                    />
                  }
                  typed={typedBlock}
                />
              ) : (
                <TreeWindow
                  bodyRef={stacked ? undefined : codeBodyRef}
                  compact={stacked}
                  emptyState={emptyState}
                  focus={phase === 'reveal' ? treeFocus : undefined}
                  hasRunway={phase === 'reveal' && !stacked}
                  isScanning={phase === 'scan'}
                  marks={marks}
                  notes={notes}
                  meta={
                    phase === 'scan' ? (
                      <>
                        {treeCount !== undefined && (
                          <>
                            {treeCount}
                            <span aria-hidden className="ws-window-meta-sep">
                              ·
                            </span>
                          </>
                        )}
                        <ScanMeta startedAt={startedAt} />
                      </>
                    ) : (
                      treeCount
                    )
                  }
                  pinned={pinned}
                  reducedMotion={reducedMotion}
                  // The phone's scan tree is never focused: the reveal shows its own, under the finding. On a desktop the
                  // tree keeps its rows when the reveal adds the chips under it.
                  reserve={stacked ? 0 : EXCERPT_HEIGHT + (phase === 'scan' ? CHIPS_HEIGHT : 0)}
                  title={treeTitle}
                  tree={tree}
                />
              )}
              {phase !== 'scan' && <Chips chips={chips} />}
            </div>
          )}
          {phase === 'review' && (
            <ReviewPane
              busy={busy}
              citations={citations}
              isEdited={isEdited}
              isLocked={isLocked}
              isTyping={draft !== undefined && draft !== (edit?.yaml ?? generated?.yaml)}
              onDecision={onDecision}
              onRegion={onRegion}
              onSetting={onSetting}
              onSelect={select}
              onShowInFile={showInFile}
              progress={nodeProgress}
              resources={resources}
              selected={selected}
              state={state}
              stories={stories}
            />
          )}
        </div>

        <section
          aria-label={filename}
          className="ws-panel ws-editor"
          data-collapsed={stacked && phase !== 'review' ? 'true' : undefined}
          hidden={!showFile}
          id="config-file"
        >
          <header className="ws-editor-head">
            <span className="ws-editor-file">
              <FileIcon path={filename} />
              {filename}
            </span>
            {phase === 'review' && isEdited && <span className="ws-badge">Edited</span>}
            <span className="ws-editor-head-end">
              {phase === 'scan' && stacked ? (
                <span className="ws-editor-wait">
                  <span aria-hidden className="ws-pulse" />
                  Waiting for findings
                </span>
              ) : phase !== 'review' ? (
                phase === 'reveal' && (
                  <span
                    className="ws-editor-estimate"
                    title="What the file written so far costs per month, at AWS list prices"
                  >
                    {price.text === 'estimating…' ? (
                      <span className="ws-editor-estimate-label">Estimating…</span>
                    ) : (
                      <>
                        <span className="ws-editor-estimate-label">Estimate so far</span>
                        <AnimatedPrice className="ws-editor-price" countFromZero duration={0} text={price.text} />
                      </>
                    )}
                  </span>
                )
              ) : (
                <Tabs
                  appearance="segmented"
                  ariaLabel="File format"
                  onValueChange={onFormatChange}
                  size="small"
                  tabs={[
                    { value: 'yaml', label: 'YAML' },
                    {
                      value: 'typescript',
                      label: 'TypeScript',
                      disabled: isEdited,
                      ...(isEdited ? { title: 'Your edits are YAML. Discard them to save TypeScript.' } : {})
                    }
                  ]}
                  value={isEdited ? 'yaml' : format}
                  width="fit"
                />
              )}
            </span>
          </header>
          <p className="ws-editor-hint" key={phase === 'review' ? 'review' : 'writing'}>
            {phase === 'scan' ? (
              'Written from what the analysis finds'
            ) : phase === 'reveal' ? (
              'Read-only while it is written'
            ) : showTypeScript ? (
              'Saved as stacktape.ts. Switch to YAML to edit it here.'
            ) : (
              <>
                Edit freely <span aria-hidden>·</span>{' '}
                <button
                  className="ws-docs-button"
                  disabled={editorHandle === undefined}
                  onClick={() =>
                    editorHandle?.showDocs(
                      (selected === undefined ? undefined : blockLines[selected]?.from) ??
                        Object.values(blockLines)[0]?.from
                    )
                  }
                  title="Shows what the key on the cursor's line does"
                  type="button"
                >
                  <BiInfoCircle aria-hidden size={13} />
                  Docs
                </button>{' '}
                {isTouch ? (
                  'or tap a key'
                ) : (
                  <>
                    or hover a key <span aria-hidden>·</span>{' '}
                    <span className="ws-editor-hint-keys">
                      <kbd>Ctrl</kbd> <kbd>Space</kbd> for suggestions
                    </span>
                  </>
                )}
              </>
            )}
          </p>
          <div className="ws-editor-body">
            {phase === 'scan' && !stacked && <Waiting lines={lineCount(header)} />}
            <Suspense fallback={<EditorLoading />}>
              {showTypeScript ? (
                generated?.typescript === undefined ? (
                  <EditorLoading text="Formatting…" />
                ) : (
                  <ConfigFileEditor
                    key="typescript"
                    language="typescript"
                    onChange={() => {}}
                    onProblems={() => {}}
                    readOnly
                    readOnlyMessage="TypeScript is read-only here. Switch to YAML to edit."
                    value={generated.typescript}
                  />
                )
              ) : (
                <ConfigFileEditor
                  highlight={
                    selected === undefined || blockLines[selected] === undefined
                      ? undefined
                      : { ...blockLines[selected], reveal: revealCount }
                  }
                  docsOnTap={isTouch}
                  key="yaml"
                  language="yaml"
                  lenses={lenses}
                  onChange={changeText}
                  onProblems={setProblems}
                  onReady={setEditorHandle}
                  peek={
                    peekStory?.evidence === undefined || peekLines === undefined
                      ? undefined
                      : {
                          afterLine: peekLines.from,
                          height: 166,
                          content: (
                            <EvidencePeek
                              citation={citations[peekStory.name]}
                              file={files.get(peekStory.evidence.file)}
                              onClose={() => setPeek(undefined)}
                              story={peekStory}
                            />
                          )
                        }
                  }
                  readOnly={phase !== 'review' || isLocked}
                  readOnlyMessage={
                    phase === 'review'
                      ? 'Not editable while stacktape init is disconnected or deploying.'
                      : 'Editable in a moment, once it is written.'
                  }
                  // The reveal lines a block up with its code, which can need the last lines higher than the bottom.
                  scrollBeyondLastLine={phase === 'reveal'}
                  value={phase === 'review' ? (editorText ?? '') : undefined}
                />
              )}
            </Suspense>
          </div>
          {phase === 'review' && (parseError !== undefined || isEdited || problems.count > 0) && (
            <footer className="ws-editor-status" data-tone={parseError !== undefined ? 'error' : undefined}>
              <span>
                {parseError !== undefined
                  ? `This YAML does not parse: ${parseError}`
                  : isEdited
                    ? 'Edited by hand. This text is what gets saved and deployed.'
                    : ''}
                {parseError === undefined && problems.count > 0 && (
                  <strong className="ws-editor-warning">
                    {isEdited ? ' ' : ''}
                    {problems.count === 1 ? '1 schema warning' : `${problems.count} schema warnings`}
                    {problems.first === undefined ? '' : ` (line ${problems.first.line})`}
                  </strong>
                )}
              </span>
              {isEdited && (
                <button className="ws-textbutton" onClick={discardEdits} type="button">
                  Discard my edits
                </button>
              )}
            </footer>
          )}
        </section>
        {/* A phone's bar has room for the price and the button only: what the click does is said above it. */}
        {phase === 'review' && stacked && <p className="ws-save-note">{barNote}</p>}
      </div>

      {phase === 'review' && (
        <div className="ws-bar-slot" data-arrived={arrived ? 'true' : undefined}>
          <ActionBar note={barNote} price={<MonthlyPrice state={state} suffix={monthlySuffix} />}>
            <Button
              disabled={isLocked || parseError !== undefined || busy !== undefined}
              isLoading={busy === 'write'}
              onClick={onContinue}
              variant="primary"
            >
              Continue to deploy
            </Button>
          </ActionBar>
        </div>
      )}
    </>
  );
}

/** A line's tokens without its first `count` characters. */
const dropLeading = (tokens: readonly Token[], count: number): Token[] => {
  let left = count;
  return tokens.flatMap((token) => {
    if (left <= 0) return [token];
    const cut = Math.min(left, token.text.length);
    left -= cut;
    return cut === token.text.length ? [] : [{ ...token, text: token.text.slice(cut) }];
  });
};

/** How many chips the reveal shows at `step`: every chip of the steps told so far. */
const chipCount = (plan: RevealPlan | undefined, step: number): number =>
  plan?.steps.slice(0, step + 1).reduce((sum, entry) => sum + entry.chips.length, 0) ?? 0;

/** "Read-only · 0:06": what the analysis may do, and how long it has been at it. */
function ScanMeta({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(() => Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.max(0, Math.round((Date.now() - startedAt) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return (
    <>
      {/* A phone's header has room for the count and the time only. */}
      <span className="ws-meta-wide">
        Read-only <span aria-hidden>·</span>
      </span>{' '}
      <span className="ws-elapsed">
        {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
      </span>
    </>
  );
}

function ScanStatus({ agentLabel, lastTool }: { agentLabel: string | undefined; lastTool: string | undefined }) {
  const activity = lastTool === undefined ? undefined : scanActivity(lastTool);
  return (
    <>
      <p aria-live="polite" className="ws-head-line ws-status">
        <span aria-hidden className="ws-pulse" />
        <span className="ws-status-text">
          {agentLabel === undefined ? (
            'Stacktape is reading manifests and config files, without AI'
          ) : activity === undefined ? (
            `${agentLabel} is starting`
          ) : (
            <>
              {agentLabel} {activity.text}
              {activity.subject !== undefined && (
                <>
                  {' '}
                  <code>{activity.subject}</code>
                </>
              )}
            </>
          )}
        </span>
      </p>
    </>
  );
}

/**
 * The finding the reveal is on, across both panes: the line of code on the left, what it became on the right, with
 * its own price ("$31/mo for this database") once the block is written, in the same beat as the estimate takes it. A
 * resource Stacktape adds for another says so instead of quoting code.
 */
function Finding({
  story,
  citation,
  isPriced
}: {
  story: ResourceStory;
  citation: Citation | undefined;
  isPriced: boolean;
}) {
  const ownPrice = resourcePrice(story);
  return (
    <div className="ws-finding" data-design-choice={story.designChoice === undefined ? undefined : 'true'}>
      <p className="ws-finding-from">
        <EvidenceLine citation={citation} story={story} />
        <span aria-hidden className="ws-finding-leader" />
      </p>
      <p className="ws-finding-to">
        <ResourceIcon resourceType={story.type} size={16} />
        <strong>{story.plainName}</strong>
        {ownPrice !== undefined && (
          <span className="ws-finding-price" data-shown={isPriced ? 'true' : undefined}>
            {ownPrice}
          </span>
        )}
      </p>
    </div>
  );
}

/**
 * The phone's reveal: the finding, the file it came from in the project's tree with its lines under it, and the YAML
 * it became, in one column, where the desktop has two panes side by side.
 */
function PhoneFinding({
  story,
  citation,
  tree,
  typed,
  isPriced
}: {
  story: ResourceStory;
  citation: Citation | undefined;
  tree: ReactNode;
  typed: string;
  isPriced: boolean;
}) {
  const ownPrice = resourcePrice(story);
  const yaml = typed.split('\n').slice(0, 5);
  return (
    <div className="ws-phone-finding" key={story.name}>
      <div className="ws-phone-finding-text">
        <p className="ws-phone-finding-head">
          <ResourceIcon resourceType={story.type} size={16} />
          <strong>{story.plainName}</strong>
          {/* What the block below costs, once it is written: the estimate in the file's header takes it in. */}
          {ownPrice !== undefined && (
            <span className="ws-phone-finding-price" data-shown={isPriced ? 'true' : undefined}>
              {ownPrice}
            </span>
          )}
        </p>
        <p className="ws-phone-finding-why">
          <EvidenceLine citation={citation} story={story} />
        </p>
      </div>
      {tree}
      <p className="ws-phone-finding-arrow">
        <span aria-hidden>↓</span> stacktape.yml
        <span className="ws-tag">Preview</span>
      </p>
      <div className="ws-excerpt" data-kind="yaml">
        {(yaml.length === 0 || yaml[0] === '' ? ['  '] : yaml).map((text, index) => (
          // oxlint-disable-next-line react/no-array-index-key -- consecutive lines being typed; position is identity.
          <div className="ws-excerpt-row" data-focus="true" key={index}>
            <span className="ws-excerpt-text">{text || ' '}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Before the first finding: the file's first lines are there, and faint rows hold the place of what comes. */
function Waiting({ lines }: { lines: number }) {
  return (
    <div aria-hidden className="ws-waiting" style={{ top: 12 + lines * LINE_HEIGHT }}>
      <p className="ws-waiting-label">
        <span className="ws-pulse" />
        Waiting for the first finding
      </p>
      {[
        [2, 14],
        [4, 22],
        [4, 12],
        [6, 26],
        [6, 18],
        [4, 16],
        [6, 30]
      ].map(([indent, width], index) => (
        <span
          className="ws-ghost-row"
          // oxlint-disable-next-line react/no-array-index-key -- a fixed set of placeholder rows.
          key={index}
          style={{ marginLeft: `${indent}ch`, width: `${width}ch`, animationDelay: `${index * 90}ms` }}
        />
      ))}
    </div>
  );
}

function EmptyCode({ title, line }: { title: string; line: string }) {
  return (
    <div className="ws-empty-code">
      <span aria-hidden className="ws-empty-code-mark">
        <Spinner />
      </span>
      <strong>{title}</strong>
      <span>{line}</span>
    </div>
  );
}

function Chips({ chips }: { chips: readonly Chip[] }) {
  return (
    <ul aria-label="Found so far" className="ws-chips">
      {chips.map((chip) => (
        <li className="ws-chip" data-kind={chip.kind} key={chip.id}>
          {chip.kind === 'resource' && chip.type !== undefined ? (
            <ResourceIcon resourceType={chip.type} size={14} />
          ) : chip.kind === 'secrets' ? (
            <BiKey aria-hidden size={14} />
          ) : (
            <BiLinkExternal aria-hidden size={13} />
          )}
          {chip.label}
        </li>
      ))}
    </ul>
  );
}

/** The inline "why": the lines around the evidence in the real file, the cited ones lit. */
function EvidencePeek({
  story,
  citation,
  file,
  onClose
}: {
  story: ResourceStory;
  citation: Citation | undefined;
  file: FileView | undefined;
  onClose: () => void;
}) {
  const evidence = story.evidence!;
  const line = citation?.line ?? evidence.line;
  const lit = new Set(citation?.lines ?? [line]);
  const lines = file?.status === 'shown' ? file.text.split('\n') : undefined;
  const from = Math.max(1, (citation?.lines[0] ?? line) - 2);
  const shown = lines?.slice(from - 1, from + 4) ?? [];
  return (
    <div className="ws-peek">
      <div className="ws-peek-head">
        <span className="ws-peek-title">
          <FileIcon path={evidence.file} />
          {evidence.file}
          <span className="ws-peek-line">line {line}</span>
        </span>
        <button aria-label="Close" className="ws-peek-close" onClick={onClose} type="button">
          ×
        </button>
      </div>
      {lines === undefined ? (
        <p className="ws-peek-quote">
          <code>{evidence.quote}</code>
        </p>
      ) : (
        <div className="ws-peek-code">
          {shown.map((text, index) => (
            <div
              className="ws-peek-row"
              data-focus={lit.has(from + index) ? 'true' : undefined}
              // oxlint-disable-next-line react/no-array-index-key -- consecutive lines of one file; the number is identity.
              key={from + index}
            >
              <span className="ws-peek-number">{from + index}</span>
              <span className="ws-peek-text">{text || ' '}</span>
            </div>
          ))}
        </div>
      )}
      {(story.designChoice ?? story.reason) !== undefined && (
        <p className="ws-peek-reason">{story.designChoice ?? story.reason}</p>
      )}
    </div>
  );
}

function EditorLoading({ text = 'Loading the editor…' }: { text?: ReactNode }) {
  return (
    <div className="ws-editor-loading">
      <Spinner /> {text}
    </div>
  );
}
