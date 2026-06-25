'use client';

import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BiCheck, BiCopy } from 'react-icons/bi';
import { colors } from '../../styles/variables';
import { marked } from 'marked';
import { convertTypescriptToYaml, convertYamlToTypescript } from '../../utils/yaml-to-typescript';
import { computeYamlHovers } from './yaml-hover';

const STACKTAPE_TYPE_FILES = ['index.d.ts', 'types.d.ts', 'plain.d.ts', 'cloudformation.d.ts'] as const;
const SHIKI_THEME = 'catppuccin-mocha';
const DEFAULT_DEV_TYPES_BASE_URL = '/stacktape';
const DEFAULT_PROD_TYPES_BASE_URL = 'https://cdn.jsdelivr.net/npm/stacktape@latest';

type CodeTab = { label: ReactNode; code: string; lang: string };

type CodeBlockNewProps = {
  tabs: CodeTab[];
  lang?: string | null;
  intellisense?: boolean;
  stacktapeConfig?: boolean;
  typesCdnBaseUrl?: string;
};

type ProcessedCode = {
  renderCode: string;
  fullCode: string;
  copyCode: string;
  highlightedLineNumbers: number[];
  focusedLineSpecs: FocusedLineSpec[];
  hasFocusMarkers: boolean;
  // For each rendered line, the index (0-based) of the original source line it came from,
  // or -1 for synthetic placeholder lines (e.g. the `...` collapse marker).
  lineMap: number[];
};

type FocusedLineSpec =
  | {
      kind: 'line';
      fullLineNumber: number;
      text: string;
      displayText: string;
    }
  | {
      kind: 'placeholder';
      text: string;
    };

type ShikiRuntime = {
  codeToHtml: (code: string, options: { lang: string; theme: string; transformers?: unknown[] }) => Promise<string>;
};

type TwoslashRuntime = {
  prepareTypes: (code: string) => Promise<void>;
  transformerTwoslash: unknown | null;
};

type RenderWithShikiProps = {
  runtime: ShikiRuntime;
  code: string;
  language: string;
  highlightedLineNumbers: number[];
  useTwoslash: boolean;
  twoslashRuntime?: TwoslashRuntime;
  extraTransformers?: unknown[];
};

// Every language the docs use, preloaded once when the highlighter is created. Loading grammars up
// front (instead of Shiki's default lazy per-language dynamic import) avoids Vite dev's "Failed to
// fetch dynamically imported module" — a lazily-loaded grammar otherwise 404s after Vite
// re-optimizes deps mid-session. Unknown languages fall back to plain text.
const SHIKI_LANGS = [
  'typescript',
  'tsx',
  'javascript',
  'jsx',
  'json',
  'jsonc',
  'yaml',
  'bash',
  'shell',
  'dockerfile',
  'toml',
  'python',
  'sql'
] as const;

const shikiRuntimePromise = import('shiki').then(async ({ createHighlighter }) => {
  const highlighter = await createHighlighter({ themes: [SHIKI_THEME], langs: SHIKI_LANGS as unknown as string[] });
  const loadedLangs = new Set(highlighter.getLoadedLanguages());
  return {
    codeToHtml: (code, options) =>
      Promise.resolve(
        highlighter.codeToHtml(code, {
          ...options,
          lang: loadedLangs.has(options.lang) ? options.lang : 'text'
        })
      )
  } satisfies ShikiRuntime;
});
const twoslashRuntimeCache = new Map<string, Promise<TwoslashRuntime>>();

const normalizeLanguage = (lang?: string | null) => {
  const normalized = (lang || 'text').toLowerCase();
  if (normalized === 'yml') return 'yaml';
  if (normalized === 'shell' || normalized === 'sh') return 'bash';
  if (normalized === 'ts') return 'typescript';
  if (normalized === 'js') return 'javascript';
  return normalized;
};

const getDefaultTypesBaseUrl = () => {
  return process.env.NODE_ENV === 'development' ? DEFAULT_DEV_TYPES_BASE_URL : DEFAULT_PROD_TYPES_BASE_URL;
};

const isTwoslashLanguage = (lang?: string | null) => {
  return ['typescript', 'tsx', 'javascript', 'jsx'].includes(normalizeLanguage(lang));
};

