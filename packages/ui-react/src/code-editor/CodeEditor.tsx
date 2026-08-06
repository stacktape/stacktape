import type { editor, MonacoEditor } from 'monaco-types';
import type { CSSProperties, Ref } from 'react';
import type {
  CodeEditorOptions,
  EditorSession,
  EditorSessionCleanup,
  EditorSessionMountContext,
  ValueUpdateMode
} from './session.js';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { createEditorSession } from './session.js';

export type { CodeEditorOptions, EditorSessionCleanup, EditorSessionMountContext, ValueUpdateMode };

/** What a host can drive imperatively. Cursor, focus and scrolling are moments, not state. */
export type CodeEditorHandle = {
  /** The underlying editor, or null before mount and after unmount. */
  getEditor: () => editor.IStandaloneCodeEditor | null;
  getValue: () => string;
  focus: () => void;
  /** Moves the cursor and, unless told otherwise, scrolls the position into view. */
  setPosition: (position: { lineNumber: number; column: number }, reveal?: boolean) => void;
  scrollToBottom: () => void;
  /** Runs a registered editor action, e.g. `editor.action.formatDocument`. */
  runAction: (actionId: string) => void;
};

export type CodeEditorProps = {
  /**
   * The host's Monaco namespace.
   *
   * Passed in rather than imported so there is exactly one Monaco on the page: the host registers
   * languages, themes and workers against it, and a second copy would silently ignore all of them.
   * It also keeps Monaco out of every other entry point in this package.
   */
  monaco: MonacoEditor;
  /** Controlled text. Leave it undefined to let the editor own its content after `defaultValue`. */
  value?: string | undefined;
  defaultValue?: string | undefined;
  language: string;
  /**
   * The model's URI. Language services key off it, so a host with language-specific tooling should
   * supply a path whose extension matches. Defaults to a unique in-memory path.
   */
  path?: string | undefined;
  readOnly?: boolean | undefined;
  theme?: string | undefined;
  /**
   * Merged over the component's own defaults and re-applied when it changes.
   *
   * The editor's own state — model, value, language, readOnly, theme — is not settable here; each has
   * a prop, and two owners for one of them is how Monaco ends up crashing on an update.
   */
  options?: CodeEditorOptions | undefined;
  /** How a new `value` replaces the current text. Defaults to an undoable edit. */
  valueUpdateMode?: ValueUpdateMode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  onChange?: ((value: string, event: editor.IModelContentChangedEvent) => void) | undefined;
  /**
   * The extension point. Runs once, after the editor exists; install decorations, commands and
   * listeners here and return their disposer. Nothing installed here survives unmount.
   */
  onMount?: ((context: EditorSessionMountContext) => EditorSessionCleanup) | undefined;
  ref?: Ref<CodeEditorHandle>;
};

const BASE_OPTIONS: CodeEditorOptions = {
  automaticLayout: true,
  tabSize: 2
};

/**
 * A controlled Monaco editor.
 *
 * It owns exactly one editor and one model, and it is deliberately incurious about what is being
 * edited: no language configuration, no schemas, no toolbar. A host composes those on top through
 * `onMount` and the imperative handle.
 *
 * Callback and object props are read through refs, so changing an inline `onChange` or `options`
 * literal never tears the editor down — only `language`, `path` and the Monaco namespace itself
 * change the editor's identity.
 */
export function CodeEditor({
  monaco,
  value,
  defaultValue = '',
  language,
  path,
  readOnly = false,
  theme,
  options,
  valueUpdateMode = 'edit',
  className,
  style,
  onChange,
  onMount,
  ref
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<EditorSession | null>(null);

  // Latest props, read from long-lived Monaco listeners. Without this the listener registered at
  // creation would keep calling the first render's callbacks forever.
  const latest = useRef({ onChange, onMount, options, readOnly, value, defaultValue, theme });
  latest.current = { onChange, onMount, options, readOnly, value, defaultValue, theme };

  useImperativeHandle(
    ref,
    () => ({
      getEditor: () => sessionRef.current?.getEditor() ?? null,
      getValue: () => sessionRef.current?.getValue() ?? '',
      focus: () => sessionRef.current?.focus(),
      setPosition: (position, reveal) => sessionRef.current?.setPosition(position, reveal),
      scrollToBottom: () => sessionRef.current?.scrollToBottom(),
      runAction: (actionId) => sessionRef.current?.runAction(actionId)
    }),
    []
  );

  // Creation. `language` and `path` are the only props that can force a new editor, and even they
  // are handled by swapping the model below rather than by re-running this effect.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const initial = latest.current;
    const session = createEditorSession({
      monaco,
      container,
      value: typeof initial.value === 'string' ? initial.value : initial.defaultValue,
      language,
      path,
      theme: initial.theme,
      editorOptions: { ...BASE_OPTIONS, ...initial.options },
      readOnly: initial.readOnly,
      onChange: (nextValue, event) => latest.current.onChange?.(nextValue, event),
      onMount: (context) => latest.current.onMount?.(context)
    });
    sessionRef.current = session;

    return () => {
      sessionRef.current = null;
      session.dispose();
    };
    // `language`/`path` are intentionally absent: a change there swaps the model in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monaco]);

  useEffect(() => {
    sessionRef.current?.setLanguage(language, path);
  }, [language, path]);

  useEffect(() => {
    if (typeof value === 'string') {
      sessionRef.current?.applyValue(value, valueUpdateMode);
    }
  }, [value, valueUpdateMode]);

  // Options are objects a host usually writes inline, so they are compared by Monaco rather than by
  // identity here: `updateOptions` diffs internally and ignores a no-op.
  useEffect(() => {
    sessionRef.current?.updateOptions({ ...BASE_OPTIONS, ...options }, readOnly);
  });

  useEffect(() => {
    if (theme) {
      sessionRef.current?.setTheme(theme);
    }
  }, [theme]);

  return <div className={className} ref={containerRef} style={{ height: '100%', ...style }} />;
}
