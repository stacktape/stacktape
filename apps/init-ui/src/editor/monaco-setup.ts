/* eslint-disable import/default -- Vite's `?worker` modules export a worker constructor by default. */
// oxlint-disable-next-line import/no-unassigned-import -- registers the editor features and the two languages.
import './monaco-lean';
import * as monaco from 'monaco-editor/editor/editor.api.js';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import TsLanguageWorker from 'monaco-editor/language/typescript/ts.worker?worker';
import { configureStacktapeMonacoYaml } from '@stacktape/ui-react/monaco-yaml';
import YamlWorker from './yaml-worker?worker';

/**
 * Monaco for the wizard's config editor, set up once when the editor chunk loads.
 *
 * Everything is served by `stacktape init` on loopback: the workers are files in the bundle (`script-src 'self'`
 * covers them, so the CSP is unchanged) and the config schema is `/config-schema.json` from the CLI. YAML gets its
 * language service from `monaco-yaml`, TypeScript from Monaco's own TypeScript worker (`monaco-typescript.ts`), which
 * starts only when a TypeScript file is opened.
 */
self.MonacoEnvironment = {
  getWorker: (_workerId: string, label: string) =>
    label === 'yaml'
      ? new YamlWorker()
      : label === 'typescript' || label === 'javascript'
        ? new TsLanguageWorker()
        : new EditorWorker()
};

const hex = (value: number) =>
  Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, '0');

/**
 * A colour from the page's CSS variables, as the hex Monaco's theme needs. The editor and the workspace's code window
 * share one palette (`--ws-code-*` in `workspace/workspace.css`), so a palette change there reaches both.
 */
const cssColor = (variable: string, fallback: string): string => {
  const probe = document.createElement('span');
  probe.style.color = `var(${variable}, ${fallback})`;
  probe.style.display = 'none';
  document.body.append(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const rgb = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/.exec(computed);
  const srgb = /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/.exec(computed);
  const channels = rgb
    ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
    : srgb
      ? [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255]
      : undefined;
  if (channels === undefined) return fallback;
  const alphaText = (rgb ?? srgb)![4];
  const alpha =
    alphaText === undefined ? 1 : alphaText.endsWith('%') ? Number(alphaText.slice(0, -1)) / 100 : Number(alphaText);
  return `#${channels.map(hex).join('')}${alpha < 1 ? hex(alpha * 255) : ''}`;
};

const token = (variable: string, fallback: string) => cssColor(variable, fallback).slice(1);

monaco.editor.defineTheme('stacktape-wizard', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'type', foreground: token('--ws-code-key', '#7fd3d3') },
    { token: 'string', foreground: token('--ws-code-string', '#c9b98a') },
    { token: 'number', foreground: token('--ws-code-number', '#b5cea8') },
    { token: 'keyword', foreground: token('--ws-code-keyword', '#8fb8f0') },
    { token: 'comment', foreground: token('--ws-code-comment', '#6b7676'), fontStyle: 'italic' },
    // TypeScript: the classes the file builds with in the key colour, so `new RelationalDatabase` reads like `type:`.
    { token: 'type.identifier.ts', foreground: token('--ws-code-key', '#7fd3d3') },
    { token: 'identifier.ts', foreground: token('--ws-code-text', '#d4d9d9') },
    { token: 'delimiter.ts', foreground: token('--ws-code-punctuation', '#8a9696') }
  ],
  colors: {
    'editor.background': cssColor('--ws-code-bg', '#171c1c'),
    'editor.foreground': cssColor('--ws-code-text', '#d4d9d9'),
    'editor.lineHighlightBackground': cssColor('--ws-code-line-active', '#1f2626'),
    'editorLineNumber.foreground': cssColor('--ws-code-line-number', '#4d5858'),
    'editorLineNumber.activeForeground': cssColor('--ws-code-line-number-active', '#9aa4a4'),
    'editorGutter.background': cssColor('--ws-code-bg', '#171c1c'),
    'editor.selectionBackground': cssColor('--ws-code-selection', '#36bebe40'),
    'editorIndentGuide.background1': cssColor('--ws-code-guide', '#262e2e'),
    'editorHoverWidget.background': cssColor('--ws-code-popup', '#222929'),
    'editorHoverWidget.border': cssColor('--ws-code-popup-border', '#384242'),
    'editorSuggestWidget.background': cssColor('--ws-code-popup', '#222929'),
    'editorSuggestWidget.border': cssColor('--ws-code-popup-border', '#384242'),
    'editorSuggestWidget.selectedBackground': cssColor('--ws-code-popup-selected', '#2b3a3a'),
    'editorSuggestWidget.highlightForeground': cssColor('--ws-code-key', '#7fd3d3'),
    'editorStickyScroll.background': cssColor('--ws-code-bg', '#171c1c'),
    'editorStickyScrollHover.background': cssColor('--ws-code-line-active', '#1f2626'),
    'editorStickyScroll.shadow': '#00000066',
    'editorLink.activeForeground': cssColor('--ws-code-key', '#7fd3d3'),
    'editorError.foreground': cssColor('--ws-code-error', '#e5737a'),
    'editorWarning.foreground': cssColor('--ws-code-warning', '#d8b45f'),
    'editorBracketMatch.background': '#ffffff10',
    'editorBracketMatch.border': '#ffffff30',
    'editorGutter.foldingControlForeground': cssColor('--ws-code-line-number', '#4d5858'),
    'scrollbarSlider.background': cssColor('--ws-code-scrollbar', '#ffffff14'),
    'minimap.background': cssColor('--ws-code-bg', '#171c1c')
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
