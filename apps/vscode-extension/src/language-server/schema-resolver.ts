import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { URI } from 'vscode-uri';

const SCHEMA_FILE_NAME = 'config-schema.json';
const RELEASE_DATA_FILE_NAME = 'release-data.json';
const REMOTE_SCHEMA_URI = 'https://schemas.stacktape-dev.com/config-schema.json';

export type ResolvedStacktapeSchema = {
  uri: string;
  label: string;
  warning?: string;
};

type SchemaResolverOptions = {
  extensionPath: string;
  extensionVersion: string;
  homeDirectory?: string;
  fetchSchema?: typeof fetch;
};

const fileUri = (path: string): string => URI.file(path).toString();

const readVersion = (path: string): string | undefined => {
  try {
    const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof value === 'object' && value !== null && 'version' in value && typeof value.version === 'string') {
      return value.version;
    }
  } catch {
    // A missing or malformed metadata file only means that the version cannot be shown.
  }
  return undefined;
};

const documentPath = (documentUri: string): string | undefined => {
  try {
    const uri = URI.parse(documentUri);
    return uri.scheme === 'file' ? uri.fsPath : undefined;
  } catch {
    return undefined;
  }
};

const findLocalInstall = (fromPath: string): { packageDirectory: string; version: string } | undefined => {
  let directory = dirname(fromPath);
  for (;;) {
    const packageDirectory = join(directory, 'node_modules', 'stacktape');
    const version = readVersion(join(packageDirectory, 'package.json'));
    if (version) {
      return { packageDirectory, version };
    }

    const parent = dirname(directory);
    if (parent === directory) {
      return undefined;
    }
    directory = parent;
  }
};

export class StacktapeSchemaResolver {
  readonly #bundledSchemaPath: string;
  readonly #extensionVersion: string;
  readonly #fetchSchema: typeof fetch;
  readonly #globalBinDirectory: string;
  readonly #schemaContent = new Map<string, string>();
  readonly #documentSchemas = new Map<string, ResolvedStacktapeSchema>();

  constructor(options: SchemaResolverOptions) {
    this.#bundledSchemaPath = join(options.extensionPath, 'dist', SCHEMA_FILE_NAME);
    this.#extensionVersion = options.extensionVersion;
    this.#fetchSchema = options.fetchSchema ?? fetch;
    this.#globalBinDirectory = join(options.homeDirectory ?? homedir(), '.stacktape', 'bin');
  }

  getDocumentSchema(documentUri: string): ResolvedStacktapeSchema | undefined {
    return this.#documentSchemas.get(documentUri);
  }

  forgetDocument(documentUri: string): void {
    this.#documentSchemas.delete(documentUri);
  }

  async resolve(documentUri: string): Promise<ResolvedStacktapeSchema> {
    const cached = this.#documentSchemas.get(documentUri);
    if (cached) {
      return cached;
    }

    const path = documentPath(documentUri);
    const localInstall = path ? findLocalInstall(path) : undefined;
    if (localInstall) {
      const localSchemaPath = join(localInstall.packageDirectory, 'bin', SCHEMA_FILE_NAME);
      const versionedSchemaPath = join(this.#globalBinDirectory, localInstall.version, SCHEMA_FILE_NAME);
      const localSchema = [localSchemaPath, versionedSchemaPath].find(existsSync);
      if (localSchema) {
        return this.#remember(documentUri, {
          uri: fileUri(localSchema),
          label: `Stacktape ${localInstall.version} (project)`
        });
      }

      const globalVersion = readVersion(join(this.#globalBinDirectory, RELEASE_DATA_FILE_NAME));
      const globalSchemaPath = join(this.#globalBinDirectory, SCHEMA_FILE_NAME);
      if (globalVersion === localInstall.version && existsSync(globalSchemaPath)) {
        return this.#remember(documentUri, {
          uri: fileUri(globalSchemaPath),
          label: `Stacktape ${localInstall.version} (project)`
        });
      }

      return this.#resolveFallback(
        documentUri,
        `The local Stacktape ${localInstall.version} install has no cached schema. Run a Stacktape command once to cache it.`
      );
    }

    const globalSchemaPath = join(this.#globalBinDirectory, SCHEMA_FILE_NAME);
    if (existsSync(globalSchemaPath)) {
      const globalVersion = readVersion(join(this.#globalBinDirectory, RELEASE_DATA_FILE_NAME));
      return this.#remember(documentUri, {
        uri: fileUri(globalSchemaPath),
        label: globalVersion ? `Stacktape ${globalVersion} (global)` : 'global Stacktape install'
      });
    }

    return this.#resolveFallback(documentUri);
  }

  async read(uri: string): Promise<string> {
    const cached = this.#schemaContent.get(uri);
    if (cached) {
      return cached;
    }

    let content: string;
    if (uri.startsWith('file:')) {
      content = await readFile(URI.parse(uri).fsPath, 'utf8');
    } else {
      const response = await this.#fetchSchema(uri);
      if (!response.ok) {
        throw new Error(`Could not load Stacktape schema from ${uri}: HTTP ${response.status}.`);
      }
      content = await response.text();
    }

    JSON.parse(content);
    this.#schemaContent.set(uri, content);
    return content;
  }

  #remember(documentUri: string, schema: ResolvedStacktapeSchema): ResolvedStacktapeSchema {
    this.#documentSchemas.set(documentUri, schema);
    return schema;
  }

  #resolveFallback(documentUri: string, warning?: string): ResolvedStacktapeSchema {
    if (existsSync(this.#bundledSchemaPath)) {
      const resolved: ResolvedStacktapeSchema = {
        uri: fileUri(this.#bundledSchemaPath),
        label: `bundled with extension ${this.#extensionVersion}`,
        ...(warning ? { warning: `${warning} Using the schema bundled with this extension.` } : {})
      };
      return this.#remember(documentUri, resolved);
    }

    return this.#remember(documentUri, {
      uri: REMOTE_SCHEMA_URI,
      label: 'latest published Stacktape schema',
      warning: warning
        ? `${warning} Using the latest published schema.`
        : 'The bundled schema is unavailable. Using the latest published schema.'
    });
  }
}