const isStacktapeTypescriptConfig = (tab: CodeTab) => {
  const lang = normalizeLanguage(tab.lang);
  return isTwoslashLanguage(lang) && tab.code.includes('defineConfig') && /from\s+['"]stacktape['"]/.test(tab.code);
};

const withGeneratedYamlTabs = (tabs: CodeTab[], shouldEnableIntellisense: boolean): CodeTab[] => {
  if (!shouldEnableIntellisense) return tabs;
  if (tabs.some((tab) => normalizeLanguage(tab.lang) === 'yaml')) return tabs;

  const stacktapeConfigTab = tabs.find(isStacktapeTypescriptConfig);
  if (!stacktapeConfigTab) return tabs;

  const yamlCode = convertTypescriptToYaml(stacktapeConfigTab.code);
  if (!yamlCode) return tabs;

  return [
    ...tabs,
    {
      label: 'YAML',
      lang: 'yaml',
      code: yamlCode
    }
  ];
};

// Shiki-style notation parsing. Markers live inside `#` (YAML/bash/python) or `//` (TS/JS/...)
// comments and are stripped before rendering. Both block (start/end) and trailing single-line
// (with optional `:N` count) forms are supported.
//
//   # [!code focus-start]      ... # [!code focus-end]
//   // [!code focus-start]     ... // [!code focus-end]
//   foo: bar  # [!code focus]            (just this line)
//   foo: bar  # [!code focus:3]          (this line + next 2)
//   foo: bar  // [!code highlight]
//   etc.
const MARKER_RE = /(?:#|\/\/)\s*\[!code\s+(focus|highlight)(?:-(start|end))?(?::(\d+))?\s*\]/;
const MARKER_RE_GLOBAL = new RegExp(MARKER_RE.source, 'g');

type LineMarker = {
  kind: 'focus' | 'highlight';
  form: 'start' | 'end' | 'inline';
  count?: number;
};

const parseMarkersFromLine = (line: string): LineMarker[] => {
  const markers: LineMarker[] = [];
  for (const m of line.matchAll(MARKER_RE_GLOBAL)) {
    const kind = m[1] as 'focus' | 'highlight';
    const suffix = m[2] as 'start' | 'end' | undefined;
    const count = m[3] ? Math.max(1, parseInt(m[3], 10)) : undefined;
    markers.push({
      kind,
      form: suffix ?? 'inline',
      count
    });
  }
  return markers;
};

const stripMarkersFromLine = (line: string): string => {
  // Remove all markers and any leading whitespace + comment-leader they bring with them.
  // For trailing markers like `foo: bar  # [!code focus]`, also strip the spaces+comment so we
  // don't leave dangling comment leaders.
  const stripped = line.replace(/\s*(?:#|\/\/)\s*\[!code\s+(?:focus|highlight)(?:-(?:start|end))?(?::\d+)?\s*\]/g, '');
  return stripped;
};

const isMarkerOnlyLine = (line: string): boolean => {
  return stripMarkersFromLine(line).trim() === '' && MARKER_RE.test(line);
};

const leadingIndent = (line: string): string => {
  const m = line.match(/^[ \t]*/);
  return m ? m[0] : '';
};

const commonIndentPrefix = (lines: string[]) => {
  const indents = lines.filter((line) => line.trim().length > 0).map(leadingIndent);
  if (indents.length === 0) return '';
  let prefix = indents[0];
  for (const indent of indents.slice(1)) {
    while (prefix && !indent.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
};

const stripIndentPrefix = (line: string, indent: string) =>
  indent && line.startsWith(indent) ? line.slice(indent.length) : line;

const dedentLinesForDisplay = (lines: string[]) => {
  const indent = commonIndentPrefix(lines);
  return indent ? lines.map((line) => stripIndentPrefix(line, indent)) : lines;
};

const stripQuotedText = (line: string) =>
  line
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');

const countChars = (value: string, chars: string) => {
  let count = 0;
  for (const char of value) {
    if (chars.includes(char)) count += 1;
  }
  return count;
};

const formatTypescriptConfigSnippet = (code: string) => {
  const lines = code.replace(/\r\n/g, '\n').split('\n');
  const firstContentLine = lines.find((line) => line.trim().length > 0);
  const baseIndent = firstContentLine ? leadingIndent(firstContentLine) : '';
  let indentLevel = 0;

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      const codeOnly = stripQuotedText(trimmed).replace(/\/\/.*$/, '');
      const leadingCloseCount = countChars(codeOnly.match(/^[}\]]+/)?.[0] || '', '}]');
      const lineIndentLevel = Math.max(0, indentLevel - leadingCloseCount);
      const formattedLine = `${baseIndent}${'  '.repeat(lineIndentLevel)}${trimmed}`;

      const opens = countChars(codeOnly, '{[');
      const closes = countChars(codeOnly, '}]');
      indentLevel = Math.max(0, indentLevel + opens - closes);
      return formattedLine;
    })
    .join('\n');
};

const preprocessCode = ({
  code,
  lang,
  formatStacktapeConfig = false
}: {
  code: string;
  lang: string;
  formatStacktapeConfig?: boolean;
}): ProcessedCode => {
  const normalizedCode = formatStacktapeConfig ? formatTypescriptConfigSnippet(code) : code;
  const rawLines = normalizedCode.replace(/\r\n/g, '\n').split('\n');

  // Pass 1: parse markers, strip them, decide focus/highlight per (original) source line.
  type LineState = {
    text: string; // line text with markers stripped
    sourceIndex: number; // original index in `rawLines`
    isMarkerOnly: boolean; // line had nothing but a marker → drop entirely
    focused: boolean;
    highlighted: boolean;
  };
  const states: LineState[] = [];
  let focusBlockActive = false;
  let highlightBlockActive = false;
  let focusCounter = 0; // remaining lines (incl. current) to mark focused via inline `:N`
  let highlightCounter = 0;
  let anyFocusMarker = false;

  rawLines.forEach((rawLine, idx) => {
    const markers = parseMarkersFromLine(rawLine);
    let lineFocused = focusBlockActive;
    let lineHighlighted = highlightBlockActive;

    // Apply pending counters from previous `:N` markers (counter ticks down per line).
    if (focusCounter > 0) {
      lineFocused = true;
      focusCounter--;
    }
    if (highlightCounter > 0) {
      lineHighlighted = true;
      highlightCounter--;
    }

    for (const m of markers) {
      if (m.kind === 'focus') anyFocusMarker = true;
      if (m.form === 'start') {
        if (m.kind === 'focus') focusBlockActive = true;
        else highlightBlockActive = true;
      } else if (m.form === 'end') {
        if (m.kind === 'focus') focusBlockActive = false;
        else highlightBlockActive = false;
      } else {
        // inline: applies to this line + (count - 1) following lines
        const count = m.count ?? 1;
        if (m.kind === 'focus') {
          lineFocused = true;
          if (count > 1) focusCounter = count - 1;
        } else {
          lineHighlighted = true;
          if (count > 1) highlightCounter = count - 1;
        }
      }
    }

    const stripped = stripMarkersFromLine(rawLine);
    states.push({
      text: stripped,
      sourceIndex: idx,
      isMarkerOnly: markers.length > 0 && isMarkerOnlyLine(rawLine),
      focused: lineFocused,
      highlighted: lineHighlighted
    });
  });

  const fullStates = states
    .filter((state) => !state.isMarkerOnly)
    .map((state, index) => ({
      ...state,
      fullLineNumber: index + 1
    }));
  const fullCode = fullStates
    .map((state) => state.text)
    .join('\n')
    .replace(/\n$/, '');

  // Pass 2: emit visible lines, collapsing hidden runs to a single `...` placeholder.
  const visibleLines: string[] = [];
  const lineMap: number[] = [];
  const highlightedLineNumbers: number[] = [];
  const focusedLineSpecs: FocusedLineSpec[] = [];
  let pendingHide: typeof fullStates = []; // contiguous hidden run waiting to be collapsed

  const flushHidden = (nextVisibleIndent?: string) => {
    if (pendingHide.length === 0) return;
    if (visibleLines.length === 0 || nextVisibleIndent === undefined) {
      pendingHide = [];
      return;
    }
    // Indent the `...` placeholder to the next visible line's indent (or first hidden line's
    // indent as fallback) so it visually fits the surrounding tree.
    const indent = nextVisibleIndent ?? pendingHide.map((s) => leadingIndent(s.text)).find((s) => s.length > 0) ?? '';
    const placeholderText = `${indent}...`;
    visibleLines.push(placeholderText);
    lineMap.push(-1);
    focusedLineSpecs.push({ kind: 'placeholder', text: placeholderText });
    pendingHide = [];
  };

  for (const state of fullStates) {
    const isFocused = !anyFocusMarker || state.focused;
    if (!isFocused) {
      pendingHide.push(state);
      continue;
    }

    flushHidden(leadingIndent(state.text));
    visibleLines.push(state.text);
    lineMap.push(state.sourceIndex);
    focusedLineSpecs.push({
      kind: 'line',
      fullLineNumber: state.fullLineNumber,
      text: state.text,
      displayText: state.text
    });
    if (state.highlighted && !isTwoslashLanguage(lang)) {
      highlightedLineNumbers.push(visibleLines.length);
    }
  }
  pendingHide = [];

  const displayLines = anyFocusMarker
    ? dedentLinesForDisplay(focusedLineSpecs.map((spec) => spec.text))
    : focusedLineSpecs.map((spec) => spec.text);
  const displayFocusedLineSpecs = focusedLineSpecs.map((spec): FocusedLineSpec => {
    const displayText = displayLines.shift() ?? spec.text;
    if (spec.kind === 'line') {
      return { ...spec, displayText };
    }
    return { ...spec, text: displayText };
  });
  const renderCode = displayFocusedLineSpecs
    .map((spec) => (spec.kind === 'line' ? spec.displayText : spec.text))
    .join('\n')
    .replace(/\n$/, '');

  return {
    renderCode,
    fullCode,
    copyCode: fullCode.trim(),
    highlightedLineNumbers,
    focusedLineSpecs: displayFocusedLineSpecs,
    hasFocusMarkers: anyFocusMarker,
    lineMap
  };
};

const removeLeadingWhitespace = (node: Node) => {
  for (const child of Array.from(node.childNodes)) {
    const text = child.textContent || '';
    if (!text) continue;
    if (/^\s+$/.test(text)) {
      child.remove();
      continue;
    }
    if (child.nodeType === Node.TEXT_NODE) {
      child.textContent = text.replace(/^\s+/, '');
      return;
    }
    removeLeadingWhitespace(child);
    return;
  }
};

const removeAllLeadingWhitespace = (node: Node) => {
  for (let i = 0; i < 20; i++) {
    const before = leadingIndent(node.textContent || '');
    if (!before) return;
    removeLeadingWhitespace(node);
    const after = leadingIndent(node.textContent || '');
    if (after.length >= before.length) return;
  }
};

const collapseRenderedHtmlToFocusedLines = ({
  html,
  focusedLineSpecs
}: {
  html: string;
  focusedLineSpecs: FocusedLineSpec[];
}) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const pre = doc.querySelector('pre');
  const code = pre?.querySelector('code');
  if (!pre || !code) {
    return html;
  }

  const lines = Array.from(code.children).filter((child): child is HTMLElement => child.classList.contains('line'));
  if (lines.length === 0) {
    return html;
  }

  const fragment = doc.createDocumentFragment();
  focusedLineSpecs.forEach((spec) => {
    if (spec.kind === 'line') {
      const line = lines[spec.fullLineNumber - 1];
      if (line) {
        const clonedLine = line.cloneNode(true) as HTMLElement;
        const expectedIndent = leadingIndent(spec.displayText);
        removeAllLeadingWhitespace(clonedLine);
        if (expectedIndent.length > 0) {
          clonedLine.insertBefore(doc.createTextNode(expectedIndent), clonedLine.firstChild);
        }
        fragment.appendChild(clonedLine);
      }
      return;
    }

    const line = doc.createElement('span');
    line.className = 'line stacktape-focus-placeholder-line';
    line.textContent = spec.text;
    fragment.appendChild(line);
  });

  code.replaceChildren(fragment);

  return pre.outerHTML;
};

const decorateRenderedHtml = ({ html, highlightedLineNumbers }: { html: string; highlightedLineNumbers: number[] }) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const pre = doc.querySelector('pre');
  const code = pre?.querySelector('code');
  if (!pre) {
    return html;
  }

  pre.classList.add('stacktape-shiki-pre');
  pre.removeAttribute('tabindex');
  const lines = code
    ? Array.from(code.children).filter((child): child is HTMLElement => child.classList.contains('line'))
    : [];
  highlightedLineNumbers.forEach((lineNumber) => {
    lines[lineNumber - 1]?.classList.add('stacktape-highlighted-line');
  });

  // Remove the type-info code section when the popup also has docs/JSDoc — the docs are
  // more useful. Keep the code section as a fallback for variables without JSDoc so their
  // type signature is still shown.
  pre.querySelectorAll('.twoslash-popup-container').forEach((container) => {
    const hasDocs = container.querySelector('.twoslash-popup-docs');
    const codeEl = container.querySelector('.twoslash-popup-code');
    if (hasDocs && codeEl) codeEl.remove();
  });

  // Render markdown in all popup docs sections (YAML hovers and TypeScript twoslash JSDoc).
  pre.querySelectorAll('.twoslash-popup-docs').forEach((el) => {
    const raw = el.textContent || '';
    if (!raw.trim()) return;
    try {
      el.innerHTML = marked.parse(raw, { async: false }) as string;
      // External links open in a new tab
      el.querySelectorAll('a').forEach((a) => {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      });
    } catch {
      /* leave raw text on parse failure */
    }
  });

  // Strip redundant "\n" text nodes between line elements. `.line` is `display: block` so
  // line breaks come from layout; the explicit newlines get duplicated on copy.
  lines.forEach((line) => {
    const next = line.nextSibling;
    if (next && next.nodeType === 3 && /^\n+$/.test(next.textContent || '')) {
      next.remove();
    }
  });

  return pre.outerHTML;
};

