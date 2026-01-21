import type { Language } from 'prism-react-renderer';
import type { CSSProperties, ReactNode } from 'react';
import { keyframes } from '@emotion/react';
import { Highlight, Prism, themes } from 'prism-react-renderer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BiCheck, BiCopy } from 'react-icons/bi';
import { onMaxW500 } from '../../styles/responsive';
import {
  activeTabButtonStyle,
  box,
  colors,
  fontFamilyMono,
  iconButtonStyle,
  prettyScrollBar,
  tabButtonStyle,
  tabContainerStyle
} from '../../styles/variables';
import { convertYamlToTypescript } from '../../utils/yaml-to-typescript';

(typeof globalThis !== 'undefined' ? globalThis : window).Prism = Prism;
Prism.languages.prisma = Prism.languages.extend('clike', {
  keyword: /\b(?:datasource|enum|generator|model|type)\b/,
  'type-class-name': /(\b(?:model|datasource|enum|generator|type)\s+)[\w.\\]+/
});
// Prism.languages.javascript['class-name'][0].pattern = /(\b(?:model|datasource|enum|generator|type)\s+)[\w.\\]+/;
Prism.languages.insertBefore('prisma', 'function', {
  annotation: {
    pattern: /(^|[^.])@+\w+/,
    lookbehind: true,
    alias: 'punctuation'
  }
});
Prism.languages.insertBefore('prisma', 'punctuation', {
  'type-args': /\b(?:references|fields|onDelete|onUpdate):/
});
Prism.languages.json5 = Prism.languages.js;
Prism.languages.json = Prism.languages.json5;

type RendererToken = {
  types: string[];
  content: string;
  empty?: boolean;
};
const START_HIGHLIGHT_MARK = '{start-highlight}';
const STOP_HIGHLIGHT_MARK = '{stop-highlight}';

const START_IGNORE_SECTION = '{start-ignore}';
const STOP_IGNORE_SECTION = '{stop-ignore}';

const DIRECTIVE_TYPES = [START_HIGHLIGHT_MARK, STOP_HIGHLIGHT_MARK, START_IGNORE_SECTION, STOP_IGNORE_SECTION] as const;

const isNestedKeyAtLevel = ({
  token,
  tokenKey,
  line,
  level
}: {
  token: RendererToken;
  tokenKey: number;
  line: RendererToken[];
  level: number;
}) => {
  return (
    // tokenKey === 1 &&
    token.types.includes('key') &&
    !/^\s*$/.test(token.content) &&
    // /^\s*$/.test(line[tokenKey - 1].content) &&
    // line[tokenKey - 1].content.length === level * 2
    line.slice(0, tokenKey).reduce((finalLength, { content }) => finalLength + content.length, 0) === level * 2
  );
};

const BASH_COMMAND_TOKENS = [
  'stacktape',
  'stp',
  'yarn',
  'npm',
  'curl',
  'rails',
  'pip3',
  'npx',
  'pip',
  'iwr',
  'pnpm',
  'bun',
  'deno'
];

const addCustomStacktapeStyle = ({
  token,
  tokenKey,
  line,
  lang,
  prevToken,
  amountOfLines
}: {
  token: RendererToken;
  tokenKey: number;
  line: RendererToken[];
  lang: string;
  prevToken?: RendererToken;
  amountOfLines: number;
}): CSSProperties => {
  // console.log({ token, tokenKey, line, lang });
  if (lang === 'bash') {
    const tokenContent = token.content.trim();
    if (BASH_COMMAND_TOKENS.includes(tokenContent) && tokenKey === 0) {
      return { color: colors.primary, fontWeight: 'bold' };
    }
    if (tokenContent.startsWith('--') || tokenContent.startsWith('-')) {
      return { color: '#949494' };
    }
    if (tokenContent === '<<' || tokenContent === '>>' || prevToken?.content === '<<') {
      return { fontStyle: 'italic', color: colors.fontColorPrimary };
    }
    return { color: colors.fontColorPrimary };
  }
  if (lang === 'yaml' || lang === 'yml') {
    const isLongEnoughToUseCustomColors = amountOfLines > 6;

    // highlight level 0 keys
    if (isLongEnoughToUseCustomColors && (tokenKey === 0 || isNestedKeyAtLevel({ token, tokenKey, line, level: 0 }))) {
      return { color: colors.primary, fontWeight: 'bold' };
    }
    // highlight level 1 keys
    if (isLongEnoughToUseCustomColors && isNestedKeyAtLevel({ token, tokenKey, line, level: 1 })) {
      return { color: colors.fontColorPrimary, fontWeight: 'bold' };
    }
    // highlight level 2 keys
    if (isLongEnoughToUseCustomColors && isNestedKeyAtLevel({ token, tokenKey, line, level: 2 })) {
      return { color: '#dcdcaa' };
    }
    // adding styling to plain tokens
    // plain tokens are non-quoted strings, therefore same color as for strings is added
    if (token.types.length === 1 && token.types[0] === 'plain') {
      return { color: 'rgb(206, 145, 120)' };
    }
    // if one of the previous tokens in line was plain, then we are in non-quoted string
    // therefore the styling (color) should be same as for strings
    // this resolves problem with punctuation and numbers in non-quoted string
    if (
      line
        .slice(0, tokenKey)
        .some((pToken) => pToken.types.includes('plain') && !/^\s*$/.test(pToken.content) && pToken.types.length === 1)
    ) {
      return { color: 'rgb(206, 145, 120)' };
    }
  }
  return {};
};

