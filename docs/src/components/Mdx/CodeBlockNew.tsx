'use client';

import type { ReactNode } from 'react';
import { css, Global, keyframes } from '@emotion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BiCheck, BiCopy } from 'react-icons/bi';
import { onMaxW500 } from '../../styles/responsive';
import {
  box,
  colors,
  fontFamilyMono,
  iconButtonStyle,
  prettyScrollBar,
  tabButtonStyle,
  tabContainerStyle
} from '../../styles/variables';
import { convertYamlToTypescript } from '../../utils/yaml-to-typescript';

const START_HIGHLIGHT_MARK = '{start-highlight}';
const STOP_HIGHLIGHT_MARK = '{stop-highlight}';
const START_IGNORE_SECTION = '{start-ignore}';
const STOP_IGNORE_SECTION = '{stop-ignore}';
const DIRECTIVE_TYPES = [START_HIGHLIGHT_MARK, STOP_HIGHLIGHT_MARK, START_IGNORE_SECTION, STOP_IGNORE_SECTION] as const;
const STACKTAPE_TYPE_FILES = ['index.d.ts', 'types.d.ts', 'plain.d.ts', 'cloudformation.d.ts'] as const;
const SHIKI_THEME = 'catppuccin-mocha';
const DEFAULT_DEV_TYPES_BASE_URL = '/stacktape';
const DEFAULT_PROD_TYPES_BASE_URL = 'https://cdn.jsdelivr.net/npm/stacktape@latest';

type CodeTab = { label: ReactNode; code: string; lang: string };

type CodeBlockNewProps = {
  tabs: CodeTab[];
  lang?: string | null;
  typesCdnBaseUrl?: string;
};

type ProcessedCode = {
  renderCode: string;
  copyCode: string;
  highlightedLineNumbers: number[];
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
};

