/*
 * The Console's left navigation.
 *
 * The labels and their grouping are the product's, and they are the whole reason this surface earns
 * its space on the homepage: a CTO scanning it should be able to find the thing their team already
 * does somewhere else — alarms, budgets, secrets, guardrails, AWS accounts — without reading a word
 * of marketing copy. So nothing here is abbreviated for looks, and no group is dropped for balance.
 *
 * The icons are hand-drawn rather than imported. Console's own icon set is bound to its runtime, and
 * a 16 px line glyph in `currentColor` is indistinguishable at this size while costing no
 * dependency and no client JavaScript.
 */

type NavGlyphName =
  | 'overview'
  | 'config'
  | 'projects'
  | 'activity'
  | 'users'
  | 'money'
  | 'channels'
  | 'bell'
  | 'alarm'
  | 'issues'
  | 'shield'
  | 'lock'
  | 'sliders'
  | 'aws'
  | 'globe'
  | 'docs';

type NavItem = {
  label: string;
  glyph: NavGlyphName;
  /** The count pill Console puts on a row that is asking for attention. */
  badge?: { count: number; tone: 'warning' | 'danger' };
  /** Rows that open a sub-list get a chevron; the list itself is collapsed here. */
  expandable?: boolean;
  isActive?: boolean;
};

type NavGroup = {
  /** Uppercase in the product. Absent on the first group, which has no heading. */
  heading?: string;
  items: NavItem[];
};

const NAV_GROUPS: readonly NavGroup[] = [
  {
    items: [
      { label: 'Overview', glyph: 'overview', isActive: true },
      { label: 'Config editor', glyph: 'config' }
    ]
  },
  {
    heading: 'Organization',
    items: [
      { label: 'Projects', glyph: 'projects' },
      { label: 'Activity', glyph: 'activity' },
      { label: 'Users', glyph: 'users' },
      { label: 'Costs', glyph: 'money' }
    ]
  },
  {
    heading: 'Monitoring',
    items: [
      { label: 'Channels', glyph: 'channels' },
      { label: 'Notifications', glyph: 'bell', expandable: true },
      { label: 'Alarms', glyph: 'alarm', badge: { count: 1, tone: 'warning' }, expandable: true },
      { label: 'Budgets', glyph: 'money', expandable: true },
      { label: 'Issues', glyph: 'issues', badge: { count: 2, tone: 'danger' } }
    ]
  },
  {
    heading: 'Configuration',
    items: [
      { label: 'Guardrails', glyph: 'shield' },
      { label: 'Secrets', glyph: 'lock' },
      { label: 'SSM Params', glyph: 'sliders' },
      { label: 'AWS Accounts', glyph: 'aws' },
      { label: 'Domains', glyph: 'globe' }
    ]
  }
];