const loadStacktapeFsMap = async (typesCdnBaseUrl: string) => {
  const baseUrl = typesCdnBaseUrl.replace(/\/$/, '');
  const fsMap = new Map<string, string>();
  const files = await Promise.all(
    STACKTAPE_TYPE_FILES.map(async (fileName) => {
      const response = await fetch(`${baseUrl}/${fileName}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${fileName} from ${baseUrl}`);
      }
      return [fileName, await response.text()] as const;
    })
  );

  files.forEach(([fileName, content]) => {
    fsMap.set(`file:///node_modules/stacktape/${fileName}`, content);
  });

  fsMap.set(
    'file:///node_modules/stacktape/package.json',
    JSON.stringify({
      name: 'stacktape',
      version: '0.0.0-docs',
      types: './index.d.ts',
      exports: {
        '.': './index.d.ts',
        './types': './types.d.ts',
        './plain': './plain.d.ts',
        './cloudformation': './cloudformation.d.ts'
      }
    })
  );

  fsMap.set(
    'file:///node_modules/stacktape/module-declarations.d.ts',
    [
      "declare module 'stacktape' {",
      "  export * from 'file:///node_modules/stacktape/index.d.ts';",
      '}',
      "declare module 'stacktape/types' {",
      "  export * from 'file:///node_modules/stacktape/types.d.ts';",
      '}',
      "declare module 'stacktape/plain' {",
      "  export * from 'file:///node_modules/stacktape/plain.d.ts';",
      '}',
      "declare module 'stacktape/cloudformation' {",
      "  export * from 'file:///node_modules/stacktape/cloudformation.d.ts';",
      '}'
    ].join('\n')
  );

  return fsMap;
};

