import type { editor as MonacoEditorTypes } from 'monaco-editor/editor/editor.api.js';
import { MonacoEditor } from '@stacktape/ui-react/monaco-editor';
import { getYamlModelPath } from '@stacktape/ui-react/monaco-yaml/model-path';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { changedLines } from './line-diff';
import { monaco, sharedMonaco, stacktapeYaml } from './monaco-setup';
import { loadStacktapeTypes } from './monaco-typescript';
import { Spinner } from '@stacktape/ui-react/spinner';

const YAML_PATH = getYamlModelPath({ editorNumber: 1, intellisense: true });
const TYPESCRIPT_PATH = 'file:///stacktape.ts';

export type EditorProblems = {
  count: number;
  /** How many of them are errors; the rest are warnings. */
  errors: number;
  first?: { line: number; message: string };
};

/** A faint note at the end of a line: "Postgres database · $14/mo" after `mainDatabase:`. */
export type EditorLabel = { line: number; text: string };

/** A heading drawn between lines, above `line`: the template's resources, grouped by what they were created for. */
export type EditorSection = { line: number; content: ReactNode };

/** What the host can drive while the editor is up: the editor itself, for the reveal's typing, and its gutter marks. */
export type ConfigEditorHandle = {
  editor: MonacoEditorTypes.IStandaloneCodeEditor;
  /** The block being written: a brand mark in its gutter. */
  markWriting: (fromLine: number, toLine: number) => void;
  /** The block is written: its mark dims and stays with its lines while more are added around them. */
  markWritten: () => void;
  /** The file is written: every mark fades out. */
  clearMarks: () => void;
  /**
   * Shows the docs, the same card a hover shows, for the key under the cursor, or on `fallbackLine` while the cursor
   * has not been placed. Without a pointer to hover with, this is how docs are read.
   */
  showDocs: (fallbackLine?: number) => void;
  /** Moves to the next problem and shows it, from the cursor. */
  nextProblem: () => void;
};

