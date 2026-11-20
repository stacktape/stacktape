import { Spinner } from '@stacktape/ui-react/spinner';
import { Tabs, type Tab } from '@stacktape/ui-react/tabs';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BiCheck, BiCheckCircle, BiCopy, BiErrorCircle, BiLayer } from 'react-icons/bi';
import type { Session } from '../session';
import { FileIcon } from '../workspace/FileIcon';
import type { ResourceStory } from '../workspace/resource-story';
import { blockAt, resourceBlocks } from './config-blocks';
import { CloudFormationView } from './CloudFormationView';
import type { ConfigEditorHandle, EditorLabel, EditorProblems } from './ConfigFileEditor';
import type { EditorVersion } from './editor-version';
import type { ConfigFormat, useConfigDraft } from './use-config-draft';

const ConfigFileEditor = lazy(() => import('./ConfigFileEditor'));

type Phase = 'scan' | 'reveal' | 'review';

const FORMAT_NAMES: Record<ConfigFormat, string> = { yaml: 'YAML', typescript: 'TypeScript' };

/** YAML and TypeScript; while the text is edited in one, the other is off and says why. */
const formatTabs = (lockedTo: ConfigFormat | undefined): Array<Tab<ConfigFormat>> =>
  (['yaml', 'typescript'] as const).map((value) => {
    const tab: Tab<ConfigFormat> = { value, label: FORMAT_NAMES[value] };
    if (value === 'typescript') tab.compactLabel = 'TS';
    if (lockedTo !== undefined && lockedTo !== value) {
      tab.disabled = true;
      tab.title = `Your edits are ${FORMAT_NAMES[lockedTo]}. Discard them to switch to ${FORMAT_NAMES[value]}.`;
    }
    return tab;
  });

/** The file's tab carries a dot while its text is the user's own. */
function EditedDot() {
  return (
    <span className="ws-editor-edited-dot" title="Edited by hand">
      <span className="sr-only">Edited</span>
    </span>
  );
}
type View = 'file' | 'template';

/**
 * The configuration panel of Analyze and Review: the file, its CloudFormation template, and a status line.
 *
 * While the analysis runs the file is written into it and nothing can be changed. On Review it is the file in the
 * format picked here (YAML or TypeScript), editable with that language's own help, and the template it compiles to.
 * The status line under it says whether the file is valid, how to reach suggestions and docs, and whether the text is
 * the user's own; the panel has no instructions above the code.
 *
 * `version` (`?editor=`) picks how the template is shown: a second tab (e1, e3) or docked under the file (e2).
 */