const createLocalStorageCache = () => {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }

  return {
    getItemRaw(key: string) {
      try {
        return localStorage.getItem(`stacktape-docs-twoslash:${key}`);
      } catch {
        return null;
      }
    },
    setItemRaw(key: string, value: string) {
      try {
        localStorage.setItem(`stacktape-docs-twoslash:${key}`, value);
      } catch {}
    }
  };
};

const getShikiRuntime = async () => shikiRuntimePromise;

const renderWithShiki = async ({
  runtime,
  code,
  language,
  highlightedLineNumbers,
  useTwoslash,
  twoslashRuntime,
  extraTransformers = []
}: RenderWithShikiProps) => {
  const hasTwoslash = useTwoslash && twoslashRuntime?.transformerTwoslash;
  const transformers = [...(hasTwoslash ? [twoslashRuntime.transformerTwoslash] : []), ...extraTransformers];

  if (hasTwoslash) {
    await twoslashRuntime?.prepareTypes(code);
  }

  const html = await runtime.codeToHtml(code, {
    lang: language,
    theme: SHIKI_THEME,
    transformers
  });

  return decorateRenderedHtml({ html, highlightedLineNumbers });
};

const createTwoslashRuntime = async (typesCdnBaseUrl: string) => {
  const [{ createTransformerFactory, rendererRich }, { createTwoslashFromCDN }] = await Promise.all([
    import('@shikijs/twoslash'),
    import('twoslash-cdn')
  ]);

  let fsMap: Map<string, string> | undefined;
  try {
    fsMap = await loadStacktapeFsMap(typesCdnBaseUrl);
  } catch (error) {
    console.warn('Failed to load Stacktape declaration files for Twoslash.', error);
  }

  const twoslash = createTwoslashFromCDN({
    fsMap,
    storage: createLocalStorageCache(),
    compilerOptions: {
      lib: ['esnext', 'dom']
    }
  });

  return {
    prepareTypes: twoslash.prepareTypes,
    transformerTwoslash: createTransformerFactory(twoslash.runSync)({
      renderer: rendererRich(),
      twoslashOptions: {
        handbookOptions: {
          noErrorValidation: true
        }
      }
    })
  } satisfies TwoslashRuntime;
};

