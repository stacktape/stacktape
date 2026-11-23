import type { ReactNode } from 'react';
import clsx from 'clsx';
import { LuArrowDown, LuArrowRight, LuCheck, LuChevronRight, LuCopy } from 'react-icons/lu';

/*
 * The docs home page (`content/index.mdx`). Every component here renders static HTML. The only script is the
 * copy handler below, which the hero renders once.
 *
 * Layout follows the space the page gives it (`@container`), not the viewport, so the page stays correct whatever
 * the sidebar and table-of-contents rails take. Colours come from the docs tokens (`tokens.css`) through
 * the theme utilities (`text-ink-*`, `bg-surface-*`, `border-line`, `aws-*`); there are no colour literals in this file.
 */

// ── Copy buttons ─────────────────────────────────────────────────────────────────────────────────────────

/** One delegated click handler for every `[data-home-copy]` button. Idempotent across client-side navigations. */
const COPY_SCRIPT = `(() => {
  if (window.__stpHomeCopy) return;
  window.__stpHomeCopy = true;
  const show = (button, text) => {
    const label = button.querySelector('[data-copy-label]');
    if (label) label.textContent = text;
    button.setAttribute('data-copied', '');
    clearTimeout(button.__stpTimer);
    button.__stpTimer = setTimeout(() => {
      button.removeAttribute('data-copied');
      if (label) label.textContent = 'Copy';
    }, 1600);
  };
  const fallback = (text) => {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    area.remove();
    return ok;
  };
  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-home-copy]') : null;
    if (!button) return;
    const text = button.getAttribute('data-home-copy') || '';
    const failed = () => show(button, fallback(text) ? 'Copied' : 'Select and copy');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => show(button, 'Copied'), failed);
    } else {
      failed();
    }
  });
  // Open the command tab for the visitor's system, as the Quickstart's install tabs do. Phones keep the first tab.
  const preselect = () => {
    const agent = navigator.userAgent;
    if (/Android|iPhone|iPad|Mobile/.test(agent)) return;
    const os = /Windows/.test(agent) ? 'Windows' : /Macintosh|Mac OS X/.test(agent) ? 'macOS' : /Linux/.test(agent) ? 'Linux' : '';
    const input = os && document.querySelector('input[name="home-command"][value="' + os + '"]');
    if (input) input.checked = true;
  };
  document.addEventListener('DOMContentLoaded', preselect);
  document.addEventListener('astro:page-load', preselect);
})();`;

function CopyButton({ text, labelClassName }: { text: string; labelClassName?: string }) {
  return (
    <button
      type="button"
      data-home-copy={text}
      aria-label={`Copy: ${text}`}
      className={clsx(
        'group/copy inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-line bg-surface-raised px-2.5 py-1.5',
        'font-sans text-[12.5px] font-semibold text-ink-muted cursor-pointer',
        '[transition:color_150ms_ease,border-color_150ms_ease] hover:text-ink hover:border-line-strong',
        'data-[copied]:text-accent-text data-[copied]:border-accent',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
      )}
    >
      <LuCopy size={13} aria-hidden="true" className="group-data-[copied]/copy:hidden" />
      <LuCheck size={13} aria-hidden="true" className="hidden group-data-[copied]/copy:block" />
      <span data-copy-label aria-live="polite" className={labelClassName}>
        Copy
      </span>
    </button>
  );
}

/** Pairs each part of a split string with its position in the original, a stable React key. */
const withOffsets = (parts: string[], separatorLength: number) => {
  let offset = 0;
  return parts.map((part) => {
    const entry = { part, offset };
    offset += part.length + separatorLength;
    return entry;
  });
};

/**
 * A shell command that wraps as whole words with a hanging indent, so `--stage` never breaks after its hyphens and a
 * continuation line never reads as a second command. A URL or a long word may wrap inside, after a path `/`.
 */
