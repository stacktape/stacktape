import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type JsonRpcMessage = {
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
};

type PendingRequest = {
  reject: (reason: Error) => void;
  resolve: (value: unknown) => void;
  timer: NodeJS.Timeout;
};

class LspClient {
  readonly #child: ChildProcessWithoutNullStreams;
  readonly #notifications: JsonRpcMessage[] = [];
  readonly #pending = new Map<number, PendingRequest>();
  #buffer = Buffer.alloc(0);
  #nextId = 1;
  #stderr = '';

  constructor(serverPath: string, workingDirectory: string) {
    this.#child = spawn(process.execPath, [serverPath, '--stdio'], { cwd: workingDirectory });
    this.#child.stderr.on('data', (chunk: Buffer) => {
      this.#stderr += chunk.toString();
    });
    this.#child.stdout.on('data', (chunk: Buffer) => {
      this.#buffer = Buffer.concat([this.#buffer, chunk]);
      this.#readMessages();
    });
    this.#child.on('exit', (code) => {
      for (const request of this.#pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error(`Language server exited with code ${code}.\n${this.#stderr}`));
      }
      this.#pending.clear();
    });
  }

  notify(method: string, params: unknown): void {
    this.#send({ jsonrpc: '2.0', method, params });
  }

  request(method: string, params: unknown, timeoutMs = 5_000): Promise<unknown> {
    const id = this.#nextId++;
    return new Promise((resolveRequest, rejectRequest) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        rejectRequest(new Error(`Timed out waiting for ${method}.\n${this.#stderr}`));
      }, timeoutMs);
      this.#pending.set(id, { reject: rejectRequest, resolve: resolveRequest, timer });
      this.#send({ jsonrpc: '2.0', id, method, params });
    });
  }

  async waitForNotification(
    method: string,
    predicate: (params: unknown) => boolean,
    timeoutMs = 5_000
  ): Promise<unknown> {
    const started = Date.now();
    for (;;) {
      const notification = this.#notifications.find(
        (candidate) => candidate.method === method && predicate(candidate.params)
      );
      if (notification) {
        return notification.params;
      }
      if (Date.now() - started >= timeoutMs) {
        throw new Error(`Timed out waiting for ${method}.\n${this.#stderr}`);
      }
      // Notifications arrive from a child process, so this loop intentionally yields
      // until the matching message or the explicit deadline.
      // oxlint-disable-next-line no-await-in-loop
      await new Promise((resolveWait) => setTimeout(resolveWait, 20));
    }
  }

  async close(): Promise<void> {
    try {
      await this.request('shutdown', null, 2_000);
      this.notify('exit', null);
    } catch {
      // A failed smoke test can mean that the server never started. Cleanup should
      // not replace that original failure with a second shutdown error.
    } finally {
      setTimeout(() => this.#child.kill(), 500).unref();
    }
  }

  #readMessages(): void {
    for (;;) {
      const headerEnd = this.#buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        return;
      }
      const lengthMatch = /Content-Length: (\d+)/i.exec(this.#buffer.subarray(0, headerEnd).toString());
      if (!lengthMatch?.[1]) {
        this.#buffer = this.#buffer.subarray(headerEnd + 4);
        continue;
      }
      const bodyStart = headerEnd + 4;
      const bodyLength = Number(lengthMatch[1]);
      if (this.#buffer.length < bodyStart + bodyLength) {
        return;
      }
      const message = JSON.parse(this.#buffer.subarray(bodyStart, bodyStart + bodyLength).toString()) as JsonRpcMessage;
      this.#buffer = this.#buffer.subarray(bodyStart + bodyLength);
      this.#receive(message);
    }
  }

  #receive(message: JsonRpcMessage): void {
    if (message.id !== undefined && !message.method) {
      const pending = this.#pending.get(message.id);
      if (!pending) {
        return;
      }
      clearTimeout(pending.timer);
      this.#pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(JSON.stringify(message.error)));
      } else {
        pending.resolve(message.result);
      }
      return;
    }
    this.#notifications.push(message);
  }

  #send(message: JsonRpcMessage & { jsonrpc: '2.0' }): void {
    const body = JSON.stringify(message);
    this.#child.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  }
}

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverPath = join(appDirectory, 'dist', 'language-server', 'server.cjs');
if (!existsSync(serverPath)) {
  throw new Error('Build the extension before running its smoke test.');
}

