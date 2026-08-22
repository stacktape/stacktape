import { join } from 'node:path';
import { window } from 'vscode';
import type { ExtensionContext } from 'vscode';
import {
  LanguageClient,
  type LanguageClientOptions,
  RevealOutputChannelOn,
  type ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';
import { registerStacktapeCommands } from './commands';

let client: LanguageClient | undefined;

export const activate = async (context: ExtensionContext): Promise<void> => {
  const outputChannel = window.createOutputChannel('Stacktape');
  context.subscriptions.push(outputChannel);
  registerStacktapeCommands(context);

  const serverModule = context.asAbsolutePath(join('dist', 'language-server', 'server.cjs'));
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6019'] }
    }
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: 'stacktape' }, { language: 'yaml', pattern: '**/*{stacktape,stp}*.{yml,yaml}' }],
    initializationOptions: {
      extensionPath: context.extensionPath,
      extensionVersion: context.extension.packageJSON.version
    },
    synchronize: {
      configurationSection: 'stacktape'
    },
    outputChannel,
    revealOutputChannelOn: RevealOutputChannelOn.Never
  };

  client = new LanguageClient('stacktape', 'Stacktape', serverOptions, clientOptions);
  await client.start();
};

export const deactivate = async (): Promise<void> => {
  if (client) {
    await client.stop();
    client = undefined;
  }
};
