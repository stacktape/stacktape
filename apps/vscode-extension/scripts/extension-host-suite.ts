/* oxlint-disable no-await-in-loop -- Poll host state and exercise documents in sequence because VS Code has one active editor. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { commands, extensions, languages, tasks, Uri, window, workspace, WorkspaceEdit, Range, Position } from 'vscode';
import type { CodeLens } from 'vscode';

const waitFor = async <T>(
  read: () => T | PromiseLike<T>,
  accept: (value: T) => boolean,
  message: string
): Promise<T> => {
  const expires = Date.now() + 15_000;
  while (Date.now() < expires) {
    const value = await read();
    if (accept(value)) return value;
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(message);
};

const write = async (path: string, content: string) => {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, content);
};

const lensesFor = (uri: Uri) => commands.executeCommand<CodeLens[]>('vscode.executeCodeLensProvider', uri);

/** Invoked by VS Code's extension test host, with the real vscode API and the compiled extension. */
export const run = async () => {
  const root = process.env.STP_J12_HOST_FIXTURE;
  assert(root, 'The host runner must supply its isolated workspace');
  const extension = extensions.getExtension('stacktape.vscode-stacktape');
  assert(extension, 'The development extension must be discoverable');
  const rootUri = Uri.file(join(root, 'stacktape.yml'));
  const rootDocument = await workspace.openTextDocument(rootUri);
  await window.showTextDocument(rootDocument);
  assert.equal(rootDocument.languageId, 'stacktape', 'The filename contribution must select Stacktape automatically');
  await waitFor(() => extension.isActive, Boolean, 'Opening a Stacktape document did not activate the extension');

  const fallback = await waitFor(
    () => lensesFor(rootUri),
    (lenses) =>
      Boolean(lenses?.some((lens) => lens.command?.title === 'Stacktape schema: bundled with extension 1.0.0')),
    'The extension host did not expose the bundled schema CodeLens'
  );
  assert(
    fallback?.some(
      (lens) =>
        lens.command?.command === 'stacktape.openExternal' &&
        lens.command.arguments?.[0] === 'https://docs.stacktape.com/'
    )
  );
  const registered = await commands.getCommands(true);
  for (const command of ['stacktape.validate', 'stacktape.preview', 'stacktape.deploy', 'stacktape.openExternal']) {
    assert(registered.includes(command), `${command} must be registered by activation`);
  }
  console.info('PASS host automatic activation, filename association, bundled schema and registered commands');

  // Two different installed versions in one workspace: the nearest package must own validation for its document.
  const parent = join(root, 'project');
  const nested = join(parent, 'nested');
  for (const [directory, version, required] of [
    [parent, '4.0.0-j12-parent', 'parentRequired'],
    [nested, '4.0.0-j12-nested', 'nestedRequired']
  ] as const) {
    await write(join(directory, 'node_modules/stacktape/package.json'), JSON.stringify({ name: 'stacktape', version }));
    await write(
      join(directory, 'node_modules/stacktape/bin/config-schema.json'),
      JSON.stringify({
        type: 'object',
        properties: { [required]: { type: 'string' } },
        required: [required]
      })
    );
    const path = join(directory, 'stacktape.yml');
    await write(path, '{}\n');
    const uri = Uri.file(path);
    const document = await workspace.openTextDocument(uri);
    await window.showTextDocument(document);
    await waitFor(
      () => lensesFor(uri),
      (lenses) =>
        Boolean(lenses?.some((lens) => lens.command?.title === `Stacktape schema: Stacktape ${version} (project)`)),
      `The CodeLens did not identify ${version}`
    );
    await waitFor(
      () => languages.getDiagnostics(uri),
      (diagnostics) => diagnostics.some(({ message }) => message.includes(required)),
      `Validation did not use the ${version} schema`
    );
    const edit = new WorkspaceEdit();
    edit.replace(
      uri,
      new Range(new Position(0, 0), document.positionAt(document.getText().length)),
      `${required}: satisfied\n`
    );
    assert(await workspace.applyEdit(edit));
    await waitFor(
      () => languages.getDiagnostics(uri),
      (diagnostics) => diagnostics.length === 0,
      'Schema diagnostics did not clear after correcting the document'
    );
  }
  console.info('PASS host nearest installed schema selection, diagnostics and correction');

  const unrelated = await workspace.openTextDocument({
    language: 'plaintext',
    content: 'This is not a Stacktape config.'
  });
  await window.showTextDocument(unrelated);
  let startedTasks = 0;
  const listener = tasks.onDidStartTask(() => {
    startedTasks += 1;
  });
  try {
    for (const command of ['stacktape.validate', 'stacktape.preview', 'stacktape.deploy']) {
      const pending = commands.executeCommand(command);
      await commands.executeCommand('notifications.clearAll');
      await pending;
    }
    assert.equal(startedTasks, 0, 'Commands must reject an unrelated active document before starting a task');
  } finally {
    listener.dispose();
  }
  console.info('PASS host command dispatch refuses an unrelated document');
};