const source = [
  'resources:',
  '  postsTable:',
  '    type: dynamo-db-table',
  '  api:',
  '    type: function',
  '    properties:',
  '      connectTo:',
  '        - postsTable',
  '        - typoo',
  '      environment:',
  '        - name: URL',
  "          value: $ResourceParam('postsTable', 'arn')",
  ''
].join('\n');
const uri = 'file:///language-server-smoke.stacktape.yml';
const positionAt = (offset: number) => {
  const before = source.slice(0, offset).split('\n');
  return { line: before.length - 1, character: before.at(-1)?.length ?? 0 };
};
const referenceStart = source.indexOf("$ResourceParam('postsTable'") + "$ResourceParam('".length;
const typeValueStart = source.indexOf('dynamo-db-table');

const client = new LspClient(serverPath, appDirectory);
const checks: Array<[string, boolean]> = [];
try {
  const initialized = (await client.request('initialize', {
    processId: process.pid,
    rootUri: null,
    capabilities: { textDocument: { hover: { contentFormat: ['markdown'] } } },
    initializationOptions: { extensionPath: appDirectory, extensionVersion: '1.0.0' }
  })) as { capabilities?: Record<string, unknown> };
  checks.push(['initialize returns capabilities', Boolean(initialized.capabilities)]);
  checks.push(['definition provider is advertised', initialized.capabilities?.definitionProvider === true]);

  client.notify('initialized', {});
  client.notify('workspace/didChangeConfiguration', {
    settings: { stacktape: { completion: true, hover: true, validate: true, validateReferences: true } }
  });
  client.notify('textDocument/didOpen', {
    textDocument: { uri, languageId: 'stacktape', version: 1, text: source }
  });

  const diagnosticParams = (await client.waitForNotification(
    'textDocument/publishDiagnostics',
    (params) => (params as { uri?: string } | undefined)?.uri === uri
  )) as { diagnostics: Array<{ message: string }> };
  const messages = diagnosticParams.diagnostics.map((diagnostic) => diagnostic.message);
  checks.push(['schema validation runs', messages.some((message) => /Missing property|required/i.test(message))]);
  checks.push(['unknown resource references are diagnosed', messages.some((message) => message.includes('typoo'))]);
  checks.push(['valid resource references are accepted', !messages.some((message) => message.includes('postsTable'))]);

  const position = positionAt(referenceStart + 3);
  const definition = (await client.request('textDocument/definition', {
    textDocument: { uri },
    position
  })) as unknown[] | null;
  const hover = await client.request('textDocument/hover', { textDocument: { uri }, position });
  const completion = (await client.request('textDocument/completion', {
    textDocument: { uri },
    position: positionAt(referenceStart)
  })) as { items?: Array<{ label: string }> } | Array<{ label: string }>;
  const completionItems = Array.isArray(completion) ? completion : (completion.items ?? []);
  const schemaHover = await client.request('textDocument/hover', {
    textDocument: { uri },
    position: positionAt(typeValueStart + 2)
  });
  const codeLenses = (await client.request('textDocument/codeLens', { textDocument: { uri } })) as Array<{
    command?: { title?: string };
  }>;

  checks.push(['go to definition resolves a resource', Array.isArray(definition) && definition.length > 0]);
  checks.push(['reference hover includes the resource type', JSON.stringify(hover).includes('dynamo-db-table')]);
  checks.push([
    'reference completion lists local resources',
    completionItems.some((item) => item.label === 'postsTable') && completionItems.some((item) => item.label === 'api')
  ]);
  checks.push(['schema hover is provided by the upstream language service', Boolean(schemaHover)]);
  const schemaLensTitle = codeLenses.find((lens) => lens.command?.title?.startsWith('Stacktape schema'))?.command
    ?.title;
  checks.push([
    `the selected schema is visible in the code lens (${schemaLensTitle ?? 'missing'})`,
    Boolean(schemaLensTitle)
  ]);
} finally {
  await client.close();
}

let failures = 0;
for (const [name, passed] of checks) {
  console.info(`${passed ? '✓' : '✗'} ${name}`);
  if (!passed) {
    failures++;
  }
}
console.info(`\n${checks.length - failures}/${checks.length} checks passed`);
if (failures > 0) {
  process.exitCode = 1;
}
