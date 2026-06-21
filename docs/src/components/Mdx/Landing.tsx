import type { ReactNode } from 'react';
import { Children, cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from 'react';
import { keyframes } from '@emotion/react';
import {
  LuActivity,
  LuArrowRight,
  LuBot,
  LuBoxes,
  LuCloudUpload,
  LuCode,
  LuContainer,
  LuCpu,
  LuDatabase,
  LuDollarSign,
  LuEye,
  LuGauge,
  LuGitBranch,
  LuGlobe,
  LuKeyRound,
  LuLayers,
  LuLaptop,
  LuLayoutDashboard,
  LuLock,
  LuNetwork,
  LuPlug,
  LuRefreshCw,
  LuRocket,
  LuServer,
  LuShield,
  LuSparkles,
  LuTerminal,
  LuWallet,
  LuWorkflow,
  LuZap
} from 'react-icons/lu';
import { onMaxW650, onMaxW870, onMaxW1000 } from '../../styles/responsive';
import { box, colors, fontFamilyMono } from '../../styles/variables';
import { Link } from './Link';
import { allResources } from './ResourceList';

// ────────────────────────────────────────────────────────────────────────────
// Shared tokens
// ────────────────────────────────────────────────────────────────────────────

const brandGradient = `linear-gradient(120deg, #7fe8d4 0%, ${colors.stacktapeGreen} 42%, #4aa6dc 100%)`;
const subtleGradient = `linear-gradient(120deg, ${colors.stacktapeGreen}, #4aa6dc)`;

const gradientText = (gradient: string = brandGradient): Css => ({
  background: gradient,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: 'transparent'
});

const categoryColor: Record<string, string> = {
  'compute-resource': colors.awsResourceCompute,
  'database-resource': colors.awsResourceDatabase,
  'storage-resource': colors.awsResourceStorage,
  'security-resource': colors.awsResourceSecurity,
  'other-resource': colors.awsResourceIntegration,
  '3rd-party-resource': colors.awsResourceNetwork,
  undefined: colors.gray
};

const awsIconByType: Record<string, (args: { size: number }) => ReactNode> = Object.fromEntries(
  allResources.map((resource) => [resource.type, resource.icon])
);

// ────────────────────────────────────────────────────────────────────────────
// Hooks
// ────────────────────────────────────────────────────────────────────────────

const useInView = (threshold = 0.2): [React.RefObject<any>, boolean] => {
  const ref = useRef<any>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
};

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const handler = () => setReduced(query.matches);
    query.addEventListener?.('change', handler);
    return () => query.removeEventListener?.('change', handler);
  }, []);
  return reduced;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const useCountUp = (target: number, active: boolean, duration = 1300) => {
  const [value, setValue] = useState(0);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(easeOutCubic(progress) * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration, reduced]);
  return value;
};

// ────────────────────────────────────────────────────────────────────────────
// Lightweight TypeScript/YAML/bash syntax highlighting (compact, dependency-free)
// ────────────────────────────────────────────────────────────────────────────

const tokenColors = {
  comment: '#6c7086',
  string: '#a6e3a1',
  keyword: '#cba6f7',
  type: '#f9e2af',
  call: '#89b4fa',
  number: '#fab387',
  property: '#89dceb',
  base: '#cdd6f4',
  prompt: colors.stacktapeGreen
};

const TS_KEYWORDS = new Set([
  'import',
  'from',
  'export',
  'default',
  'const',
  'let',
  'var',
  'new',
  'return',
  'async',
  'await',
  'function',
  'type',
  'interface',
  'true',
  'false',
  'null',
  'undefined'
]);

type Tok = { text: string; color: string };

