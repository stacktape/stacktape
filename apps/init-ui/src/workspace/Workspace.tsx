import type { DeploymentPreferenceChange } from '@stacktape/config-inference/compose/preferences';
import { Button } from '@stacktape/ui-react/button';
import { ResourceIcon } from '@stacktape/ui-react/resource-icon';
import { Spinner } from '@stacktape/ui-react/spinner';
import { Tabs } from '@stacktape/ui-react/tabs';
import { Tooltip } from '@stacktape/ui-react/tooltip';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BiInfoCircle, BiKey, BiLinkExternal } from 'react-icons/bi';
import { parse as parseYaml } from 'yaml';
import { ActionBar } from '../components/ActionBar';
import { AnimatedPrice } from '../components/AnimatedPrice';
import type { ConfigEditorHandle, EditorLens, EditorProblems } from '../editor/ConfigFileEditor';
import type { FileView, Session, WizardState } from '../session';
import { scanActivity } from '../steps/AnalyzeStep';
import { ReviewPane } from '../steps/ReviewStep';
import { filenameFor, splitMonthly } from '../steps/review-model';
import { CodeWindow } from './CodeWindow';
import { FileIcon } from './FileIcon';
import {
  allChips,
  quoteLabel,
  revealPlan,
  storiesOf,
  tellingOrder,
  yamlSegments,
  type Chip,
  type RevealPlan,
  type ResourceStory
} from './resource-story';
import './workspace.css';

const ConfigFileEditor = lazy(() => import('../editor/ConfigFileEditor'));
// The diagram is shown the moment the reveal ends; start loading it while the analysis runs.
const loadDiagram = () => import('../components/Diagram');

type Resources = Record<string, { type: string; properties: Record<string, unknown> }>;
type Phase = 'scan' | 'reveal' | 'review';

const usePrefersReducedMotion = (): boolean => {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => window.matchMedia?.(query).matches === true);
  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (list === undefined) return;
    const update = () => setReduced(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, []);
  return reduced;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
const lineCount = (text: string) => text.split('\n').length - (text.endsWith('\n') ? 1 : 0);

