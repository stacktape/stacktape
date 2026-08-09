import type { editor, IDisposable, MonacoEditor } from 'monaco-types';

/**
 * The imperative half of `MonacoEditor`: everything that owns a Monaco editor, its model and its
 * subscriptions, with no React in sight.
 *
 * Monaco's lifecycle is easy to get wrong from inside effects — models outlive editors, listeners
 * outlive components, and a stale closure silently reports the wrong value. Keeping it here means
 * the ordering is written once, in one place, and can be tested against a fake Monaco namespace
 * without a DOM.
 *
 * The Monaco namespace is passed in rather than imported. There must be exactly one Monaco instance
 * on a page — the host's language providers, themes and workers are registered against it — and a
 * package that imported its own copy would quietly get a second one.
 */

export type EditorSessionCleanup = void | (() => void) | IDisposable;

/**
 * Construction options the component owns, and a consumer therefore cannot set.
 *
 * `model`, `value` and `language` are the editor's identity, which this session creates and swaps.
 * `readOnly` and `theme` have props of their own. Letting any of them through would mean two owners
 * for one piece of state — and `model` in particular is forwarded to `updateOptions` on every
 * change, where Monaco crashes on a second model (microsoft/monaco-editor#2027).
 */
const OWNED_OPTION_KEYS = ['model', 'value', 'language', 'readOnly', 'theme'] as const;

type OwnedOptionKey = (typeof OWNED_OPTION_KEYS)[number];

/** Construction options a consumer may set. */
export type CodeEditorOptions = Omit<editor.IStandaloneEditorConstructionOptions, OwnedOptionKey>;

/**
 * Drops owned keys. The type already forbids them, but options are the one prop hosts build
 * dynamically and spread from wider objects, so an owned key can arrive from code that type-checked
 * — and `updateOptions` turns it into a crash rather than a compile error.
 */
const withoutOwnedOptions = (options: CodeEditorOptions = {}): CodeEditorOptions => {
  const sanitized: CodeEditorOptions = { ...options };
  for (const key of OWNED_OPTION_KEYS) {
    delete (sanitized as Partial<Record<OwnedOptionKey, unknown>>)[key];
  }
  return sanitized;
};

export type EditorSessionMountContext = {
  editor: editor.IStandaloneCodeEditor;
  monaco: MonacoEditor;
  container: HTMLElement;
};

export type EditorSessionOptions = {
  monaco: MonacoEditor;
  container: HTMLElement;
  /** Initial text. */
  value: string;
  language: string;
  /**
   * The model's URI. Language services key off it: the TypeScript worker identifies files by path,
   * and schema associations match on extension. Defaults to a unique in-memory path.
   */
  path?: string | undefined;
  theme?: string | undefined;
  /** Consumer options. Owned fields are stripped before they reach Monaco. */
  editorOptions: CodeEditorOptions;
  readOnly: boolean;
  /**
   * Fired for edits the user made. Edits this session applies itself while syncing a controlled
   * value are deliberately excluded — otherwise the host would echo its own value back.
   */
  onChange: (value: string, event: editor.IModelContentChangedEvent) => void;
  /**
   * Runs once, after the editor exists. Anything the host installs here — decorations, commands,
   * extra listeners — is torn down by the cleanup it returns when the session is disposed.
   */
  onMount?: ((context: EditorSessionMountContext) => EditorSessionCleanup) | undefined;
};

/** How a new controlled value replaces the current text. */
export type ValueUpdateMode =
  /** An undoable edit. Keeps the user's undo history usable. */
  | 'edit'
  /** A full model reset. For text the host is streaming in, where undo history is noise. */
  | 'reset';

let nextInstanceNumber = 0;

/**
 * Every session gets its own model URI. Monaco throws when two models share one, and a wall-clock
 * timestamp is not unique enough — two editors mounted in the same millisecond collide.
 */
export const nextModelPath = (): string => {
  nextInstanceNumber += 1;
  return `inmemory://monaco-editor/${nextInstanceNumber}`;
};

export type EditorSession = {
  getEditor: () => editor.IStandaloneCodeEditor;
  getValue: () => string;
  /** Syncs the controlled value. A value equal to the current text is ignored. */
  applyValue: (value: string, mode: ValueUpdateMode) => void;
  /** Swaps in a fresh model, carrying the current text across. */
  setLanguage: (language: string, path?: string) => void;
  updateOptions: (options: CodeEditorOptions | undefined, readOnly: boolean) => void;
  setTheme: (theme: string) => void;
  focus: () => void;
  setPosition: (position: { lineNumber: number; column: number }, reveal?: boolean) => void;
  scrollToBottom: () => void;
  runAction: (actionId: string) => void;
  dispose: () => void;
};

