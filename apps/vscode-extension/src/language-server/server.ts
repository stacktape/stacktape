import { dirname, resolve } from 'node:path';
import {
  CodeLens,
  CompletionList,
  createConnection,
  Hover,
  MarkedString,
  MarkupContent,
  ProposedFeatures,
  Range,
  TextDocuments,
  TextDocumentSyncKind
} from 'vscode-languageserver/node';
import type { DidChangeConfigurationParams, InitializeParams, InitializeResult } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { getLanguageService, type LanguageService as YamlLanguageService } from 'yaml-language-server';
import { isStacktapeYamlPath } from '../stacktape-files';
import {
  getReferenceCompletions,
  getReferenceDefinition,
  getReferenceDiagnostics,
  getReferenceHover
} from './references';
import { StacktapeSchemaResolver } from './schema-resolver';

type StacktapeSettings = {
  completion: boolean;
  hover: boolean;
  validate: boolean;
  validateReferences: boolean;
};

type InitializationOptions = {
  extensionPath?: string;
  extensionVersion?: string;
};

const DEFAULT_SETTINGS: StacktapeSettings = {
  completion: true,
  hover: true,
  validate: true,
  validateReferences: true
};

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
const validationTimers = new Map<string, NodeJS.Timeout>();
let schemaResolver: StacktapeSchemaResolver | undefined;
let languageService: YamlLanguageService | undefined;
let settings = DEFAULT_SETTINGS;

const activeDocument = (document: TextDocument): boolean =>
  document.languageId === 'stacktape' || isStacktapeYamlPath(document.uri);

const resolveRelativePath = (relativePath: string, resource: string): string => {
  try {
    const resourceUri = URI.parse(resource);
    if (resourceUri.scheme === 'file') {
      return URI.file(resolve(dirname(resourceUri.fsPath), relativePath)).toString();
    }
    return new URL(relativePath, resource).toString();
  } catch {
    return relativePath;
  }
};

const configureLanguageService = (): void => {
  languageService?.configure({
    completion: settings.completion,
    hover: settings.hover,
    hoverSchemaSource: false,
    validate: settings.validate,
    yamlVersion: '1.2'
  });
};

const updateSettings = (change: DidChangeConfigurationParams): void => {
  const root = change.settings as Record<string, unknown> | undefined;
  const candidate = (root?.stacktape ?? root) as Partial<StacktapeSettings> | undefined;
  settings = {
    completion: candidate?.completion !== false,
    hover: candidate?.hover !== false,
    validate: candidate?.validate !== false,
    validateReferences: candidate?.validateReferences !== false
  };
  configureLanguageService();
};

const validate = async (document: TextDocument): Promise<void> => {
  if (!activeDocument(document) || !languageService || !settings.validate) {
    await connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
    return;
  }

  try {
    const schemaDiagnostics = await languageService.doValidation(document, false);
    const diagnostics = settings.validateReferences
      ? [...schemaDiagnostics, ...getReferenceDiagnostics(document)]
      : schemaDiagnostics;
    await connection.sendDiagnostics({ uri: document.uri, diagnostics });
  } catch (error) {
    connection.console.error(
      `Failed to validate ${document.uri}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const scheduleValidation = (document: TextDocument, delay = 150): void => {
  const previous = validationTimers.get(document.uri);
  if (previous) {
    clearTimeout(previous);
  }
  validationTimers.set(
    document.uri,
    setTimeout(() => {
      validationTimers.delete(document.uri);
      void validate(document);
    }, delay)
  );
};

const hoverText = (hover: Hover | null | undefined): string | undefined => {
  if (!hover) {
    return undefined;
  }
  const values = Array.isArray(hover.contents) ? hover.contents : [hover.contents];
  const rendered = values.map((value) => {
    if (typeof value === 'string') {
      return value;
    }
    if (MarkupContent.is(value)) {
      return value.value;
    }
    if (MarkedString.is(value)) {
      return typeof value === 'string' ? value : `\`\`\`${value.language}\n${value.value}\n\`\`\``;
    }
    return '';
  });
  const result = rendered.filter(Boolean).join('\n\n');
  return result || undefined;
};

