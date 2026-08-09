import type { MonacoEditor } from 'monaco-types';
import { expect, test } from 'bun:test';
import type { CodeEditorOptions } from './session.js';
import { createEditorSession, nextModelPath } from './session.js';

/**
 * A fake Monaco namespace, recording the calls the session's lifecycle depends on.
 *
 * The session takes its Monaco instance as a parameter, which is what makes this possible: the real
 * failures here — a model outliving its editor, a listener outliving the component, a controlled
 * sync echoing back as a user edit — are ordering bugs, and ordering is exactly what a fake can see.
 */
const createFakeMonaco = () => {
  const log: string[] = [];
  let contentListener: ((event: unknown) => void) | null = null;

  const createModel = (initialValue: string, languageId: string, uri: { toString: () => string }) => {
    const path = uri.toString();
    let text = initialValue;
    let language = languageId;
    const model = {
      id: path,
      isDisposed: false,
      setLanguageId: (next: string) => {
        language = next;
        log.push(`model:${path}:setLanguage:${next}`);
      },
      getValue: () => text,
      setValue: (next: string) => {
        text = next;
        log.push(`model:${path}:setValue`);
        contentListener?.({ kind: 'reset' });
      },
      pushEditOperations: (_before: unknown, operations: { text: string }[]) => {
        text = operations[0]!.text;
        log.push(`model:${path}:pushEdit`);
        contentListener?.({ kind: 'edit' });
        return null;
      },
      getFullModelRange: () => ({}),
      getLanguageId: () => language,
      getLineCount: () => text.split('\n').length,
      dispose: () => {
        model.isDisposed = true;
        log.push(`model:${path}:dispose`);
      }
    };
    log.push(`model:${path}:create`);
    return model;
  };

  type FakeModel = ReturnType<typeof createModel>;
  const models: FakeModel[] = [];
  let attachedModel: FakeModel | null = null;
  let editorDisposed = false;

  const monaco = {
    Uri: { parse: (path: string) => ({ toString: () => path }) },
    editor: {
      createModel: (value: string, languageId: string, uri: { toString: () => string }) => {
        const model = createModel(value, languageId, uri);
        models.push(model);
        return model;
      },
      setTheme: (theme: string) => log.push(`theme:${theme}`),
      setModelLanguage: (model: FakeModel, languageId: string) => model.setLanguageId(languageId),
      create: (_container: unknown, createOptions: { model: FakeModel }) => {
        attachedModel = createOptions.model;
        return {
          getValue: () => attachedModel!.getValue(),
          getModel: () => (editorDisposed ? null : attachedModel),
          setModel: (model: FakeModel) => {
            attachedModel = model;
            log.push(`editor:setModel:${model.id}`);
          },
          onDidChangeModelContent: (listener: (event: unknown) => void) => {
            contentListener = listener;
            return {
              dispose: () => {
                contentListener = null;
                log.push('subscription:dispose');
              }
            };
          },
          pushUndoStop: () => log.push('editor:undoStop'),
          updateOptions: (updated: Record<string, unknown>) =>
            log.push(`editor:updateOptions:${JSON.stringify(updated)}`),
          focus: () => log.push('editor:focus'),
          setPosition: () => log.push('editor:setPosition'),
          revealPositionInCenter: () => log.push('editor:reveal'),
          revealLineInCenterIfOutsideViewport: (line: number) => log.push(`editor:revealLine:${line}`),
          setScrollTop: () => log.push('editor:scrollTop'),
          getAction: (id: string) => ({ run: () => log.push(`action:${id}`) }),
          dispose: () => {
            editorDisposed = true;
            log.push('editor:dispose');
          }
        };
      }
    }
  } as unknown as MonacoEditor;

  return { monaco, log, models, fireContentChange: (event: unknown) => contentListener?.(event) };
};

const startSession = (overrides: Partial<Parameters<typeof createEditorSession>[0]> = {}) => {
  const fake = createFakeMonaco();
  const changes: string[] = [];
  const session = createEditorSession({
    monaco: fake.monaco,
    container: {} as HTMLElement,
    value: 'initial',
    language: 'yaml',
    editorOptions: {},
    readOnly: false,
    onChange: (value) => changes.push(value),
    ...overrides
  });
  return { ...fake, session, changes };
};

test('each session gets a model URI of its own', () => {
  expect(nextModelPath()).not.toBe(nextModelPath());
});