const shikiRuntimePromise = import('shiki').then(({ codeToHtml }) => ({ codeToHtml }) satisfies ShikiRuntime);
const twoslashRuntimeCache = new Map<string, Promise<TwoslashRuntime>>();

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`;

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

const isTwoslashError = (error: unknown) => {
  return error instanceof Error && error.name === 'TwoslashError';
};

const getDirectiveFromLine = (line: string) => {
  return DIRECTIVE_TYPES.find((directive) => line.includes(directive));
};

const preprocessCode = ({ code, lang }: { code: string; lang: string }) => {
  const lines = code.replace(/\r\n/g, '\n').split('\n');
  const visibleLines: string[] = [];
  const highlightedLineNumbers: number[] = [];
  let shouldHighlight = false;
  let shouldIgnore = false;

  for (const line of lines) {
    const directive = getDirectiveFromLine(line);
    if (directive === START_HIGHLIGHT_MARK) {
      shouldHighlight = true;
      continue;
    }
    if (directive === STOP_HIGHLIGHT_MARK) {
      shouldHighlight = false;
      continue;
    }
    if (directive === START_IGNORE_SECTION) {
      shouldIgnore = true;
      continue;
    }
    if (directive === STOP_IGNORE_SECTION) {
      shouldIgnore = false;
      continue;
    }
    if (shouldIgnore) {
      continue;
    }
    visibleLines.push(line);
    if (shouldHighlight && !isTwoslashLanguage(lang)) {
      highlightedLineNumbers.push(visibleLines.length);
    }
  }

  const renderCode = visibleLines.join('\n').replace(/\n$/, '');

  return {
    renderCode,
    copyCode: renderCode.trim(),
    highlightedLineNumbers
  } satisfies ProcessedCode;
};

const decorateRenderedHtml = ({ html, highlightedLineNumbers }: { html: string; highlightedLineNumbers: number[] }) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const pre = doc.querySelector('pre');
  if (!pre) {
    return html;
  }

  pre.classList.add('stacktape-shiki-pre');
  pre.removeAttribute('tabindex');
  const lines = Array.from(pre.querySelectorAll('.line'));
  highlightedLineNumbers.forEach((lineNumber) => {
    lines[lineNumber - 1]?.classList.add('stacktape-highlighted-line');
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
      } catch {
        return;
      }
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
  twoslashRuntime
}: RenderWithShikiProps) => {
  const transformers = useTwoslash && twoslashRuntime?.transformerTwoslash ? [twoslashRuntime.transformerTwoslash] : [];

  if (transformers.length > 0) {
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
    <div css={{ display: 'flex', marginBottom: '8px' }}>
      <div ref={containerRef} css={{ ...tabContainerStyle, position: 'relative' }}>
        <div
          css={{
            position: 'absolute',
            top: '4px',
            height: 'calc(100% - 8px)',
            background: 'linear-gradient(135deg, rgb(60, 64, 64), rgb(44, 47, 47))',
            boxShadow:
              '0 4px 12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(190, 190, 190, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            borderRadius: '7px',
            transition: 'left 200ms ease, width 200ms ease',
            zIndex: 0,
            left: indicatorStyle.left,
            width: indicatorStyle.width
          }}
        />
        {tabs.map((tab, index) => {
          const isActive = activeIndex === index;
          return (
            <button
              key={index}
              type="button"
              css={{
                ...tabButtonStyle,
                zIndex: 1,
                color: isActive ? colors.fontColorPrimary : tabButtonStyle.color
              }}
              onClick={() => onTabClick(index)}
            >
              {tab.label}
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
  typesCdnBaseUrl = getDefaultTypesBaseUrl(),
  ...props
}: {
  children: ReactNode;
  typescript?: string;
  className?: string;
  typesCdnBaseUrl?: string;
}) {
  const lang = props.className ? props.className.split('-')[1] : null;
  const codeString =
    typeof code === 'string' ? code : (code as { props?: { children?: string } })?.props?.children || '';

  const autoTypescript = useMemo(() => {
    if (typescript) return null;
    if (lang !== 'yaml' && lang !== 'yml') return null;
    return convertYamlToTypescript(codeString);
  }, [codeString, lang, typescript]);

  const tsCode = typescript || autoTypescript;
  const tabs: CodeTab[] = tsCode
    ? [
        { code: tsCode, label: 'TypeScript', lang: 'typescript' },
        { code: codeString, label: 'YAML', lang: lang || 'yaml' }
      ]
    : [{ code: codeString, label: lang === 'yaml' || lang === 'yml' ? 'YAML' : '', lang: lang || 'text' }];

  return <CodeBlockNew lang={lang} tabs={tabs} typesCdnBaseUrl={typesCdnBaseUrl} />;
}

export function CodeBlockNew({ tabs, lang, typesCdnBaseUrl = getDefaultTypesBaseUrl() }: CodeBlockNewProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [isCopiedShown, setIsCopiedShown] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const processedCode = useMemo(() => {
    return preprocessCode({ code: activeTab.code, lang: activeTab.lang || lang || 'text' });
  }, [activeTab.code, activeTab.lang, lang]);

  const amountOfLines = processedCode.renderCode.split('\n').length;
  const activeIndex = tabs.findIndex((tab) => tab.label === activeTab.label);

  useEffect(() => {
    const preferredLabels = getPreferredTabLabels();
    const matchedTab = tabs.find((tab) => preferredLabels.includes(String(tab.label)));
    setActiveTab(matchedTab || tabs[0]);
  }, [tabs]);

  useEffect(() => {
    let isCancelled = false;

    const renderHighlightedCode = async () => {
      try {
        setRenderError(null);
        const runtime = await getShikiRuntime();
        const normalizedLanguage = normalizeLanguage(activeTab.lang || lang || tabs[0]?.lang || 'text');
        const shouldUseTwoslash = isTwoslashLanguage(normalizedLanguage);
        const twoslashRuntime = shouldUseTwoslash ? await getTwoslashRuntime(typesCdnBaseUrl) : undefined;

        let html: string;
        try {
          html = await renderWithShiki({
            runtime,
            code: processedCode.renderCode,
            language: normalizedLanguage,
            highlightedLineNumbers: processedCode.highlightedLineNumbers,
            useTwoslash: shouldUseTwoslash,
            twoslashRuntime
          });
        } catch (error) {
          if (!shouldUseTwoslash || !isTwoslashError(error)) {
            throw error;
          }

          html = await renderWithShiki({
            runtime,
            code: processedCode.renderCode,
            language: normalizedLanguage,
            highlightedLineNumbers: processedCode.highlightedLineNumbers,
            useTwoslash: false
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
  }, [activeTab.lang, lang, processedCode, tabs, typesCdnBaseUrl]);

  const handleCopyClick = async () => {
    setIsCopiedShown(true);
    setTimeout(() => setIsCopiedShown(false), 1000);
    await copyToClipboard(processedCode.copyCode);
  };

  const handleTabClick = (index: number) => {
    setActiveTab(tabs[index]);
    setAnimationKey((value) => value + 1);
  };

  return (
    <div
      css={{
        marginTop: '25px',
        marginBottom: '30px',
        overflow: 'visible',
        width: '100%',
        fontSize: '13.5px',
        lineHeight: '1.5'
      }}
    >
      <Global
        styles={css`
          .stacktape-code-block.twoslash {
            --twoslash-border-color: rgba(147, 153, 178, 0.24);
            --twoslash-underline-color: #89b4fa;
            --twoslash-highlighted-border: rgba(245, 194, 231, 0.32);
            --twoslash-highlighted-bg: rgba(245, 194, 231, 0.12);
            --twoslash-popup-bg: rgba(30, 30, 46, 0.96);
            --twoslash-popup-color: #cdd6f4;
            --twoslash-popup-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
            --twoslash-docs-color: #a6adc8;
            --twoslash-docs-font: inherit;
            --twoslash-code-font: ${fontFamilyMono};
            --twoslash-code-font-size: 0.92em;
            --twoslash-matched-color: #f5e0dc;
            --twoslash-unmatched-color: #7f849c;
            --twoslash-cursor-color: rgba(137, 180, 250, 0.45);
            --twoslash-error-color: #f38ba8;
            --twoslash-error-bg: rgba(243, 139, 168, 0.14);
            --twoslash-warn-color: #f9e2af;
            --twoslash-warn-bg: rgba(249, 226, 175, 0.16);
            --twoslash-tag-color: #89dceb;
            --twoslash-tag-bg: rgba(137, 220, 235, 0.14);
            --twoslash-tag-warn-color: #fab387;
            --twoslash-tag-warn-bg: rgba(250, 179, 135, 0.14);
            --twoslash-tag-annotate-color: #a6e3a1;
            --twoslash-tag-annotate-bg: rgba(166, 227, 161, 0.14);
          }

          .stacktape-code-block.twoslash .twoslash-hover {
            border-bottom: 1px dotted transparent;
            transition: border-color 0.3s ease;
            position: relative;
            cursor: help;
          }

          .stacktape-code-block.twoslash .twoslash-hover:hover {
            border-bottom-color: var(--twoslash-underline-color);
          }

          .stacktape-code-block.twoslash .twoslash-popup-container {
            position: absolute;
            opacity: 0;
            display: inline-flex;
            flex-direction: column;
            transform: translateY(1.1em);
            background: var(--twoslash-popup-bg);
            color: var(--twoslash-popup-color);
            border: 1px solid var(--twoslash-border-color);
            border-radius: 8px;
            transition: opacity 0.2s ease;
            pointer-events: none;
            z-index: 30;
            user-select: none;
            text-align: left;
            box-shadow: var(--twoslash-popup-shadow);
            min-width: min(360px, calc(100vw - 56px));
            max-width: min(720px, calc(100vw - 40px));
            backdrop-filter: blur(12px);
            white-space: normal;
          }

          .stacktape-code-block.twoslash .twoslash-query-persisted .twoslash-popup-container {
            z-index: 29;
            transform: translateY(1.5em);
          }

          .stacktape-code-block.twoslash .twoslash-hover:hover .twoslash-popup-container,
          .stacktape-code-block.twoslash .twoslash-error-hover:hover .twoslash-popup-container,
          .stacktape-code-block.twoslash .twoslash-query-persisted .twoslash-popup-container,
          .stacktape-code-block.twoslash .twoslash-query-line .twoslash-popup-container {
            opacity: 1;
            pointer-events: auto;
          }

          .stacktape-code-block.twoslash .twoslash-popup-container:hover,
          .stacktape-code-block.twoslash .twoslash-completion-list:hover {
            user-select: auto;
          }

          .stacktape-code-block.twoslash .twoslash-popup-arrow {
            position: absolute;
            top: -4px;
            left: 1em;
            border-top: 1px solid var(--twoslash-border-color);
            border-right: 1px solid var(--twoslash-border-color);
            background: var(--twoslash-popup-bg);
            transform: rotate(-45deg);
            width: 6px;
            height: 6px;
            pointer-events: none;
          }

          .stacktape-code-block.twoslash .twoslash-popup-code,
          .stacktape-code-block.twoslash .twoslash-popup-error,
          .stacktape-code-block.twoslash .twoslash-popup-docs {
            padding: 6px 8px !important;
          }

          .stacktape-code-block.twoslash .twoslash-popup-code {
            font-family: var(--twoslash-code-font);
            font-size: var(--twoslash-code-font-size);
            line-height: 1.45;
            white-space: normal;
            overflow-wrap: anywhere;
            word-break: normal;
          }

          .stacktape-code-block.twoslash .twoslash-popup-code span {
            white-space: inherit !important;
          }

          .stacktape-code-block.twoslash .twoslash-popup-code pre,
          .stacktape-code-block.twoslash .twoslash-popup-code code {
            margin: 0;
            padding: 0;
            border: 0;
            min-width: 0;
            background: transparent !important;
            box-shadow: none;
          }

          .stacktape-code-block.twoslash .twoslash-popup-code .line {
            display: inline;
            padding: 0 !important;
            min-height: 0;
          }

          .stacktape-code-block.twoslash .twoslash-popup-code .line + .line::before {
            content: '\a';
            white-space: pre;
          }

          .stacktape-code-block.twoslash .twoslash-popup-docs {
            color: var(--twoslash-docs-color);
            font-family: var(--twoslash-docs-font);
            font-size: 0.8em;
            line-height: 1.5;
            border-top: 1px solid var(--twoslash-border-color);
          }

          .stacktape-code-block.twoslash .twoslash-popup-docs p {
            margin: 0 0 6px 0;
          }

          .stacktape-code-block.twoslash .twoslash-popup-docs p:last-child {
            margin-bottom: 0;
          }

          .stacktape-code-block.twoslash .twoslash-popup-error {
            color: var(--twoslash-error-color);
            background-color: var(--twoslash-error-bg);
            font-size: 0.8em;
          }

          .stacktape-code-block.twoslash .twoslash-popup-docs-tags {
            display: flex;
            flex-direction: column;
          }

          .stacktape-code-block.twoslash .twoslash-popup-docs-tag-name {
            margin-right: 0.5em;
            font-family: var(--twoslash-code-font);
          }

          .stacktape-code-block.twoslash .twoslash-query-line .twoslash-popup-container {
            position: relative;
            margin-bottom: 1.4em;
            transform: translateY(0.6em);
          }

          .stacktape-code-block.twoslash .twoslash-error-line,
          .stacktape-code-block.twoslash .twoslash-tag-line {
            position: relative;
            min-width: 100%;
            width: max-content;
            margin: 0.2em 0;
            padding: 6px 10px;
            border-left: 3px solid var(--twoslash-error-color);
            background-color: var(--twoslash-error-bg);
            color: var(--twoslash-error-color);
          }

          .stacktape-code-block.twoslash .twoslash-error-line.twoslash-error-level-warning {
            background-color: var(--twoslash-warn-bg);
            border-left-color: var(--twoslash-warn-color);
            color: var(--twoslash-warn-color);
          }

          .stacktape-code-block.twoslash .twoslash-tag-line {
            border-left-color: var(--twoslash-tag-color);
            background-color: var(--twoslash-tag-bg);
            color: var(--twoslash-tag-color);
          }

          .stacktape-code-block.twoslash .twoslash-completion-cursor {
            position: relative;
          }

          .stacktape-code-block.twoslash .twoslash-completion-cursor .twoslash-completion-list {
            user-select: none;
            position: absolute;
            top: 0;
            left: 0;
            transform: translate(0, 1.2em);
            margin: 3px 0 0 -1px;
            display: inline-block;
            z-index: 28;
            box-shadow: var(--twoslash-popup-shadow);
            background: var(--twoslash-popup-bg);
            border: 1px solid var(--twoslash-border-color);
          }

          .stacktape-code-block.twoslash .twoslash-completion-list {
            width: 260px;
            font-size: 0.8rem;
            padding: 4px;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .stacktape-code-block.twoslash .twoslash-completion-list::before {
            background-color: var(--twoslash-cursor-color);
            width: 2px;
            position: absolute;
            top: -1.6em;
            height: 1.4em;
            left: -1px;
            content: ' ';
          }

          .stacktape-code-block.twoslash .twoslash-completion-list li {
            overflow: hidden;
            display: flex;
            align-items: center;
            gap: 0.25em;
            line-height: 1em;
          }

          .stacktape-code-block.twoslash .twoslash-completions-unmatched,
          .stacktape-code-block.twoslash .twoslash-completions-icon {
            color: var(--twoslash-unmatched-color);
          }

          .stacktape-code-block.twoslash .twoslash-completions-icon {
            width: 1em;
            flex: none;
          }

          .stacktape-code-block.twoslash .twoslash-completions-matched {
            color: var(--twoslash-matched-color);
          }

          .stacktape-code-block.twoslash .deprecated {
            text-decoration: line-through;
            opacity: 0.5;
          }

          .stacktape-code-block.twoslash .twoslash-highlighted {
            background-color: var(--twoslash-highlighted-bg);
            border: 1px solid var(--twoslash-highlighted-border);
            padding: 1px 2px;
            margin: -1px -3px;
            border-radius: 4px;
          }
        `}
      />

      <TabSwitcher tabs={tabs} activeIndex={activeIndex >= 0 ? activeIndex : 0} onTabClick={handleTabClick} />

      <div
        css={{
          overflowX: 'auto',
          overflowY: 'hidden',
          ...prettyScrollBar,
          ...box,
          [onMaxW500]: {
            marginTop: '3.5px'
          },
          padding: '16px 0 14px 0',
          position: 'relative',
          '&:hover .copy-button': {
            opacity: 1
          }
        }}
      >
        <button
          type="button"
          className="copy-button"
          css={{
            ...iconButtonStyle,
            position: 'absolute',
            top: amountOfLines <= 2 ? '7px' : '14px',
            right: '14px',
            zIndex: 20,
            opacity: 0,
            transition: 'all 250ms ease, opacity 0.2s ease-in-out'
          }}
          onClick={handleCopyClick}
        >
          {isCopiedShown ? (
            <BiCheck size={18} color={colors.fontColorPrimary} />
          ) : (
            <BiCopy size={18} color={colors.fontColorPrimary} />
          )}
        </button>

        {renderError ? (
          <div css={{ padding: '0 18px 10px 18px' }}>
            <p css={{ color: colors.fontColorLightGray, fontSize: '0.8rem', marginBottom: '8px' }}>{renderError}</p>
            <pre css={{ margin: 0, color: colors.fontColorPrimary, fontFamily: fontFamilyMono }}>
              {processedCode.renderCode}
            </pre>
          </div>
        ) : renderedHtml ? (
          <div
            key={animationKey}
            className="stacktape-code-block twoslash"
            css={{
              animation: `${fadeIn} 180ms ease-out`,
              display: 'block',
              '*': {
                fontFamily: fontFamilyMono
              },
              '.stacktape-shiki-pre': {
                display: 'block',
                background: 'transparent !important',
                margin: 0,
                padding: 0,
                minWidth: '100%',
                overflow: 'visible'
              },
              '.stacktape-shiki-pre code': {
                display: 'block'
              },
              '.stacktape-shiki-pre .line': {
                display: 'block',
                width: '100%',
                padding: '0 18px',
                minHeight: '1.5em'
              },
              '.stacktape-shiki-pre .stacktape-highlighted-line': {
                background:
                  'linear-gradient(90deg, rgba(137, 180, 250, 0.18) 0%, rgba(137, 180, 250, 0.08) 55%, rgba(0, 0, 0, 0) 100%)',
                borderLeft: '2px solid rgba(137, 180, 250, 0.8)'
              },
              '.stacktape-shiki-pre .line span': {
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }
            }}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <pre
            css={{
              margin: 0,
              padding: '0 18px',
              color: colors.fontColorPrimary,
              fontFamily: fontFamilyMono,
              whiteSpace: 'pre-wrap'
            }}
          >
            {processedCode.renderCode}
          </pre>
        )}
      </div>
    </div>
  );
}

export { CodeBlockNew as CodeBlock, MdxCodeBlockNew as MdxCodeBlock };
