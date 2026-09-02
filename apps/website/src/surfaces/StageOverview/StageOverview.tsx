/*
 * The Console, on a stage's Overview tab.
 *
 * This is the "after" screen: the config is deployed, and what you get is not a wall of AWS
 * consoles but one page that knows the project, its stages and the six things it created. It is the
 * densest surface on the site by design — a developer should be able to read every label on it, and
 * a CTO should be able to see the whole SDLC listed down the left before deciding to care.
 *
 * Nothing here is interactive. The buttons and tabs are spans styled as controls rather than real
 * `<button>`s: a marketing recreation that hands the reader a focusable control which then does
 * nothing is worse than one that plainly is a picture. The resource marks are redrawn (see
 * `ResourceGlyph`) but keep the product's category colours, so `mainDatabase` is blue and `firewall`
 * is red for exactly the same reason they are in the real Console.
 *
 * Server-rendered end to end — it ships no client JavaScript at all.
 */
import { BrowserFrame } from '../frames/BrowserFrame';
import { API_URL, CONSOLE_URL, GIT_REPOSITORY, ORG_NAME, PROJECT_NAME, RESOURCES, STAGES, WEB_URL } from '../story';
import { Chevron, ConsoleNav } from './ConsoleNav';
import { ResourceGlyph } from './ResourceGlyph';

/** The stage tabs, in the order the cover's Console shows them. */
const STAGE_TABS = ['Overview', 'Activity', 'Logs', 'Metrics', 'Costs', 'Configuration', 'Danger zone'] as const;

const QUICK_LINKS = [
  { label: 'web URL', url: WEB_URL },
  { label: 'apiService URL', url: API_URL }
] as const;

export type StageOverviewProps = {
  className?: string | undefined;
};

export function StageOverview({ className }: StageOverviewProps) {
  return (
    <BrowserFrame className={['stage-overview', className].filter(Boolean).join(' ')} url={CONSOLE_URL}>
      <div className="console">
        <ConsoleTopBar />

        <div className="console__body">
          <ConsoleNav />
          <ProjectPanel />
          <StagePane />
        </div>
      </div>
    </BrowserFrame>
  );
}

function ConsoleTopBar() {
  return (
    <header className="console__topbar">
      <span className="console__brand">
        <StacktapeMark />
        <span className="console__wordmark">Stacktape</span>
      </span>

      <span className="console__crumbs">
        <span className="console__crumb">
          {ORG_NAME}
          <Chevron />
        </span>
        <span className="console__crumb-sep">/</span>
        <span className="console__crumb is-current">
          {PROJECT_NAME}
          <Chevron />
        </span>
      </span>

      <span className="console__topbar-actions">
        <span className="console-button is-primary">
          <PlusGlyph />
          Create new project
        </span>
        <span className="console__topbar-item">
          <HelpGlyph />
          Help
          <Chevron />
        </span>
        <span className="console__topbar-item">
          <PersonGlyph />
          JD
          <Chevron />
        </span>
      </span>
    </header>
  );
}

/**
 * The project column: which project, where its code lives, and which stages exist.
 *
 * The two stage rows are the surface's quiet argument for stages being a first-class idea rather
 * than a naming convention — one updated two hours ago, one mid-deploy, same project, same region.
 */
