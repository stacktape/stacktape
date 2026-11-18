/* eslint-disable import/default -- Vite's `?worker` modules export a worker constructor by default. */
import * as monaco from './monaco-lean';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import { configureStacktapeMonacoYaml } from '@stacktape/ui-react/monaco-yaml';
import YamlWorker from './yaml-worker?worker';

/**
 * Monaco for the wizard's config editor, set up once when the editor chunk loads.
 *
 * Everything is served by `stacktape init` on loopback: the two workers are files in the bundle (`script-src 'self'`
 * covers them, so the CSP is unchanged) and the config schema is `/config-schema.json` from the CLI. Only YAML gets a
 * language service (`monaco-yaml`). The TypeScript view is read-only and only highlighted, so no TypeScript worker is
 * started or shipped (see `monaco-lean.ts`).
 */
self.MonacoEnvironment = {
  getWorker: (_workerId: string, label: string) => (label === 'yaml' ? new YamlWorker() : new EditorWorker())
};

monaco.editor.defineTheme('stacktape-wizard', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'type', foreground: '7fd3d3' },
    { token: 'string', foreground: 'c9b98a' },
    { token: 'number', foreground: 'b5cea8' },
    { token: 'keyword', foreground: '8fb8f0' },
    { token: 'comment', foreground: '6b7676', fontStyle: 'italic' }
  ],
  colors: {
    'editor.background': '#171c1c',
    'editor.lineHighlightBackground': '#1f2626',
    'editorLineNumber.foreground': '#4d5858',
    'editorLineNumber.activeForeground': '#9aa4a4',
    'editorGutter.background': '#171c1c',
    'editor.selectionBackground': '#36bebe40',
    'editorIndentGuide.background1': '#262e2e',
    'editorHoverWidget.background': '#222929',
    'editorHoverWidget.border': '#384242',
    'editorSuggestWidget.background': '#222929',
    'editorSuggestWidget.border': '#384242',
    'editorSuggestWidget.selectedBackground': '#2b3a3a',
    'scrollbarSlider.background': '#ffffff14',
    'minimap.background': '#171c1c'
  }
});

/**
 * The same Monaco, typed as the shared packages see it. They type against `monaco-editor-core`, whose declarations
 * are a structurally different copy of these; the runtime object is the one namespace either way.
 */
export const sharedMonaco = monaco as unknown as Parameters<typeof configureStacktapeMonacoYaml>[0];

export const stacktapeYaml = configureStacktapeMonacoYaml(sharedMonaco, {
  schemaUrl: new URL('/config-schema.json', window.location.origin).href
});

export { monaco };
