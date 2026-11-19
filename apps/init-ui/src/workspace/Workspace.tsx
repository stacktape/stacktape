import type { DeploymentPreferenceChange } from '@stacktape/config-inference/compose/preferences';
import { Button } from '@stacktape/ui-react/button';
import { ResourceIcon } from '@stacktape/ui-react/resource-icon';
import { Spinner } from '@stacktape/ui-react/spinner';
import { Tabs } from '@stacktape/ui-react/tabs';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BiKey, BiLinkExternal } from 'react-icons/bi';
import { parse as parseYaml } from 'yaml';
import { ActionBar, MonthlyPrice } from '../components/ActionBar';
import { AnimatedPrice } from '../components/AnimatedPrice';
import type { ConfigEditorHandle, EditorLens, EditorProblems } from '../editor/ConfigFileEditor';
import type { FileView, Session, WizardState } from '../session';
import { ReviewPane } from '../steps/ReviewStep';
import { filenameFor, summarise } from '../steps/review-model';
import { CodeWindow, LINE_HEIGHT } from './CodeWindow';
import { FileIcon } from './FileIcon';
import {
  allChips,
  citationOf,
  quoteLabel,
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
import { scanActivity } from './scan-activity';
import './workspace.css';

const ConfigFileEditor = lazy(() => import('../editor/ConfigFileEditor'));
// The diagram is shown the moment the reveal ends; start loading it while the analysis runs.
const loadDiagram = () => import('../components/Diagram');

type Resources = Record<string, { type: string; properties: Record<string, unknown> }>;
type Phase = 'scan' | 'reveal' | 'review';

/** Whether a media query matches now, following changes. */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches === true);
  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (list === undefined) return;
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
};