export function ConsoleNav() {
  return (
    <nav aria-label="Console" className="console-nav">
      {NAV_GROUPS.map((group, index) => (
        <div className="console-nav__group" key={group.heading ?? `group-${index}`}>
          {group.heading !== undefined && <p className="console-nav__heading">{group.heading}</p>}
          <ul className="console-nav__list">
            {group.items.map((item) => (
              <li className={`console-nav__item${item.isActive === true ? ' is-active' : ''}`} key={item.label}>
                <NavGlyph name={item.glyph} />
                <span className="console-nav__label">{item.label}</span>
                {item.badge !== undefined && (
                  <span className={`console-nav__badge is-${item.badge.tone}`}>{item.badge.count}</span>
                )}
                {item.expandable === true && <Chevron />}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="console-nav__footer">
        <span className="console-nav__item">
          <NavGlyph name="docs" />
          <span className="console-nav__label">Docs</span>
          <ExternalGlyph />
        </span>
      </div>
    </nav>
  );
}

/** A chevron, shared by the nav rows and by the Console's dropdown buttons. */
export function Chevron({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={['console-chevron', className].filter(Boolean).join(' ')}
      fill="none"
      height="12"
      viewBox="0 0 16 16"
      width="12"
    >
      <path d="m4 6 4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

function ExternalGlyph() {
  return (
    <svg aria-hidden="true" className="console-nav__external" fill="none" height="12" viewBox="0 0 16 16" width="12">
      <path
        d="M6.5 3.5H3.5v9h9v-3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <path
        d="M9.5 3.5h3v3M12.5 3.5 7.5 8.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

/*
 * The glyph set. Each is drawn on the same 16-unit grid with a 1.4 stroke so the column of icons
 * reads as one family rather than as a collection of borrowed marks. `aws` is the exception and
 * deliberately so: the wordmark is how that row is recognised.
 */
function NavGlyph({ name }: { name: NavGlyphName }) {
  if (name === 'aws') {
    return (
      <span aria-hidden="true" className="console-nav__glyph console-nav__glyph--aws">
        aws
      </span>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="console-nav__glyph"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
      viewBox="0 0 16 16"
      width="16"
    >
      {GLYPH_PATHS[name].map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  );
}

const GLYPH_PATHS: Record<Exclude<NavGlyphName, 'aws'>, readonly string[]> = {
  overview: ['M2.5 2.5h4.2v4.2H2.5zM9.3 2.5h4.2v4.2H9.3zM9.3 9.3h4.2v4.2H9.3zM2.5 9.3h4.2v4.2H2.5z'],
  config: ['M4 2h5l3 3v9H4z', 'M9 2v3h3', 'M6.5 9.5 5.5 11l1 1.5', 'M9.5 9.5l1 1.5-1 1.5'],
  projects: ['M2.5 2.5h11v11h-11z', 'M6.2 2.5v11', 'M9.9 2.5v11'],
  activity: ['M2 8h2.6l2 5 2.4-10 1.9 5H14'],
  users: [
    'M10.8 13.5v-1.2a2.6 2.6 0 0 0-2.6-2.6H4.9a2.6 2.6 0 0 0-2.6 2.6v1.2',
    'M6.5 7.2a2.35 2.35 0 1 0 0-4.7 2.35 2.35 0 0 0 0 4.7Z',
    'M14 13.5v-1.2a2.6 2.6 0 0 0-1.9-2.5'
  ],
  money: ['M8 1.6v12.8', 'M11 4.2H6.6a2.1 2.1 0 0 0 0 4.2h2.8a2.1 2.1 0 0 1 0 4.2H4.6'],
  channels: ['M2.5 3.5h11v9h-11z', 'm3 4.3 5 3.9 5-3.9'],
  bell: ['M12 6.6a4 4 0 1 0-8 0c0 4.4-1.7 5.6-1.7 5.6h11.4S12 11 12 6.6', 'M9.2 14a1.4 1.4 0 0 1-2.4 0'],
  alarm: [
    'M8 14.2a5.6 5.6 0 1 0 0-11.2 5.6 5.6 0 0 0 0 11.2Z',
    'M8 5.9v3l1.9 1.4',
    'M2.6 3 4.4 1.5',
    'M13.4 3 11.6 1.5'
  ],
  issues: [
    'M5.4 6.2a2.6 2.6 0 0 1 5.2 0v3.5a2.6 2.6 0 0 1-5.2 0z',
    'M6.2 4.1 5.4 2.6M9.8 4.1l.8-1.5',
    'M5.4 7.4H2.9M5.4 10.2H3.4M10.6 7.4h2.5M10.6 10.2h2'
  ],
  shield: ['M8 1.9 3 3.6v4c0 3.3 2.2 6.1 5 6.9 2.8-.8 5-3.6 5-6.9v-4z', 'm6.2 7.7 1.4 1.4L10 6.7'],
  lock: ['M3.7 7.1h8.6v6.4H3.7z', 'M5.7 7.1V4.9a2.3 2.3 0 0 1 4.6 0v2.2'],
  sliders: ['M2.4 5.3h11.2M2.4 10.7h11.2', 'M6.3 3.9v2.8M10.1 9.3v2.8'],
  globe: [
    'M8 14.2a6.2 6.2 0 1 0 0-12.4 6.2 6.2 0 0 0 0 12.4Z',
    'M1.8 8h12.4',
    'M8 1.8a9.6 9.6 0 0 1 0 12.4 9.6 9.6 0 0 1 0-12.4'
  ],
  docs: ['M3 3.2A1.4 1.4 0 0 1 4.4 1.8H13v10.4H4.4A1.4 1.4 0 0 0 3 13.6z', 'M3 13.6a1.4 1.4 0 0 1 1.4-1.4H13']
};