const parseDirectiveCommentLine = ({ line }: { line: RendererToken[] }) => {
  for (const lineToken of line) {
    if (
      lineToken.types.includes('comment') &&
      DIRECTIVE_TYPES.find((directiveType) => lineToken.content.includes(directiveType))
    ) {
      return DIRECTIVE_TYPES.find((directiveType) => lineToken.content.includes(directiveType));
    }
  }
  // if (
  //   line.every(lineToken => {})

  //   /^\s*$/.test(line[0].content) &&
  //   line[1].types.includes('comment') &&
  //   DIRECTIVE_TYPES.find((directiveType) => line[1].content.includes(directiveType))
  //   // DIRECTIVE_TYPES.includes(line[1].content.slice(1).trim() as DirectiveType)
  // ) {
  //   return DIRECTIVE_TYPES.find((directiveType) => line[1].content.includes(directiveType));
  // }
};

export const copyToClipboard = (text: string) => {
  const strippedText = text
    .split('\n')
    .filter((line) => !line.includes(START_HIGHLIGHT_MARK) && !line.includes(STOP_HIGHLIGHT_MARK))
    .join('\n');
  const textarea = document.createElement('textarea');
  textarea.textContent = strippedText.trim();
  textarea.style.position = 'fixed'; // Prevent scrolling to bottom of page in Microsoft Edge.
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy'); // Security exception may be thrown by some browsers.
  } catch (ex) {
    console.warn('Copy to clipboard failed.', ex);
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
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
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const buttons = containerRef.current.querySelectorAll('button');
    const activeButton = buttons[activeIndex];
    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth
      });
    }
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
            zIndex: 0
          }}
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
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

type CodeTab = { label: ReactNode; code: string; lang: Language };

export function MdxCodeBlock({ children: code, typescript, ...props }) {
  const lang = props.className ? props.className.split('-')[1] : null;
  const codeString = typeof code === 'string' ? code : code?.props?.children || '';

  // Try to auto-convert YAML to TypeScript if not provided
  const autoTypescript = useMemo(() => {
    if (typescript) return null; // Don't auto-convert if explicit TS provided
    if (lang !== 'yaml' && lang !== 'yml') return null;
    return convertYamlToTypescript(codeString);
  }, [codeString, lang, typescript]);

  const tsCode = typescript || autoTypescript;

  const tabs: CodeTab[] = tsCode
    ? [
        { code: tsCode, label: 'TypeScript', lang: 'typescript' as Language },
        { code: codeString, label: 'YAML', lang: lang as Language }
      ]
    : [{ code: codeString, label: lang === 'yaml' || lang === 'yml' ? 'YAML' : '', lang: lang as Language }];

  return <CodeBlock lang={lang} tabs={tabs} />;
}

const getIsAppleSilicon = () => {
  const w = document.createElement('canvas').getContext('webgl');
  const d = w.getExtension('WEBGL_debug_renderer_info');
  const g = (d && w.getParameter(d.UNMASKED_RENDERER_WEBGL)) || '';
  if (g.match(/Apple/) && !g.match(/Apple GPU/)) {
    return true;
  }
  return false;
};

export const getPlatform = () => {
  if (navigator.platform.includes('Win')) {
    return 'windows';
  }
  if (navigator.platform.includes('Linux')) {
    return 'linux';
  }
  if (getIsAppleSilicon()) {
    return 'macos-arm';
  }
  return 'macos';
};