/**
 * Analyze and Review as one screen, so the page never jumps between them.
 *
 * While the analysis runs, the left side shows the code being read (a scanner line sweeping each file the agent opens)
 * and the right side is stacktape.yml, empty. When the result arrives, it is told one resource at a time: the line of
 * code that called for it lights up on the left, its block is typed into the file on the right, and the price counts
 * up. Then the code window gives way to the diagram, the settings rise in under it and the file becomes editable.
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
  const reducedMotion = usePrefersReducedMotion();

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

  // ── The reveal ──────────────────────────────────────────────────────────────────────────────────
  const [editorHandle, setEditorHandle] = useState<ConfigEditorHandle | undefined>(undefined);
  const [step, setStep] = useState(-1);
  const [written, setWritten] = useState(0);
  const [nodeProgress, setNodeProgress] = useState<Record<string, 'pending' | 'ready'> | undefined>(undefined);
  const cancelTyping = useRef<(() => void) | undefined>(undefined);

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
    const model = editorHandle.editor.getModel();
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
     * Types `text` at `offset` over `duration`, a few characters a frame, keeping the newest line in view. A block that
     * ends in a newline gets its own empty line first, so the text below it moves down once and is never pulled onto
     * the line being typed.
     */
    const type = async (whole: string, offset: number, duration: number, onLine?: (line: number) => void) => {
      const text = whole.endsWith('\n') ? whole.slice(0, -1) : whole;
      if (whole.endsWith('\n')) insert(offset, '\n');
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
        editorHandle.editor.revealLineInCenterIfOutsideViewport(line);
      }
    };
    void (async () => {
      if (model.getValueLength() > 0) model.applyEdits([{ range: model.getFullModelRange(), text: '' }]);
      await sleep(350);
      await type(current.header, 0, 420);
      const typed: number[] = [];
      for (const [index, entry] of current.steps.entries()) {
        if (run.cancelled) return;
        setStep(index);
        await sleep(300);
        const block = current.blocks[entry.blockIndex]!;
        // The block goes where it sits in the file: after the header and the blocks above it typed so far.
        const offset = current.blocks.reduce(
          (sum, text, blockIndex) =>
            sum + (blockIndex < entry.blockIndex && typed.includes(blockIndex) ? text.length : 0),
          current.header.length
        );
        const firstLine = model.getPositionAt(offset).lineNumber;
        await type(block, offset, Math.max(420, entry.durationMs - 560), (line) =>
          editorHandle.markWriting(firstLine, Math.max(firstLine, line))
        );
        if (run.cancelled) return;
        editorHandle.markWriting(firstLine, firstLine + lineCount(block) - 1);
        editorHandle.markWritten();
        typed.push(entry.blockIndex);
        setWritten(index + 1);
        await sleep(260);
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

  // Esc skips the reveal, like the Skip link.
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
        all.push({
          line: lines.from,
          title: `why: ${evidence.file}:${evidence.line}`,
          onClick: () => {
            setPeek((current) => (current === name ? undefined : name));
            load(evidence.file);
          }
        });
      }
    }
    return all;
  }, [phase, blockLines, stories, select, load]);
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
  const focusedEvidence = plannedStep?.story.evidence;
  const activeFile = phase === 'scan' ? scanActive : (focusedEvidence?.file ?? revealTabs.at(-1));
  const chips = phase === 'scan' ? [] : allChips(plan.current).slice(0, chipCount(plan.current, step));
  const filename = filenameFor(isEdited ? 'yaml' : format, state.existingConfig !== undefined);
  const parseError = draft === undefined ? edit?.error : undefined;
  const [problems, setProblems] = useState<EditorProblems>({ count: 0 });
  const showTypeScript = phase === 'review' && format === 'typescript' && !isEdited;
  const total = splitMonthly(state.composition?.price?.monthly ?? '').amount;
  const runningPrice = useMemo(() => {
    const steps = plan.current?.steps ?? [];
    // Once everything is written, the total the estimate gave, not the sum of rounded parts.
    if (steps.length > 0 && written >= steps.length && total !== undefined) {
      return Number(total.replace(/[$,]/g, ''));
    }
    return steps.slice(0, written).reduce((sum, entry) => sum + (stories[entry.story.name]?.monthly ?? 0), 0);
  }, [written, stories, total]);

  return (
    <>
      <div
        className="ws"
        data-arrived={arrived ? 'true' : undefined}
        data-phase={phase}
        data-reduced-motion={reducedMotion ? 'true' : undefined}
        data-reveal-steps={plan.current?.steps.length}
        data-reveal-written={phase === 'reveal' ? written : undefined}
      >
        <div className="ws-left">
          {(phase !== 'review' || leaving) && (
            <div className="ws-scan" data-leaving={phase === 'review' ? 'true' : undefined}>
              <CodeWindow
                active={activeFile}
                emptyState={
                  usesAgent ? (
                    <span>{agent.label} is starting. The files it opens show up here.</span>
                  ) : (
                    <span>Reading your manifests and config files on this machine.</span>
                  )
                }
                files={files}
                focus={
                  focusedEvidence === undefined || plannedStep === undefined
                    ? undefined
                    : {
                        line: focusedEvidence.line,
                        callout: (
                          <Callout
                            // A line that already explained a resource explains this one through it.
                            alongside={
                              plan.current?.steps
                                .slice(0, step)
                                .find(
                                  (earlier) =>
                                    earlier.story.evidence?.file === focusedEvidence.file &&
                                    earlier.story.evidence.line === focusedEvidence.line
                                )?.story.plainName
                            }
                            story={plannedStep.story}
                          />
                        )
                      }
                }
                isScanning={phase === 'scan'}
                reducedMotion={reducedMotion}
                tabs={phase === 'scan' ? opened : revealTabs}
              />
              <div aria-live="polite" className="ws-status">
                {phase === 'scan' ? (
                  <ScanStatus
                    agentLabel={usesAgent ? agent.label : undefined}
                    lastTool={lastTool?.label}
                    startedAt={startedAt}
                  />
                ) : (
                  <>
                    <span className="ws-status-text">
                      {plannedStep === undefined ? (
                        'Writing stacktape.yml'
                      ) : (
                        <>
                          Adding <strong>{plannedStep.story.plainName}</strong> to stacktape.yml
                        </>
                      )}
                    </span>
                    <button className="ws-skip" onClick={skipReveal} type="button">
                      Skip <kbd>Esc</kbd>
                    </button>
                  </>
                )}
              </div>
              <Chips chips={chips} />
            </div>
          )}
          {phase === 'review' && (
            <ReviewPane
              busy={busy}
              isEdited={isEdited}
              isLocked={isLocked}
              onDecision={onDecision}
              onDiscardEdits={discardEdits}
              onPreference={onPreference}
              onRegion={onRegion}
              onSelect={select}
              progress={nodeProgress}
              resources={resources}
              selected={selected}
              state={state}
              stories={stories}
            />
          )}
        </div>

        <section aria-label={filename} className="ws-panel ws-editor" id="config-file">
          <header className="ws-editor-head">
            <span className="ws-editor-file">
              <FileIcon path={filename} />
              {filename}
            </span>
            {phase === 'review' && isEdited && <span className="ws-badge">Edited</span>}
            <span className="ws-editor-head-end">
              {phase !== 'review' ? (
                phase === 'reveal' && (
                  <AnimatedPrice className="ws-editor-price" text={`$${Math.round(runningPrice)} /mo`} />
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
                Edit freely <span aria-hidden>·</span> hover a key for docs <span aria-hidden>·</span> <kbd>Ctrl</kbd>{' '}
                <kbd>Space</kbd> for suggestions
              </>
            )}
          </p>
          <div className="ws-editor-body">
            {phase === 'scan' && <p className="ws-editor-placeholder">Resources appear here as they’re found</p>}
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
                              file={files.get(peekStory.evidence.file)}
                              onClose={() => setPeek(undefined)}
                              story={peekStory}
                            />
                          )
                        }
                  }
                  readOnly={phase !== 'review' || isLocked}
                  showLineNumbers={phase !== 'scan'}
                  readOnlyMessage={
                    phase === 'review'
                      ? 'Not editable while stacktape init is disconnected or deploying.'
                      : 'Editable in a moment, once it is written.'
                  }
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
            price={<BarPrice state={state} />}
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
      <span className="ws-status-text">
        <span aria-hidden className="ws-pulse" />
        {agentLabel === undefined ? (
          'Reading your project’s files, without AI'
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
      <span className="ws-status-meta">
        Read-only <span aria-hidden>·</span> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
      </span>
    </>
  );
}