export function ConfigPanel({
  version,
  phase,
  session,
  filename,
  draft,
  onFormatChange,
  onDiscard,
  isLocked,
  isTouch,
  stories,
  selected,
  revealCount,
  writingHead,
  bodyOverlay,
  onEditorReady
}: {
  version: EditorVersion;
  phase: Phase;
  session: Session;
  filename: string;
  draft: ReturnType<typeof useConfigDraft>;
  onFormatChange: (format: ConfigFormat) => void;
  onDiscard: () => void;
  /** Disconnected from the CLI, or a deploy is running: nothing can be changed. */
  isLocked: boolean;
  /** Nothing to hover with: a tap on a key opens its docs. */
  isTouch: boolean;
  stories: Readonly<Record<string, ResourceStory>>;
  /** The resource picked on the diagram. */
  selected: string | undefined;
  /** Bumped to bring the picked block into view again. */
  revealCount: number;
  /** The head's right side while the file is written (the estimate so far). */
  writingHead?: ReactNode;
  /** Drawn over the editor while the analysis runs (the rows waiting for findings). */
  bodyOverlay?: ReactNode;
  onEditorReady: (handle: ConfigEditorHandle) => void;
}) {
  const isReview = phase === 'review';
  const [view, setView] = useState<View>('file');
  // Docked (e2) the template shows under the file until it is closed.
  const [isDocked, setDocked] = useState(true);
  const [problems, setProblems] = useState<EditorProblems>({ count: 0, errors: 0 });
  const [handle, setHandle] = useState<ConfigEditorHandle | undefined>(undefined);
  const [cursorLine, setCursorLine] = useState<number | undefined>(undefined);
  const [template, setTemplate] = useState<{ text: string; stage: string; region: string } | undefined>(undefined);

  const language = draft.shown;
  const text = draft.text;
  const blocks = useMemo(() => (text === undefined ? {} : resourceBlocks(text, language)), [text, language]);
  const keyLines = useMemo(
    () => Object.fromEntries(Object.entries(blocks).map(([name, range]) => [name, range.from])),
    [blocks]
  );
  // A faint name and price after each resource's key line (e1, e2); e3 shows the file as it is.
  const labels = useMemo((): EditorLabel[] => {
    if (!isReview || version === 'e3') return [];
    return Object.entries(blocks).flatMap(([name, range]) => {
      const story = stories[name];
      if (story === undefined) return [];
      return [
        {
          line: range.from,
          text: `${story.plainName}${story.priceLabel === undefined ? '' : ` · ${story.priceLabel}`}`
        }
      ];
    });
  }, [isReview, version, blocks, stories]);
  const highlight =
    selected === undefined || blocks[selected] === undefined
      ? undefined
      : { ...blocks[selected]!, reveal: revealCount };
  const cursorResource = cursorLine === undefined ? undefined : blockAt(blocks, cursorLine);

  const ready = useCallback(
    (next: ConfigEditorHandle) => {
      setHandle(next);
      onEditorReady(next);
    },
    [onEditorReady]
  );
  // "Show in stacktape.yml" shows the file, whichever tab is open.
  useEffect(() => {
    if (revealCount > 0) setView('file');
  }, [revealCount]);
  // A format switch brings a new editor and its own problems.
  useEffect(() => {
    setProblems({ count: 0, errors: 0 });
    setCursorLine(undefined);
  }, [language]);

  const showsTemplate = isReview && version !== 'e2' && view === 'template';
  const docked = isReview && version === 'e2' && isDocked;
  const formatLocked = draft.isEdited && draft.editedFormat !== undefined;

  const fileEditor =
    language === 'typescript' && isReview && text === undefined ? (
      <EditorLoading text="Writing the TypeScript…" />
    ) : (
      <ConfigFileEditor
        docsOnTap={isTouch}
        highlight={highlight}
        key={language}
        labels={labels}
        language={language}
        onChange={draft.change}
        onCursorLine={setCursorLine}
        onProblems={setProblems}
        onReady={ready}
        readOnly={!isReview || isLocked}
        readOnlyMessage={
          isReview
            ? 'Not editable while stacktape init is disconnected or deploying.'
            : 'Editable in a moment, once it is written.'
        }
        resourceNames={keyLines}
        // The reveal lines a block up with its code, which can need the last lines higher than the bottom.
        scrollBeyondLastLine={phase === 'reveal'}
        value={isReview ? (text ?? '') : undefined}
      />
    );

  const templateView = (compact: boolean) => (
    <CloudFormationView
      compact={compact}
      focus={compact ? (cursorResource ?? selected) : selected}
      onTemplate={setTemplate}
      session={session}
      source={draft.error === undefined ? draft.sourceYaml : undefined}
      sourceError={draft.error !== undefined}
      stories={stories}
    />
  );

  return (
    <>
      <header className="ws-editor-head" data-version={version}>
        {isReview && version !== 'e2' ? (
          <Tabs
            appearance="underline"
            ariaLabel="Show"
            className="ws-editor-tabs"
            onValueChange={(next) => setView(next)}
            tabs={[
              {
                value: 'file',
                label: filename,
                icon: <FileIcon path={filename} />,
                ...(draft.isEdited ? { suffix: <EditedDot /> } : {})
              },
              {
                value: 'template',
                label: 'CloudFormation',
                compactLabel: 'Template',
                icon: <BiLayer size={15} />,
                title: 'The CloudFormation template this file compiles to, for a deploy to AWS. Read-only.'
              }
            ]}
            value={view}
            width="fit"
          />
        ) : (
          <span className="ws-editor-file">
            <FileIcon path={filename} />
            {filename}
            {isReview && draft.isEdited && <EditedDot />}
          </span>
        )}
        <span className="ws-editor-head-end">
          {!isReview ? (
            writingHead
          ) : (
            <>
              {!showsTemplate && (
                <Tabs
                  appearance="segmented"
                  ariaLabel="File format"
                  className="ws-editor-format"
                  onValueChange={onFormatChange}
                  size="small"
                  tabs={formatTabs(formatLocked ? language : undefined)}
                  value={language}
                  width="fit"
                />
              )}
              {version === 'e2' && (
                <button
                  aria-pressed={isDocked}
                  className="ws-editor-toggle"
                  onClick={() => setDocked((current) => !current)}
                  title="The CloudFormation template under the file, for the resource the cursor is in"
                  type="button"
                >
                  <BiLayer aria-hidden size={15} />
                  <span className="ws-editor-toggle-label">CloudFormation</span>
                </button>
              )}
              <CopyButton text={showsTemplate ? template?.text : text} what={showsTemplate ? 'template' : 'file'} />
            </>
          )}
        </span>
      </header>
      <div className="ws-editor-body" data-docked={docked ? 'true' : undefined}>
        {bodyOverlay}
        <div className="ws-editor-pane" hidden={showsTemplate}>
          <Suspense fallback={<EditorLoading />}>{fileEditor}</Suspense>
        </div>
        {showsTemplate && <div className="ws-editor-pane">{templateView(false)}</div>}
        {docked && <div className="ws-editor-dock">{templateView(true)}</div>}
      </div>
      <StatusBar
        draft={draft}
        handle={handle}
        isTouch={isTouch}
        language={language}
        onDiscard={onDiscard}
        phase={phase}
        problems={problems}
        template={showsTemplate ? (template ?? 'compiling') : undefined}
      />
    </>
  );
}

