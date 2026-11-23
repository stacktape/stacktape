import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import {
  LuArrowRight,
  LuBoxes,
  LuCheck,
  LuCode,
  LuCompass,
  LuContainer,
  LuFolderGit2,
  LuGitBranch,
  LuLayers,
  LuRefreshCw,
  LuShield,
  LuSparkles,
  LuWallet,
  LuZap
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import siteConfig from '@/site-config';
import { colors } from '@/styles/variables';
import { Button } from '@/components/Button/Button';
import StacktapeCover from '@/assets/cover-transparent.png';

// ────────────────────────────────────────────────────────────────────────────
// Shared tokens
// ────────────────────────────────────────────────────────────────────────────

const brandGradient = `linear-gradient(120deg, #7fe8d4 0%, ${colors.stacktapeGreen} 42%, #4aa6dc 100%)`;

// ────────────────────────────────────────────────────────────────────────────
// Icon registry (string-keyed so MDX can reference icons by name)
// ────────────────────────────────────────────────────────────────────────────

const iconRegistry: Record<string, IconType> = {
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
  arrow: LuArrowRight,
  repo: LuFolderGit2,
  compass: LuCompass
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
  // Map to the shared button variants used across the site (header, console, etc.).
  const buttonVariant = variant === 'secondary' ? 'secondary' : variant === 'ghost' ? 'plain' : 'primary';
  return (
    <Button
      variant={buttonVariant}
      href={href}
      width="fit-content"
      height="40px"
      iconPosition="end"
      icon={icon ? <Icon name={icon} size={18} color={colors.fontColorPrimary} /> : undefined}
      className="text-[0.95rem] py-0 pr-4 pl-[18px]"
    >
      {children}
    </Button>
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
              <span>{accent}</span>
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

export function LandingCover() {
  const coverSrc =
    typeof StacktapeCover === 'string' ? StacktapeCover : (StacktapeCover as unknown as { src: string }).src;

  return (
    <figure className="font-sans relative my-6">
      <img
        src={coverSrc}
        alt="Stacktape Console project dashboard alongside a terminal showing an infrastructure deployment in progress"
        width={3034}
        height={2408}
        loading="eager"
        decoding="async"
        className="block h-auto w-full"
      />
      <figcaption className="text-center text-[0.8rem] leading-relaxed text-fc-ternary">
        Define, deploy and operate production-grade AWS infrastructure from one workflow.
      </figcaption>
    </figure>
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
      {items.map((item) => (
        <div
          key={item.title}
          className="stp-box p-[20px_20px_22px_20px] [transition:box-shadow_220ms_ease] hover:shadow-[0_12px_28px_rgba(0,0,0,0.5),0_0_0_1px_rgba(54,190,190,0.28),inset_0_1px_0_rgba(255,255,255,0.18)]"
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
// Paths by goal (cards whose body is MDX, so it can hold inline code)
// ────────────────────────────────────────────────────────────────────────────

type PathLink = { label: string; href: string };

export function GoalPath({
  icon,
  title,
  links,
  children
}: {
  icon?: string;
  title: string;
  links: PathLink[];
  children?: ReactNode;
}) {
  return (
    <div className="stp-box flex flex-col p-[20px_20px_18px_20px]">
      <div className="flex items-center gap-[10px] mb-[10px]">
        <div className="w-[34px] h-[34px] shrink-0 rounded-[9px] flex items-center justify-center bg-[rgba(54,190,190,0.1)] shadow-[inset_0_0_0_1px_rgba(54,190,190,0.22)]">
          <Icon name={icon} size={18} />
        </div>
        <h3 className="m-0 text-[1.02rem] font-[650] text-fc-primary">{title}</h3>
      </div>
      <div className="flex-1 text-[0.875rem] leading-[1.6] text-fc-lighter [&_p]:m-0 [&_p+p]:mt-2">{children}</div>
      <div className="mt-4 flex flex-col gap-[6px]">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="group/link inline-flex items-center gap-[6px] text-[0.86rem] font-semibold text-brand no-underline hover:text-fc-primary"
          >
            {link.label}
            <LuArrowRight size={14} className="transition-transform group-hover/link:translate-x-[2px]" />
          </a>
        ))}
      </div>
    </div>
  );
}

export function GoalPaths({ children }: { children: ReactNode }) {
  return <div className="font-sans grid grid-cols-3 gap-[14px] my-[22px] max-[1000px]:grid-cols-1">{children}</div>;
}

// ────────────────────────────────────────────────────────────────────────────
// Docs map (one card per sidebar section; the icon comes from the sidebar config)
// ────────────────────────────────────────────────────────────────────────────

type MapItem = { section: string; title: string; href: string; text: string };

export function DocsMap({ items }: { items: MapItem[] }) {
  const groups = siteConfig.sidebar.groups;
  return (
    <div className="font-sans grid grid-cols-3 gap-[10px] my-[22px] max-[1000px]:grid-cols-2 max-[650px]:grid-cols-1">
      {items.map((item) => {
        const group = groups.find((candidate) => candidate.path === item.section);
        if (!group) throw new Error(`DocsMap: no sidebar section ${item.section}`);
        const SectionIcon = group.icon;
        return (
          <a
            key={item.section}
            href={item.href}
            className="group/map flex gap-3 rounded-lg p-[12px_14px] no-underline shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-[background-color,box-shadow] hover:bg-element hover:shadow-[inset_0_0_0_1px_rgba(54,190,190,0.35)]"
          >
            <span className="mt-[2px] shrink-0 text-brand">
              <SectionIcon size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.9rem] font-[650] text-fc-primary">{item.title}</span>
              <span className="block mt-[2px] text-[0.8rem] leading-[1.5] text-fc-light">{item.text}</span>
            </span>
          </a>
        );
      })}
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
        {subtitle && <p className="mt-3 text-base text-fc-lighter max-w-[600px] mx-auto leading-[1.6]">{subtitle}</p>}
        <div className="flex flex-wrap gap-3 justify-center mt-6">{children}</div>
      </div>
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
    name: 'Stacktape CLI',
    price: 'Free',
    tagline: 'Open source, no account needed',
    highlight: true,
    features: [
      'Deploy, update, roll back and delete stacks',
      'Every resource type in the library',
      'Dev mode, logs, secrets and scripts',
      'Runs on your own AWS credentials',
      'MIT-licensed'
    ],
    cta: { label: 'Get started', href: '/getting-started/open-source-cli' }
  },
  {
    name: 'Stacktape Console',
    price: 'Free to start',
    tagline: 'Free up to $200 a month of AWS spend, then 19–25% of it',
    features: [
      'Deploy history and costs for every stage',
      'Alerts, incidents, error tracking and uptime checks',
      'Git deployments and PR previews',
      'Team access, guardrails and audit log',
      'Connect existing stacks without a redeploy'
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
            <span
              className={clsx('text-[1.1rem] font-[750]', plan.highlight ? 'stp-gradient-text' : 'text-fc-lighter')}
            >
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