/** A YAML key on a line, `  type:` or `- name:`: where it starts and ends, 1-based columns. */
const keyOn = (text: string): { start: number; end: number } | undefined => {
  const match = /^(\s*(?:-\s+)?)([^\s:#'"][^:#]*?):(\s|$)/.exec(text);
  return match === null ? undefined : { start: match[1]!.length + 1, end: match[1]!.length + match[2]!.length + 1 };
};

/** Opens the hover card for the key on `line`, with the cursor on the key so the card is anchored to it. */
const openDocs = (editor: MonacoEditorTypes.IStandaloneCodeEditor, line: number, column?: number) => {
  const model = editor.getModel();
  if (model === null || line < 1 || line > model.getLineCount()) return;
  const key = model.getLanguageId() === 'yaml' ? keyOn(model.getLineContent(line)) : undefined;
  const at =
    key === undefined
      ? (column ?? model.getLineFirstNonWhitespaceColumn(line))
      : column !== undefined && column >= key.start && column <= key.end
        ? column
        : key.start;
  editor.setPosition({ lineNumber: line, column: at });
  editor.revealLineInCenterIfOutsideViewport(line, monaco.editor.ScrollType.Smooth);
  editor.trigger('stacktape.wizard.docs', 'editor.action.showHover', { focus: false });
};

/** Where to scroll for a line to show near the top, under one whole line of what is above it. */
const nearTop = (editor: MonacoEditorTypes.IStandaloneCodeEditor, line: number) =>
  line <= 2 ? 0 : editor.getTopForLineNumber(line - 1, true);

/**
 * Scrolls a line to near the top: always, or only when it is out of view or low in it. It waits for the editor's
 * layout (a file view just shown has none yet).
 */
const bringToTop = (editor: MonacoEditorTypes.IStandaloneCodeEditor, line: number, always: boolean) => {
  const timer = setTimeout(() => {
    const top = nearTop(editor, line);
    const scrolled = editor.getScrollTop();
    if (!always && top >= scrolled && top <= scrolled + editor.getLayoutInfo().height * 0.5) return;
    if (Math.abs(top - scrolled) < 2) return;
    editor.setScrollTop(top, monaco.editor.ScrollType.Smooth);
  }, 40);
  return () => clearTimeout(timer);
};

/** A gutter mark that follows its lines as text is inserted around them, and never grows into text typed at its edge. */
const mark = (from: number, to: number, className: string) => ({
  range: new monaco.Range(from, 1, to, 1),
  options: {
    isWholeLine: true,
    linesDecorationsClassName: className,
    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
  }
});

/** The problems on a model, as the status bar counts them: errors and warnings, not hints. */
const problemsOf = (markers: readonly MonacoEditorTypes.IMarker[]): EditorProblems => {
  const relevant = markers
    .filter((marker) => marker.severity >= monaco.MarkerSeverity.Warning)
    .toSorted((left, right) => left.startLineNumber - right.startLineNumber);
  const first = relevant[0];
  return {
    count: relevant.length,
    errors: relevant.filter((marker) => marker.severity === monaco.MarkerSeverity.Error).length,
    ...(first === undefined ? {} : { first: { line: first.startLineNumber, message: first.message } })
  };
};

/**
 * The configuration file in Monaco, YAML or TypeScript, editable with the language's own help: the Stacktape schema
 * for YAML (hover docs, completion, validation), the `stacktape` package's types for TypeScript (the same, plus type
 * errors and go to definition). Read-only, it shows the compiled CloudFormation template.
 *
 * Besides the text it shows what the workspace knows about the file: a faint label after each resource's key line,
 * headings between groups of lines, the block a diagram click points at, and the lines a setting just rewrote (they
 * flash).
 *
 * The default export is the lazy chunk boundary: Monaco and its workers load only when this is rendered.
 */
export default function ConfigFileEditor({
  value,
  language,
  modelPath,
  readOnly,
  readOnlyMessage,
  onChange,
  onProblems,
  onReady,
  onCursorLine,
  labels,
  sections,
  highlight,
  resourceNames,
  showLineNumbers = true,
  lineNumberMap,
  scrollBeyondLastLine = false,
  docsOnTap = false,
  folding = true,
  stickyScroll = false
}: {
  /** The text. Undefined while the host types it in itself (the reveal), through `onReady`. */
  value: string | undefined;
  language: 'yaml' | 'typescript';
  /**
   * The model's URI. The default for YAML is the one the Stacktape schema is bound to; a YAML file that is not a
   * Stacktape configuration (the template) passes its own.
   */
  modelPath?: string;
  readOnly: boolean;
  /** Said when someone types into the read-only editor. */
  readOnlyMessage?: string;
  onChange?: (value: string) => void;
  onProblems?: (problems: EditorProblems) => void;
  onReady?: (handle: ConfigEditorHandle) => void;
  /** The line the cursor is on, as it moves. */
  onCursorLine?: (line: number) => void;
  labels?: readonly EditorLabel[];
  sections?: readonly EditorSection[];
  /**
   * Lines to mark and bring into view, e.g. the resource a diagram click picked: its key line (`from`) carries the
   * selection's accent, the rest of the block a quieter one. A new `reveal` brings it into view again.
   */
  highlight?: { from: number; to: number; reveal?: number } | undefined;
  /**
   * The configuration's resource names and their key lines: in YAML, a name under `connectTo` or in a directive such as
   * `$ResourceParam('mainDatabase', ...)` goes to its definition (Ctrl+click, F12). TypeScript does this by itself.
   */
  resourceNames?: Readonly<Record<string, number>>;
  /** Off while the file is still empty: a lone "1" is noise. */
  showLineNumbers?: boolean;
  /** The numbers to show for the lines of an excerpt: line `n` shows `lineNumberMap[n - 1]`, its number in the whole. */
  lineNumberMap?: readonly number[];
  /** Lets the last lines scroll up past the bottom, for a host that positions lines itself. */
  scrollBeyondLastLine?: boolean;
  /** A touch screen has no hover: a tap on a key opens its docs instead. */
  docsOnTap?: boolean;
  folding?: boolean;
  /** Keeps the keys a long block sits under at the top while it scrolls (the template's resource names). */
  stickyScroll?: boolean;
}) {
  const [path] = useState(() => modelPath ?? (language === 'yaml' ? YAML_PATH : TYPESCRIPT_PATH));
  const [editor, setEditor] = useState<MonacoEditorTypes.IStandaloneCodeEditor | null>(null);
  // The TypeScript editor opens once the `stacktape` types are there, so `import ... from 'stacktape'` never shows
  // an error that is gone a second later.
  const [types, setTypes] = useState<'loading' | 'ready' | 'failed'>(language === 'typescript' ? 'loading' : 'ready');
  useEffect(() => {
    if (language !== 'typescript') return;
    let isCurrent = true;
    loadStacktapeTypes().then(
      () => isCurrent && setTypes('ready'),
      () => isCurrent && setTypes('failed')
    );
    return () => {
      isCurrent = false;
    };
  }, [language]);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onProblemsRef = useRef(onProblems);
  onProblemsRef.current = onProblems;
  const onCursorLineRef = useRef(onCursorLine);
  onCursorLineRef.current = onCursorLine;
  const docsOnTapRef = useRef(docsOnTap);
  docsOnTapRef.current = docsOnTap;
  const resourceNamesRef = useRef(resourceNames);
  resourceNamesRef.current = resourceNames;

  // Problems: the schema's for the Stacktape YAML (which leaves directives alone), the type checker's for TypeScript.
  useEffect(() => {
    if (path !== YAML_PATH) return;
    stacktapeYaml.setModelSettings(YAML_PATH, {
      isIntellisenseEnabled: true,
      rootSchemaIdentifier: null,
      onDiagnostics: (diagnostics) => onProblemsRef.current?.(problemsOf(diagnostics as MonacoEditorTypes.IMarker[]))
    });
    return () => stacktapeYaml.removeModelSettings(YAML_PATH);
  }, [path]);
  useEffect(() => {
    if (editor === null || language !== 'typescript') return;
    const report = () => {
      const model = editor.getModel();
      if (model !== null) onProblemsRef.current?.(problemsOf(monaco.editor.getModelMarkers({ resource: model.uri })));
    };
    report();
    const listener = monaco.editor.onDidChangeMarkers((uris) => {
      const model = editor.getModel();
      if (model !== null && uris.some((uri) => uri.toString() === model.uri.toString())) report();
    });
    return () => listener.dispose();
  }, [editor, language]);

  // A value that arrives from outside (a setting changed, edits discarded) flashes the lines it changed. Text the user
  // typed comes back as the same value and flashes nothing.
  const lastText = useRef<string | undefined>(value);
  const flashes = useRef<MonacoEditorTypes.IEditorDecorationsCollection | null>(null);
  /** Where the user's cursor was, so text replaced from outside does not move it to the end of the file. */
  const userSelection = useRef<MonacoEditorTypes.ICursorSelectionChangedEvent['selection'] | null>(null);
  useEffect(() => {
    if (editor === null || value === undefined) return;
    const before = lastText.current;
    lastText.current = value;
    if (before === undefined || before === value) return;
    // Replacing the whole text leaves the cursor at its end, and Monaco scrolls there: put both back.
    if (userSelection.current === null) editor.setPosition({ lineNumber: 1, column: 1 });
    else editor.setSelection(userSelection.current);
    editor.setScrollLeft(0);
    if (readOnly) return;
    const lines = changedLines(before, value);
    if (lines.length === 0) return;
    flashes.current?.clear();
    flashes.current = editor.createDecorationsCollection(
      lines.map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: 'ws-editor-flash',
          linesDecorationsClassName: 'ws-editor-flash-gutter'
        }
      }))
    );
    editor.revealLinesInCenterIfOutsideViewport(lines[0]!, lines.at(-1)!, monaco.editor.ScrollType.Smooth);
    const timer = setTimeout(() => flashes.current?.clear(), 1800);
    return () => clearTimeout(timer);
  }, [editor, value, readOnly]);

  // Labels: faint text after a line's own, never part of it (copying the file does not copy them). A label that would
  // wrap onto a line of its own is left out: a note is worth having only where it does not move the code.
  const labelDecorations = useRef<MonacoEditorTypes.IEditorDecorationsCollection | null>(null);
  const [columns, setColumns] = useState(0);
  useEffect(() => {
    if (editor === null) return;
    const measure = () => setColumns(editor.getLayoutInfo().viewportColumn);
    measure();
    const listener = editor.onDidLayoutChange(measure);
    return () => listener.dispose();
  }, [editor]);
  useEffect(() => {
    if (editor === null) return;
    labelDecorations.current ??= editor.createDecorationsCollection();
    const model = editor.getModel();
    if (model === null) return;
    labelDecorations.current.set(
      (labels ?? [])
        .filter(
          (label) =>
            label.line >= 1 &&
            label.line <= model.getLineCount() &&
            // The label's sans-serif letters are narrower than the code's: about 0.85 of a column each.
            model.getLineMaxColumn(label.line) + 2 + Math.ceil(label.text.length * 0.85) <= columns
        )
        .map((label) => ({
          range: new monaco.Range(label.line, 1, label.line, model.getLineMaxColumn(label.line)),
          options: {
            showIfCollapsed: true,
            after: {
              content: `\u2003${label.text}`,
              inlineClassName: 'ws-editor-label',
              cursorStops: monaco.editor.InjectedTextCursorStops.None
            },
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        }))
    );
  }, [editor, labels, value, columns]);

  // Sections: a heading in a view zone above its line. The zone's node is under the text layer, so it takes no clicks.
  const [sectionNodes, setSectionNodes] = useState<Array<{ node: HTMLElement; content: ReactNode; line: number }>>([]);
  useLayoutEffect(() => {
    if (editor === null || sections === undefined || sections.length === 0) {
      setSectionNodes([]);
      return;
    }
    const placed: Array<{ node: HTMLElement; content: ReactNode; line: number }> = [];
    const ids: string[] = [];
    editor.changeViewZones((zones) => {
      for (const section of sections) {
        const node = document.createElement('div');
        node.className = 'ws-editor-section';
        ids.push(zones.addZone({ afterLineNumber: section.line - 1, heightInPx: 34, domNode: node }));
        placed.push({ node, content: section.content, line: section.line });
      }
    });
    setSectionNodes(placed);
    return () => {
      editor.changeViewZones((zones) => {
        for (const id of ids) zones.removeZone(id);
      });
    };
  }, [editor, sections]);

  // The block a diagram click picked: its key in the selection's accent, the block marked, and its first lines brought
  // into view unless they are already near the top.
  const highlighted = useRef<MonacoEditorTypes.IEditorDecorationsCollection | null>(null);
  const highlightFrom = highlight?.from;
  const highlightTo = highlight?.to;
  const highlightReveal = highlight?.reveal;
  useEffect(() => {
    if (editor === null) return;
    highlighted.current?.clear();
    if (highlightFrom === undefined || highlightTo === undefined) return;
    highlighted.current = editor.createDecorationsCollection([
      {
        range: new monaco.Range(highlightFrom, 1, highlightFrom, 1),
        options: { isWholeLine: true, className: 'ws-editor-key', linesDecorationsClassName: 'ws-editor-picked-gutter' }
      },
      ...(highlightTo > highlightFrom
        ? [
            {
              range: new monaco.Range(highlightFrom + 1, 1, highlightTo, 1),
              options: {
                isWholeLine: true,
                className: 'ws-editor-picked',
                linesDecorationsClassName: 'ws-editor-picked-gutter is-quiet'
              }
            }
          ]
        : [])
    ]);
    return bringToTop(editor, highlightFrom, false);
  }, [editor, highlightFrom, highlightTo]);
  // Asked again (Show in stacktape.yml), the block comes to the top even when it was in view.
  const lastReveal = useRef(highlightReveal);
  useEffect(() => {
    if (editor === null || highlightFrom === undefined || lastReveal.current === highlightReveal) return;
    lastReveal.current = highlightReveal;
    return bringToTop(editor, highlightFrom, true);
  }, [editor, highlightFrom, highlightReveal]);

  // YAML references to a resource lead to it: `- mainDatabase` under connectTo, `$ResourceParam('mainDatabase', ...)`.
  useEffect(() => {
    if (editor === null || language !== 'yaml' || path !== YAML_PATH) return;
    const modelUri = editor.getModel()?.uri.toString();
    const provider = monaco.languages.registerDefinitionProvider('yaml', {
      provideDefinition: (model, position) => {
        if (model.uri.toString() !== modelUri) return null;
        const word = model.getWordAtPosition(position);
        const names = resourceNamesRef.current;
        if (word === null || names === undefined || names[word.word] === undefined) return null;
        const text = model.getLineContent(position.lineNumber);
        const before = text.slice(0, word.startColumn - 1);
        const isReference =
          /^\s*-\s*['"]?$/.test(before) || /\$\w+\(\s*['"]$/.test(before) || /connectTo:\s*\[?['"]?$/.test(before);
        if (!isReference) return null;
        const line = names[word.word]!;
        const key = model.getLineContent(line).indexOf(word.word) + 1;
        return { uri: model.uri, range: new monaco.Range(line, key, line, key + word.word.length) };
      }
    });
    return () => provider.dispose();
  }, [editor, language, path]);

  const lineNumbers = useMemo(
    () =>
      !showLineNumbers
        ? ('off' as const)
        : lineNumberMap === undefined
          ? ('on' as const)
          : (line: number) => String(lineNumberMap[line - 1] ?? ''),
    [showLineNumbers, lineNumberMap]
  );

  if (types !== 'ready') {
    return (
      <div className="ws-editor-loading">
        {types === 'loading' ? (
          <>
            <Spinner /> Loading the stacktape types…
          </>
        ) : (
          'The stacktape types could not be loaded. Reload the page to try again.'
        )}
      </div>
    );
  }

  return (
    <>
      <MonacoEditor
        className="h-full w-full"
        language={language}
        monaco={sharedMonaco}
        onChange={(next) => {
          lastText.current = next;
          onChange?.(next);
        }}
        onMount={({ editor: mounted }) => {
          const instance = mounted as unknown as MonacoEditorTypes.IStandaloneCodeEditor;
          setEditor(instance);
          let tapDocs: ReturnType<typeof setTimeout> | undefined;
          const selections = instance.onDidChangeCursorSelection((event) => {
            if (event.source !== 'modelChange') userSelection.current = event.selection;
            onCursorLineRef.current?.(event.selection.positionLineNumber);
            // A tap that puts the cursor on a key opens its docs; a drag that selects text does not.
            const { selection } = event;
            if (event.source !== 'mouse' || !docsOnTapRef.current || !selection.isEmpty()) return;
            const model = instance.getModel();
            if (model === null) return;
            if (model.getLanguageId() === 'yaml') {
              const key = keyOn(model.getLineContent(selection.startLineNumber));
              if (key === undefined || selection.startColumn < key.start || selection.startColumn > key.end) return;
            } else if (model.getWordAtPosition(selection.getStartPosition()) === null) {
              return;
            }
            clearTimeout(tapDocs);
            tapDocs = setTimeout(() => openDocs(instance, selection.startLineNumber, selection.startColumn), 120);
          });
          // Marks follow their lines as blocks are inserted above them, and never grow into a block typed at their edge.
          const writing = instance.createDecorationsCollection();
          const written = instance.createDecorationsCollection();
          // The key being written carries the accent its line of code carries in the code window.
          const key = instance.createDecorationsCollection();
          let current: { from: number; to: number } | undefined;
          let fade: ReturnType<typeof setTimeout> | undefined;
          onReadyRef.current?.({
            editor: instance,
            markWriting: (from, to) => {
              current = { from, to };
              writing.set([mark(from, to, 'ws-editor-writing')]);
              key.set([
                {
                  range: new monaco.Range(from, 1, from, 1),
                  options: { isWholeLine: true, className: 'ws-editor-key' }
                }
              ]);
            },
            markWritten: () => {
              const range = writing.getRanges()[0];
              if (range !== undefined && current !== undefined) {
                written.append([mark(range.startLineNumber, range.endLineNumber, 'ws-editor-written')]);
              }
              writing.clear();
              key.clear();
              current = undefined;
            },
            clearMarks: () => {
              const container = instance.getContainerDomNode();
              container.classList.add('ws-editor-marks-fading');
              key.clear();
              fade = setTimeout(() => {
                writing.clear();
                written.clear();
                container.classList.remove('ws-editor-marks-fading');
              }, 700);
            },
            showDocs: (fallbackLine) => {
              const placed = userSelection.current;
              if (placed !== null) openDocs(instance, placed.positionLineNumber, placed.positionColumn);
              else openDocs(instance, fallbackLine ?? 1);
            },
            nextProblem: () => {
              instance.focus();
              instance.trigger('stacktape.wizard.problems', 'editor.action.marker.next', {});
            }
          });
          return () => {
            clearTimeout(fade);
            clearTimeout(tapDocs);
            selections.dispose();
            setEditor(null);
          };
        }}
        options={{
          fontFamily: "ui-monospace, 'SFMono-Regular', 'JetBrains Mono', Menlo, Consolas, monospace",
          fontSize: 13,
          lineHeight: 20,
          minimap: { enabled: false },
          scrollBeyondLastLine,
          // Long values wrap under their key rather than running off the edge: after a space, or inside a long name
          // after a hyphen or slash, never inside a word or after the dot of `$Secret('app-db.password')`.
          wordWrap: 'on',
          wrappingIndent: 'indent',
          wrappingStrategy: 'simple',
          wordWrapBreakBeforeCharacters: '',
          wordWrapBreakAfterCharacters: ' \t})],;|&/-',
          renderLineHighlight: readOnly ? 'none' : 'line',
          padding: { top: 12, bottom: 12 },
          quickSuggestions: { other: true, strings: true, comments: false },
          // The docs card opens under the key, so the key and the lines above it stay in view.
          hover: { delay: 250, above: false },
          fixedOverflowWidgets: true,
          scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
          codeLens: false,
          lineNumbers,
          lineNumbersMinChars: lineNumberMap === undefined ? 3 : 4,
          lineDecorationsWidth: 12,
          folding,
          showFoldingControls: 'mouseover',
          foldingHighlight: false,
          stickyScroll: { enabled: stickyScroll, maxLineCount: 2 },
          glyphMargin: false,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          // Suggestions come from the schema or the types, not from words seen elsewhere in the file.
          suggest: { showWords: false },
          ...(readOnlyMessage === undefined ? {} : { readOnlyMessage: { value: readOnlyMessage } })
        }}
        path={path}
        readOnly={readOnly}
        theme="stacktape-wizard"
        value={value}
      />
      {sectionNodes.map(({ node, content, line }) => createPortal(content, node, String(line)))}
    </>
  );
}