function Callout({ story, alongside }: { story: ResourceStory; alongside?: string | undefined }) {
  return (
    <span className="ws-callout-tag">
      <code>{quoteLabel(story.evidence!.quote)}</code>
      <span className="ws-callout-in">in {story.evidence!.file.split('/').at(-1)}</span>
      <span aria-hidden className="ws-callout-arrow">
        →
      </span>
      <strong>{story.plainName}</strong>
      {alongside !== undefined && <span className="ws-callout-in">for the {alongside}</span>}
    </span>
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

/** The inline "why": the lines around the evidence in the real file, the cited one lit. */
function EvidencePeek({
  story,
  file,
  onClose
}: {
  story: ResourceStory;
  file: FileView | undefined;
  onClose: () => void;
}) {
  const evidence = story.evidence!;
  const lines = file?.status === 'shown' ? file.text.split('\n') : undefined;
  const from = Math.max(1, evidence.line - 2);
  const shown = lines?.slice(from - 1, evidence.line + 2) ?? [];
  return (
    <div className="ws-peek">
      <div className="ws-peek-head">
        <span className="ws-peek-title">
          <FileIcon path={evidence.file} />
          {evidence.file}
          <span className="ws-peek-line">line {evidence.line}</span>
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
              data-focus={from + index === evidence.line ? 'true' : undefined}
              // oxlint-disable-next-line react/no-array-index-key -- consecutive lines of one file; the number is identity.
              key={from + index}
            >
              <span className="ws-peek-number">{from + index}</span>
              <span className="ws-peek-text">{text || ' '}</span>
            </div>
          ))}
        </div>
      )}
      {story.reason !== undefined && <p className="ws-peek-reason">{story.reason}</p>}
    </div>
  );
}

function BarPrice({ state }: { state: WizardState }) {
  const price = state.composition?.price;
  if (price === undefined) {
    return (
      <span className="ws-bar-price is-pending">
        {state.composition?.priceUnavailable === true ? (
          'Price unavailable offline'
        ) : (
          <>
            <Spinner /> Pricing…
          </>
        )}
      </span>
    );
  }
  const { amount, usage } = splitMonthly(price.monthly);
  return (
    <span aria-live="polite" className="ws-bar-price">
      {amount === undefined ? (
        <span className="ws-bar-amount">{price.monthly}</span>
      ) : (
        <AnimatedPrice className="ws-bar-amount" text={`${amount} /month${usage ? ' + usage' : ''}`} />
      )}
      <Tooltip
        content={
          <>
            {usage
              ? 'The fixed part runs whether or not anyone uses the app. Usage is traffic and requests, billed by AWS as they happen. '
              : 'Everything here runs at a fixed monthly price. '}
            AWS list prices for {price.region}, billed by AWS to your account.
          </>
        }
        maxWidth={300}
        placement="top"
      >
        <button aria-label="What the price includes" className="ws-info" type="button">
          <BiInfoCircle aria-hidden size={15} />
        </button>
      </Tooltip>
    </span>
  );
}

function EditorLoading({ text = 'Loading the editor…' }: { text?: ReactNode }) {
  return (
    <div className="ws-editor-loading">
      <Spinner /> {text}
    </div>
  );
}