const highlightLine = (line: string, lang: string): Tok[] => {
  if (lang === 'bash') {
    // First token (command) green, flags muted, comments gray.
    const out: Tok[] = [];
    const commentIdx = line.indexOf('#');
    const code = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
    const comment = commentIdx >= 0 ? line.slice(commentIdx) : '';
    const parts = code.split(/(\s+)/);
    let seenCmd = false;
    parts.forEach((part) => {
      if (/^\s+$/.test(part) || part === '') {
        out.push({ text: part, color: tokenColors.base });
      } else if (part.startsWith('-')) {
        out.push({ text: part, color: tokenColors.type });
      } else if (!seenCmd) {
        seenCmd = true;
        out.push({ text: part, color: tokenColors.prompt });
      } else {
        out.push({ text: part, color: tokenColors.base });
      }
    });
    if (comment) out.push({ text: comment, color: tokenColors.comment });
    return out;
  }

  const tokens: Tok[] = [];
  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i);
    // comment
    let m = rest.match(/^\/\/.*/) || (lang === 'yaml' && rest.match(/^#.*/));
    if (m) {
      tokens.push({ text: m[0], color: tokenColors.comment });
      i += m[0].length;
      continue;
    }
    // string
    m = rest.match(/^(['"`])(?:\\.|(?!\1)[\s\S])*\1?/);
    if (m) {
      tokens.push({ text: m[0], color: tokenColors.string });
      i += m[0].length;
      continue;
    }
    // yaml key
    if (lang === 'yaml') {
      m = rest.match(/^[A-Za-z0-9_-]+(?=\s*:)/);
      if (m) {
        tokens.push({ text: m[0], color: tokenColors.property });
        i += m[0].length;
        continue;
      }
    }
    // number
    m = rest.match(/^\d[\d._]*/);
    if (m) {
      tokens.push({ text: m[0], color: tokenColors.number });
      i += m[0].length;
      continue;
    }
    // identifier
    m = rest.match(/^[A-Za-z_$][\w$]*/);
    if (m) {
      const word = m[0];
      let color = tokenColors.base;
      if (TS_KEYWORDS.has(word)) color = tokenColors.keyword;
      else if (/^[A-Z]/.test(word)) color = tokenColors.type;
      else if (rest.slice(word.length).match(/^\s*\(/)) color = tokenColors.call;
      tokens.push({ text: word, color });
      i += word.length;
      continue;
    }
    // whitespace / other single char
    m = rest.match(/^\s+/);
    if (m) {
      tokens.push({ text: m[0], color: tokenColors.base });
      i += m[0].length;
      continue;
    }
    tokens.push({ text: line[i], color: tokenColors.base });
    i += 1;
  }
  return tokens;
};

const codeWindowHeader = (filename: string, accent: string) => (
  <div
    css={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.07)'
    }}
  >
    <div css={{ display: 'flex', gap: '6px' }}>
      {['#ff5f57', '#febc2e', '#28c840'].map((dotColor) => (
        <span key={dotColor} css={{ width: 11, height: 11, borderRadius: '50%', background: dotColor, opacity: 0.85 }} />
      ))}
    </div>
    <span
      css={{
        marginLeft: '6px',
        fontFamily: fontFamilyMono,
        fontSize: '12px',
        color: colors.fontColorLighterGray,
        display: 'flex',
        alignItems: 'center',
        gap: '7px'
      }}
    >
      <span css={{ width: 7, height: 7, borderRadius: '50%', background: accent }} />
      {filename}
    </span>
  </div>
);

function CodePanel({
  code,
  lang = 'typescript',
  filename = 'stacktape.ts',
  accent = colors.stacktapeGreen
}: {
  code: string;
  lang?: string;
  filename?: string;
  accent?: string;
}) {
  const lines = code.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
  return (
    <div css={{ ...box, overflow: 'hidden' }}>
      {codeWindowHeader(filename, accent)}
      <pre
        css={{
          margin: 0,
          padding: '14px 16px',
          overflowX: 'auto',
          fontFamily: fontFamilyMono,
          fontSize: '13px',
          lineHeight: 1.65,
          color: tokenColors.base,
          counterReset: 'code',
          background: 'transparent'
        }}
      >
        <code css={{ fontFamily: fontFamilyMono, display: 'block' }}>
          {lines.map((line, lineIdx) => (
            <span
              key={lineIdx}
              css={{
                display: 'block',
                whiteSpace: 'pre',
                '&::before': {
                  counterIncrement: 'code',
                  content: 'counter(code)',
                  display: 'inline-block',
                  width: '1.8em',
                  marginRight: '14px',
                  textAlign: 'right',
                  color: 'rgba(255,255,255,0.18)',
                  userSelect: 'none'
                }
              }}
            >
              {highlightLine(line, lang).map((tok, tokIdx) => (
                <span key={tokIdx} css={{ color: tok.color }}>
                  {tok.text}
                </span>
              ))}
              {line === '' ? ' ' : ''}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Icon registry (string-keyed so MDX can reference icons by name)
// ────────────────────────────────────────────────────────────────────────────

const iconRegistry: Record<string, any> = {
  bolt: LuZap,
  zap: LuZap,
  server: LuServer,
  database: LuDatabase,
  cloud: LuCloudUpload,
  shield: LuShield,
  git: LuGitBranch,
  terminal: LuTerminal,
  dollar: LuDollarSign,
  layers: LuLayers,
  boxes: LuBoxes,
  globe: LuGlobe,
  cpu: LuCpu,
  network: LuNetwork,
  lock: LuLock,
  key: LuKeyRound,
  gauge: LuGauge,
  rocket: LuRocket,
  code: LuCode,
  plug: LuPlug,
  refresh: LuRefreshCw,
  eye: LuEye,
  wallet: LuWallet,
  sparkles: LuSparkles,
  container: LuContainer,
  workflow: LuWorkflow,
  bot: LuBot,
  laptop: LuLaptop,
  activity: LuActivity,
  dashboard: LuLayoutDashboard,
  arrow: LuArrowRight
};

const Icon = ({ name, size = 22, color }: { name?: string; size?: number; color?: string }) => {
  const Component = (name && iconRegistry[name]) || LuSparkles;
  return <Component size={size} color={color || colors.stacktapeGreen} />;
};

// ────────────────────────────────────────────────────────────────────────────
// CTA buttons
// ────────────────────────────────────────────────────────────────────────────

export function CTAButton({
  href,
  children,
  variant = 'primary',
  icon
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: string;
}) {
  const base: Css = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '11px 20px',
    borderRadius: '9px',
    fontSize: '0.92rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    transition: 'all 220ms ease, transform 150ms ease',
    textDecoration: 'none',
    '&:hover': { transform: 'translateY(-1px)' },
    '&:active': { transform: 'scale(0.98)' }
  };
  const variants: Record<string, Css> = {
    primary: {
      color: '#06201d',
      background: brandGradient,
      boxShadow: '0 6px 18px rgba(54,190,190,0.28), inset 0 1px 0 rgba(255,255,255,0.35)',
      '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 10px 26px rgba(54,190,190,0.4)' }
    },
    secondary: {
      color: colors.fontColorPrimary,
      background: colors.elementBackground,
      boxShadow: '0 2px 8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.14)',
      '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 6px 16px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.16)' }
    },
    ghost: {
      color: colors.fontColorSecondary,
      background: 'transparent',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
      '&:hover': { transform: 'translateY(-1px)', boxShadow: 'inset 0 0 0 1px rgba(54,190,190,0.5)' }
    }
  };
  return (
    <Link href={href} rootCss={{ ...base, ...variants[variant], color: variants[variant].color as string }}>
      {children}
      {icon && <Icon name={icon} size={17} color={variant === 'primary' ? '#06201d' : undefined} />}
    </Link>
  );
}

export function ButtonRow({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'center' }) {
  return (
    <div
      css={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginTop: '26px',
        justifyContent: align === 'center' ? 'center' : 'flex-start'
      }}
    >
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────────────────────────────────────

const heroGlow = keyframes`
  0%, 100% { opacity: 0.55; transform: translate(-50%, 0) scale(1); }
  50% { opacity: 0.85; transform: translate(-50%, 0) scale(1.08); }
`;

export function LandingHero({
  eyebrow,
  title,
  accent,
  subtitle,
  align = 'left',
  children
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  subtitle?: ReactNode;
  align?: 'left' | 'center';
  children?: ReactNode;
}) {
  return (
    <div
      css={{
        position: 'relative',
        margin: '6px 0 14px 0',
        padding: '10px 0 8px 0',
        textAlign: align,
        overflow: 'hidden'
      }}
    >
      <div
        css={{
          position: 'absolute',
          top: '-90px',
          left: align === 'center' ? '50%' : '12%',
          width: '520px',
          maxWidth: '90%',
          height: '260px',
          transform: 'translateX(-50%)',
          background: `radial-gradient(ellipse at center, ${colors.stacktapeGreen}22 0%, transparent 70%)`,
          filter: 'blur(8px)',
          animation: `${heroGlow} 7s ease-in-out infinite`,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <div css={{ position: 'relative', zIndex: 1, maxWidth: align === 'center' ? '780px' : 'none', margin: align === 'center' ? '0 auto' : 0 }}>
        {eyebrow && (
          <div
            css={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 13px',
              borderRadius: '999px',
              fontSize: '12.5px',
              fontWeight: 600,
              letterSpacing: '0.3px',
              color: colors.fontColorSecondary,
              background: 'rgba(54,190,190,0.08)',
              boxShadow: 'inset 0 0 0 1px rgba(54,190,190,0.22)',
              marginBottom: '20px'
            }}
          >
            <span css={{ width: 7, height: 7, borderRadius: '50%', background: colors.stacktapeGreen }} />
            {eyebrow}
          </div>
        )}
        <h2
          css={{
            fontSize: '40px',
            lineHeight: 1.12,
            fontWeight: 750,
            letterSpacing: '-0.02em',
            margin: 0,
            color: colors.fontColorPrimary,
            [onMaxW870]: { fontSize: '32px' },
            [onMaxW650]: { fontSize: '27px' }
          }}
        >
          {title}
          {accent && (
            <>
              {' '}
              <span css={gradientText()}>{accent}</span>
            </>
          )}
        </h2>
        {subtitle && (
          <p
            css={{
              marginTop: '18px',
              fontSize: '1.08rem',
              lineHeight: 1.6,
              color: colors.fontColorLighterGray,
              maxWidth: '680px',
              marginLeft: align === 'center' ? 'auto' : 0,
              marginRight: align === 'center' ? 'auto' : 0,
              [onMaxW650]: { fontSize: '1rem' }
            }}
          >
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Animated stat strip
// ────────────────────────────────────────────────────────────────────────────

type Stat = { value?: number; display?: string; prefix?: string; suffix?: string; label: string };

function StatItem({ stat, active }: { stat: Stat; active: boolean }) {
  const counted = useCountUp(stat.value ?? 0, active);
  const shown = stat.display ?? `${stat.prefix ?? ''}${counted}${stat.suffix ?? ''}`;
  return (
    <div
      css={{
        flex: '1 1 140px',
        padding: '20px 18px',
        textAlign: 'center',
        ...box,
        transition: 'transform 200ms ease',
        '&:hover': { transform: 'translateY(-2px)' }
      }}
    >
      <div css={{ fontSize: '34px', fontWeight: 750, letterSpacing: '-0.02em', ...gradientText() }}>{shown}</div>
      <div css={{ marginTop: '6px', fontSize: '0.82rem', color: colors.fontColorLighterGray, lineHeight: 1.4 }}>
        {stat.label}
      </div>
    </div>
  );
}

export function StatStrip({ stats }: { stats: Stat[] }) {
  const [ref, inView] = useInView(0.3);
  return (
    <div ref={ref} css={{ display: 'flex', flexWrap: 'wrap', gap: '12px', margin: '30px 0' }}>
      {stats.map((stat, idx) => (
        <StatItem key={idx} stat={stat} active={inView} />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Feature grid
// ────────────────────────────────────────────────────────────────────────────

type Feature = { icon?: string; title: string; text: string };

export function FeatureGrid({ items, columns = 3 }: { items: Feature[]; columns?: number }) {
  return (
    <div
      css={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '14px',
        margin: '26px 0',
        [onMaxW1000]: { gridTemplateColumns: 'repeat(2, 1fr)' },
        [onMaxW650]: { gridTemplateColumns: '1fr' }
      }}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          css={{
            ...box,
            padding: '20px 20px 22px 20px',
            transition: 'transform 220ms ease, box-shadow 220ms ease',
            '&:hover': {
              transform: 'translateY(-3px)',
              boxShadow: '0 12px 28px rgba(0,0,0,0.5), 0 0 0 1px rgba(54,190,190,0.28), inset 0 1px 0 rgba(255,255,255,0.18)'
            }
          }}
        >
          <div
            css={{
              width: 42,
              height: 42,
              borderRadius: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(54,190,190,0.1)',
              boxShadow: 'inset 0 0 0 1px rgba(54,190,190,0.22)',
              marginBottom: '14px'
            }}
          >
            <Icon name={item.icon} size={21} />
          </div>
          <h3 css={{ fontSize: '1rem', fontWeight: 650, margin: '0 0 7px 0', color: colors.fontColorPrimary }}>
            {item.title}
          </h3>
          <p css={{ fontSize: '0.875rem', lineHeight: 1.55, color: colors.fontColorLighterGray, margin: 0 }}>
            {item.text}
          </p>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Resource galaxy — every supported AWS resource, color-coded by category
// ────────────────────────────────────────────────────────────────────────────

const galaxyAppear = keyframes`
  from { opacity: 0; transform: translateY(10px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const HIDDEN_RESOURCE_TYPES = new Set([
  'custom-resource-definition',
  'custom-resource-instance',
  'aws-cdk-construct',
  'deployment-script'
]);

export function ResourceGalaxy({ limit }: { limit?: number }) {
  const [ref, inView] = useInView(0.12);
  const reduced = usePrefersReducedMotion();
  const resources = useMemo(() => {
    const list = allResources.filter((resource) => !HIDDEN_RESOURCE_TYPES.has(resource.type));
    return typeof limit === 'number' ? list.slice(0, limit) : list;
  }, [limit]);

  return (
    <div
      ref={ref}
      css={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
        gap: '10px',
        margin: '26px 0'
      }}
    >
      {resources.map((resource, idx) => {
        const color = categoryColor[resource.category] || colors.gray;
        return (
          <div
            key={resource.type}
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
              padding: '11px 13px',
              borderRadius: '10px',
              background: colors.elementBackground,
              boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), inset 3px 0 0 ${color}`,
              opacity: inView || reduced ? 1 : 0,
              animation: inView && !reduced ? `${galaxyAppear} 480ms ease both` : 'none',
              animationDelay: `${Math.min(idx * 28, 600)}ms`,
              transition: 'transform 180ms ease, box-shadow 180ms ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `inset 0 0 0 1px ${color}66, inset 3px 0 0 ${color}, 0 8px 18px rgba(0,0,0,0.4)`
              }
            }}
          >
            <span css={{ display: 'flex', flexShrink: 0, width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
              {resource.icon({ size: 24 })}
            </span>
            <span
              css={{
                fontSize: '0.8rem',
                fontWeight: 500,
                color: colors.fontColorPrimary,
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {resource.prettyType}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Architecture flow (vertical, animated wires) — reused by CodeToCloud & explorer
// ────────────────────────────────────────────────────────────────────────────

const flowDash = keyframes`
  to { background-position: 0 -16px; }
`;

const nodeAppear = keyframes`
  from { opacity: 0; transform: translateX(8px); }
  to { opacity: 1; transform: translateX(0); }
`;

type ArchNode = { type?: string; label: string; sub?: string; color?: string };

function ArchFlow({ nodes, active }: { nodes: ArchNode[]; active: boolean }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div css={{ display: 'flex', flexDirection: 'column' }}>
      {nodes.map((node, idx) => {
        const renderIcon = node.type ? awsIconByType[node.type] : undefined;
        const accent = node.color || colors.stacktapeGreen;
        return (
          <div key={idx}>
            <div
              css={{
                display: 'flex',
                alignItems: 'center',
                gap: '13px',
                padding: '12px 15px',
                ...box,
                opacity: active || reduced ? 1 : 0,
                animation: active && !reduced ? `${nodeAppear} 420ms ease both` : 'none',
                animationDelay: `${idx * 180}ms`
              }}
            >
              <span
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  borderRadius: '9px',
                  background: `${accent}1a`,
                  boxShadow: `inset 0 0 0 1px ${accent}40`
                }}
              >
                {renderIcon ? renderIcon({ size: 28 }) : <Icon name="boxes" size={20} color={accent} />}
              </span>
              <div css={{ minWidth: 0 }}>
                <div css={{ fontSize: '0.92rem', fontWeight: 600, color: colors.fontColorPrimary }}>{node.label}</div>
                {node.sub && (
                  <div css={{ fontSize: '0.78rem', color: colors.fontColorLighterGray, marginTop: '2px' }}>{node.sub}</div>
                )}
              </div>
            </div>
            {idx < nodes.length - 1 && (
              <div css={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: '34px' }}>
                <div
                  css={{
                    width: '2px',
                    height: '24px',
                    backgroundImage: `linear-gradient(${colors.stacktapeGreen} 50%, transparent 50%)`,
                    backgroundSize: '2px 12px',
                    opacity: active || reduced ? 0.7 : 0.25,
                    animation: active && !reduced ? `${flowDash} 700ms linear infinite` : 'none'
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const DEFAULT_CODE_TO_CLOUD = `import {
  defineConfig,
  DynamoDbTable,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const api = new HttpApiGateway({});

  const usersTable = new DynamoDbTable({
    primaryKey: { partitionKey: { name: 'id', type: 'string' } }
  });

  const createUser = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: 'src/create-user.ts'
    }),
    connectTo: [{ resource: usersTable, access: 'readWrite' }],
    events: [
      new HttpApiIntegration({ httpApiGatewayName: 'api', method: 'POST', path: '/users' })
    ]
  });

  return { resources: { api, usersTable, createUser } };
});`;

const DEFAULT_CTC_NODES: ArchNode[] = [
  { type: 'http-api-gateway', label: 'HTTP API Gateway', sub: 'HTTPS endpoint + CORS', color: colors.awsResourceNetwork },
  { type: 'function', label: 'Lambda function', sub: 'Auto-built from your TS', color: colors.awsResourceCompute },
  { type: 'dynamo-db-table', label: 'DynamoDB table', sub: 'IAM scoped to read/write', color: colors.awsResourceDatabase }
];

export function CodeToCloud({
  code = DEFAULT_CODE_TO_CLOUD,
  nodes = DEFAULT_CTC_NODES,
  caption = 'One TypeScript file → a live API Gateway endpoint, a Lambda, a DynamoDB table, and least-privilege IAM wiring them together.'
}: {
  code?: string;
  nodes?: ArchNode[];
  caption?: string;
}) {
  const [ref, inView] = useInView(0.18);
  return (
    <div ref={ref} css={{ margin: '28px 0' }}>
      <div
        css={{
          display: 'grid',
          gridTemplateColumns: '1.15fr 0.85fr',
          gap: '18px',
          alignItems: 'start',
          [onMaxW870]: { gridTemplateColumns: '1fr' }
        }}
      >
        <CodePanel code={code} />
        <div>
          <div
            css={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.7px',
              textTransform: 'uppercase',
              color: colors.fontColorLightGray,
              margin: '2px 0 12px 2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Icon name="cloud" size={15} /> Provisioned in your AWS account
          </div>
          <ArchFlow nodes={nodes} active={inView} />
        </div>
      </div>
      {caption && (
        <p
          css={{
            marginTop: '16px',
            fontSize: '0.86rem',
            color: colors.fontColorLighterGray,
            textAlign: 'center',
            lineHeight: 1.55
          }}
        >
          {caption}
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Animated terminal
// ────────────────────────────────────────────────────────────────────────────

const blink = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
`;

type TermLine = { text: string; kind?: 'cmd' | 'out' | 'ok' | 'muted' };

const DEFAULT_TERM_LINES: TermLine[] = [
  { text: 'stacktape deploy --stage prod --region eu-west-1', kind: 'cmd' },
  { text: 'Packaging createUser (esbuild) … done in 0.4s', kind: 'muted' },
  { text: 'Deploying stack my-app-prod …', kind: 'out' },
  { text: '  ✔ HttpApiGateway       CREATE_COMPLETE', kind: 'ok' },
  { text: '  ✔ DynamoDbTable        CREATE_COMPLETE', kind: 'ok' },
  { text: '  ✔ LambdaFunction       CREATE_COMPLETE', kind: 'ok' },
  { text: 'Stack deployed in 47s 🎉', kind: 'ok' },
  { text: 'apiUrl  https://api.my-app.com', kind: 'out' }
];

export function AnimatedTerminal({ lines = DEFAULT_TERM_LINES, title = 'bash' }: { lines?: TermLine[]; title?: string }) {
  const [ref, inView] = useInView(0.35);
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setVisible(lines.length);
      return;
    }
    setVisible(0);
    let current = 0;
    const id = setInterval(() => {
      current += 1;
      setVisible(current);
      if (current >= lines.length) clearInterval(id);
    }, 520);
    return () => clearInterval(id);
  }, [inView, reduced, lines.length]);

  const lineColor = (kind?: string) => {
    if (kind === 'cmd') return colors.fontColorPrimary;
    if (kind === 'ok') return colors.stacktapeGreen;
    if (kind === 'muted') return colors.fontColorLightGray;
    return colors.fontColorLighterGray;
  };

  return (
    <div ref={ref} css={{ ...box, overflow: 'hidden', margin: '26px 0' }}>
      {codeWindowHeader(title, colors.stacktapeGreen)}
      <div
        css={{
          padding: '16px 18px',
          fontFamily: fontFamilyMono,
          fontSize: '13px',
          lineHeight: 1.7,
          minHeight: `${lines.length * 1.7 + 1}em`,
          background: 'rgba(0,0,0,0.18)'
        }}
      >
        {lines.slice(0, visible).map((line, idx) => (
          <div key={idx} css={{ color: lineColor(line.kind), whiteSpace: 'pre-wrap' }}>
            {line.kind === 'cmd' && <span css={{ color: colors.stacktapeGreen, userSelect: 'none' }}>$ </span>}
            {line.text}
          </div>
        ))}
        {visible < lines.length && (
          <span css={{ display: 'inline-block', width: '8px', height: '15px', background: colors.stacktapeGreen, animation: `${blink} 1s step-end infinite`, verticalAlign: 'middle' }} />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Steps (numbered vertical timeline; children may include CodeBlocks)
// ────────────────────────────────────────────────────────────────────────────

export function Step({ title, children, _index = 0, _last = false }: { title: string; children?: ReactNode; _index?: number; _last?: boolean }) {
  return (
    <div css={{ display: 'flex', gap: '16px' }}>
      <div css={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          css={{
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '14px',
            color: '#06201d',
            background: brandGradient,
            boxShadow: '0 4px 12px rgba(54,190,190,0.3)'
          }}
        >
          {_index + 1}
        </div>
        {!_last && <div css={{ width: '2px', flex: 1, minHeight: '24px', background: 'rgba(54,190,190,0.22)', marginTop: '4px' }} />}
      </div>
      <div css={{ flex: 1, paddingBottom: _last ? 0 : '14px', minWidth: 0 }}>
        <h3 css={{ fontSize: '1.05rem', fontWeight: 650, margin: '4px 0 8px 0', color: colors.fontColorPrimary }}>{title}</h3>
        <div css={{ fontSize: '0.9rem', color: colors.fontColorLighterGray, lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <div css={{ margin: '26px 0' }}>
      {items.map((child, idx) =>
        cloneElement(child as any, { _index: idx, _last: idx === items.length - 1, key: idx })
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Comparison cards (PaaS vs raw AWS vs Stacktape)
// ────────────────────────────────────────────────────────────────────────────

type CompareColumn = { name: string; tagline?: string; highlight?: boolean; rows: { label: string; value: string | boolean }[] };

const DEFAULT_COMPARE: CompareColumn[] = [
  {
    name: 'Managed PaaS',
    tagline: 'Heroku, Vercel, Render',
    rows: [
      { label: 'Fast to ship', value: true },
      { label: 'Runs in your AWS account', value: false },
      { label: 'No vendor markup', value: false },
      { label: 'Containers + serverless', value: false },
      { label: 'Full AWS escape hatch', value: false }
    ]
  },
  {
    name: 'Raw AWS / IaC',
    tagline: 'CloudFormation, Terraform',
    rows: [
      { label: 'Fast to ship', value: false },
      { label: 'Runs in your AWS account', value: true },
      { label: 'No vendor markup', value: true },
      { label: 'Containers + serverless', value: true },
      { label: 'Full AWS escape hatch', value: true }
    ]
  },
  {
    name: 'Stacktape',
    tagline: 'PaaS speed, AWS control',
    highlight: true,
    rows: [
      { label: 'Fast to ship', value: true },
      { label: 'Runs in your AWS account', value: true },
      { label: 'No vendor markup', value: true },
      { label: 'Containers + serverless', value: true },
      { label: 'Full AWS escape hatch', value: true }
    ]
  }
];

const CompareCell = ({ value }: { value: string | boolean }) => {
  if (value === true) return <span css={{ color: colors.stacktapeGreen, fontSize: '15px' }}>✓</span>;
  if (value === false) return <span css={{ color: '#5b6060', fontSize: '15px' }}>✕</span>;
  return <span css={{ color: colors.fontColorLighterGray, fontSize: '0.82rem' }}>{value}</span>;
};

export function CompareCards({ columns = DEFAULT_COMPARE }: { columns?: CompareColumn[] }) {
  return (
    <div
      css={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
        gap: '14px',
        margin: '26px 0',
        [onMaxW870]: { gridTemplateColumns: '1fr' }
      }}
    >
      {columns.map((column) => (
        <div
          key={column.name}
          css={{
            ...box,
            padding: '20px',
            position: 'relative',
            ...(column.highlight && {
              boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 0 1.5px ${colors.stacktapeGreen}88, inset 0 1px 0 rgba(255,255,255,0.2)`
            })
          }}
        >
          {column.highlight && (
            <div
              css={{
                position: 'absolute',
                top: '-11px',
                left: '20px',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '10.5px',
                fontWeight: 700,
                letterSpacing: '0.4px',
                color: '#06201d',
                background: brandGradient
              }}
            >
              RECOMMENDED
            </div>
          )}
          <div css={{ fontSize: '1.05rem', fontWeight: 700, color: column.highlight ? colors.fontColorPrimary : colors.fontColorPrimary }}>
            {column.name}
          </div>
          {column.tagline && (
            <div css={{ fontSize: '0.78rem', color: colors.fontColorLightGray, marginTop: '3px', marginBottom: '14px' }}>
              {column.tagline}
            </div>
          )}
          <div css={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: column.tagline ? 0 : '14px' }}>
            {column.rows.map((row) => (
              <div key={row.label} css={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <span css={{ fontSize: '0.83rem', color: colors.fontColorLighterGray }}>{row.label}</span>
                <CompareCell value={row.value} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Use-case explorer (interactive)
// ────────────────────────────────────────────────────────────────────────────

type UseCase = { id: string; label: string; icon?: string; blurb: string; code: string; lang?: string; nodes: ArchNode[] };

const DEFAULT_USE_CASES: UseCase[] = [
  {
    id: 'api',
    label: 'Serverless API',
    icon: 'zap',
    blurb: 'A Lambda behind API Gateway with a DynamoDB table — auto IAM and env vars from a single connectTo.',
    code: `const api = new HttpApiGateway({});

const table = new DynamoDbTable({
  primaryKey: { partitionKey: { name: 'id', type: 'string' } }
});

const fn = new LambdaFunction({
  packaging: new StacktapeLambdaBuildpackPackaging({
    entryfilePath: 'src/handler.ts'
  }),
  connectTo: [table],
  events: [new HttpApiIntegration({
    httpApiGatewayName: 'api', method: 'GET', path: '/'
  })]
});`,
    nodes: [
      { type: 'http-api-gateway', label: 'API Gateway', color: colors.awsResourceNetwork },
      { type: 'function', label: 'Lambda', color: colors.awsResourceCompute },
      { type: 'dynamo-db-table', label: 'DynamoDB', color: colors.awsResourceDatabase }
    ]
  },
  {
    id: 'web',
    label: 'Fullstack web app',
    icon: 'globe',
    blurb: 'Ship Next.js, Astro, Remix or SvelteKit to AWS with a global CDN — Stacktape detects the framework and builds it.',
    code: `const web = new NextjsWeb({
  packaging: { entryfilePath: '.' }
});

const db = new RelationalDatabase({
  engine: new RdsEnginePostgres({
    primaryInstance: { instanceSize: 'db.t4g.micro' },
    version: '18.1'
  }),
  credentials: { masterUserPassword: $Secret('db-pass') }
});

web.connectTo = [db];`,
    nodes: [
      { type: 'nextjs-web', label: 'Next.js (CDN + SSR)', color: colors.awsResourceCompute },
      { type: 'relational-database', label: 'Postgres (RDS)', color: colors.awsResourceDatabase }
    ]
  },
  {
    id: 'container',
    label: 'Container service',
    icon: 'container',
    blurb: 'Run any Dockerfile or buildpack image on Fargate behind a load balancer — auto-scaled and health-checked.',
    code: `const service = new WebService({
  packaging: new NixpacksWebServicePackaging({
    entryfilePath: 'src/server.ts'
  }),
  resources: { cpu: 0.5, memory: 1024 },
  scaling: { minInstances: 2, maxInstances: 10 }
});

const cache = new RedisCluster({
  instanceSize: 'cache.t4g.micro'
});

service.connectTo = [cache];`,
    nodes: [
      { type: 'application-load-balancer', label: 'Load Balancer', color: colors.awsResourceNetwork },
      { type: 'web-service', label: 'Fargate service', color: colors.awsResourceCompute },
      { type: 'redis-cluster', label: 'Redis (ElastiCache)', color: colors.awsResourceDatabase }
    ]
  },
  {
    id: 'events',
    label: 'Event pipeline',
    icon: 'workflow',
    blurb: 'Wire queues, topics and streams to handlers declaratively — Stacktape provisions the trigger and the IAM.',
    code: `const queue = new SqsQueue({});

const worker = new LambdaFunction({
  packaging: new StacktapeLambdaBuildpackPackaging({
    entryfilePath: 'src/worker.ts'
  }),
  events: [new SqsIntegration({
    sqsQueueName: queue.resourceName,
    batchSize: 10
  })]
});`,
    nodes: [
      { type: 'sqs-queue', label: 'SQS queue', color: colors.awsResourceIntegration },
      { type: 'function', label: 'Worker Lambda', color: colors.awsResourceCompute }
    ]
  }
];

export function UseCaseExplorer({ cases = DEFAULT_USE_CASES }: { cases?: UseCase[] }) {
  const [activeId, setActiveId] = useState(cases[0]?.id);
  const [ref, inView] = useInView(0.18);
  const active = cases.find((useCase) => useCase.id === activeId) || cases[0];

  return (
    <div ref={ref} css={{ margin: '28px 0' }}>
      <div css={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {cases.map((useCase) => {
          const isActive = useCase.id === active.id;
          return (
            <button
              key={useCase.id}
              type="button"
              onClick={() => setActiveId(useCase.id)}
              css={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 15px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 200ms ease',
                color: isActive ? '#06201d' : colors.fontColorLighterGray,
                background: isActive ? brandGradient : colors.elementBackground,
                boxShadow: isActive
                  ? '0 6px 16px rgba(54,190,190,0.28)'
                  : 'inset 0 0 0 1px rgba(255,255,255,0.08)'
              }}
            >
              <Icon name={useCase.icon} size={16} color={isActive ? '#06201d' : colors.stacktapeGreen} />
              {useCase.label}
            </button>
          );
        })}
      </div>
      <p css={{ fontSize: '0.92rem', color: colors.fontColorLighterGray, lineHeight: 1.6, margin: '0 0 16px 0' }}>
        {active.blurb}
      </p>
      <div
        css={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          gap: '18px',
          alignItems: 'start',
          [onMaxW870]: { gridTemplateColumns: '1fr' }
        }}
      >
        <CodePanel code={active.code} filename={`${active.id}.ts`} lang={active.lang || 'typescript'} />
        <ArchFlow key={active.id} nodes={active.nodes} active={inView} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Closing CTA band
// ────────────────────────────────────────────────────────────────────────────

export function CTASection({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div
      css={{
        margin: '40px 0 10px 0',
        padding: '36px 30px',
        borderRadius: '16px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(54,190,190,0.1), rgba(74,166,220,0.06))',
        boxShadow: 'inset 0 0 0 1px rgba(54,190,190,0.22)'
      }}
    >
      <div
        css={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% -20%, ${colors.stacktapeGreen}1f 0%, transparent 60%)`,
          pointerEvents: 'none'
        }}
      />
      <div css={{ position: 'relative' }}>
        <h2 css={{ fontSize: '1.7rem', fontWeight: 720, letterSpacing: '-0.02em', margin: 0, color: colors.fontColorPrimary, [onMaxW650]: { fontSize: '1.4rem' } }}>
          {title}
        </h2>
        {subtitle && (
          <p css={{ marginTop: '12px', fontSize: '1rem', color: colors.fontColorLighterGray, maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            {subtitle}
          </p>
        )}
        <div css={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
