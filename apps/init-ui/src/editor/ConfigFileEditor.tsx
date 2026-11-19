import type { editor as MonacoEditorTypes } from 'monaco-editor/editor/editor.api.js';
import { MonacoEditor } from '@stacktape/ui-react/monaco-editor';
import { getYamlModelPath } from '@stacktape/ui-react/monaco-yaml/model-path';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { changedLines } from './line-diff';
import { monaco, sharedMonaco, stacktapeYaml } from './monaco-setup';

const YAML_PATH = getYamlModelPath({ editorNumber: 1, intellisense: true });

export type EditorProblems = { count: number; first?: { line: number; message: string } };

/** A clickable note above a line: "Postgres database · $15/mo", "why: package.json:29". */
export type EditorLens = { line: number; title: string; onClick: () => void };

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
   * Shows the schema docs, the same card a hover shows, for the key on the cursor's line, or on `fallbackLine` while
   * the cursor has not been placed. Without a pointer to hover with, this is how docs are read.
   */
  showDocs: (fallbackLine?: number) => void;
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
  const key = keyOn(model.getLineContent(line));
  const at =
    key === undefined
      ? (column ?? 1)
      : column !== undefined && column >= key.start && column <= key.end
        ? column
        : key.start;
  editor.setPosition({ lineNumber: line, column: at });
  editor.revealLineInCenterIfOutsideViewport(line, monaco.editor.ScrollType.Smooth);
  editor.trigger('stacktape.wizard.docs', 'editor.action.showHover', { focus: false });
};

let lensCommand = 0;

/** Where to scroll for a line to show at the top with the lens above it: never under the editor's own edge. */
const lensTop = (editor: MonacoEditorTypes.IStandaloneCodeEditor, line: number) =>
  Math.max(0, editor.getTopForLineNumber(line, true) - 4);

/**
 * Scrolls a line and its lens to the top: always, or only when they are out of view or low in it. It waits for the
 * editor's layout (a file view just shown has none yet) and looks again once the lenses have been drawn above it.
 */
