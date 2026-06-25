import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
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
import { colors } from '../../styles/variables';
import { Button } from '../Button/Button';

// ────────────────────────────────────────────────────────────────────────────
// Shared tokens
// ────────────────────────────────────────────────────────────────────────────

export const brandGradient = `linear-gradient(120deg, #7fe8d4 0%, ${colors.stacktapeGreen} 42%, #4aa6dc 100%)`;

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
      rootClassName="text-[0.95rem] py-0 pr-4 pl-[18px]"
    />
  );
}

export function ButtonRow({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'center' }) {
  return (
    <div className={clsx('flex flex-wrap gap-3 mt-[26px]', align === 'center' ? 'justify-center' : 'justify-start')}>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────────────────────────────────────

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
      className={clsx(
        'font-sans relative m-[6px_0_14px_0] p-[10px_0_8px_0] overflow-hidden',
        align === 'center' ? 'text-center' : 'text-left'
      )}
    >
      <div
        className="absolute top-[-90px] w-[520px] max-w-[90%] h-[260px] -translate-x-1/2 blur-[8px] animate-hero-glow pointer-events-none z-0"
        style={{
          left: align === 'center' ? '50%' : '12%',
          background: `radial-gradient(ellipse at center, ${colors.stacktapeGreen}22 0%, transparent 70%)`
        }}
      />
      <div className={clsx('relative z-[1]', align === 'center' && 'max-w-[780px] mx-auto')}>
        {eyebrow && (
          <div className="inline-flex items-center gap-2 px-[13px] py-[5px] rounded-full text-[12.5px] font-semibold tracking-[0.3px] text-fc-secondary bg-[rgba(54,190,190,0.08)] shadow-[inset_0_0_0_1px_rgba(54,190,190,0.22)] mb-5">
            <span className="w-[7px] h-[7px] rounded-full bg-brand" />
            {eyebrow}
          </div>
        )}
        <h2 className="text-[40px] leading-[1.12] font-[750] tracking-[-0.02em] m-0 text-fc-primary max-[870px]:text-[32px] max-[650px]:text-[27px]">
          {title}
          {accent && (
            <>
              {' '}
              <span className="stp-gradient-text">{accent}</span>
            </>
          )}
        </h2>
        {subtitle && (
          <p
            className={clsx(
              'mt-[18px] text-[1.08rem] leading-[1.6] text-fc-lighter max-w-[680px] max-[650px]:text-base',
              align === 'center' && 'mx-auto'
            )}
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
    <div className="stp-box flex-[1_1_140px] px-[18px] py-5 text-center [transition:transform_200ms_ease] hover:-translate-y-[2px]">
      <div className="stp-gradient-text text-[34px] font-[750] tracking-[-0.02em]">{shown}</div>
      <div className="mt-[6px] text-[0.82rem] text-fc-lighter leading-[1.4]">{stat.label}</div>
    </div>
  );
}

export function StatStrip({ stats }: { stats: Stat[] }) {
  const [ref, inView] = useInView(0.3);
  return (
    <div ref={ref} className="font-sans flex flex-wrap gap-3 my-[30px]">
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
      className="font-sans grid [grid-template-columns:repeat(var(--cols),1fr)] gap-[14px] my-[26px] max-[1000px]:[grid-template-columns:repeat(2,1fr)] max-[650px]:[grid-template-columns:1fr]"
      style={{ '--cols': columns } as CSSProperties}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          className="stp-box p-[20px_20px_22px_20px] [transition:transform_220ms_ease,box-shadow_220ms_ease] hover:-translate-y-[3px] hover:shadow-[0_12px_28px_rgba(0,0,0,0.5),0_0_0_1px_rgba(54,190,190,0.28),inset_0_1px_0_rgba(255,255,255,0.18)]"
        >
          <div className="w-[42px] h-[42px] rounded-[11px] flex items-center justify-center bg-[rgba(54,190,190,0.1)] shadow-[inset_0_0_0_1px_rgba(54,190,190,0.22)] mb-[14px]">
            <Icon name={item.icon} size={21} />
          </div>
          <h3 className="text-base font-[650] m-0 mb-[7px] text-fc-primary">{item.title}</h3>
          <p className="text-[0.875rem] leading-[1.55] text-fc-lighter m-0">{item.text}</p>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Steps (numbered vertical timeline; children may include CodeBlocks)
// ────────────────────────────────────────────────────────────────────────────

// Numbering + the "last step has no connector / bottom padding" are driven by CSS (a counter and
// :last-of-type, defined on `.stp-step*` in global.css) rather than by the parent injecting
// `_index`/`_last` props. Astro renders MDX children as opaque wrapped nodes, so a <Steps> parent
// can't clone its <Step> children to pass those props — every Step would otherwise render as "1".
export function Step({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="stp-step flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className="stp-step-number w-[34px] h-[34px] shrink-0 rounded-full flex items-center justify-center font-bold text-[14px] text-[#06201d] shadow-[0_4px_12px_rgba(54,190,190,0.3)]"
          style={{ background: brandGradient }}
        />
        <div className="stp-step-connector w-[2px] flex-1 min-h-[24px] bg-[rgba(54,190,190,0.22)] mt-1" />
      </div>
      <div className="stp-step-body flex-1 pb-[14px] min-w-0">
        <h3 className="text-[1.05rem] font-[650] mt-1 mb-2 mx-0 text-fc-primary">{title}</h3>
        <div className="text-[0.9rem] text-fc-lighter leading-[1.6]">{children}</div>
      </div>
    </div>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  return <div className="stp-steps font-sans my-[26px]">{children}</div>;
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
    <div className="mt-10 mb-[10px] mx-0 px-[30px] py-9 rounded-2xl text-center relative overflow-hidden bg-[linear-gradient(135deg,rgba(54,190,190,0.1),rgba(74,166,220,0.06))] shadow-[inset_0_0_0_1px_rgba(54,190,190,0.22)]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% -20%, ${colors.stacktapeGreen}1f 0%, transparent 60%)` }}
      />
      <div className="relative">
        <h2 className="text-[1.7rem] font-[720] tracking-[-0.02em] m-0 text-fc-primary max-[650px]:text-[1.4rem]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 text-base text-fc-lighter max-w-[600px] mx-auto leading-[1.6]">{subtitle}</p>
        )}
        <div className="flex flex-wrap gap-3 justify-center mt-6">{children}</div>
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
      className="font-sans relative overflow-hidden my-6 px-[22px] py-5 rounded-[14px] flex items-center gap-[18px] bg-[linear-gradient(120deg,rgba(54,190,190,0.12),rgba(74,166,220,0.07))] max-[650px]:flex-col max-[650px]:items-start"
      style={{ boxShadow: `inset 0 0 0 1px ${colors.stacktapeGreen}33` }}
    >
      <div
        className="shrink-0 w-[46px] h-[46px] rounded-xl flex items-center justify-center bg-[rgba(54,190,190,0.14)]"
        style={{ boxShadow: `inset 0 0 0 1px ${colors.stacktapeGreen}44` }}
      >
        <LuSparkles size={24} color={colors.stacktapeGreen} />
      </div>
      <div className="flex-1">
        <div className="text-[1.05rem] font-bold text-fc-primary mb-1">Stacktape is now open source</div>
        <div className="m-0 text-[0.9rem] leading-[1.55] text-fc-lighter [&_p]:m-0">
          {children ||
            'After years as a closed-source product, our DevOps-free cloud development framework is now MIT-licensed and open to the community.'}
        </div>
      </div>
      <a
        href="https://github.com/stacktape/stacktape"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 inline-flex items-center gap-2 px-4 py-[10px] rounded-[9px] text-[0.86rem] font-semibold text-fc-primary bg-element shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.12)] no-underline"
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
      className="font-sans grid [grid-template-columns:repeat(var(--cols),1fr)] gap-[14px] my-[26px] max-[870px]:[grid-template-columns:1fr]"
      style={{ '--cols': Math.min(items.length, 2) } as CSSProperties}
    >
      {items.map((item) => (
        <div key={item.author} className="stp-box p-[22px_22px_20px_22px] flex flex-col">
          <div className="text-[34px] leading-none text-brand font-[Georgia,serif] mb-1">&ldquo;</div>
          <p className="flex-1 m-0 text-[0.95rem] leading-[1.6] text-fc-primary">{item.quote}</p>
          <div className="mt-4 flex items-center gap-[11px]">
            <div
              className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[14px] font-bold text-[#06201d]"
              style={{ background: brandGradient }}
            >
              {item.author
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div>
              <div className="text-[0.86rem] font-semibold text-fc-primary">{item.author}</div>
              <div className="text-[0.78rem] text-fc-light">{item.role}</div>
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
      className="font-sans grid [grid-template-columns:repeat(var(--cols),1fr)] gap-4 my-[26px] max-[870px]:[grid-template-columns:1fr]"
      style={{ '--cols': plans.length } as CSSProperties}
    >
      {plans.map((plan) => (
        <div
          key={plan.name}
          className="stp-box p-6 relative flex flex-col"
          style={
            plan.highlight
              ? {
                  boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 0 1.5px ${colors.stacktapeGreen}88, inset 0 1px 0 rgba(255,255,255,0.2)`
                }
              : undefined
          }
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[1.15rem] font-bold text-fc-primary">{plan.name}</span>
            <span className={clsx('text-[1.1rem] font-[750]', plan.highlight ? 'stp-gradient-text' : 'text-fc-lighter')}>
              {plan.price}
            </span>
          </div>
          <div className="text-[0.82rem] text-fc-light mt-1 mb-[18px]">{plan.tagline}</div>
          <div className="flex flex-col gap-[11px] flex-1">
            {plan.features.map((feature) => (
              <div key={feature} className="flex gap-[10px] items-start">
                <LuCheck size={16} color={colors.stacktapeGreen} className="shrink-0 mt-[2px]" />
                <span className="text-[0.85rem] leading-[1.45] text-fc-lighter">{feature}</span>
              </div>
            ))}
          </div>
          <a
            href={plan.cta.href}
            className="mt-5 inline-flex justify-center px-4 py-[11px] rounded-[9px] text-[0.88rem] font-semibold no-underline text-fc-primary"
            style={{
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