function Command({ code, size = 'large' }: { code: string; size?: 'large' | 'small' }) {
  return (
    <code
      className={clsx(
        'block min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 pl-[2ch] -indent-[2ch] font-mono text-ink break-normal whitespace-normal',
        size === 'large' ? 'text-[14px] leading-[1.65] @min-[560px]:text-[14.5px]' : 'text-[13px] leading-[1.55]'
      )}
    >
      <span className="select-none text-accent-text" aria-hidden="true">
        ${' '}
      </span>
      {withOffsets(code.split(' '), 1).map(({ part, offset }) => (
        <span key={offset}>
          {offset > 0 && ' '}
          <span className={part.includes('/') || part.length > 28 ? '[overflow-wrap:anywhere]' : 'whitespace-nowrap'}>
            {withOffsets(part.split(/(?<=[^/]\/)(?!\/)/), 0).map(({ part: segment, offset: at }) => (
              <span key={at}>
                {at > 0 && <wbr />}
                {segment}
              </span>
            ))}
          </span>
        </span>
      ))}
    </code>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────────────────────────────────

type CommandTab = { label: string; code: string };
type PathLink = { label: string; href: string };
const NO_LINKS: PathLink[] = [];

/* Which command is shown follows the checked radio. Tailwind needs each selector written out, so the hero supports
 * up to four commands. */
const SHOWN = [
  'group-has-[#home-command-0:checked]/cmd:visible',
  'group-has-[#home-command-1:checked]/cmd:visible',
  'group-has-[#home-command-2:checked]/cmd:visible',
  'group-has-[#home-command-3:checked]/cmd:visible'
];
const SHOWN_FLEX = [
  'group-has-[#home-command-0:checked]/cmd:inline-flex',
  'group-has-[#home-command-1:checked]/cmd:inline-flex',
  'group-has-[#home-command-2:checked]/cmd:inline-flex',
  'group-has-[#home-command-3:checked]/cmd:inline-flex'
];

function ArrowLink({
  link,
  tone = 'accent',
  className
}: {
  link: PathLink;
  tone?: 'accent' | 'muted';
  className?: string;
}) {
  const isAnchor = link.href.startsWith('#');
  const Icon = isAnchor ? LuArrowDown : LuArrowRight;
  return (
    <a
      href={link.href}
      className={clsx(
        'group/link inline-flex items-center gap-1.5 font-semibold no-underline [transition:color_150ms_ease]',
        tone === 'accent' ? 'text-accent-text hover:text-ink-strong' : 'text-ink-muted hover:text-ink',
        className
      )}
    >
      {link.label}
      <Icon
        size={14}
        aria-hidden="true"
        className={clsx(
          '[transition:transform_150ms_ease] motion-reduce:transform-none',
          isAnchor ? 'group-hover/link:translate-y-0.5' : 'group-hover/link:translate-x-0.5'
        )}
      />
    </a>
  );
}

/**
 * The title, the one command, and the next step beside it. The command card keeps one height whichever system is
 * selected: every command sits in the same grid cell and only the selected one is visible.
 */
export function HomeHero({
  eyebrow,
  title,
  lead,
  commandLabel,
  commands,
  commandNote,
  links = NO_LINKS
}: {
  eyebrow?: string;
  title: string;
  lead: string;
  commandLabel: string;
  commands: CommandTab[];
  commandNote?: string;
  /** The first link is the next step after the command. Later links show only where the paths below are off screen. */
  links?: PathLink[];
}) {
  const shown = commands.slice(0, SHOWN.length);
  const [primary, ...secondary] = links;
  return (
    <section className="@container font-sans mt-1 mb-14" aria-labelledby="home-title">
      <script dangerouslySetInnerHTML={{ __html: COPY_SCRIPT }} />
      <div className="grid gap-x-12 gap-y-7 @min-[860px]:grid-cols-[minmax(0,1fr)_minmax(0,31rem)] @min-[860px]:items-center">
        <div>
          {eyebrow && <p className="m-0 text-[13px] font-semibold tracking-[0.02em] text-accent-text">{eyebrow}</p>}
          <h1
            id="home-title"
            className="mt-3 mb-0 font-bold text-ink-strong tracking-[-0.03em] text-[32px] leading-[1.1] @min-[560px]:text-[40px] @min-[860px]:text-[46px] @min-[860px]:leading-[1.05]"
          >
            {title}
          </h1>
          <p className="mt-4 mb-0 max-w-[36rem] text-[16px] leading-[1.6] text-ink-muted @min-[560px]:mt-5 @min-[560px]:text-[17px] @min-[560px]:leading-[1.65]">
            {lead}
          </p>
        </div>

        <div className="group/cmd min-w-0 overflow-hidden rounded-xl border border-line-strong bg-surface-raised">
          <div className="flex items-center gap-2 border-b border-line pr-2 pl-2">
            <fieldset className="m-0 flex min-w-0 flex-1 items-center border-0 p-0">
              <legend className="sr-only">{commandLabel}</legend>
              {shown.map((command, index) => (
                <label
                  key={command.label}
                  className={clsx(
                    'relative -mb-px cursor-pointer select-none border-b-2 border-transparent px-2 pt-3 pb-2.5 @min-[400px]:px-2.5',
                    'text-[13px] font-semibold text-ink-faint [transition:color_150ms_ease] hover:text-ink',
                    'has-[:checked]:text-ink has-[:checked]:border-accent',
                    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent has-[:focus-visible]:rounded-sm'
                  )}
                >
                  <input
                    type="radio"
                    name="home-command"
                    value={command.label}
                    id={`home-command-${index}`}
                    defaultChecked={index === 0}
                    className="sr-only"
                  />
                  {command.label}
                </label>
              ))}
            </fieldset>
            {shown.map((command, index) => (
              <span key={command.label} className={clsx('hidden', SHOWN_FLEX[index])}>
                <CopyButton text={command.code} labelClassName="@max-[399px]:sr-only" />
              </span>
            ))}
          </div>
          <div className="bg-surface-sunken px-4 pt-3 pb-3.5">
            <p className="m-0 mb-1.5 font-mono text-[13px] leading-[1.6] text-ink-faint">
              <span aria-hidden="true"># </span>
              {commandLabel}
            </p>
            <div className="grid">
              {shown.map((command, index) => (
                <div key={command.label} className={clsx('invisible col-start-1 row-start-1 min-w-0', SHOWN[index])}>
                  <Command code={command.code} />
                </div>
              ))}
            </div>
          </div>
          {(commandNote || primary) && (
            <div className="border-t border-line px-4 pt-3 pb-4">
              {commandNote && <p className="m-0 text-[13.5px] leading-[1.55] text-ink-muted">{commandNote}</p>}
              {primary && (
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px]">
                  <ArrowLink link={primary} />
                  {secondary.map((link) => (
                    <ArrowLink key={link.href} link={link} tone="muted" className="@min-[860px]:hidden" />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Paths by goal ────────────────────────────────────────────────────────────────────────────────────────

type Path = {
  title: string;
  /** Where the title leads: the guide for this goal. */
  href: string;
  text: string;
  /** Wizard steps, shown as one quiet line. */
  steps?: string[];
  /** A command to copy. */
  command?: string;
  /** What the destination answers, shown as one quiet line. */
  topics?: string[];
  links?: PathLink[];
};

/**
 * Three goals, one card each, built the same way: the title links to the guide, one sentence says what happens,
 * one detail line (the wizard steps, the command, or the questions answered) and an optional second link.
 */
export function HomePaths({ title, items }: { title: string; items: Path[] }) {
  return (
    <section className="@container font-sans mb-16" aria-labelledby="home-paths">
      <h2 id="home-paths" className="m-0 mb-4 text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink">
        {title}
      </h2>
      <ol className="m-0 grid list-none gap-3 p-0 @min-[760px]:grid-cols-3">
        {items.map((item) => (
          <li
            key={item.title}
            className="before:hidden m-0 flex min-w-0 flex-col rounded-xl border border-line-strong bg-surface-raised p-4 @min-[560px]:p-5"
          >
            <h3 className="m-0 text-[17px] font-semibold leading-[1.35]">
              <ArrowLink
                link={{ label: item.title, href: item.href }}
                tone="accent"
                className="text-ink-strong hover:text-accent-text"
              />
            </h3>
            <p className="m-0 mt-2 text-[14px] leading-[1.6] text-ink-muted">{item.text}</p>
            <div className="mt-auto pt-4">
              {item.steps && (
                <ol className="m-0 flex list-none flex-wrap items-center gap-x-1 gap-y-1 p-0" aria-label="Wizard steps">
                  {item.steps.map((step, index) => (
                    <li
                      key={step}
                      className="before:hidden m-0 flex items-center gap-1 p-0 text-[13px] leading-[1.5] font-medium text-ink"
                    >
                      {step}
                      {index < (item.steps?.length ?? 0) - 1 && (
                        <LuChevronRight size={13} aria-hidden="true" className="text-ink-faint" />
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {item.command && (
                <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-sunken py-1.5 pr-1.5 pl-3">
                  <span className="min-w-0 flex-1">
                    <Command code={item.command} size="small" />
                  </span>
                  <CopyButton text={item.command} labelClassName="sr-only" />
                </div>
              )}
              {item.topics && (
                <ul className="m-0 flex list-none flex-wrap gap-x-1.5 p-0 text-[13px] leading-[1.6] font-medium text-ink">
                  {item.topics.map((topic, index) => (
                    <li key={topic} className="before:hidden m-0 p-0 whitespace-nowrap">
                      {topic}
                      {index < (item.topics?.length ?? 0) - 1 && (
                        <span className="pl-1.5 text-ink-faint" aria-hidden="true">
                          ·
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {item.links && item.links.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px]">
                  {item.links.map((link) => (
                    <ArrowLink key={link.href} link={link} tone="muted" />
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── Shared section frame ─────────────────────────────────────────────────────────────────────────────────

function Section({ id, title, lead, children }: { id: string; title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="@container font-sans mb-16" aria-labelledby={`${id}-title`}>
      <h2
        id={`${id}-title`}
        className="m-0 text-[24px] font-semibold leading-[1.25] tracking-[-0.015em] text-ink @min-[560px]:text-[26px]"
      >
        {title}
      </h2>
      {lead && <p className="m-0 mt-3 max-w-[44rem] text-[15.5px] leading-[1.65] text-ink-muted">{lead}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** Renders `code` spans written with backticks in plain prop strings. */
function Inline({ text }: { text: string }) {
  // The capturing group keeps the backticked parts in the result, so the parts add up to the whole string.
  const parts = withOffsets(text.split(/(`[^`]+`)/g).filter(Boolean), 0);
  return (
    <>
      {parts.map(({ part, offset }) =>
        part.startsWith('`') && part.endsWith('`') ? (
          <code key={offset}>{part.slice(1, -1)}</code>
        ) : (
          <span key={offset}>{part}</span>
        )
      )}
    </>
  );
}

// ── Example: config and the AWS resources it creates ────────────────────────────────────────────────────

type AwsCategory = 'compute' | 'database' | 'network' | 'security' | 'storage' | 'integration';
type AwsService = { category: AwsCategory; service: string; detail: string };
/** One resource of the config (its name and class, as in the code) and the AWS services it creates. */
type ExampleResource = {
  name: string;
  kind: string;
  services: AwsService[];
  /** The label on the line that leads into this resource: how requests or connections reach it. */
  via: string;
};

const categoryDot: Record<AwsCategory, string> = {
  compute: 'bg-aws-compute',
  database: 'bg-aws-database',
  network: 'bg-aws-network',
  security: 'bg-aws-security',
  storage: 'bg-aws-storage',
  integration: 'bg-aws-integration'
};

function ResourceNode({ resource }: { resource: ExampleResource }) {
  return (
    <div className="rounded-lg border border-line-strong bg-surface-raised">
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-3.5 py-2">
        <code className="rounded-none border-0 bg-transparent p-0 font-mono text-[13px] font-semibold text-ink-strong">
          {resource.name}
        </code>
        <span className="font-mono text-[12px] text-ink-faint">{resource.kind}</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 px-3.5 py-2.5">
        {resource.services.map((service) => (
          <li key={service.service} className="before:hidden m-0 p-0">
            <div className="flex items-center gap-2">
              <span
                className={clsx('h-2 w-2 shrink-0 rounded-full', categoryDot[service.category])}
                aria-hidden="true"
              />
              <span className="text-[13.5px] font-semibold text-ink">{service.service}</span>
            </div>
            <p className="m-0 mt-0.5 pl-4 text-[12.5px] leading-[1.5] text-ink-muted">
              <Inline text={service.detail} />
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A labelled line between two nodes: what travels along it. */
function Connector({ label }: { label: string }) {
  return (
    <div className="flex items-stretch gap-2.5 pl-5" aria-hidden="true">
      <span className="w-px shrink-0 bg-line-strong" />
      <span className="py-2 text-[12px] leading-[1.4] text-ink-faint">
        <Inline text={label} />
      </span>
    </div>
  );
}

type DeployStep = { label: string; command: string };

/**
 * A config next to what it creates. On a phone the diagram comes first, then the config, then the commands, so the
 * reader meets the two halves of the example together.
 */
export function HomeExample({
  title,
  lead,
  stack,
  resources,
  extras,
  deployTitle,
  deploy,
  children
}: {
  title: string;
  lead: string;
  stack: string;
  resources: ExampleResource[];
  extras: string[];
  deployTitle: string;
  deploy: DeployStep[];
  children: ReactNode;
}) {
  return (
    <Section id="example" title={title} lead={lead}>
      <div className="grid gap-4 [grid-template-areas:'diagram'_'config'_'deploy'] @min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @min-[900px]:grid-rows-[auto_1fr] @min-[900px]:[grid-template-areas:'config_diagram'_'config_deploy']">
        {/* The code block brings its own vertical margins; the grid sets the spacing here. */}
        <div className="min-w-0 [grid-area:config] [&_astro-island>div]:my-0">{children}</div>
        <figure className="m-0 min-w-0 rounded-xl border border-line bg-surface-sunken p-4 [grid-area:diagram]">
          <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-[13px] font-semibold text-ink">In your AWS account</span>
            <span className="font-mono text-[12px] text-ink-faint">stack {stack}</span>
          </figcaption>
          <div className="text-[12.5px] font-medium text-ink-muted">Internet</div>
          {resources.map((resource) => (
            <div key={resource.name}>
              <Connector label={resource.via} />
              <ResourceNode resource={resource} />
            </div>
          ))}
          <ul className="m-0 mt-4 flex list-none flex-col gap-1.5 p-0">
            {extras.map((extra) => (
              <li key={extra} className="before:hidden m-0 flex gap-2 p-0 text-[12.5px] leading-[1.5] text-ink-muted">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-faint" aria-hidden="true" />
                <span>
                  <Inline text={extra} />
                </span>
              </li>
            ))}
          </ul>
        </figure>
        <div className="min-w-0 rounded-xl border border-line p-4 [grid-area:deploy] @min-[900px]:self-start">
          <h3 className="m-0 text-[13px] font-semibold text-ink">{deployTitle}</h3>
          <ol className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
            {deploy.map((step) => (
              <li key={step.command} className="before:hidden m-0 p-0">
                <p className="m-0 mb-1.5 text-[12.5px] leading-[1.5] text-ink-muted">{step.label}</p>
                <div className="flex items-start gap-2 rounded-lg border border-line bg-surface-sunken py-1.5 pr-1.5 pl-3">
                  <span className="min-w-0 flex-1 pt-[5px]">
                    <Command code={step.command} size="small" />
                  </span>
                  <CopyButton text={step.command} labelClassName="sr-only" />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}

// ── Open-source CLI and the Console ─────────────────────────────────────────────────────────────────────

type Offer = { name: string; price: string; items: string[] };

export function HomeOffers({
  title,
  lead,
  offers,
  pricing,
  pricingLink
}: {
  title: string;
  lead?: string;
  offers: Offer[];
  pricing: string;
  pricingLink: PathLink;
}) {
  return (
    <Section id="cli-and-console" title={title} lead={lead}>
      <div className="grid gap-3 @min-[700px]:grid-cols-2">
        {offers.map((offer) => (
          <div key={offer.name} className="min-w-0 rounded-xl border border-line p-5">
            <h3 className="m-0 text-[16px] font-semibold text-ink">{offer.name}</h3>
            <p className="m-0 mt-1 text-[13.5px] font-medium text-accent-text">{offer.price}</p>
            <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
              {offer.items.map((item) => (
                <li key={item} className="before:hidden m-0 flex gap-2.5 p-0 text-[14px] leading-[1.55] text-ink-muted">
                  <span className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <span>
                    <Inline text={item} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="m-0 mt-4 text-[14px] leading-[1.65] text-ink-muted">
        <Inline text={pricing} />{' '}
        <a href={pricingLink.href} className="font-semibold text-accent-text no-underline hover:text-ink-strong">
          {pricingLink.label}
        </a>
      </p>
    </Section>
  );
}

// ── For teams ────────────────────────────────────────────────────────────────────────────────────────────

type Answer = { title: string; text: string; link: PathLink };

export function HomeTeams({ title, lead, items }: { title: string; lead?: string; items: Answer[] }) {
  return (
    <Section id="for-teams" title={title} lead={lead}>
      <dl className="m-0 grid gap-x-10 border-t border-line @min-[760px]:grid-cols-2">
        {items.map((item) => (
          <div key={item.title} className="min-w-0 border-b border-line py-4">
            <dt className="m-0 text-[15px] font-semibold text-ink">{item.title}</dt>
            <dd className="m-0 mt-1.5 text-[14px] leading-[1.6] text-ink-muted">
              <Inline text={item.text} />
              <a
                href={item.link.href}
                className="group/link mt-2 flex w-fit items-center gap-1.5 text-[13.5px] font-semibold text-accent-text no-underline hover:text-ink-strong"
              >
                {item.link.label}
                <LuArrowRight
                  size={13}
                  aria-hidden="true"
                  className="[transition:transform_150ms_ease] group-hover/link:translate-x-0.5 motion-reduce:group-hover/link:translate-x-0"
                />
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

// ── Map of the docs ──────────────────────────────────────────────────────────────────────────────────────

type MapGroup = { title: string; links: PathLink[] };

export function HomeMap({ title, groups }: { title: string; groups: MapGroup[] }) {
  return (
    <Section id="docs-map" title={title}>
      <div className="grid gap-x-8 gap-y-8 grid-cols-2 @min-[760px]:grid-cols-4">
        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title} className="min-w-0">
            <h3 className="m-0 mb-3 text-[13px] font-semibold tracking-[0.02em] text-ink-muted">{group.title}</h3>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {group.links.map((link) => (
                <li key={link.href} className="before:hidden m-0 p-0 leading-[1.45]">
                  <a
                    href={link.href}
                    className="text-[14.5px] leading-[1.45] text-ink no-underline [transition:color_150ms_ease] hover:text-ink-strong"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </Section>
  );
}
