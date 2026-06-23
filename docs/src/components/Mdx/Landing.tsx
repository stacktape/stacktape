import type { ReactNode } from 'react';
import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from 'react';
import { keyframes } from '@emotion/react';
import {
  LuArrowRight,
  LuBoxes,
  LuCheck,
  LuCode,
  LuContainer,
  LuGitBranch,
  LuGithub,
  LuLayers,
  LuRefreshCw,
  LuShield,
  LuSparkles,
  LuWallet,
  LuZap
} from 'react-icons/lu';
import { onMaxW650, onMaxW870, onMaxW1000 } from '../../styles/responsive';
import { box, colors, fontFamily } from '../../styles/variables';
import { Button } from '../Button/Button';

// ────────────────────────────────────────────────────────────────────────────
// Shared tokens
// ────────────────────────────────────────────────────────────────────────────

export const brandGradient = `linear-gradient(120deg, #7fe8d4 0%, ${colors.stacktapeGreen} 42%, #4aa6dc 100%)`;
export const gradientText = (gradient: string = brandGradient): Css => ({
  background: gradient,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: 'transparent'
});

// ────────────────────────────────────────────────────────────────────────────
// Hooks
// ────────────────────────────────────────────────────────────────────────────

export const useInView = (threshold = 0.2): [React.RefObject<any>, boolean] => {
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

export const usePrefersReducedMotion = () => {
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

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export const useCountUp = (target: number, active: boolean, duration = 1300) => {
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
// Icon registry (string-keyed so MDX can reference icons by name)
// ────────────────────────────────────────────────────────────────────────────

const iconRegistry: Record<string, any> = {
  bolt: LuZap,
  zap: LuZap,
  shield: LuShield,
  git: LuGitBranch,
  layers: LuLayers,
  boxes: LuBoxes,
  code: LuCode,
  refresh: LuRefreshCw,
  wallet: LuWallet,
  sparkles: LuSparkles,
  container: LuContainer,
  arrow: LuArrowRight
};

export const Icon = ({ name, size = 22, color }: { name?: string; size?: number; color?: string }) => {
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
  // Map to the brand Button visual types used across the site (header, console, etc.).
  const visualType = variant === 'secondary' ? 'secondary' : variant === 'ghost' ? 'plain' : 'primary';
  return (
    <Button
      visualType={visualType}
      linkTo={href}
      width="fit-content"
      height="40px"
      iconPosition="end"
      icon={icon ? <Icon name={icon} size={18} color={colors.fontColorPrimary} /> : undefined}
      text={children}
      rootCss={{ fontSize: '0.95rem', padding: '0 16px 0 18px' }}
    />
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
        fontFamily,
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
      <div
        css={{
          position: 'relative',
          zIndex: 1,
          maxWidth: align === 'center' ? '780px' : 'none',
          margin: align === 'center' ? '0 auto' : 0
        }}
      >
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
    <div ref={ref} css={{ fontFamily, display: 'flex', flexWrap: 'wrap', gap: '12px', margin: '30px 0' }}>
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
        fontFamily,
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
              boxShadow:
                '0 12px 28px rgba(0,0,0,0.5), 0 0 0 1px rgba(54,190,190,0.28), inset 0 1px 0 rgba(255,255,255,0.18)'
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
// Steps (numbered vertical timeline; children may include CodeBlocks)
// ────────────────────────────────────────────────────────────────────────────

export function Step({
  title,
  children,
  _index = 0,
  _last = false
}: {
  title: string;
  children?: ReactNode;
  _index?: number;
  _last?: boolean;
}) {
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
        {!_last && (
          <div
            css={{ width: '2px', flex: 1, minHeight: '24px', background: 'rgba(54,190,190,0.22)', marginTop: '4px' }}
          />
        )}
      </div>
      <div css={{ flex: 1, paddingBottom: _last ? 0 : '14px', minWidth: 0 }}>
        <h3 css={{ fontSize: '1.05rem', fontWeight: 650, margin: '4px 0 8px 0', color: colors.fontColorPrimary }}>
          {title}
        </h3>
        <div css={{ fontSize: '0.9rem', color: colors.fontColorLighterGray, lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <div css={{ fontFamily, margin: '26px 0' }}>
      {items.map((child, idx) =>
        cloneElement(child as any, { _index: idx, _last: idx === items.length - 1, key: idx })
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Closing CTA band
// ────────────────────────────────────────────────────────────────────────────

export function CTASection({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
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
        <h2
          css={{
            fontSize: '1.7rem',
            fontWeight: 720,
            letterSpacing: '-0.02em',
            margin: 0,
            color: colors.fontColorPrimary,
            [onMaxW650]: { fontSize: '1.4rem' }
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            css={{
              marginTop: '12px',
              fontSize: '1rem',
              color: colors.fontColorLighterGray,
              maxWidth: '600px',
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.6
            }}
          >
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

// ────────────────────────────────────────────────────────────────────────────
// Open-source banner
// ────────────────────────────────────────────────────────────────────────────

export function OpenSourceBanner({ children }: { children?: ReactNode }) {
  return (
    <div
      css={{
        fontFamily,
        position: 'relative',
        overflow: 'hidden',
        margin: '24px 0',
        padding: '20px 22px',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
        background: 'linear-gradient(120deg, rgba(54,190,190,0.12), rgba(74,166,220,0.07))',
        boxShadow: `inset 0 0 0 1px ${colors.stacktapeGreen}33`,
        [onMaxW650]: { flexDirection: 'column', alignItems: 'flex-start' }
      }}
    >
      <div
        css={{
          flexShrink: 0,
          width: 46,
          height: 46,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(54,190,190,0.14)',
          boxShadow: `inset 0 0 0 1px ${colors.stacktapeGreen}44`
        }}
      >
        <LuSparkles size={24} color={colors.stacktapeGreen} />
      </div>
      <div css={{ flex: 1 }}>
        <div css={{ fontSize: '1.05rem', fontWeight: 700, color: colors.fontColorPrimary, marginBottom: '4px' }}>
          Stacktape is now open source
        </div>
        <div
          css={{
            margin: 0,
            fontSize: '0.9rem',
            lineHeight: 1.55,
            color: colors.fontColorLighterGray,
            '& p': { margin: 0 }
          }}
        >
          {children ||
            'After years as a closed-source product, our DevOps-free cloud development framework is now MIT-licensed and open to the community.'}
        </div>
      </div>
      <a
        href="https://github.com/stacktape/stacktape"
        target="_blank"
        rel="noopener noreferrer"
        css={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          borderRadius: '9px',
          fontSize: '0.86rem',
          fontWeight: 600,
          color: colors.fontColorPrimary,
          background: colors.elementBackground,
          boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.12)',
          textDecoration: 'none'
        }}
      >
        <LuGithub size={17} /> Star on GitHub
      </a>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Testimonials
// ────────────────────────────────────────────────────────────────────────────

type Quote = { quote: string; author: string; role: string };

const DEFAULT_QUOTES: Quote[] = [
  {
    quote:
      'Stacktape (the product) and Stacktape (the team) have helped us move extremely fast. They abstract away so much of the complexity of AWS, and let us focus on our application logic, instead of infrastructure configuration.',
    author: 'Henry Garrett',
    role: 'Founding Engineer, Recipts.xyz'
  },
  {
    quote:
      "Stacktape has been a game-changer for Lastmyle, providing a secure and intuitive way to manage our AWS deployments. It's allowed our small team to efficiently handle environments using GitOps, all while keeping a tight rein on costs.",
    author: 'Rhys Williams',
    role: 'CTO & Founder, Lastmyle'
  }
];

export function Testimonials({ items = DEFAULT_QUOTES }: { items?: Quote[] }) {
  return (
    <div
      css={{
        fontFamily,
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(items.length, 2)}, 1fr)`,
        gap: '14px',
        margin: '26px 0',
        [onMaxW870]: { gridTemplateColumns: '1fr' }
      }}
    >
      {items.map((item) => (
        <div
          key={item.author}
          css={{ ...box, padding: '22px 22px 20px 22px', display: 'flex', flexDirection: 'column' }}
        >
          <div
            css={{
              fontSize: '34px',
              lineHeight: 1,
              color: colors.stacktapeGreen,
              fontFamily: 'Georgia, serif',
              marginBottom: '4px'
            }}
          >
            &ldquo;
          </div>
          <p css={{ flex: 1, margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: colors.fontColorPrimary }}>
            {item.quote}
          </p>
          <div css={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div
              css={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 700,
                color: '#06201d',
                background: brandGradient
              }}
            >
              {item.author
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div>
              <div css={{ fontSize: '0.86rem', fontWeight: 600, color: colors.fontColorPrimary }}>{item.author}</div>
              <div css={{ fontSize: '0.78rem', color: colors.fontColorLightGray }}>{item.role}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Pricing columns
// ────────────────────────────────────────────────────────────────────────────

type Plan = {
  name: string;
  price: string;
  tagline: string;
  highlight?: boolean;
  features: string[];
  cta: { label: string; href: string };
};

const DEFAULT_PLANS: Plan[] = [
  {
    name: 'Stacktape Core',
    price: 'Free',
    tagline: 'The open-source CLI and engine',
    highlight: true,
    features: [
      'The full CLI: deploy, dev, logs, scripts and more',
      'Every resource type in the library',
      'Override, extend and eject anytime',
      'Local dev mode against real cloud resources',
      'MIT-licensed - yours forever'
    ],
    cta: { label: 'Get started free', href: '/getting-started/configure-your-stack' }
  },
  {
    name: 'Stacktape Console',
    price: 'Paid',
    tagline: 'Hosted CI/CD, GitOps & observability',
    features: [
      'CI/CD pipeline for GitHub, GitLab & Bitbucket',
      'Web console to deploy and manage stacks',
      'Browse logs, metrics, costs and issues',
      'Remote sessions into running containers',
      'Secrets management, guardrails & alarms',
      'Premium support - 8-minute average response'
    ],
    cta: { label: 'See the Console', href: '/stacktape-console/console-overview' }
  }
];

export function PricingColumns({ plans = DEFAULT_PLANS }: { plans?: Plan[] }) {
  return (
    <div
      css={{
        fontFamily,
        display: 'grid',
        gridTemplateColumns: `repeat(${plans.length}, 1fr)`,
        gap: '16px',
        margin: '26px 0',
        [onMaxW870]: { gridTemplateColumns: '1fr' }
      }}
    >
      {plans.map((plan) => (
        <div
          key={plan.name}
          css={{
            ...box,
            padding: '24px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            ...(plan.highlight && {
              boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 0 1.5px ${colors.stacktapeGreen}88, inset 0 1px 0 rgba(255,255,255,0.2)`
            })
          }}
        >
          <div css={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span css={{ fontSize: '1.15rem', fontWeight: 700, color: colors.fontColorPrimary }}>{plan.name}</span>
            <span
              css={{
                fontSize: '1.1rem',
                fontWeight: 750,
                ...(plan.highlight ? gradientText() : { color: colors.fontColorLighterGray })
              }}
            >
              {plan.price}
            </span>
          </div>
          <div css={{ fontSize: '0.82rem', color: colors.fontColorLightGray, marginTop: '4px', marginBottom: '18px' }}>
            {plan.tagline}
          </div>
          <div css={{ display: 'flex', flexDirection: 'column', gap: '11px', flex: 1 }}>
            {plan.features.map((feature) => (
              <div key={feature} css={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <LuCheck size={16} color={colors.stacktapeGreen} css={{ flexShrink: 0, marginTop: '2px' }} />
                <span css={{ fontSize: '0.85rem', lineHeight: 1.45, color: colors.fontColorLighterGray }}>
                  {feature}
                </span>
              </div>
            ))}
          </div>
          <a
            href={plan.cta.href}
            css={{
              marginTop: '20px',
              display: 'inline-flex',
              justifyContent: 'center',
              padding: '11px 16px',
              borderRadius: '9px',
              fontSize: '0.88rem',
              fontWeight: 600,
              textDecoration: 'none',
              color: colors.fontColorPrimary,
              background: plan.highlight
                ? 'linear-gradient(135deg, rgb(12, 95, 95), rgb(27, 109, 103))'
                : colors.elementBackground,
              boxShadow: plan.highlight
                ? '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(81, 231, 236, 0.5), inset 0 1px 0 rgba(43, 232, 239, 0.4)'
                : '0 2px 8px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
            }}
          >
            {plan.cta.label}
          </a>
        </div>
      ))}
    </div>
  );
}