/** One line under the code: is it valid, how to get help, is it the user's own. */
function StatusBar({
  phase,
  draft,
  problems,
  handle,
  language,
  isTouch,
  template,
  onDiscard
}: {
  phase: Phase;
  draft: ReturnType<typeof useConfigDraft>;
  problems: EditorProblems;
  handle: ConfigEditorHandle | undefined;
  language: ConfigFormat;
  isTouch: boolean;
  template: { stage: string; region: string } | 'compiling' | undefined;
  onDiscard: () => void;
}) {
  if (phase !== 'review') {
    return (
      <footer className="ws-editor-status">
        <span className="ws-status-note">
          {phase === 'scan' ? 'Written from what the analysis finds' : 'Read-only while it is written'}
        </span>
      </footer>
    );
  }
  if (template !== undefined) {
    return (
      <footer className="ws-editor-status">
        <span className="ws-status-note">
          {template === 'compiling'
            ? 'Compiled on this machine, without AWS'
            : `Compiled on this machine for stage ${template.stage} in ${template.region}, without AWS`}
        </span>
        <span className="ws-status-hints">Read-only</span>
      </footer>
    );
  }
  const error = draft.error;
  return (
    <footer className="ws-editor-status" data-tone={error !== undefined ? 'error' : undefined}>
      <span className="ws-status-main">
        {error !== undefined ? (
          <span className="ws-status-problem" data-tone="error" title={error.message}>
            <BiErrorCircle aria-hidden size={14} />
            <span className="ws-status-text">
              {error.line === undefined ? '' : `Line ${error.line}: `}
              {error.message}
            </span>
          </span>
        ) : problems.count > 0 ? (
          <button
            className="ws-status-problem"
            data-tone={problems.errors > 0 ? 'error' : 'warn'}
            onClick={() => handle?.nextProblem()}
            title={problems.first?.message}
            type="button"
          >
            <BiErrorCircle aria-hidden size={14} />
            <span className="ws-status-text">
              {problems.count === 1 ? '1 problem' : `${problems.count} problems`}
              {problems.first === undefined ? '' : ` · line ${problems.first.line}`}
            </span>
          </button>
        ) : draft.isPending ? (
          <span className="ws-status-note">
            <Spinner /> Checking
          </span>
        ) : (
          <span className="ws-status-ok">
            <BiCheckCircle aria-hidden size={14} />
            {language === 'yaml' ? 'Valid' : 'No type errors'}
          </span>
        )}
        {draft.isEdited && (
          <span className="ws-status-edited">
            <span aria-hidden className="ws-status-sep">
              ·
            </span>
            Edited by hand
            <button className="ws-textbutton" onClick={onDiscard} type="button">
              Discard
            </button>
          </span>
        )}
      </span>
      {/* Hints are for finding your way in; once the text is the user's own, the line is about the edit. */}
      <span className="ws-status-hints" hidden={draft.isEdited}>
        {isTouch ? (
          'Tap a key for its docs'
        ) : (
          <>
            <span className="ws-status-hint">
              <kbd>Ctrl</kbd>
              <kbd>Space</kbd> suggestions
            </span>
            <span className="ws-status-hint">Hover for docs</span>
          </>
        )}
      </span>
    </footer>
  );
}

function CopyButton({ text, what }: { text: string | undefined; what: 'file' | 'template' }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      aria-label={copied ? 'Copied' : `Copy the ${what}`}
      className="ws-editor-icon-button"
      disabled={text === undefined}
      onClick={async () => {
        if (text === undefined) return;
        await navigator.clipboard?.writeText(text);
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1400);
      }}
      title={copied ? 'Copied' : `Copy the ${what}`}
      type="button"
    >
      {copied ? <BiCheck aria-hidden size={16} /> : <BiCopy aria-hidden size={15} />}
    </button>
  );
}

function EditorLoading({ text = 'Loading the editor…' }: { text?: ReactNode }) {
  return (
    <div className="ws-editor-loading">
      <Spinner /> {text}
    </div>
  );
}
