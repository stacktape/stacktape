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

function Command({ code, size = 'large' }: { code: string; size?: 'large' | 'small' }) {
  return (
    <code
      className={clsx(
        'block min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 font-mono text-ink break-normal whitespace-normal',
        size === 'large' ? 'text-[15px] leading-[1.6]' : 'text-[13px] leading-[1.55]'
      )}
    >
      <span className="select-none text-accent-text" aria-hidden="true">
        ${' '}
      </span>
      {withOffsets(code.split(' '), 1).map(({ part, offset }) => (
        <span key={offset}>
          {offset > 0 && ' '}
          {/* Wrap between words, not after the hyphens of a flag. A URL may also wrap after a slash, so a phone
              breaks it at `installs.stacktape.com/` rather than mid-word; anything longer still wraps. */}
          <span className="inline-block max-w-full [overflow-wrap:anywhere]">
            {withOffsets(part.split(/(?<=\/)(?!\/)/), 0).map(({ part: segment, offset: at }) => (
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

/* Which command is shown follows the checked radio. Tailwind needs each selector written out, so the hero supports
 * up to four commands. */
const SHOWN_BLOCK = [
  'group-has-[#home-command-0:checked]/cmd:block',
  'group-has-[#home-command-1:checked]/cmd:block',
  'group-has-[#home-command-2:checked]/cmd:block',
  'group-has-[#home-command-3:checked]/cmd:block'
];
const SHOWN_FLEX = [
  'group-has-[#home-command-0:checked]/cmd:inline-flex',
  'group-has-[#home-command-1:checked]/cmd:inline-flex',
  'group-has-[#home-command-2:checked]/cmd:inline-flex',
  'group-has-[#home-command-3:checked]/cmd:inline-flex'
];

export function HomeHero({
  eyebrow,
  title,
  lead,
  commandLabel,
  commands,
  commandNote
}: {
  eyebrow?: string;
  title: string;
  lead: string;
  commandLabel: string;
  commands: CommandTab[];
  commandNote?: string;
}) {
  const shown = commands.slice(0, SHOWN_BLOCK.length);
  return (
    <section className="@container font-sans mt-1 mb-12" aria-labelledby="home-title">
      <script dangerouslySetInnerHTML={{ __html: COPY_SCRIPT }} />
      <div className="grid gap-x-12 gap-y-8 @min-[860px]:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] @min-[860px]:items-center">
        <div>
          {eyebrow && <p className="m-0 text-[13px] font-semibold tracking-[0.02em] text-accent-text">{eyebrow}</p>}
          <h1
            id="home-title"
            className="mt-3 mb-0 font-bold text-ink-strong tracking-[-0.03em] text-[32px] leading-[1.1] @min-[560px]:text-[40px] @min-[860px]:text-[46px] @min-[860px]:leading-[1.05]"
          >
            {title}
          </h1>
          <p className="mt-5 mb-0 max-w-[36rem] text-[16px] leading-[1.65] text-ink-muted @min-[560px]:text-[17px]">
            {lead}
          </p>
        </div>

        <div className="group/cmd @container/card min-w-0 rounded-xl border border-line bg-surface-raised">
          <div className="flex items-center gap-2 border-b border-line pr-2.5 pl-2">
            <fieldset className="m-0 flex min-w-0 flex-1 items-center border-0 p-0 pt-2">
              <legend className="sr-only">{commandLabel}</legend>
              {shown.map((command, index) => (
                <label
                  key={command.label}
                  className={clsx(
                    'relative -mb-px cursor-pointer select-none border-b-2 border-transparent px-2 pt-1.5 pb-2.5 @min-[400px]/card:px-2.5',
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
                <CopyButton text={command.code} labelClassName="@max-[399px]/card:sr-only" />
              </span>
            ))}
          </div>
          <div className="px-4 pt-3.5 pb-4">
            <p className="m-0 mb-2 text-[12.5px] font-medium text-ink-muted">{commandLabel}</p>
            <div className="rounded-lg border border-line bg-surface-sunken px-3.5 py-3">
              {shown.map((command, index) => (
                <div key={command.label} className={clsx('hidden', SHOWN_BLOCK[index])}>
                  <Command code={command.code} />
                </div>
              ))}
            </div>
          </div>
          {commandNote && (
            <p className="m-0 border-t border-line px-4 pt-3 pb-4 text-[13.5px] leading-[1.55] text-ink-muted">
              {commandNote}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Paths by goal ────────────────────────────────────────────────────────────────────────────────────────

type PathLink = { label: string; href: string };
type Path = { title: string; text: string; command?: string; steps?: string[]; links: PathLink[] };

function PathLinkView({ link, primary }: { link: PathLink; primary: boolean }) {
  const isAnchor = link.href.startsWith('#');
  return (
    <a
      href={link.href}
      className={clsx(
        'group/link inline-flex items-center gap-1.5 text-[14px] font-semibold no-underline',
        primary ? 'text-accent-text hover:text-ink-strong' : 'text-ink-muted hover:text-ink'
      )}
    >
      {link.label}
      {isAnchor ? (
        <LuArrowDown
          size={14}
          aria-hidden="true"
          className="[transition:transform_150ms_ease] group-hover/link:translate-y-0.5 motion-reduce:group-hover/link:translate-y-0"
        />
      ) : (
        <LuArrowRight
          size={14}
          aria-hidden="true"
          className="[transition:transform_150ms_ease] group-hover/link:translate-x-0.5 motion-reduce:group-hover/link:translate-x-0"
        />
      )}
    </a>
  );
}

export function HomePaths({ title, items }: { title: string; items: Path[] }) {
  return (
    <section className="@container font-sans mb-16" aria-labelledby="home-paths">
      <h2 id="home-paths" className="m-0 mb-4 text-[13px] font-semibold tracking-[0.02em] text-ink-muted">
        {title}
      </h2>
      <ol className="m-0 grid list-none gap-3 p-0 @min-[760px]:grid-cols-3">
        {items.map((item) => (
          <li
            key={item.title}
            className="before:hidden m-0 flex min-w-0 flex-col rounded-xl border border-line bg-surface-raised p-4 @min-[560px]:p-5 [transition:border-color_150ms_ease] hover:border-line-strong"
          >
            <h3 className="m-0 text-[17px] font-semibold leading-[1.35] text-ink">{item.title}</h3>
            <p className="m-0 mt-2 text-[14px] leading-[1.6] text-ink-muted">{item.text}</p>
            {item.steps && (
              <ol
                className="m-0 mt-4 flex list-none flex-wrap items-center gap-x-1 gap-y-1 rounded-lg border border-line bg-surface-sunken px-3 py-2.5"
                aria-label="Wizard steps"
              >
                {item.steps.map((step, index) => (
                  <li
                    key={step}
                    className="before:hidden m-0 flex items-center gap-1 p-0 text-[13px] leading-[1.5] font-medium text-ink-muted"
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
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-line bg-surface-sunken py-2 pr-2 pl-3">
                <span className="min-w-0 flex-1 pt-[5px]">
                  <Command code={item.command} size="small" />
                </span>
                <CopyButton text={item.command} />
              </div>
            )}
            <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-4">
              {item.links.map((link, linkIndex) => (
                <PathLinkView key={link.href} link={link} primary={linkIndex === 0} />
              ))}
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
type AwsResource = { category: AwsCategory; service: string; name: string; detail: string; inVpc?: boolean };

const categoryDot: Record<AwsCategory, string> = {
  compute: 'bg-aws-compute',
  database: 'bg-aws-database',
  network: 'bg-aws-network',
  security: 'bg-aws-security',
  storage: 'bg-aws-storage',
  integration: 'bg-aws-integration'
};

function ResourceNode({ resource }: { resource: AwsResource }) {
  return (
    <div className="relative rounded-lg border border-line bg-surface-raised px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span className={clsx('h-2 w-2 shrink-0 rounded-full', categoryDot[resource.category])} aria-hidden="true" />
        <span className="text-[13.5px] font-semibold text-ink">{resource.service}</span>
        <span className="ml-auto font-mono text-[12px] text-ink-faint">{resource.name}</span>
      </div>
      <p className="m-0 mt-1 pl-4 text-[12.5px] leading-[1.5] text-ink-muted">
        <Inline text={resource.detail} />
      </p>
    </div>
  );
}

function Connector() {
  return <div className="mx-auto h-4 w-px bg-line" aria-hidden="true" />;
}

type DeployStep = { label: string; command: string };

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
  resources: AwsResource[];
  extras: string[];
  deployTitle: string;
  deploy: DeployStep[];
  children: ReactNode;
}) {
  const outside = resources.filter((resource) => !resource.inVpc);
  const inside = resources.filter((resource) => resource.inVpc);
  return (
    <Section id="example" title={title} lead={lead}>
      <div className="grid gap-4 @min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @min-[900px]:items-start">
        {/* The code block brings its own vertical margins; the grid sets the spacing here. On narrow screens the
            config starts collapsed below the diagram, and the checkbox opens it. */}
        <div className="relative min-w-0">
          <input type="checkbox" id="home-full-config" className="peer sr-only" />
          <div className="max-h-[22rem] overflow-hidden peer-checked:max-h-none @min-[900px]:max-h-none [&_astro-island>div]:my-0">
            {children}
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-surface peer-checked:hidden @min-[900px]:hidden"
            aria-hidden="true"
          />
          <label
            htmlFor="home-full-config"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 cursor-pointer rounded-md border border-line bg-surface-raised px-3 py-1.5 text-[13px] font-semibold text-ink peer-checked:hidden peer-focus-visible:outline-2 peer-focus-visible:outline-accent @min-[900px]:hidden"
          >
            Show the full config
          </label>
        </div>
        {/* What the config creates comes first on narrow screens, before the code that describes it. */}
        <div className="order-first flex min-w-0 flex-col gap-4 @min-[900px]:order-none">
          <figure className="m-0 rounded-xl border border-line bg-surface-sunken p-4">
            <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-[13px] font-semibold text-ink">In your AWS account</span>
              <span className="font-mono text-[12px] text-ink-faint">stack {stack}</span>
            </figcaption>
            <div className="text-center text-[12px] text-ink-faint">Internet</div>
            <Connector />
            {outside.map((resource) => (
              <div key={resource.name}>
                <ResourceNode resource={resource} />
                <Connector />
              </div>
            ))}
            {inside.length > 0 && (
              <div className="rounded-lg border border-dashed border-line-strong p-2.5 pt-2">
                <div className="mb-2 px-1 text-[11.5px] font-medium text-ink-faint">VPC</div>
                {inside.map((resource, index) => (
                  <div key={resource.name}>
                    <ResourceNode resource={resource} />
                    {index < inside.length - 1 && <Connector />}
                  </div>
                ))}
              </div>
            )}
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
          <div className="rounded-xl border border-line p-4">
            <h3 className="m-0 text-[13px] font-semibold text-ink">{deployTitle}</h3>
            <ol className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
              {deploy.map((step) => (
                <li key={step.command} className="before:hidden m-0 p-0">
                  <p className="m-0 mb-1.5 text-[12.5px] leading-[1.5] text-ink-muted">{step.label}</p>
                  <div className="flex items-start gap-3 rounded-lg border border-line bg-surface-sunken py-2 pr-2 pl-3">
                    <span className="min-w-0 flex-1 pt-[5px]">
                      <Command code={step.command} size="small" />
                    </span>
                    <CopyButton text={step.command} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
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