function ProjectPanel() {
  return (
    <aside className="console-project">
      <div className="console-project__head">
        <p className="console-project__label">
          Project <InfoGlyph />
        </p>
        <span className="console-project__collapse" aria-hidden="true">
          «
        </span>
      </div>

      <div className="console-project__title">
        <h3>{PROJECT_NAME}</h3>
        <span className="console-project__gear">
          <GearGlyph />
        </span>
      </div>

      <p className="console-project__repo">
        <GitGlyph />
        {GIT_REPOSITORY}
      </p>

      <p className="console-project__label console-project__label--stages">
        Stages <InfoGlyph />
      </p>

      <span className="console-button is-primary console-project__new">
        <PlusGlyph />
        New stage
      </span>

      <ul className="console-project__stages">
        {STAGES.map((stage) => (
          <li className={`console-stage${stage.name === 'staging' ? ' is-selected' : ''}`} key={stage.name}>
            <span className="console-stage__name">{stage.name}</span>
            <span className="console-stage__region">{stage.region}</span>
            <span className={`console-stage__status is-${stage.status.kind}`}>
              {stage.status.kind === 'deploying' && <span aria-hidden="true" className="console-stage__dot" />}
              {stage.status.label}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function StagePane() {
  return (
    <section className="console-stage-pane">
      <div className="console-stage-pane__head">
        <div>
          <p className="console-eyebrow">Stage</p>
          <h2 className="console-stage-pane__name">staging</h2>
        </div>
        <span className="console-button is-primary is-large">
          Deploy stage
          <Chevron />
        </span>
      </div>

      <div className="console-tabs">
        {STAGE_TABS.map((tab) => (
          <span className={`console-tabs__tab${tab === 'Overview' ? ' is-active' : ''}`} key={tab}>
            {tab}
          </span>
        ))}
      </div>

      <p className="console-eyebrow console-section-label">Quick links</p>
      <div className="console-links">
        {QUICK_LINKS.map((link) => (
          <span className="console-link-card" key={link.label}>
            <span className="console-link-card__label">{link.label}</span>
            <span className="console-link-card__url">{link.url}</span>
          </span>
        ))}
      </div>

      <p className="console-eyebrow console-section-label">Resources</p>
      <div className="console-resources">
        {RESOURCES.map((resource) => (
          <span className="console-resource" key={resource.name}>
            <ResourceGlyph resource={resource} />
            <span className="console-resource__text">
              <span className="console-resource__name">{resource.name}</span>
              <span className="console-resource__type">{resource.consoleLabel}</span>
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}

/*
 * The logo mark only — the wordmark next to it is set in the page's own type.
 *
 * The gradient ids are namespaced for this surface because SVG ids are document-global: sharing
 * `stp-logo-a` with the site's own wordmark would make whichever mark renders second reference the
 * first one's gradients.
 */
function StacktapeMark() {
  return (
    <svg aria-hidden="true" className="console__mark" fill="none" height="20" viewBox="0 0 42 49" width="18">
      <path
        d="M41.7636 14.3985L37.4928 37.8262L13.8142 45.812C13.4647 45.934 13.0741 45.8036 12.8578 45.5013L0.253235 27.8495C0.22812 27.8199 0.203008 27.7825 0.182777 27.7487C0.0662745 27.5725 0 27.3625 0 27.1356C0 27.0813 0.0041868 27.0264 0.0125582 26.9721L1.89613 26.3378L25.0633 18.5204L40.5867 13.2822C41.2355 13.0624 41.8927 13.6839 41.7636 14.3985Z"
        fill="url(#stp-console-mark-a)"
      />
      <path
        d="M25.0635 18.5195L1.89626 26.3376L0.0126953 26.9719C0.0378096 26.7999 0.099898 26.6442 0.191286 26.5054C0.195472 26.5011 0.199656 26.4927 0.208028 26.4842L0.345457 26.3242L22.2235 0.728862C22.6183 0.266567 23.3669 0.548453 23.4255 1.1827L25.0635 18.5195Z"
        fill="url(#stp-console-mark-b)"
      />
      <path
        d="M37.493 37.8262L29.4369 48.1848C29.0434 48.7662 28.1616 48.4928 28.0891 47.7669L27.4473 41.2145L37.493 37.8262Z"
        fill="url(#stp-console-mark-c)"
      />
      <defs>
        <linearGradient gradientUnits="userSpaceOnUse" id="stp-console-mark-a" x1="20.3" x2="22" y1="9.9" y2="42.3">
          <stop stopColor="#70C8B6" />
          <stop offset="1" stopColor="#0097A1" />
        </linearGradient>
        <linearGradient gradientUnits="userSpaceOnUse" id="stp-console-mark-b" x1="10.6" x2="12.6" y1="-2" y2="23.3">
          <stop stopColor="#70C8B6" />
          <stop offset="1" stopColor="#0097A1" />
        </linearGradient>
        <linearGradient gradientUnits="userSpaceOnUse" id="stp-console-mark-c" x1="33.3" x2="32.7" y1="47" y2="40.6">
          <stop stopColor="#70C8B6" />
          <stop offset="1" stopColor="#0097A1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg aria-hidden="true" className="console-glyph" fill="none" height="12" viewBox="0 0 16 16" width="12">
      <path d="M8 3.4v9.2M3.4 8h9.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function HelpGlyph() {
  return (
    <svg aria-hidden="true" className="console-glyph" fill="none" height="14" viewBox="0 0 16 16" width="14">
      <path d="M8 14.4A6.4 6.4 0 1 0 8 1.6a6.4 6.4 0 0 0 0 12.8Z" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M6.3 6.2a1.75 1.75 0 1 1 2.4 1.6c-.5.2-.7.6-.7 1.1v.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.3"
      />
      <path d="M8 11.6h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function PersonGlyph() {
  return (
    <svg aria-hidden="true" className="console-glyph" fill="none" height="14" viewBox="0 0 16 16" width="14">
      <path d="M8 7.8a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8Z" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M2.9 14v-.7A3.6 3.6 0 0 1 6.5 9.7h3A3.6 3.6 0 0 1 13.1 13.3v.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function GearGlyph() {
  return (
    <svg aria-hidden="true" className="console-glyph" fill="none" height="14" viewBox="0 0 16 16" width="14">
      <path d="M8 10.1a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2Z" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M12.8 9.8a1.1 1.1 0 0 0 .2 1.2l.1.1a1.3 1.3 0 1 1-1.9 1.9l-.1-.1a1.1 1.1 0 0 0-1.2-.2 1.1 1.1 0 0 0-.7 1v.2a1.3 1.3 0 0 1-2.6 0v-.1a1.1 1.1 0 0 0-.7-1 1.1 1.1 0 0 0-1.2.2l-.1.1a1.3 1.3 0 1 1-1.9-1.9l.1-.1a1.1 1.1 0 0 0 .2-1.2 1.1 1.1 0 0 0-1-.7h-.2a1.3 1.3 0 0 1 0-2.6h.1a1.1 1.1 0 0 0 1-.7 1.1 1.1 0 0 0-.2-1.2l-.1-.1a1.3 1.3 0 1 1 1.9-1.9l.1.1a1.1 1.1 0 0 0 1.2.2h.1a1.1 1.1 0 0 0 .7-1v-.2a1.3 1.3 0 0 1 2.6 0v.1a1.1 1.1 0 0 0 .7 1 1.1 1.1 0 0 0 1.2-.2l.1-.1a1.3 1.3 0 1 1 1.9 1.9l-.1.1a1.1 1.1 0 0 0-.2 1.2v.1a1.1 1.1 0 0 0 1 .7h.2a1.3 1.3 0 0 1 0 2.6h-.1a1.1 1.1 0 0 0-1 .7Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function GitGlyph() {
  return (
    <svg aria-hidden="true" className="console-glyph" fill="none" height="13" viewBox="0 0 16 16" width="13">
      <path
        d="M4.6 5.8a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8ZM4.6 14a1.9 1.9 0 1 0 0-3.8A1.9 1.9 0 0 0 4.6 14ZM11.4 5.8a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M4.6 5.8v4.4M11.4 5.8v.9a2.4 2.4 0 0 1-2.4 2.4H7a2.4 2.4 0 0 0-2.4 2.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.3"
      />
    </svg>
  );
}

/** The `(?)` Console puts beside a section heading that has an explanation behind it. */
function InfoGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="console-glyph console-glyph--info"
      fill="none"
      height="11"
      viewBox="0 0 16 16"
      width="11"
    >
      <path d="M8 14.6A6.6 6.6 0 1 0 8 1.4a6.6 6.6 0 0 0 0 13.2Z" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M6.4 6.1a1.65 1.65 0 1 1 2.3 1.5c-.5.2-.7.6-.7 1.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <path d="M8 11.4h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}