test('an explicit path is used verbatim, so language services see the extension the host chose', () => {
  const { session, log } = startSession({ path: 'file:///stacktape-config-1.yaml' });

  expect(log).toContain('model:file:///stacktape-config-1.yaml:create');
  session.dispose();
});

test('the model is disposed after the editor, not before and not never', () => {
  const { session, log } = startSession();

  session.dispose();

  const editorIndex = log.indexOf('editor:dispose');
  const modelIndex = log.findIndex((entry) => entry.endsWith(':dispose') && entry.startsWith('model:'));
  expect(editorIndex).toBeGreaterThanOrEqual(0);
  expect(modelIndex).toBeGreaterThan(editorIndex);
});

test('disposing tears down content subscriptions and host extensions exactly once', () => {
  const { session, log } = startSession({
    onMount: () => () => log.push('extension:dispose')
  });

  session.dispose();
  session.dispose();

  expect(log.filter((entry) => entry === 'extension:dispose')).toHaveLength(1);
  expect(log.filter((entry) => entry === 'subscription:dispose')).toHaveLength(1);
  expect(log.filter((entry) => entry === 'editor:dispose')).toHaveLength(1);
});

test('host extensions are torn down before the editor they attached to', () => {
  const { session, log } = startSession({ onMount: () => () => log.push('extension:dispose') });

  session.dispose();

  expect(log.indexOf('extension:dispose')).toBeLessThan(log.indexOf('editor:dispose'));
});

test('an onMount disposable is accepted as well as a cleanup function', () => {
  const { session, log } = startSession({
    onMount: () => ({ dispose: () => log.push('extension:dispose') })
  });

  session.dispose();

  expect(log).toContain('extension:dispose');
});

test('a user edit is reported, a controlled sync is not', () => {
  const { session, changes, fireContentChange } = startSession();

  fireContentChange({ kind: 'typed' });
  expect(changes).toEqual(['initial']);

  session.applyValue('from the host', 'edit');
  expect(changes).toEqual(['initial']);
});

test('applying the value the editor already holds does nothing', () => {
  const { session, log } = startSession();

  session.applyValue('initial', 'edit');

  expect(log).not.toContain('editor:undoStop');
});

test('edit mode brackets the change in undo stops; reset mode replaces outright', () => {
  const edited = startSession();
  edited.session.applyValue('next', 'edit');
  expect(edited.log.filter((entry) => entry === 'editor:undoStop')).toHaveLength(2);
  expect(edited.log.some((entry) => entry.endsWith(':pushEdit'))).toBe(true);

  const reset = startSession();
  reset.session.applyValue('next', 'reset');
  expect(reset.log).not.toContain('editor:undoStop');
  expect(reset.log.some((entry) => entry.endsWith(':setValue'))).toBe(true);
});

test('changing the language swaps in a new model, carries the text over and disposes the old one', () => {
  const { session, log, models } = startSession();

  session.applyValue('resources: {}', 'edit');
  session.setLanguage('typescript', 'file:///config.ts');

  expect(models).toHaveLength(2);
  expect(models[1]!.getValue()).toBe('resources: {}');
  expect(models[0]!.isDisposed).toBe(true);
  // The replacement is attached before the old model goes away, so the editor is never modelless.
  expect(log.indexOf('editor:setModel:file:///config.ts')).toBeLessThan(log.indexOf(`model:${models[0]!.id}:dispose`));
});

test('re-setting the same language and path leaves the model alone', () => {
  const { session, models } = startSession({ path: 'file:///config.yaml' });

  session.setLanguage('yaml', 'file:///config.yaml');

  expect(models).toHaveLength(1);
});

test('changing only the language on a pinned path retags the model instead of duplicating its URI', () => {
  // Monaco throws "Cannot add model because it already exists" when a second model is created at a
  // URI it still holds, so a host that pins a path and switches language must not get a new model.
  const { session, models } = startSession({ path: 'file:///config.yaml' });

  session.setLanguage('json', 'file:///config.yaml');

  expect(models).toHaveLength(1);
  expect(models[0]!.isDisposed).toBe(false);
  expect(models[0]!.getLanguageId()).toBe('json');
});

test('changing only the language on a generated path keeps the model and its undo history', () => {
  const { session, models } = startSession();

  session.setLanguage('json');

  expect(models).toHaveLength(1);
  expect(models[0]!.getLanguageId()).toBe('json');
});

test('removing an explicit path gives the model a fresh in-memory identity', () => {
  const { session, models } = startSession({ path: 'file:///config.yaml' });

  session.setLanguage('yaml');

  expect(models).toHaveLength(2);
  expect(models[1]!.id).toStartWith('inmemory://monaco-editor/');
  expect(models[0]!.isDisposed).toBe(true);
});