export const createEditorSession = ({
  monaco,
  container,
  value,
  language,
  path,
  theme,
  editorOptions,
  readOnly,
  onChange,
  onMount
}: EditorSessionOptions): EditorSession => {
  let modelPath = path ?? nextModelPath();
  let hasExplicitModelPath = path !== undefined;
  let model = monaco.editor.createModel(value, language, monaco.Uri.parse(modelPath));

  let codeEditor: editor.IStandaloneCodeEditor;
  try {
    codeEditor = monaco.editor.create(container, { ...withoutOwnedOptions(editorOptions), readOnly, model });
  } catch (error) {
    model.dispose();
    throw error;
  }

  if (theme) {
    monaco.editor.setTheme(theme);
  }

  // Set while this session writes to the model itself, so a controlled-value sync is not reported
  // back to the host as a user edit.
  let isApplyingValue = false;

  const subscriptions: IDisposable[] = [
    codeEditor.onDidChangeModelContent((event) => {
      if (!isApplyingValue) {
        onChange(codeEditor.getValue(), event);
      }
    })
  ];

  let isDisposed = false;

  /**
   * Tears everything down in the order that leaves nothing behind: host extensions first, because
   * they may hold decorations on the model; then the content subscription; then the editor; then the
   * model, which is captured beforehand because a disposed editor reports no model.
   *
   * Every step runs even if an earlier one throws — a host disposer that fails must not strand an
   * editor and a model. The first failure is rethrown once the teardown is complete.
   */
  const disposeAll = (cleanup: EditorSessionCleanup) => {
    if (isDisposed) {
      return;
    }
    isDisposed = true;

    let firstFailure: unknown;
    const step = (run: () => void) => {
      try {
        run();
      } catch (error) {
        firstFailure ??= error;
      }
    };

    step(() => {
      if (typeof cleanup === 'function') {
        cleanup();
      } else if (cleanup) {
        cleanup.dispose();
      }
    });

    for (const subscription of subscriptions) {
      step(() => subscription.dispose());
    }

    const ownedModel = model;
    step(() => codeEditor.dispose());
    step(() => ownedModel.dispose());

    if (firstFailure !== undefined) {
      throw firstFailure;
    }
  };

  let mountCleanup: EditorSessionCleanup;
  try {
    mountCleanup = onMount?.({ editor: codeEditor, monaco, container });
  } catch (error) {
    // The editor and model already exist. Without this they would leak: the caller never receives a
    // session, so nothing else can ever dispose them.
    try {
      disposeAll(undefined);
    } catch {
      // The host's failure is the one worth reporting; a teardown failure while handling it is not.
    }
    throw error;
  }

  return {
    getEditor: () => codeEditor,
    getValue: () => codeEditor.getValue(),

    applyValue: (nextValue, mode) => {
      if (nextValue === codeEditor.getValue()) {
        return;
      }

      isApplyingValue = true;
      try {
        if (mode === 'reset') {
          model.setValue(nextValue);
        } else {
          codeEditor.pushUndoStop();
          model.pushEditOperations([], [{ range: model.getFullModelRange(), text: nextValue }], () => null);
          codeEditor.pushUndoStop();
        }
      } finally {
        isApplyingValue = false;
      }
    },

    setLanguage: (nextLanguage, nextPath) => {
      const nextPathIsExplicit = nextPath !== undefined;
      const keepsCurrentPath = nextPathIsExplicit ? nextPath === modelPath : !hasExplicitModelPath;
      if (nextLanguage === model.getLanguageId() && keepsCurrentPath) {
        return;
      }

      // The URI is not moving, so a replacement model could carry nothing this one does not already
      // have — and Monaco throws "Cannot add model because it already exists" when a model is created
      // at a URI it still holds. Retag the model that is there.
      //
      // This is the ordinary path for a host that pins an explicit path and switches language on it,
      // which is why the crash was reachable from a plain `language` prop change.
      if (keepsCurrentPath) {
        monaco.editor.setModelLanguage(model, nextLanguage);
        hasExplicitModelPath = nextPathIsExplicit;
        return;
      }

      // A new model rather than `setModelLanguage`, because the URI carries the language too: the
      // TypeScript worker will not treat a `.yaml` path as TypeScript however it is tagged.
      const previousModel = model;
      const replacementPath = nextPath ?? nextModelPath();
      const replacementModel = monaco.editor.createModel(
        previousModel.getValue(),
        nextLanguage,
        monaco.Uri.parse(replacementPath)
      );
      try {
        codeEditor.setModel(replacementModel);
      } catch (error) {
        replacementModel.dispose();
        throw error;
      }
      modelPath = replacementPath;
      hasExplicitModelPath = nextPathIsExplicit;
      model = replacementModel;
      previousModel.dispose();
    },

    updateOptions: (options, nextReadOnly) =>
      codeEditor.updateOptions({ ...withoutOwnedOptions(options), readOnly: nextReadOnly }),
    setTheme: (nextTheme) => monaco.editor.setTheme(nextTheme),
    focus: () => codeEditor.focus(),

    setPosition: (position, reveal = true) => {
      codeEditor.setPosition(position);
      if (reveal) {
        codeEditor.revealPositionInCenter(position);
      }
    },

    scrollToBottom: () => {
      codeEditor.revealLineInCenterIfOutsideViewport(model.getLineCount());
      codeEditor.setScrollTop(Number.MAX_SAFE_INTEGER);
    },

    runAction: (actionId) => {
      codeEditor.getAction(actionId)?.run();
    },

    dispose: () => disposeAll(mountCleanup)
  };
};