connection.onInitialize((params: InitializeParams): InitializeResult => {
  const options = (params.initializationOptions ?? {}) as InitializationOptions;
  schemaResolver = new StacktapeSchemaResolver({
    extensionPath: options.extensionPath ?? process.cwd(),
    extensionVersion: options.extensionVersion ?? 'development'
  });
  languageService = getLanguageService({
    clientCapabilities: params.capabilities,
    schemaRequestService: (uri) => {
      if (!schemaResolver) {
        throw new Error('Stacktape schema resolver is not initialized.');
      }
      return schemaResolver.read(uri);
    },
    workspaceContext: { resolveRelativePath }
  });
  languageService.registerCustomSchemaProvider(async (documentUri) => {
    if (!schemaResolver) {
      throw new Error('Stacktape schema resolver is not initialized.');
    }
    return (await schemaResolver.resolve(documentUri)).uri;
  });
  configureLanguageService();

  return {
    capabilities: {
      codeLensProvider: { resolveProvider: false },
      completionProvider: { resolveProvider: false },
      definitionProvider: true,
      documentLinkProvider: { resolveProvider: false },
      documentSymbolProvider: true,
      foldingRangeProvider: true,
      hoverProvider: true,
      textDocumentSync: TextDocumentSyncKind.Incremental
    }
  };
});

connection.onDidChangeConfiguration((change) => {
  updateSettings(change);
  documents.all().forEach((document) => scheduleValidation(document, 0));
});

documents.onDidOpen(({ document }) => scheduleValidation(document, 0));
documents.onDidChangeContent(({ document }) => scheduleValidation(document));
documents.onDidClose(({ document }) => {
  const timer = validationTimers.get(document.uri);
  if (timer) {
    clearTimeout(timer);
    validationTimers.delete(document.uri);
  }
  schemaResolver?.forgetDocument(document.uri);
  void connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
});

connection.onCompletion(async ({ textDocument, position }): Promise<CompletionList | null> => {
  const document = documents.get(textDocument.uri);
  if (!document || !activeDocument(document) || !languageService || !settings.completion) {
    return null;
  }
  return getReferenceCompletions(document, position) ?? languageService.doComplete(document, position, false);
});

connection.onHover(async ({ textDocument, position }): Promise<Hover | null> => {
  const document = documents.get(textDocument.uri);
  if (!document || !activeDocument(document) || !languageService || !settings.hover) {
    return null;
  }

  const referenceHover = getReferenceHover(document, position);
  const schemaHover = await languageService.doHover(document, position);
  if (!referenceHover) {
    return schemaHover;
  }
  const schemaText = hoverText(schemaHover);
  if (!schemaText || !MarkupContent.is(referenceHover.contents)) {
    return referenceHover;
  }
  return {
    contents: {
      kind: 'markdown',
      value: `${referenceHover.contents.value}\n\n${schemaText}`
    },
    ...(referenceHover.range ? { range: referenceHover.range } : {})
  };
});

connection.onDefinition(({ textDocument, position }) => {
  const document = documents.get(textDocument.uri);
  if (!document || !activeDocument(document) || !languageService) {
    return undefined;
  }
  return (
    getReferenceDefinition(document, position) ?? languageService.doDefinition(document, { textDocument, position })
  );
});

connection.onCodeLens(({ textDocument }): CodeLens[] => {
  const document = documents.get(textDocument.uri);
  if (!document || !activeDocument(document)) {
    return [];
  }
  const schema = schemaResolver?.getDocumentSchema(document.uri);
  const links = [
    {
      title: schema ? `Stacktape schema: ${schema.label}` : 'Stacktape schema',
      url: 'https://docs.stacktape.com/'
    },
    { title: 'Stacktape docs', url: 'https://docs.stacktape.com/' },
    { title: 'Report an issue', url: 'https://github.com/stacktape/stacktape/issues/new' }
  ];
  if (schema?.warning) {
    links.unshift({ title: `⚠️ ${schema.warning}`, url: 'https://docs.stacktape.com/' });
  }
  return links.map(({ title, url }) => {
    const lens = CodeLens.create(Range.create(0, 0, 0, 0));
    lens.command = {
      title,
      command: 'stacktape.openExternal',
      arguments: [url]
    };
    return lens;
  });
});

connection.onDocumentSymbol(({ textDocument }) => {
  const document = documents.get(textDocument.uri);
  return document && languageService ? languageService.findDocumentSymbols2(document) : [];
});

connection.onDocumentLinks(({ textDocument }) => {
  const document = documents.get(textDocument.uri);
  return document && languageService ? languageService.findLinks(document) : [];
});

connection.languages.foldingRange.on(({ textDocument }) => {
  const document = documents.get(textDocument.uri);
  return document && languageService ? languageService.getFoldingRanges(document, {}) : [];
});

documents.listen(connection);
connection.listen();