const getPlatformName = () => {
  if (navigator.platform.includes('Win')) {
    return 'Windows (PowerShell)';
  }
  if (navigator.platform.includes('Linux')) {
    return 'Linux';
  }
  if (getIsAppleSilicon()) {
    return 'Macos ARM';
  }
  return 'Macos';
};

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`;

export function CodeBlock({ tabs, lang }: { tabs: CodeTab[]; lang: string }) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [isCopiedShown, setIsCopiedShown] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const amountOfLines = activeTab.code.split('\n').length;
  useEffect(() => {
    const platformName = getPlatformName();
    setActiveTab(tabs.find((tab) => tab.label === platformName) || tabs[0]);
  }, [tabs]);

  const language = activeTab?.lang || lang || tabs?.[0].lang || 'yaml';

  const handleCopyClick = () => {
    setIsCopiedShown(true);
    setTimeout(() => {
      setIsCopiedShown(false);
    }, 1000);
    copyToClipboard(activeTab.code);
  };

  const handleTabClick = (index: number) => {
    setActiveTab(tabs[index]);
    setAnimationKey((k) => k + 1);
  };

  const activeIndex = tabs.findIndex((t) => t.label === activeTab.label);

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
      <TabSwitcher tabs={tabs} activeIndex={activeIndex >= 0 ? activeIndex : 0} onTabClick={handleTabClick} />
      <div
        css={{
          overflowX: 'auto',
          ...prettyScrollBar,
          ...box,
          [onMaxW500]: {
            marginTop: '3.5px'
          },
          padding: '16px 0px 14px 0px',
          '*': {
            fontFamily: fontFamilyMono
          },
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
            zIndex: 10,
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
        <Highlight code={activeTab.code} language={language} theme={themes.vsDark}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => {
            let applyHighlighting = false;
            let ignoreSection = false;
            const classNameToUse = activeTab.lang === 'typescript' ? 'language-ts' : className;
            return (
              <span
                key={animationKey}
                className={classNameToUse}
                style={style}
                css={{ animation: `${fadeIn} 180ms ease-out` }}
              >
                {tokens.map((line, i) => {
                  const directive = parseDirectiveCommentLine({ line });
                  if (directive) {
                    // when we encounter start-highlight directive we activate highlighting for successive lines
                    if (directive === START_HIGHLIGHT_MARK) {
                      applyHighlighting = true;
                    }
                    // highlighting is disabled once we encounter stop-highlight directive
                    if (directive === STOP_HIGHLIGHT_MARK) {
                      applyHighlighting = false;
                    }
                    if (directive === START_IGNORE_SECTION) {
                      ignoreSection = true;
                    }
                    if (directive === STOP_IGNORE_SECTION) {
                      ignoreSection = false;
                    }
                    // directive comments are discarded (they are not rendered)
                    return null;
                  }
                  if (ignoreSection) {
                    return null;
                  }
                  // Skip empty last line (Prism adds trailing empty token)
                  const isLastLine = i === tokens.length - 1;
                  const isEmptyLine = line.length === 1 && line[0].empty;
                  if (isLastLine && isEmptyLine) {
                    return null;
                  }
                  return (
                    <div
                      key={i}
                      css={{
                        padding: '0px 18px',
                        ...(applyHighlighting &&
                          !(activeTab.lang === 'typescript') && {
                            backgroundColor: colors.highlightedCodeLine,
                            borderLeft: `1px solid ${colors.fontColorPrimary}`
                          }),
                        width: '100%'
                      }}
                      {...getLineProps({ line })}
                    >
                      {line.map((token, key) => {
                        // we do this because bash coloring parses stacktape bash lines in a wrong way
                        if (
                          activeTab.lang === 'bash' &&
                          (BASH_COMMAND_TOKENS.some((t) => token.content.split(' ')[0].trim().startsWith(t)) ||
                            token.content.trim().startsWith('-') ||
                            token.content.trim().startsWith('--'))
                        ) {
                          return token.content
                            .split(' ')
                            .map((t, idx) => ({ content: idx === 0 ? t : ` ${t}`, types: ['plain'] }))
                            .map((nestedToken, index) => {
                              const tokenProps = getTokenProps({
                                token: nestedToken,
                                key: index,
                                style: {
                                  ...addCustomStacktapeStyle({
                                    token: nestedToken,
                                    tokenKey: key,
                                    line,
                                    lang: activeTab.lang,
                                    amountOfLines
                                  })
                                }
                              });
                              return <span {...tokenProps} key={index} />;
                            });
                        }
                        const tokenProps = getTokenProps({
                          token,
                          key,
                          style: {
                            ...addCustomStacktapeStyle({
                              amountOfLines,
                              token,
                              tokenKey: key,
                              line,
                              lang: activeTab.lang,
                              prevToken: line[key - 1]
                            })
                          }
                        });
                        return <span {...tokenProps} key={tokenProps.key as string} />;
                      })}
                    </div>
                  );
                })}
              </span>
            );
          }}
        </Highlight>
      </div>
    </div>
  );
}