const getTwoslashRuntime = async (typesCdnBaseUrl: string) => {
  const cacheKey = typesCdnBaseUrl.replace(/\/$/, '');
  if (!twoslashRuntimeCache.has(cacheKey)) {
    twoslashRuntimeCache.set(cacheKey, createTwoslashRuntime(cacheKey));
  }
  return twoslashRuntimeCache.get(cacheKey)!;
};

const copyToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

const getIsAppleSilicon = () => {
  const webGlContext = document.createElement('canvas').getContext('webgl');
  const debugInfo = webGlContext?.getExtension('WEBGL_debug_renderer_info');
  const renderer = (debugInfo && webGlContext?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) || '';
  return Boolean(renderer.match(/Apple/) && !renderer.match(/Apple GPU/));
};

const getPlatform = () => {
  if (navigator.platform.includes('Win')) return 'windows';
  if (navigator.platform.includes('Linux')) return 'linux';
  if (getIsAppleSilicon()) return 'macos-arm';
  return 'macos';
};

const getPreferredTabLabels = () => {
  const platform = getPlatform();
  if (platform === 'windows') return ['Windows (PowerShell)', 'Windows'];
  if (platform === 'linux') return ['Linux'];
  if (platform === 'macos-arm') return ['macOS (ARM)', 'Macos ARM', 'macOS'];
  return ['macOS', 'Macos'];
};

