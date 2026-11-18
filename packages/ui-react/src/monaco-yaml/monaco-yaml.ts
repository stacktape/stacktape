import type { editor, MonacoEditor } from 'monaco-types';
import type { JSONSchema } from 'monaco-yaml';
import { configureMonacoYaml } from 'monaco-yaml';
import { createYamlSchemaAssociations } from './yaml-schema-associations.js';

export { getYamlModelPath } from './yaml-schema-associations.js';

type YamlConfigDiagnostic = Pick<editor.IMarkerData, 'message' | 'severity' | 'startLineNumber' | 'startColumn'>;

export type MonacoYamlModelSettings = {
  isIntellisenseEnabled: boolean;
  rootSchemaIdentifier: string | null;
  /** For snippets: a fragment of a config is never a valid config, so its schema errors are noise. */
  hideDiagnostics?: boolean;
  onDiagnostics?: ((diagnostics: YamlConfigDiagnostic[]) => void) | undefined;
};

const isDirective = (value: string) => {
  const trimmed = value.trim();
  const directive = /^\$[a-z_]\w*\s*\((?:[^()]+|\$[a-z_]\w*\s*\([^()]*\))?\)/i.exec(trimmed);
  if (!directive) {
    return false;
  }
  const remainder = trimmed.slice(directive[0].length);
  return remainder === '' || /^\.[a-z_][\w.]*$/i.test(remainder);
};

const markerText = (model: editor.ITextModel, marker: editor.IMarker) =>
  model.getValueInRange({
    startLineNumber: marker.startLineNumber,
    startColumn: marker.startColumn,
    endLineNumber: marker.endLineNumber,
    endColumn: marker.endColumn
  });

/** Directive-shaped values (`$Secret('db.password')`) are Stacktape's to resolve; JSON Schema cannot judge them. */
export const shouldIgnoreYamlDiagnostic = (value: string) => isDirective(value);

type LegacyWebWorkerOptions = { label?: string; createData?: unknown };
type CreateWebWorker = (options: unknown) => unknown;

/**
 * `monaco-yaml` creates its worker through `monaco-worker-manager`, which still calls `createWebWorker` with the
 * options Monaco took before 0.56 (`label`, `createData`). Monaco 0.56 takes a started worker instead, so the old call
 * fails and every YAML feature (hovers, completion, validation) silently stops. This adapter starts the worker the way
 * Monaco's own language workers do: from `MonacoEnvironment.getWorker`, then the two messages its worker expects.
 */
export const withLegacyWebWorkerOptions = <Monaco extends MonacoEditor>(monaco: Monaco): Monaco => {
  const original = monaco.editor.createWebWorker as unknown as CreateWebWorker;
  const createWebWorker = (options: { worker: unknown } | LegacyWebWorkerOptions) => {
    if ('worker' in options) return original(options);
    const worker = Promise.resolve(
      globalThis.MonacoEnvironment!.getWorker!('workerMain.js', options.label ?? 'monaco-editor-worker')
    ).then((started) => {
      // A worker's postMessage has no target origin; the rule is about window.postMessage.
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
      started.postMessage('ignore');
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
      started.postMessage(options.createData);
      return started;
    });
    return original({ worker });
  };
  return { ...monaco, editor: { ...monaco.editor, createWebWorker } };
};

/**
 * Configures the maintained `monaco-yaml` integration once for a page that edits Stacktape YAML.
 *
 * Stacktape-specific behavior stays small: associate model URIs with the generated config schema,
 * filter directive-shaped values that JSON Schema cannot understand, and report diagnostics only
 * to the model that explicitly supplied a callback. Parsing, completion, hover, formatting and
 * worker lifecycle remain owned by the upstream package.
 *
 * The host serves the schema (`schemaUrl`) and registers the YAML worker under the `yaml` label in
 * `MonacoEnvironment.getWorker`: the Console from its own origin, the init wizard from the CLI on loopback.
 */
export const configureStacktapeMonacoYaml = (monaco: MonacoEditor, { schemaUrl }: { schemaUrl: string }) => {
  const schemaAssociations = createYamlSchemaAssociations(schemaUrl);
  const settingsByModelUri = new Map<string, MonacoYamlModelSettings>();
  let isDisposed = false;
  let schemaLoad: Promise<JSONSchema> | null = null;

  const yaml = configureMonacoYaml(withLegacyWebWorkerOptions(monaco), {
    enableSchemaRequest: true,
    schemas: schemaAssociations.getSchemas(),
    yamlVersion: '1.2'
  });

  let isReplacingMarkers = false;
  const markerListener = monaco.editor.onDidChangeMarkers((uris) => {
    if (isReplacingMarkers) {
      return;
    }

    for (const uri of uris) {
      const uriString = String(uri);
      const settings = settingsByModelUri.get(uriString);
      if (!settings) {
        continue;
      }
      const model = monaco.editor.getModel(uri);
      if (!model) {
        continue;
      }

      const markers = monaco.editor.getModelMarkers({ owner: 'yaml', resource: uri });
      const filtered = settings.hideDiagnostics
        ? []
        : markers.filter((marker) => !shouldIgnoreYamlDiagnostic(markerText(model, marker)));

      if (filtered.length !== markers.length) {
        isReplacingMarkers = true;
        try {
          monaco.editor.setModelMarkers(model, 'yaml', filtered);
        } finally {
          isReplacingMarkers = false;
        }
      }
      settings.onDiagnostics?.(filtered);
    }
  });

  const updateSchemas = () => {
    void yaml
      .update({ schemas: schemaAssociations.getSchemas() })
      .catch((error: unknown) => console.error('Failed to update YAML schema associations.', error));
  };
  const ensureCanonicalSchema = () => {
    schemaLoad ??= fetch(schemaUrl)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load the Stacktape configuration schema (${response.status}).`);
        }
        return (await response.json()) as JSONSchema;
      })
      .then((schema) => {
        if (!isDisposed) {
          schemaAssociations.setCanonicalSchema(schema);
          updateSchemas();
        }
        return schema;
      });
    void schemaLoad.catch((error: unknown) => console.error('Failed to configure resource YAML IntelliSense.', error));
  };

  return {
    dispose() {
      isDisposed = true;
      markerListener.dispose();
      yaml.dispose();
      settingsByModelUri.clear();
    },

    setModelSettings(uri: string, settings: MonacoYamlModelSettings) {
      if (!settings.isIntellisenseEnabled) {
        settingsByModelUri.delete(uri);
        if (schemaAssociations.remove(uri)) {
          updateSchemas();
        }
        return;
      }

      settingsByModelUri.set(uri, settings);
      if (schemaAssociations.setModel(uri, settings.rootSchemaIdentifier)) {
        updateSchemas();
      }
      if (settings.rootSchemaIdentifier) {
        ensureCanonicalSchema();
      }
    },

    removeModelSettings(uri: string) {
      settingsByModelUri.delete(uri);
      if (schemaAssociations.remove(uri)) {
        updateSchemas();
      }
    }
  };
};