/** The width at which the two panes stack (`.ws` in `workspace.css`). */
const STACKED = '(max-width: 1020px)';

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
 * app is. While the analysis runs, the left pane shows the code being read (a scanner line sweeping each file the agent
 * opens) and the right one is stacktape.yml with its first lines and room for what comes. When the result arrives it
 * is told one resource at a time: the head names the finding, the lines of code that called for it light up on the
 * left, level with its block being typed on the right, and the price counts up. Then the code window gives way to the
 * diagram, the settings rise in under it and the file becomes editable.
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
  onPreference,
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
  onPreference: (change: DeploymentPreferenceChange) => void;
  onDecision: (id: string, value: string) => void;
  onRegion: (region: string) => void;
  onConfigText: (yaml: string | null) => void;
  onContinue: () => void;
  /** The reveal is playing: the step navigation still says Analyze. */
  onRevealing: (isRevealing: boolean) => void;
}) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const stacked = useMediaQuery(STACKED);
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
    for (const path of opened) load(path);
  }, [opened, load]);
  useEffect(() => {
    for (const step of plan.current?.steps ?? []) if (step.story.evidence) load(step.story.evidence.file);
  }, [phase, load]);

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
  const citationsRef = useRef(citations);
  citationsRef.current = citations;
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
     * Brings the cited line on the left and the block's first line on the right to the same height, together: about a
     * third of the way down, higher when the block would not fit under it, and never lower than either can come.
     */
    const align = async (citedLine: number | undefined, blockLine: number, blockLines: number) => {
      const body = codeBodyRef.current;
      const editorNode = editor.getDomNode();
      if (stackedRef.current || editorNode === null) return;
      const editorTop = editorNode.getBoundingClientRect().top;
      const height = editor.getLayoutInfo().height;
      const blockAt = editor.getTopForLineNumber(blockLine);
      const lineNode =
        citedLine === undefined || body === null ? null : body.querySelector<HTMLElement>(`[data-line="${citedLine}"]`);
      const bodyTop = body?.getBoundingClientRect().top ?? editorTop;
      const top = Math.max(editorTop, bodyTop) + 12;
      // A block that fits starts where all of it shows; a longer one a few lines down, the rest typed below the fold.
      const room = Math.max(top + 3 * LINE_HEIGHT, editorTop + height - blockLines * LINE_HEIGHT - 16);
      const y = Math.max(
        top,
        Math.min(
          editorTop + height * 0.3,
          room,
          editorTop + blockAt,
          lineNode === null ? Number.POSITIVE_INFINITY : bodyTop + lineNode.offsetTop
        )
      );
      const fromEditor = editor.getScrollTop();
      const toEditor = Math.max(0, blockAt - (y - editorTop));
      const fromCode = body?.scrollTop ?? 0;
      const toCode = lineNode === null || body === null ? fromCode : Math.max(0, lineNode.offsetTop - (y - bodyTop));
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
        const citedLine = citationsRef.current[entry.story.name]?.lines[0] ?? entry.story.evidence?.line;
        await type(
          block,
          offset,
          Math.max(420, entry.durationMs - 560),
          (line) => editorHandle.markWriting(firstLine, Math.max(firstLine, line)),
          async (line) => {
            editorHandle.markWriting(line, line);
            await align(entry.story.evidence === undefined ? undefined : citedLine, line, lineCount(block));
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
      if (!run.cancelled) finishReveal(editorHandle, current.text);
    })();
    /* oxlint-enable no-await-in-loop */
    return () => {
      run.cancelled = true;
      cancelTyping.current = undefined;
    };
  }, [phase, editorHandle, finishReveal]);

  const editorHandleRef = useRef(editorHandle);
  editorHandleRef.current = editorHandle;
  const skipReveal = useCallback(() => {
    if (phaseRef.current !== 'reveal') return;
    cancelTyping.current?.();
    finishReveal(editorHandleRef.current, plan.current?.text);
  }, [finishReveal]);
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
  const showWhy = useCallback(
    (name: string) => {
      const evidence = stories[name]?.evidence;
      if (evidence === undefined) return;
      load(evidence.file);
      setSelected(name);
      setPeek(name);
      if (stackedRef.current) setStackedView('file');
    },
    [stories, load]
  );
  const lenses = useMemo((): EditorLens[] => {
    if (phase !== 'review') return [];
    const all: EditorLens[] = [];
    for (const [name, lines] of Object.entries(blockLines)) {
      const story = stories[name];
      if (story === undefined) continue;
      const head = `${story.plainName}${story.priceLabel === undefined ? '' : ` · ${story.priceLabel}`}`;
      all.push({ line: lines.from, title: head, onClick: () => select(name) });
      const evidence = story.evidence;
      if (evidence !== undefined) {
        const line = citations[name]?.line ?? evidence.line;
        all.push({
          line: lines.from,
          title: `why: ${evidence.file}:${line}`,
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
  // The code window keeps its last frame while it fades out, so it never jumps to another file on the way.
  const plannedStep = phase === 'scan' ? undefined : plan.current?.steps[step];
  const revealTabs = useMemo(() => {
    const evidence = (plan.current?.steps ?? [])
      .slice(0, step + 1)
      .flatMap((entry) => (entry.story.evidence === undefined ? [] : [entry.story.evidence.file]));
    return [...new Set([...opened, ...evidence])];
  }, [opened, step]);
  const agent = state.agents?.find((option) => option.id === state.choice?.agentId);
  const usesAgent = agent !== undefined && agent.id !== 'none';
  const lastTool = state.timeline.findLast((entry) => entry.kind === 'tool');
  const scanActive = phase === 'scan' ? opened.at(-1) : undefined;
  const focusedStory = plannedStep?.story;
  const focusedCitation = focusedStory === undefined ? undefined : citations[focusedStory.name];
  const focusedEvidence = focusedStory?.evidence;
  const activeFile = phase === 'scan' ? scanActive : (focusedEvidence?.file ?? revealTabs.at(-1));
  const chips = phase === 'scan' ? [] : allChips(plan.current).slice(0, chipCount(plan.current, step));
  const filename = filenameFor(isEdited ? 'yaml' : format, state.existingConfig !== undefined);
  const parseError = draft === undefined ? edit?.error : undefined;
  const [problems, setProblems] = useState<EditorProblems>({ count: 0 });
  const showTypeScript = phase === 'review' && format === 'typescript' && !isEdited;
  const price = useMemo(() => {
    const steps = plan.current?.steps ?? [];
    const sofar = steps.slice(0, written).map((entry) => stories[entry.story.name] ?? entry.story);
    return runningPrice(sofar);
  }, [written, stories]);
  const filesRead = new Set(opened).size;
  const receipt = !usesAgent
    ? 'Read without AI'
    : `Read by ${agent.label}${filesRead > 0 ? ` · ${filesRead} ${filesRead === 1 ? 'file' : 'files'}` : ''}`;
  const showFile = !stacked || phase !== 'review' || stackedView === 'file';
  const showLeft = !stacked || phase !== 'review' || stackedView === 'architecture';

  const emptyState = usesAgent ? (
    <EmptyCode
      line="The files it opens show up here, with what it is reading marked."
      title={`${agent.label} is starting`}
    />
  ) : (
    <EmptyCode
      line="It reads manifests, Dockerfiles and config files. No AI, nothing leaves this machine."
      title="Stacktape is reading project manifests"
    />
  );

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
      >
        <header className="ws-head" data-phase={phase}>
          {phase === 'scan' ? (
            <>
              <h1 className="ws-title">Reading {state.projectName}</h1>
              <ScanStatus
                agentLabel={usesAgent ? agent.label : undefined}
                lastTool={lastTool?.label}
                startedAt={startedAt}
              />
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
                  isWritten={written > step}
                  key={focusedStory.name}
                  story={stories[focusedStory.name] ?? focusedStory}
                />
              )}
            </>
          ) : (
            <>
              <h1 className="ws-title">{state.projectName} on AWS</h1>
              <p className="ws-head-line ws-summary">{summarise(state, { external: false })}</p>
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
                  file={focusedEvidence === undefined ? undefined : files.get(focusedEvidence.file)}
                  story={focusedStory}
                  typed={typedBlock}
                />
              ) : (
                <CodeWindow
                  active={activeFile}
                  bodyRef={stacked ? undefined : codeBodyRef}
                  compact={stacked}
                  emptyState={emptyState}
                  files={files}
                  focus={
                    phase === 'reveal' && focusedEvidence !== undefined
                      ? { lines: focusedCitation?.lines ?? [focusedEvidence.line] }
                      : undefined
                  }
                  isBare={phase === 'scan' && !usesAgent}
                  isScanning={phase === 'scan'}
                  reducedMotion={reducedMotion}
                  tabs={phase === 'scan' ? opened : revealTabs}
                />
              )}
              {phase !== 'scan' && chips.length > 0 && <Chips chips={chips} />}
            </div>
          )}
          {phase === 'review' && (
            <ReviewPane
              busy={busy}
              citations={citations}
              isEdited={isEdited}
              isLocked={isLocked}
              onDecision={onDecision}
              onDiscardEdits={discardEdits}
              onPreference={onPreference}
              onRegion={onRegion}
              onSelect={select}
              onShowWhy={showWhy}
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
                  Waiting for the first finding
                </span>
              ) : phase !== 'review' ? (
                phase === 'reveal' && (
                  <AnimatedPrice
                    className={`ws-editor-price${price.amount === undefined ? ' is-quiet' : ''}`}
                    countFromZero
                    text={price.text}
                    title="What this file costs per month so far, at AWS list prices"
                  />
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
                Edit freely
                <span className="ws-editor-hint-keys">
                  {' '}
                  <span aria-hidden>·</span> hover a key for docs <span aria-hidden>·</span> <kbd>Ctrl</kbd>{' '}
                  <kbd>Space</kbd> for suggestions
                </span>
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
                  highlight={selected === undefined ? undefined : blockLines[selected]}
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
      </div>

      {phase === 'review' && (
        <div className="ws-bar-slot" data-arrived={arrived ? 'true' : undefined}>
          <ActionBar
            note={parseError !== undefined ? 'Fix the YAML to continue.' : `Saves ${filename}`}
            price={<MonthlyPrice state={state} />}
          >
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

/** How many chips the reveal shows at `step`: every chip of the steps told so far. */
const chipCount = (plan: RevealPlan | undefined, step: number): number =>
  plan?.steps.slice(0, step + 1).reduce((sum, entry) => sum + entry.chips.length, 0) ?? 0;

function ScanStatus({
  agentLabel,
  lastTool,
  startedAt
}: {
  agentLabel: string | undefined;
  lastTool: string | undefined;
  startedAt: number;
}) {
  const [elapsed, setElapsed] = useState(() => Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.max(0, Math.round((Date.now() - startedAt) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  const activity = lastTool === undefined ? undefined : scanActivity(lastTool);
  return (
    <>
      <p aria-live="polite" className="ws-head-line ws-status">
        <span aria-hidden className="ws-pulse" />
        <span className="ws-status-text">
          {agentLabel === undefined ? (
            'Stacktape is reading project manifests, without AI'
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
      <p className="ws-head-side ws-status-meta">
        Read-only <span aria-hidden>·</span> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
      </p>
    </>
  );
}

/**
 * The finding the reveal is on, across both panes: the line of code on the left, what it became on the right, with
 * its price once the block is written. A resource Stacktape adds for another says so instead of quoting code.
 */
function Finding({
  story,
  citation,
  isWritten
}: {
  story: ResourceStory;
  citation: Citation | undefined;
  isWritten: boolean;
}) {
  const evidence = story.evidence;
  const where = evidence === undefined ? undefined : `${evidence.file}:${citation?.line ?? evidence.line}`;
  return (
    <div className="ws-finding" data-design-choice={story.designChoice === undefined ? undefined : 'true'}>
      <p className="ws-finding-from">
        {story.designChoice !== undefined || evidence === undefined ? (
          <span className="ws-finding-choice">{story.designChoice ?? 'Added to the file'}</span>
        ) : (
          <>
            {(citation?.text ?? [quoteLabel(evidence.quote)]).map((text) => (
              <code key={text}>{text}</code>
            ))}
            <span className="ws-finding-where">{where}</span>
          </>
        )}
        <span aria-hidden className="ws-finding-leader" />
      </p>
      <p className="ws-finding-to">
        <ResourceIcon resourceType={story.type} size={16} />
        <strong>{story.plainName}</strong>
        {isWritten && story.priceLabel !== undefined && <span className="ws-finding-price">{story.priceLabel}</span>}
      </p>
    </div>
  );
}

/**
 * The phone's reveal: the finding, a few lines of the file around it and the YAML it became, together, where the
 * desktop has two panes side by side.
 */
function PhoneFinding({
  story,
  citation,
  file,
  typed
}: {
  story: ResourceStory;
  citation: Citation | undefined;
  file: FileView | undefined;
  typed: string;
}) {
  const evidence = story.evidence;
  const lines = file?.status === 'shown' ? file.text.split('\n') : undefined;
  const lit = new Set(citation?.lines ?? (evidence === undefined ? [] : [evidence.line]));
  const first = citation?.lines[0] ?? evidence?.line ?? 1;
  const last = citation?.lines.at(-1) ?? first;
  const from = Math.max(1, first - 1);
  const to = Math.min(lines?.length ?? last, Math.max(last + 1, from + 2));
  const yaml = typed.split('\n').slice(0, 5);
  return (
    <div className="ws-phone-finding ws-panel" key={story.name}>
      <p className="ws-phone-finding-head">
        <ResourceIcon resourceType={story.type} size={16} />
        <strong>{story.plainName}</strong>
        {evidence !== undefined && story.designChoice === undefined && (
          <span>
            {evidence.file}:{citation?.line ?? evidence.line}
          </span>
        )}
      </p>
      {story.designChoice !== undefined || evidence === undefined ? (
        <p className="ws-phone-finding-choice">{story.designChoice ?? 'Added to the file'}</p>
      ) : (
        <div className="ws-excerpt">
          {lines === undefined ? (
            <div className="ws-excerpt-row" data-focus="true">
              <span className="ws-excerpt-number">{evidence.line}</span>
              <span className="ws-excerpt-text">{quoteLabel(evidence.quote)}</span>
            </div>
          ) : (
            lines.slice(from - 1, to).map((text, index) => (
              <div
                className="ws-excerpt-row"
                data-focus={lit.has(from + index) ? 'true' : undefined}
                // oxlint-disable-next-line react/no-array-index-key -- consecutive lines of one file; the number is identity.
                key={from + index}
              >
                <span className="ws-excerpt-number">{from + index}</span>
                <span className="ws-excerpt-text">{text || ' '}</span>
              </div>
            ))
          )}
        </div>
      )}
      <p aria-hidden className="ws-phone-finding-arrow">
        ↓ stacktape.yml
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