const getDisplayTabLabel = (label: ReactNode) => {
  if (label === 'stacktape.ts') return 'TypeScript';
  return label;
};

function TabSwitcher({
  tabs,
  activeIndex,
  onTabClick
}: {
  tabs: { label: ReactNode }[];
  activeIndex: number;
  onTabClick: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const buttons = containerRef.current.querySelectorAll('button');
    const activeButton = buttons[activeIndex] as HTMLButtonElement | undefined;
    if (!activeButton) return;
    setIndicatorStyle({ left: activeButton.offsetLeft, width: activeButton.offsetWidth });
  }, [activeIndex]);

  if (tabs.length <= 1) return null;

  return (
    <div className="flex mb-2">
      <div ref={containerRef} className="stp-tab-container">
        <div
          className="absolute top-[3px] h-[calc(100%-6px)] z-0 rounded-[6px] bg-[linear-gradient(135deg,rgb(60,64,64),rgb(44,47,47))] shadow-[0_4px_12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(190,190,190,0.16),inset_0_1px_0_rgba(255,255,255,0.1)] [transition:left_200ms_ease,width_200ms_ease]"
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        />
        {tabs.map((tab, index) => {
          const isActive = activeIndex === index;
          return (
            <button
              key={index}
              type="button"
              className={clsx('stp-tab-button', isActive && 'is-active')}
              onClick={() => onTabClick(index)}
            >
              {getDisplayTabLabel(tab.label)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MdxCodeBlockNew({
  children: code,
  typescript,
  intellisense = false,
  stacktapeConfig = false,
  typesCdnBaseUrl = getDefaultTypesBaseUrl(),
  ...props
}: {
  children: ReactNode;
  typescript?: string;
  intellisense?: boolean;
  stacktapeConfig?: boolean;
  className?: string;
  typesCdnBaseUrl?: string;
}) {
  const lang = props.className ? props.className.split('-')[1] : null;
  const codeString =
    typeof code === 'string' ? code : (code as { props?: { children?: string } })?.props?.children || '';
  const shouldEnableIntellisense = intellisense || stacktapeConfig;

  const autoTypescript = useMemo(() => {
    if (typescript) return null;
    if (!shouldEnableIntellisense) return null;
    if (lang !== 'yaml' && lang !== 'yml') return null;
    return convertYamlToTypescript(codeString);
  }, [codeString, lang, shouldEnableIntellisense, typescript]);

  const tsCode = typescript || autoTypescript;
  const tabs: CodeTab[] = tsCode
    ? [
        { code: tsCode, label: 'TypeScript', lang: 'typescript' },
        { code: codeString, label: 'YAML', lang: lang || 'yaml' }
      ]
    : [{ code: codeString, label: lang === 'yaml' || lang === 'yml' ? 'YAML' : '', lang: lang || 'text' }];

  return (
    <CodeBlockNew intellisense={shouldEnableIntellisense} lang={lang} tabs={tabs} typesCdnBaseUrl={typesCdnBaseUrl} />
  );
}

export function CodeBlockNew({
  tabs,
  lang,
  intellisense = false,
  stacktapeConfig = false,
  typesCdnBaseUrl = getDefaultTypesBaseUrl()
}: CodeBlockNewProps) {
  const shouldEnableIntellisense = intellisense || stacktapeConfig;
  const resolvedTabs = useMemo(
    () => withGeneratedYamlTabs(tabs, shouldEnableIntellisense),
    [shouldEnableIntellisense, tabs]
  );
  const [activeTabLabel, setActiveTabLabel] = useState(() => String(resolvedTabs[0]?.label ?? ''));
  const [isCopiedShown, setIsCopiedShown] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const resolvedTabLabels = resolvedTabs.map((tab) => String(tab.label)).join('\u0000');
  const activeTab =
    resolvedTabs.find((tab) => String(tab.label) === activeTabLabel) ||
    resolvedTabs.find((tab) => getPreferredTabLabels().includes(String(tab.label))) ||
    resolvedTabs[0];

  const activeTabCode = activeTab.code;
  const activeTabLang = activeTab.lang;
  const activeTabIsStacktapeConfig =
    isTwoslashLanguage(normalizeLanguage(activeTabLang)) &&
    activeTabCode.includes('defineConfig') &&
    /from\s+['"]stacktape['"]/.test(activeTabCode);

  const processedCode = useMemo(() => {
    const activeLanguage = activeTabLang || lang || 'text';
    return preprocessCode({
      code: activeTabCode,
      lang: activeLanguage,
      formatStacktapeConfig: shouldEnableIntellisense && activeTabIsStacktapeConfig
    });
  }, [activeTabCode, activeTabIsStacktapeConfig, activeTabLang, lang, shouldEnableIntellisense]);

  const amountOfLines = processedCode.renderCode.split('\n').length;
  const activeIndex = resolvedTabs.findIndex((tab) => tab.label === activeTab.label);

  useEffect(() => {
    const preferredLabels = getPreferredTabLabels();
    const matchedTab = resolvedTabs.find((tab) => preferredLabels.includes(String(tab.label)));
    setActiveTabLabel((currentLabel) => {
      if (resolvedTabs.some((tab) => String(tab.label) === currentLabel)) return currentLabel;
      return String((matchedTab || resolvedTabs[0])?.label ?? '');
    });
  }, [resolvedTabLabels, resolvedTabs]);

  useEffect(() => {
    let isCancelled = false;

    const renderHighlightedCode = async () => {
      try {
        setRenderError(null);
        const runtime = await getShikiRuntime();
        const normalizedLanguage = normalizeLanguage(activeTab.lang || lang || 'text');
        const shouldUseIntellisense = shouldEnableIntellisense;
        const shouldUseTwoslash = shouldUseIntellisense && isTwoslashLanguage(normalizedLanguage);
        const twoslashRuntime = shouldUseTwoslash ? await getTwoslashRuntime(typesCdnBaseUrl) : undefined;

        const extraTransformers: unknown[] = [];
        if (shouldUseIntellisense && normalizedLanguage === 'yaml') {
          // Parse the ORIGINAL code (still valid YAML) and translate hover positions
          // through `lineMap` to match the rendered (possibly focus-filtered) output.
          const hoverTransformer = await computeYamlHovers(activeTab.code, processedCode.lineMap);
          if (hoverTransformer) extraTransformers.push(hoverTransformer);
        }

        let html: string;
        try {
          const codeToRender = shouldUseTwoslash ? processedCode.fullCode : processedCode.renderCode;
          html = await renderWithShiki({
            runtime,
            code: codeToRender,
            language: normalizedLanguage,
            highlightedLineNumbers: processedCode.highlightedLineNumbers,
            useTwoslash: shouldUseTwoslash,
            twoslashRuntime,
            extraTransformers
          });
          if (shouldUseTwoslash && processedCode.hasFocusMarkers) {
            html = collapseRenderedHtmlToFocusedLines({
              html,
              focusedLineSpecs: processedCode.focusedLineSpecs
            });
          }
        } catch {
          // Any decorated-render failure (twoslash type loading, the YAML hover transformer, etc.)
          // degrades to plain Shiki highlighting rather than dropping to unstyled text. Note the
          // empty transformer list — the extra transformer may itself be the cause of the failure.
          html = await renderWithShiki({
            runtime,
            code: processedCode.renderCode,
            language: normalizedLanguage,
            highlightedLineNumbers: processedCode.highlightedLineNumbers,
            useTwoslash: false,
            extraTransformers: []
          });
        }

        if (isCancelled) return;
        setRenderedHtml(html);
      } catch (error) {
        if (isCancelled) return;
        console.warn('Failed to render code block with Shiki.', error);
        setRenderedHtml(null);
        setRenderError('Syntax highlighting unavailable');
      }
    };

    renderHighlightedCode();

    return () => {
      isCancelled = true;
    };
  }, [activeTab.code, activeTab.lang, lang, processedCode, shouldEnableIntellisense, typesCdnBaseUrl]);

  // Move hover popups out of the code block into a portal attached to <body>, so they escape
  // any containing block (transforms from animations, overflow clipping, etc.) and can be
  // positioned freely via viewport-relative `position: fixed`.
  useEffect(() => {
    const container = codeContainerRef.current;
    if (!container || !renderedHtml || typeof document === 'undefined') return;

    // Per-component portal — classes mirror the code block so CSS selectors still match.
    const portal = document.createElement('div');
    portal.className = 'stacktape-code-block twoslash stacktape-hover-portal';
    document.body.appendChild(portal);

    const hovers = Array.from(container.querySelectorAll<HTMLElement>('.twoslash-hover'));
    const cleanups: Array<() => void> = [];

    for (const hover of hovers) {
      const popup = hover.querySelector<HTMLElement>('.twoslash-popup-container');
      if (!popup) continue;

      // Move popup into portal — escapes all ancestor containing blocks and overflow clipping.
      portal.appendChild(popup);

      let hideTimeout: ReturnType<typeof setTimeout> | null = null;

      const position = () => {
        const rect = hover.getBoundingClientRect();
        // Show at (0,0) briefly to get natural size, then clamp into viewport.
        popup.style.left = '0px';
        popup.style.top = '0px';
        const popupRect = popup.getBoundingClientRect();
        let left = rect.left;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (left + popupRect.width > vw - 10) left = Math.max(10, vw - popupRect.width - 10);
        let top = rect.bottom + 2;
        // Flip above if not enough space below
        if (top + popupRect.height > vh - 10 && rect.top - popupRect.height - 2 >= 10) {
          top = rect.top - popupRect.height - 2;
        }
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
      };
      const show = () => {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
        popup.classList.add('visible');
        // Position after making visible so we get accurate measurements
        position();
      };
      const scheduleHide = () => {
        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => popup.classList.remove('visible'), 150);
      };

      hover.addEventListener('mouseenter', show);
      hover.addEventListener('mouseleave', scheduleHide);
      popup.addEventListener('mouseenter', show);
      popup.addEventListener('mouseleave', scheduleHide);

      cleanups.push(() => {
        if (hideTimeout) clearTimeout(hideTimeout);
        hover.removeEventListener('mouseenter', show);
        hover.removeEventListener('mouseleave', scheduleHide);
        popup.removeEventListener('mouseenter', show);
        popup.removeEventListener('mouseleave', scheduleHide);
      });
    }

    const onScroll = () => {
      portal.querySelectorAll<HTMLElement>('.twoslash-popup-container.visible').forEach((p) => {
        p.classList.remove('visible');
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });

    return () => {
      cleanups.forEach((fn) => fn());
      window.removeEventListener('scroll', onScroll, { capture: true });
      portal.remove();
    };
  }, [renderedHtml]);

  const handleCopyClick = async () => {
    setIsCopiedShown(true);
    setTimeout(() => setIsCopiedShown(false), 1000);
    await copyToClipboard(processedCode.copyCode);
  };

  const handleTabClick = (index: number) => {
    setActiveTabLabel(String(resolvedTabs[index].label));
    setAnimationKey((value) => value + 1);
  };

  return (
    <div className="mt-[25px] mb-[30px] overflow-visible w-full text-[13.5px] leading-[1.5]">
      <TabSwitcher tabs={resolvedTabs} activeIndex={activeIndex >= 0 ? activeIndex : 0} onTabClick={handleTabClick} />

      <div className="stacktape-code-block-shell stp-box stp-pretty-scrollbar group relative overflow-x-auto overflow-y-hidden pt-4 pb-[14px] px-0 max-[500px]:mt-[3.5px]">
        <button
          type="button"
          className="copy-button stp-icon-button absolute right-[14px] z-20 opacity-0 group-hover:opacity-100 [transition:all_250ms_ease,opacity_0.2s_ease-in-out]"
          style={{ top: amountOfLines <= 2 ? '7px' : '14px' }}
          onClick={handleCopyClick}
        >
          {isCopiedShown ? (
            <BiCheck size={18} color={colors.fontColorPrimary} />
          ) : (
            <BiCopy size={18} color={colors.fontColorPrimary} />
          )}
        </button>

        {renderError ? (
          <div className="pt-0 px-[18px] pb-[10px]">
            <p className="text-fc-light text-[0.8rem] mb-2">{renderError}</p>
            <pre className="m-0 text-fc-primary font-mono">{processedCode.renderCode}</pre>
          </div>
        ) : renderedHtml ? (
          <div
            key={animationKey}
            ref={codeContainerRef}
            className="stacktape-code-block twoslash block animate-code-fade-in"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <pre className="m-0 px-[18px] text-fc-primary font-mono whitespace-pre-wrap">{processedCode.renderCode}</pre>
        )}
      </div>
    </div>
  );
}

export { CodeBlockNew as CodeBlock, MdxCodeBlockNew as MdxCodeBlock };