const bringToTop = (editor: MonacoEditorTypes.IStandaloneCodeEditor, line: number, always: boolean) => {
  let placed = false;
  const place = (again: boolean) => {
    const top = lensTop(editor, line);
    const scrolled = editor.getScrollTop();
    if (!again && !always && top >= scrolled && top <= scrolled + editor.getLayoutInfo().height * 0.5) return;
    placed = true;
    if (Math.abs(top - scrolled) < 2) return;
    editor.setScrollTop(top, again ? monaco.editor.ScrollType.Immediate : monaco.editor.ScrollType.Smooth);
  };
  const first = setTimeout(() => place(false), 40);
  const settled = setTimeout(() => placed && place(true), 420);
  return () => {
    clearTimeout(first);
    clearTimeout(settled);
  };
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

/**
 * The configuration file in Monaco: YAML editable with the Stacktape schema (hover documentation, Ctrl+Space
 * completion, validation), TypeScript shown read-only.
 *
 * Besides the text it shows what the workspace knows about the file: a lens above each resource, the block a diagram
 * click points at, the lines a setting just rewrote (they flash), and an inline peek at the code a resource came from.
 *
 * The default export is the lazy chunk boundary: Monaco and its workers load only when this is rendered.
 */
export default function ConfigFileEditor({
  value,
  language,
  readOnly,
  readOnlyMessage,
  onChange,
  onProblems,
  onReady,
  lenses,
  highlight,
  peek,
  showLineNumbers = true,
  scrollBeyondLastLine = false,
  docsOnTap = false
}: {
  /** The text. Undefined while the host types it in itself (the reveal), through `onReady`. */
  value: string | undefined;
  language: 'yaml' | 'typescript';
  readOnly: boolean;
  /** Said when someone types into the read-only editor. */
  readOnlyMessage?: string;
  onChange: (value: string) => void;
  onProblems: (problems: EditorProblems) => void;
  onReady?: (handle: ConfigEditorHandle) => void;
  lenses?: readonly EditorLens[];
  /**
   * Lines to mark and bring into view, e.g. the resource a diagram click picked: its key line (`from`) carries the
   * selection's accent, the rest of the block a quieter one. A new `reveal` brings it into view again.
   */
  highlight?: { from: number; to: number; reveal?: number } | undefined;
  /** An inline panel under a line, pushing the lines below it down. */
  peek?: { afterLine: number; height: number; content: ReactNode } | undefined;
  /** Off while the file is still empty: a lone "1" is noise. */
  showLineNumbers?: boolean;
  /** Lets the last lines scroll up past the bottom, for a host that positions lines itself. */
  scrollBeyondLastLine?: boolean;
  /** A touch screen has no hover: a tap on a key opens its docs instead. */
  docsOnTap?: boolean;
}) {
  const [path] = useState(() => (language === 'yaml' ? YAML_PATH : 'file:///stacktape.ts'));
  const [editor, setEditor] = useState<MonacoEditorTypes.IStandaloneCodeEditor | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const docsOnTapRef = useRef(docsOnTap);
  docsOnTapRef.current = docsOnTap;

  useEffect(() => {
    if (language !== 'yaml') return;
    stacktapeYaml.setModelSettings(YAML_PATH, {
      isIntellisenseEnabled: true,
      rootSchemaIdentifier: null,
      onDiagnostics: (diagnostics) => {
        const errors = diagnostics.filter((entry) => entry.severity >= monaco.MarkerSeverity.Warning);
        const first = errors[0];
        onProblems({
          count: errors.length,
          ...(first === undefined ? {} : { first: { line: first.startLineNumber, message: first.message } })
        });
      }
    });
    return () => stacktapeYaml.removeModelSettings(YAML_PATH);
  }, [language, onProblems]);

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
  }, [editor, value]);

  // Lenses: one provider for this model, refreshed whenever the host's list changes.
  const lensesRef = useRef(lenses ?? []);
  const lensChanged = useRef<{ fire: () => void } | null>(null);
  useEffect(() => {
    lensesRef.current = lenses ?? [];
    lensChanged.current?.fire();
  }, [lenses]);
  useEffect(() => {
    if (editor === null || language !== 'yaml') return;
    const commandId = `stacktape.wizard.lens.${(lensCommand += 1)}`;
    const command = monaco.editor.registerCommand(commandId, (_accessor, index: number) =>
      lensesRef.current[index]?.onClick()
    );
    const emitter = new monaco.Emitter<monaco.languages.CodeLensProvider>();
    const modelUri = editor.getModel()?.uri.toString();
    const provider: monaco.languages.CodeLensProvider = {
      onDidChange: emitter.event,
      provideCodeLenses: (model) => ({
        lenses:
          model.uri.toString() !== modelUri
            ? []
            : lensesRef.current
                .map((lens, index) => ({ lens, index }))
                .filter(({ lens }) => lens.line >= 1 && lens.line <= model.getLineCount())
                .map(({ lens, index }) => ({
                  range: new monaco.Range(lens.line, 1, lens.line, 1),
                  command: { id: commandId, title: lens.title, arguments: [index] }
                })),
        dispose: () => {}
      })
    };
    const registration = monaco.languages.registerCodeLensProvider('yaml', provider);
    lensChanged.current = { fire: () => emitter.fire(provider) };
    return () => {
      lensChanged.current = null;
      registration.dispose();
      command.dispose();
      emitter.dispose();
    };
  }, [editor, language]);

  // The block a diagram click picked: its key in the selection's accent, the block marked, and its lens and first
  // lines brought into view unless they are already near the top.
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

  // The peek: a view zone keeps the space under its line, and an overlay widget on top of it holds the content, so the
  // panel takes clicks (a zone sits under the text layer, which would take them instead). VS Code's peek works the same.
  const [peekNode, setPeekNode] = useState<HTMLElement | null>(null);
  const peekLine = peek?.afterLine;
  const peekHeight = peek?.height;
  useLayoutEffect(() => {
    if (editor === null || peekLine === undefined || peekHeight === undefined) {
      setPeekNode(null);
      return;
    }
    const node = document.createElement('div');
    node.className = 'ws-editor-peek-zone';
    node.addEventListener('mousedown', (event) => event.stopPropagation());
    const fit = () => {
      const layout = editor.getLayoutInfo();
      node.style.left = `${layout.contentLeft}px`;
      node.style.width = `${Math.max(240, layout.contentWidth - layout.verticalScrollbarWidth)}px`;
    };
    fit();
    const layoutChanged = editor.onDidLayoutChange(fit);
    const widget: MonacoEditorTypes.IOverlayWidget = {
      getId: () => 'stacktape.wizard.peek',
      getDomNode: () => node,
      getPosition: () => null
    };
    editor.addOverlayWidget(widget);
    let zoneId = '';
    editor.changeViewZones((zones) => {
      zoneId = zones.addZone({
        afterLineNumber: peekLine,
        heightInPx: peekHeight,
        domNode: document.createElement('div'),
        onDomNodeTop: (top) => {
          node.style.top = `${top}px`;
        },
        onComputedHeight: (height) => {
          node.style.height = `${height}px`;
        }
      });
    });
    setPeekNode(node);
    // The line the peek explains comes to the top with its lens, so the panel is read under them.
    const top = lensTop(editor, peekLine);
    const scrolled = editor.getScrollTop();
    if (top < scrolled || top + peekHeight + 60 > scrolled + editor.getLayoutInfo().height) {
      editor.setScrollTop(top, monaco.editor.ScrollType.Smooth);
    }
    return () => {
      layoutChanged.dispose();
      editor.changeViewZones((zones) => zones.removeZone(zoneId));
      editor.removeOverlayWidget(widget);
      setPeekNode(null);
    };
  }, [editor, peekLine, peekHeight]);

  return (
    <>
      <MonacoEditor
        className="h-full w-full"
        language={language}
        monaco={sharedMonaco}
        onChange={(next) => {
          lastText.current = next;
          onChange(next);
        }}
        onMount={({ editor: mounted }) => {
          const instance = mounted as unknown as MonacoEditorTypes.IStandaloneCodeEditor;
          setEditor(instance);
          let tapDocs: ReturnType<typeof setTimeout> | undefined;
          const selections = instance.onDidChangeCursorSelection((event) => {
            if (event.source !== 'modelChange') userSelection.current = event.selection;
            // A tap that puts the cursor on a key opens its docs; a drag that selects text does not.
            const { selection } = event;
            if (event.source !== 'mouse' || !docsOnTapRef.current || !selection.isEmpty()) return;
            const key = keyOn(instance.getModel()?.getLineContent(selection.startLineNumber) ?? '');
            if (key === undefined || selection.startColumn < key.start || selection.startColumn > key.end) return;
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
          codeLens: language === 'yaml',
          codeLensFontFamily: 'Montserrat, ui-sans-serif, system-ui, sans-serif',
          codeLensFontSize: 11,
          lineNumbers: showLineNumbers ? 'on' : 'off',
          lineNumbersMinChars: 3,
          lineDecorationsWidth: 12,
          folding: false,
          stickyScroll: { enabled: false },
          glyphMargin: false,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          ...(readOnlyMessage === undefined ? {} : { readOnlyMessage: { value: readOnlyMessage } })
        }}
        path={path}
        readOnly={readOnly}
        theme="stacktape-wizard"
        value={value}
      />
      {peekNode !== null && peek !== undefined && createPortal(peek.content, peekNode)}
    </>
  );
}