test('an editor construction failure disposes the model that can no longer be reached', () => {
  const fake = createFakeMonaco();
  const boom = new Error('editor construction failed');
  fake.monaco.editor.create = () => {
    throw boom;
  };

  expect(() =>
    createEditorSession({
      monaco: fake.monaco,
      container: {} as HTMLElement,
      value: 'initial',
      language: 'yaml',
      editorOptions: {},
      readOnly: false,
      onChange: () => undefined
    })
  ).toThrow(boom);

  expect(fake.models[0]!.isDisposed).toBe(true);
});

test('a failed model attachment disposes the replacement and keeps the current model alive', () => {
  const { session, monaco, models } = startSession();
  const boom = new Error('model attachment failed');
  const originalCreate = monaco.editor.create;
  monaco.editor.create = (...arguments_) => {
    const editorInstance = originalCreate(...arguments_);
    editorInstance.setModel = () => {
      throw boom;
    };
    return editorInstance;
  };

  // Start a new session after wrapping editor construction so its editor gets the failing setter.
  session.dispose();
  const replacementSession = createEditorSession({
    monaco,
    container: {} as HTMLElement,
    value: 'initial',
    language: 'yaml',
    editorOptions: {},
    readOnly: false,
    onChange: () => undefined
  });

  expect(() => replacementSession.setLanguage('typescript', 'file:///config.ts')).toThrow(boom);
  expect(models.at(-1)!.isDisposed).toBe(true);
  expect(models.at(-2)!.isDisposed).toBe(false);
  replacementSession.dispose();
});

test('owned construction options never reach Monaco, however they got past the type', () => {
  // The shape a host can build dynamically and spread from a wider object: the type forbids these,
  // but `model` on an update is the crash in microsoft/monaco-editor#2027.
  const smuggled: CodeEditorOptions = {
    lineNumbers: 'off',
    model: {},
    value: 'x',
    language: 'json',
    theme: 'other'
  } as CodeEditorOptions;
  const { session, log } = startSession({ editorOptions: smuggled });

  session.updateOptions(smuggled, true);

  const update = log.find((entry) => entry.startsWith('editor:updateOptions:'))!;
  const applied = JSON.parse(update.slice('editor:updateOptions:'.length)) as Record<string, unknown>;
  expect(applied).toEqual({ lineNumbers: 'off', readOnly: true });
});

test('readOnly comes from its own argument, not from the options bag', () => {
  const { session, log } = startSession({ readOnly: true });

  session.updateOptions({}, false);

  const update = log.find((entry) => entry.startsWith('editor:updateOptions:'))!;
  expect(JSON.parse(update.slice('editor:updateOptions:'.length))).toEqual({ readOnly: false });
});

test('an onMount that throws does not strand the editor and model it was given', () => {
  const fake = createFakeMonaco();
  const boom = new Error('extension failed to install');

  expect(() =>
    createEditorSession({
      monaco: fake.monaco,
      container: {} as HTMLElement,
      value: 'initial',
      language: 'yaml',
      editorOptions: {},
      readOnly: false,
      onChange: () => undefined,
      onMount: () => {
        throw boom;
      }
    })
  ).toThrow(boom);

  // Nothing returned a session, so nothing else could ever dispose these.
  expect(fake.log).toContain('editor:dispose');
  expect(fake.models[0]!.isDisposed).toBe(true);
  expect(fake.log).toContain('subscription:dispose');
});

test('a host disposer that throws still lets the editor and model go, then reports the failure', () => {
  const boom = new Error('decoration teardown failed');
  const { session, log, models } = startSession({
    onMount: () => () => {
      throw boom;
    }
  });

  expect(() => session.dispose()).toThrow(boom);

  expect(log).toContain('subscription:dispose');
  expect(log).toContain('editor:dispose');
  expect(models[0]!.isDisposed).toBe(true);
});

test('a failed teardown is not retried on a second dispose', () => {
  const { session, log } = startSession({
    onMount: () => () => {
      throw new Error('teardown failed');
    }
  });

  expect(() => session.dispose()).toThrow();
  session.dispose();

  expect(log.filter((entry) => entry === 'editor:dispose')).toHaveLength(1);
});

test('scrolling to the bottom targets the last line of the current model', () => {
  const { session, log } = startSession({ value: 'a\nb\nc' });

  session.scrollToBottom();

  expect(log).toContain('editor:revealLine:3');
});
