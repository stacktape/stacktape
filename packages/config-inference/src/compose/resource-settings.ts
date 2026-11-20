/**
 * The settings a person can change on each composed resource, before the file is written.
 *
 * Preferences (`preferences.ts`) are the few stack-wide trade-offs the composition starts from. These are the
 * resource's own knobs, the way the config schema names them: a database's instance class and engine version, a
 * service's CPU and memory, a site's custom domain. Each one reads its value from the resource's properties and says
 * which property paths a new value writes, so the wizard's server can apply it to the composed configuration and the
 * same writes can be made to a file someone has edited by hand.
 *
 * Every setting carries two names: the plain one most people read ("Standby copy") and AWS's own ("Multi-AZ"), so the
 * page can serve someone deploying for the first time and someone who has run RDS for years. The wording lives here,
 * in code, never in anything an analysis produced.
 */

import type { DeploymentPreferenceKey } from './preferences';

export type SettingValue = string | number | boolean;

export type SettingOption = {
  value: SettingValue;
  /** What the option is called: "db.t4g.small", "7 days", "On". */
  label: string;
  /** What it means in numbers or plain words: "2 vCPU · 2 GB memory". */
  detail?: string;
  /** The family it belongs to, in a word or two: "burstable", "extra memory". */
  tag?: string;
  /** Why it cannot be picked with the other settings as they are. */
  disabledReason?: string;
};

/** The sections a resource's settings are shown in, in this order. */
export const SETTING_GROUPS = ['size', 'reliability', 'data', 'network', 'runtime', 'alerts'] as const;
export type SettingGroup = (typeof SETTING_GROUPS)[number];

export const SETTING_GROUP_LABELS: Readonly<Record<SettingGroup, string>> = {
  size: 'Size',
  reliability: 'Reliability',
  data: 'Data',
  network: 'Network',
  runtime: 'Runtime',
  alerts: 'Alerts'
};

export type ResourceSetting = {
  id: string;
  group: SettingGroup;
  /** The plain name: "Standby copy". */
  label: string;
  /** AWS's name for the same thing: "Multi-AZ". */
  awsTerm: string;
  /** Where the value lives in the resource's properties, dotted: `engine.properties.primaryInstance.multiAz`. */
  path: string;
  /** One or two sentences on what it does and what it costs, for the help tooltip. */
  about: string;
  /**
   * `size`: a list of real AWS sizes, each with its price. `choice`: a few named options. `toggle`: on or off.
   * `domain`: a domain name typed in, or none.
   */
  control: 'size' | 'choice' | 'toggle' | 'domain';
  options: SettingOption[];
  value: SettingValue;
  /** A different value changes the fixed monthly price, so the server prices each option. */
  priced: boolean;
  /** Folded away until asked for: it rarely needs changing before a first deploy. */
  advanced: boolean;
  /** Changed through a stack-wide preference, because the change adds or removes resources. */
  preference?: DeploymentPreferenceKey;
  /** Why it cannot be changed with the other settings as they are. */
  disabledReason?: string;
};

/** A change the page asks for. The server checks it against `settingsForResource` before applying anything. */
export type SettingChange = { resource: string; setting: string; value: SettingValue };

/** One property write: `value` undefined removes the property (and any object it leaves empty). */
export type SettingWrite = { path: readonly string[]; value?: unknown };

export type SettingsContext = {
  /** The release lines RDS offers per engine, newest first: `{ postgres: ['18', '17', '16'] }`. */
  engineVersions?: Readonly<Record<string, readonly string[]>>;
};

type Properties = Record<string, unknown>;
type Resource = { type: string; properties?: Properties };

type Definition = {
  id: string;
  group: SettingGroup;
  label: string | ((properties: Properties) => string);
  awsTerm: string;
  path: string;
  about: string;
  control: ResourceSetting['control'];
  priced?: boolean;
  advanced?: boolean;
  preference?: DeploymentPreferenceKey;
  options: (properties: Properties, context: SettingsContext) => SettingOption[];
  read: (properties: Properties) => SettingValue;
  write: (value: SettingValue, properties: Properties) => SettingWrite[];
  disabled?: (properties: Properties) => string | undefined;
};

// ── Reading and writing paths ───────────────────────────────────────────────────────────────────

const split = (path: string): string[] => path.split('.');

export const readPath = (properties: unknown, path: readonly string[]): unknown => {
  let current: unknown = properties;
  for (const key of path) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as Properties)[key];
  }
  return current;
};

const isPlainObject = (value: unknown): value is Properties =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** `properties` with each write made, as a new object: nothing passed in is changed. */
export const applyWrites = (properties: Properties, writes: readonly SettingWrite[]): Properties => {
  const setIn = (node: Properties, path: readonly string[], value: unknown): Properties => {
    const [key, ...rest] = path;
    if (key === undefined) return node;
    const next = { ...node };
    if (rest.length === 0) {
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    }
    const child = isPlainObject(node[key]) ? node[key] : {};
    const written = setIn(child, rest, value);
    // A removal that empties an object removes the object too: no `storage: {}` left behind.
    if (Object.keys(written).length === 0) delete next[key];
    else next[key] = written;
    return next;
  };
  return writes.reduce((current, write) => setIn(current, write.path, write.value), properties);
};

// ── Shared pieces ───────────────────────────────────────────────────────────────────────────────

const ON_OFF = (off: string, on: string, offDetail?: string, onDetail?: string): SettingOption[] => [
  { value: false, label: off, ...(offDetail === undefined ? {} : { detail: offDetail }) },
  { value: true, label: on, ...(onDetail === undefined ? {} : { detail: onDetail }) }
];

/** Options that always include the current value, so a hand-picked size is never silently shown as another. */
const withCurrent = (options: SettingOption[], current: SettingValue, label = String(current)): SettingOption[] =>
  options.some((option) => option.value === current) ? options : [{ value: current, label }, ...options];

const numberAt = (properties: Properties, path: string, fallback: number): number => {
  const value = readPath(properties, split(path));
  return typeof value === 'number' ? value : fallback;
};

const booleanAt = (properties: Properties, path: string, fallback: boolean): boolean => {
  const value = readPath(properties, split(path));
  return typeof value === 'boolean' ? value : fallback;
};

const stringAt = (properties: Properties, path: string, fallback: string): string => {
  const value = readPath(properties, split(path));
  return typeof value === 'string' ? value : fallback;
};

/** Writes a value, or removes the key when it is the schema default, so the file only says what differs. */
const writeOrDefault =
  (path: string, fallback: SettingValue) =>
  (value: SettingValue): SettingWrite[] => [{ path: split(path), ...(value === fallback ? {} : { value }) }];

const gb = (megabytes: number): string =>
  megabytes >= 1024 ? `${Number((megabytes / 1024).toFixed(1)).toString()} GB` : `${megabytes} MB`;

/** A domain name as Route 53 takes one: labels of letters, digits and dashes, a dot between each, no scheme. */
export const isDomainName = (value: string): boolean =>
  value.length <= 253 && /^(?!-)[a-z0-9-]{1,63}(?<!-)(?:\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i.test(value);

const customDomain: Definition = {
  id: 'customDomain',
  group: 'network',
  label: 'Custom domain',
  awsTerm: 'Custom domain (Route 53 + ACM)',
  path: 'customDomains',
  about:
    'Serves it on your own domain with a TLS certificate and DNS records made for you. The domain needs a Route 53 hosted zone in this AWS account. Without one it gets an AWS address.',
  control: 'domain',
  options: () => [],
  read: (properties) => {
    const domains = properties.customDomains;
    const first: unknown = Array.isArray(domains) ? domains[0] : undefined;
    return isPlainObject(first) && typeof first.domainName === 'string' ? first.domainName : '';
  },
  write: (value, properties) => {
    const domain = String(value).trim().toLowerCase();
    const others = Array.isArray(properties.customDomains) ? properties.customDomains.slice(1) : [];
    const domains = domain === '' ? others : [{ domainName: domain }, ...others];
    return [{ path: ['customDomains'], ...(domains.length === 0 ? {} : { value: domains }) }];
  }
};

// ── Relational databases ────────────────────────────────────────────────────────────────────────

/** RDS engines that run on instances Stacktape sizes through `primaryInstance` (not Aurora). */
const RDS_INSTANCE_ENGINES = new Set([
  'postgres',
  'mysql',
  'mariadb',
  'oracle-ee',
  'oracle-se2',
  'sqlserver-ee',
  'sqlserver-ex',
  'sqlserver-se',
  'sqlserver-web'
]);

const ENGINE_NAMES: Readonly<Record<string, string>> = {
  postgres: 'Postgres',
  mysql: 'MySQL',
  mariadb: 'MariaDB'
};

const DATABASE_SIZES: ReadonlyArray<{ size: string; vcpu: number; memory: number; note?: string }> = [
  { size: 'db.t4g.micro', vcpu: 2, memory: 1, note: 'burstable' },
  { size: 'db.t4g.small', vcpu: 2, memory: 2, note: 'burstable' },
  { size: 'db.t4g.medium', vcpu: 2, memory: 4, note: 'burstable' },
  { size: 'db.t4g.large', vcpu: 2, memory: 8, note: 'burstable' },
  { size: 'db.m7g.large', vcpu: 2, memory: 8, note: 'steady CPU' },
  { size: 'db.m7g.xlarge', vcpu: 4, memory: 16, note: 'steady CPU' },
  { size: 'db.r7g.large', vcpu: 2, memory: 16, note: 'extra memory' },
  { size: 'db.r7g.xlarge', vcpu: 4, memory: 32, note: 'extra memory' }
];

const PRIMARY = 'engine.properties.primaryInstance';
const engineType = (properties: Properties): string => stringAt(properties, 'engine.type', '');
const alarmsOf = (properties: Properties): Properties[] =>
  Array.isArray(properties.alarms) ? properties.alarms.filter(isPlainObject) : [];

/** A database alarm the composition can add or remove, matched by its trigger type. */
const databaseAlarm = ({
  id,
  label,
  awsTerm,
  about,
  trigger,
  description
}: {
  id: string;
  label: string;
  awsTerm: string;
  about: string;
  trigger: { type: string; properties: Properties };
  description: string;
}): Definition => ({
  id,
  group: 'alerts',
  label,
  awsTerm,
  path: 'alarms',
  about,
  control: 'toggle',
  options: () => ON_OFF('Off', 'On'),
  read: (properties) =>
    alarmsOf(properties).some((alarm) => isPlainObject(alarm.trigger) && alarm.trigger.type === trigger.type),
  write: (value, properties) => {
    const others = alarmsOf(properties).filter(
      (alarm) => !(isPlainObject(alarm.trigger) && alarm.trigger.type === trigger.type)
    );
    const alarms =
      value === true
        ? [
            ...others,
            {
              description,
              trigger,
              evaluation: { period: 300, evaluationPeriods: 3, breachedPeriods: 2 },
              includeInHistory: true
            }
          ]
        : others;
    return [{ path: ['alarms'], ...(alarms.length === 0 ? {} : { value: alarms }) }];
  }
});

const RELATIONAL_DATABASE: Definition[] = [
  {
    id: 'instanceSize',
    group: 'size',
    label: 'Instance',
    awsTerm: 'Instance class',
    path: `${PRIMARY}.instanceSize`,
    about:
      'The machine the database runs on. Burstable (t4g) sizes are cheapest and fine until the CPU stays busy; m7g keeps a steady CPU, r7g has extra memory. You can resize later; it restarts the database for a few minutes.',
    control: 'size',
    priced: true,
    options: (properties) =>
      withCurrent(
        DATABASE_SIZES.map(({ size, vcpu, memory, note }) => {
          const option: SettingOption = { value: size, label: size, detail: `${vcpu} vCPU · ${memory} GB` };
          if (note !== undefined) option.tag = note;
          return option;
        }),
        stringAt(properties, `${PRIMARY}.instanceSize`, 'db.t4g.micro')
      ),
    read: (properties) => stringAt(properties, `${PRIMARY}.instanceSize`, 'db.t4g.micro'),
    write: (value, properties) => {
      // Read copies follow the primary's size, so the copies never lag behind it.
      const replicas = readPath(properties, split('engine.properties.readReplicas'));
      return [
        { path: split(`${PRIMARY}.instanceSize`), value },
        ...(Array.isArray(replicas) && replicas.length > 0
          ? [
              {
                path: split('engine.properties.readReplicas'),
                value: replicas.map((replica: unknown) =>
                  Object.assign({}, isPlainObject(replica) ? replica : {}, { instanceSize: value })
                )
              }
            ]
          : [])
      ];
    }
  },
  {
    id: 'storage',
    group: 'size',
    label: 'Storage',
    awsTerm: 'Allocated storage (GB)',
    path: 'engine.properties.storage.initialSize',
    about:
      'Disk space the database starts with. It grows on its own when free space runs low, up to 200 GB or twice this size, whichever is more.',
    control: 'choice',
    priced: true,
    options: (properties) =>
      withCurrent(
        [20, 50, 100, 250, 500].map((size) => ({ value: size, label: `${size} GB` })),
        numberAt(properties, 'engine.properties.storage.initialSize', 20),
        `${numberAt(properties, 'engine.properties.storage.initialSize', 20)} GB`
      ),
    read: (properties) => numberAt(properties, 'engine.properties.storage.initialSize', 20),
    write: (value, properties) => {
      const size = Number(value);
      const maxSize = numberAt(properties, 'engine.properties.storage.maxSize', 200);
      return [
        { path: split('engine.properties.storage.initialSize'), ...(size === 20 ? {} : { value: size }) },
        // The ceiling it may grow to must be above where it starts.
        ...(size * 2 > maxSize ? [{ path: split('engine.properties.storage.maxSize'), value: size * 2 }] : [])
      ];
    }
  },
  {
    id: 'multiAz',
    group: 'reliability',
    label: 'Standby copy',
    awsTerm: 'Multi-AZ',
    path: `${PRIMARY}.multiAz`,
    about:
      'A second copy in another data center, kept in sync. If the database or its data center fails, the standby takes over in a minute or two. Doubles the database cost.',
    control: 'toggle',
    priced: true,
    options: () => ON_OFF('Off', 'On', 'A failure means downtime until it restarts', 'Fails over in a minute or two'),
    read: (properties) => booleanAt(properties, `${PRIMARY}.multiAz`, false),
    write: writeOrDefault(`${PRIMARY}.multiAz`, false)
  },
  {
    id: 'readReplicas',
    group: 'reliability',
    label: 'Read copies',
    awsTerm: 'Read replicas',
    path: 'engine.properties.readReplicas',
    about:
      'Extra copies that serve reads, each with its own address, the same size as the main instance. Useful when reads outgrow one machine. Each one costs as much as the main instance.',
    control: 'choice',
    priced: true,
    advanced: true,
    options: () => [0, 1, 2].map((count) => ({ value: count, label: count === 0 ? 'None' : String(count) })),
    read: (properties) => {
      const replicas = readPath(properties, split('engine.properties.readReplicas'));
      return Array.isArray(replicas) ? replicas.length : 0;
    },
    write: (value, properties) => {
      const count = Number(value);
      const instanceSize = stringAt(properties, `${PRIMARY}.instanceSize`, 'db.t4g.micro');
      return [
        {
          path: split('engine.properties.readReplicas'),
          ...(count === 0 ? {} : { value: Array.from({ length: count }, () => ({ instanceSize })) })
        }
      ];
    }
  },
  {
    id: 'access',
    group: 'network',
    label: 'Reachable from',
    awsTerm: 'Accessibility mode',
    path: 'accessibility.accessibilityMode',
    about:
      'Internet: a public address, and only the generated password over TLS gets in. Simplest from your laptop. Private network: no public address; Stacktape adds a small access server (bastion) you and your migrations connect through.',
    control: 'choice',
    priced: true,
    preference: 'databaseAccess',
    options: () => [
      { value: 'public', label: 'Internet', detail: 'Password and TLS required' },
      { value: 'private', label: 'Private network', detail: 'VPC only, through a bastion' }
    ],
    read: (properties) => {
      const mode = stringAt(properties, 'accessibility.accessibilityMode', 'internet');
      return mode === 'vpc' || mode === 'scoping-workloads-in-vpc' ? 'private' : 'public';
    },
    // Applied through the preference: going private adds the access server and moves serverless apps into the VPC.
    write: () => []
  },
  {
    id: 'backupRetention',
    group: 'data',
    label: 'Backups kept',
    awsTerm: 'Backup retention',
    path: 'automatedBackupRetentionDays',
    about:
      'How many days of automatic daily backups AWS keeps. You can restore the database to any minute within them. Backup storage up to the size of the database is free.',
    control: 'choice',
    options: (properties) =>
      withCurrent(
        [1, 7, 14, 35].map((days) => ({ value: days, label: days === 1 ? '1 day' : `${days} days` })),
        numberAt(properties, 'automatedBackupRetentionDays', 1),
        `${numberAt(properties, 'automatedBackupRetentionDays', 1)} days`
      ),
    read: (properties) => numberAt(properties, 'automatedBackupRetentionDays', 1),
    write: (value) => [{ path: ['automatedBackupRetentionDays'], value: Number(value) }]
  },
  {
    id: 'deletionProtection',
    group: 'data',
    label: 'Block deleting',
    awsTerm: 'Deletion protection',
    path: 'deletionProtection',
    about:
      'Refuses to delete the database, even when the stack is deleted, until you turn this off. Costs nothing; keeps a mistyped command from losing your data.',
    control: 'toggle',
    options: () => ON_OFF('Off', 'On'),
    read: (properties) => booleanAt(properties, 'deletionProtection', false),
    write: writeOrDefault('deletionProtection', false)
  },
  {
    id: 'version',
    group: 'runtime',
    label: (properties) => `${ENGINE_NAMES[engineType(properties)] ?? 'Engine'} version`,
    awsTerm: 'Engine version',
    path: 'engine.properties.version',
    about:
      'The major version. AWS keeps it on the newest minor release of that version, so security fixes arrive without you doing anything.',
    control: 'choice',
    options: (properties, context) => {
      const current = stringAt(properties, 'engine.properties.version', '');
      const lines = context.engineVersions?.[engineType(properties)] ?? [];
      return withCurrent(
        lines.slice(0, 5).map((line, index) => {
          const option: SettingOption = { value: line, label: line };
          if (index === 0) option.detail = 'newest';
          return option;
        }),
        current
      );
    },
    read: (properties) => stringAt(properties, 'engine.properties.version', ''),
    write: (value) => [{ path: split('engine.properties.version'), value: String(value) }]
  },
  {
    id: 'minorUpgrades',
    group: 'runtime',
    label: 'Minor version upgrades',
    awsTerm: 'Auto minor version upgrade',
    path: 'engine.properties.disableAutoMinorVersionUpgrade',
    about:
      'AWS applies minor releases (16.4 to 16.5) in the maintenance window. Turn it off only if you test every minor release yourself.',
    control: 'toggle',
    advanced: true,
    options: () => ON_OFF('Off', 'On'),
    read: (properties) => !booleanAt(properties, 'engine.properties.disableAutoMinorVersionUpgrade', false),
    write: (value) => [
      { path: split('engine.properties.disableAutoMinorVersionUpgrade'), ...(value === true ? {} : { value: true }) }
    ]
  },
  databaseAlarm({
    id: 'alarmFreeStorage',
    label: 'Low disk space',
    awsTerm: 'FreeStorageSpace < 2 GB',
    about: 'Raises an alarm when less than 2 GB of disk is free, before writes start failing.',
    trigger: { type: 'database-free-storage', properties: { thresholdMB: 2048 } },
    description: 'Database has less than 2 GiB of free storage'
  }),
  databaseAlarm({
    id: 'alarmCpu',
    label: 'Busy CPU',
    awsTerm: 'CPUUtilization > 80%',
    about: 'Raises an alarm when the CPU stays above 80% for ten minutes, a sign the instance is too small.',
    trigger: { type: 'database-cpu-utilization', properties: { thresholdPercent: 80 } },
    description: 'Database CPU above 80%'
  }),
  databaseAlarm({
    id: 'alarmFreeMemory',
    label: 'Low memory',
    awsTerm: 'FreeableMemory < 100 MB',
    about: 'Raises an alarm when the instance has less than 100 MB of memory left, when queries start using the disk.',
    trigger: { type: 'database-free-memory', properties: { thresholdMB: 100 } },
    description: 'Database has less than 100 MB of free memory'
  })
];

// ── Server-rendered web apps (Next.js, Nuxt, SvelteKit, …) ───────────────────────────────────────

const SSR_TYPES = new Set([
  'nextjs-web',
  'nuxt-web',
  'sveltekit-web',
  'astro-web',
  'remix-web',
  'solidstart-web',
  'tanstack-web'
]);

const usesEdge = (properties: Properties): boolean => booleanAt(properties, 'useEdgeLambda', false);
const EDGE_REASON = 'Not available while it renders at the edge (Lambda@Edge)';

const lambdaMemory = (path: string, fallback: number, about: string): Definition => ({
  id: 'memory',
  group: 'size',
  label: 'Memory',
  awsTerm: 'Lambda memory (MB)',
  path,
  about,
  control: 'size',
  options: (properties) =>
    withCurrent(
      [512, 1024, 1769, 2048, 3008].map((memory) => ({
        value: memory,
        label: `${memory} MB`,
        detail: `${memory === 1769 ? '1' : (memory / 1769).toFixed(1)} vCPU`
      })),
      numberAt(properties, path, fallback),
      `${numberAt(properties, path, fallback)} MB`
    ),
  read: (properties) => numberAt(properties, path, fallback),
  write: writeOrDefault(path, fallback)
});

const lambdaTimeout = (path: string, fallback: number, choices: number[]): Definition => ({
  id: 'timeout',
  group: 'runtime',
  label: 'Time limit per request',
  awsTerm: 'Lambda timeout',
  path,
  about: 'How long one request may run before it is stopped. A request that takes longer gets an error.',
  control: 'choice',
  options: (properties) =>
    withCurrent(
      choices.map((seconds) => ({ value: seconds, label: `${seconds} s` })),
      numberAt(properties, path, fallback),
      `${numberAt(properties, path, fallback)} s`
    ),
  read: (properties) => numberAt(properties, path, fallback),
  write: writeOrDefault(path, fallback)
});

const SSR_SITE: Definition[] = [
  lambdaMemory(
    'serverLambda.memory',
    1024,
    'Memory for the function that renders your pages. AWS gives CPU in proportion: 1769 MB is one full vCPU. More memory makes each request faster and each second of it dearer; you pay per request either way.'
  ),
  lambdaTimeout('serverLambda.timeout', 30, [10, 20, 30]),
  customDomain
];

const NEXTJS_ONLY: Definition[] = [
  {
    id: 'warmInstances',
    group: 'runtime',
    label: 'Kept warm',
    awsTerm: 'Warm server instances',
    path: 'warmServerInstances',
    about:
      'Copies of the page renderer kept started, so the first visitor after a quiet spell does not wait for a cold start (about a second). A small function pings them every few minutes.',
    control: 'choice',
    options: (properties) =>
      withCurrent(
        [0, 1, 3, 5].map((count) => {
          const option: SettingOption = { value: count, label: count === 0 ? 'None' : String(count) };
          if (usesEdge(properties) && count > 0) option.disabledReason = EDGE_REASON;
          return option;
        }),
        numberAt(properties, 'warmServerInstances', 0)
      ),
    read: (properties) => numberAt(properties, 'warmServerInstances', 0),
    write: writeOrDefault('warmServerInstances', 0),
    disabled: (properties) => (usesEdge(properties) ? EDGE_REASON : undefined)
  },
  {
    id: 'streaming',
    group: 'runtime',
    label: 'Stream responses',
    awsTerm: 'Response streaming',
    path: 'streamingEnabled',
    about:
      'Sends each page as it renders, so the first bytes arrive sooner, and allows responses up to 20 MB instead of 6 MB.',
    control: 'toggle',
    options: () => ON_OFF('Off', 'On'),
    read: (properties) => booleanAt(properties, 'streamingEnabled', false),
    write: writeOrDefault('streamingEnabled', false),
    disabled: (properties) => (usesEdge(properties) ? EDGE_REASON : undefined)
  },
  {
    id: 'edge',
    group: 'runtime',
    label: 'Render near visitors',
    awsTerm: 'Lambda@Edge',
    path: 'useEdgeLambda',
    about:
      'Renders pages in CloudFront locations around the world instead of one region. Lower latency far from the region; slower deploys, no streaming and no warm copies.',
    control: 'toggle',
    advanced: true,
    options: () => ON_OFF('Off', 'On'),
    read: usesEdge,
    write: (value) =>
      value === true
        ? [{ path: ['useEdgeLambda'], value: true }, { path: ['warmServerInstances'] }, { path: ['streamingEnabled'] }]
        : [{ path: ['useEdgeLambda'] }]
  }
];

// ── Containers ──────────────────────────────────────────────────────────────────────────────────

/** Fargate's CPU and memory pairs, smallest first: `cpu/memory` in vCPU and MB. */
const CONTAINER_SIZES: ReadonlyArray<{ cpu: number; memory: number }> = [
  { cpu: 0.25, memory: 512 },
  { cpu: 0.5, memory: 1024 },
  { cpu: 1, memory: 2048 },
  { cpu: 2, memory: 4096 },
  { cpu: 4, memory: 8192 }
];

const containerSize = (properties: Properties): string =>
  `${numberAt(properties, 'resources.cpu', 0.25)}/${numberAt(properties, 'resources.memory', 512)}`;

/** One copy only: the app keeps its data on a disk only one copy can write to. */
const pinnedToOneCopy = (properties: Properties): string | undefined =>
  Array.isArray(properties.volumeMounts) && properties.volumeMounts.length > 0
    ? 'Runs as one copy: it keeps its data on a disk only one copy can write to'
    : undefined;

const CONTAINER: Definition[] = [
  {
    id: 'size',
    group: 'size',
    label: 'CPU and memory',
    awsTerm: 'Fargate task size',
    path: 'resources',
    about:
      'What each copy of the app gets. It runs on AWS Fargate, billed per second for as long as it runs. Resizing replaces the copies one by one, without downtime.',
    control: 'size',
    priced: true,
    options: (properties) =>
      withCurrent(
        CONTAINER_SIZES.map(({ cpu, memory }) => ({
          value: `${cpu}/${memory}`,
          label: `${cpu} vCPU`,
          detail: `${gb(memory)} memory`.replace(' memory', '')
        })),
        containerSize(properties),
        `${numberAt(properties, 'resources.cpu', 0.25)} vCPU · ${gb(numberAt(properties, 'resources.memory', 512))}`
      ),
    read: containerSize,
    write: (value) => {
      const [cpu, memory] = String(value).split('/').map(Number);
      return [
        { path: ['resources', 'cpu'], value: cpu },
        { path: ['resources', 'memory'], value: memory }
      ];
    }
  },
  {
    id: 'minInstances',
    group: 'reliability',
    label: 'Copies always running',
    awsTerm: 'Minimum instances',
    path: 'scaling.minInstances',
    about:
      'How many copies run even when it is quiet. With two or more, a failed copy or a deploy never takes the app down. Each copy costs the same.',
    control: 'choice',
    priced: true,
    options: (properties) =>
      withCurrent(
        [1, 2, 3].map((count) => ({ value: count, label: String(count) })),
        numberAt(properties, 'scaling.minInstances', 1)
      ),
    read: (properties) => numberAt(properties, 'scaling.minInstances', 1),
    write: (value, properties) => {
      const count = Number(value);
      return [
        { path: ['scaling', 'minInstances'], value: count },
        // The most it may scale to is never below the least it runs.
        ...(numberAt(properties, 'scaling.maxInstances', 1) < count
          ? [{ path: ['scaling', 'maxInstances'], value: count }]
          : [])
      ];
    },
    disabled: pinnedToOneCopy
  },
  {
    id: 'maxInstances',
    group: 'reliability',
    label: 'Adds copies up to',
    awsTerm: 'Maximum instances',
    path: 'scaling.maxInstances',
    about:
      'When busy, AWS starts more copies, up to this many, and stops them when traffic drops. You pay only while they run.',
    control: 'choice',
    options: (properties) => {
      const minimum = numberAt(properties, 'scaling.minInstances', 1);
      return withCurrent(
        [1, 2, 3, 5, 10].map((count) => {
          const option: SettingOption = { value: count, label: String(count) };
          if (count < minimum) option.disabledReason = 'Fewer than the copies always running';
          return option;
        }),
        numberAt(properties, 'scaling.maxInstances', 1)
      );
    },
    read: (properties) => numberAt(properties, 'scaling.maxInstances', 1),
    write: (value) => [{ path: ['scaling', 'maxInstances'], value: Number(value) }],
    disabled: pinnedToOneCopy
  },
  {
    id: 'cpuTarget',
    group: 'reliability',
    label: 'Adds a copy when CPU passes',
    awsTerm: 'Target CPU utilization',
    path: 'scaling.scalingPolicy.keepAvgCpuUtilizationUnder',
    about: 'The average CPU at which another copy starts. Lower reacts sooner to a spike and runs more copies.',
    control: 'choice',
    advanced: true,
    options: () => [50, 70, 80].map((percent) => ({ value: percent, label: `${percent}%` })),
    read: (properties) => numberAt(properties, 'scaling.scalingPolicy.keepAvgCpuUtilizationUnder', 80),
    write: writeOrDefault('scaling.scalingPolicy.keepAvgCpuUtilizationUnder', 80),
    disabled: (properties) =>
      pinnedToOneCopy(properties) ??
      (numberAt(properties, 'scaling.maxInstances', 1) <= numberAt(properties, 'scaling.minInstances', 1)
        ? 'Only applies when it can add copies'
        : undefined)
  }
];

// ── Everything else ─────────────────────────────────────────────────────────────────────────────

const BUCKET: Definition[] = [
  {
    id: 'versioning',
    group: 'data',
    label: 'Keep old versions',
    awsTerm: 'Versioning',
    path: 'versioning',
    about:
      'Keeps every earlier version of a file when it is overwritten or deleted, so a mistake can be undone. Old versions are billed as storage.',
    control: 'toggle',
    options: () => ON_OFF('Off', 'On'),
    read: (properties) => booleanAt(properties, 'versioning', false),
    write: writeOrDefault('versioning', false)
  }
];

const FILESYSTEM: Definition[] = [
  {
    id: 'backups',
    group: 'data',
    label: 'Daily backups',
    awsTerm: 'AWS Backup',
    path: 'backupEnabled',
    about: 'AWS Backup copies the disk every day and keeps the copies for 35 days. Billed per GB of backup.',
    control: 'toggle',
    options: () => ON_OFF('Off', 'On'),
    read: (properties) => booleanAt(properties, 'backupEnabled', false),
    write: writeOrDefault('backupEnabled', false)
  }
];

const BASTION: Definition[] = [
  {
    id: 'instanceSize',
    group: 'size',
    label: 'Instance',
    awsTerm: 'EC2 instance type',
    path: 'instanceSize',
    about: 'The small server you and your migrations reach the private database through. The smallest is plenty.',
    control: 'size',
    priced: true,
    options: (properties) =>
      withCurrent(
        [
          { value: 't3.micro', label: 't3.micro', detail: '2 vCPU · 1 GB' },
          { value: 't3.small', label: 't3.small', detail: '2 vCPU · 2 GB' }
        ],
        stringAt(properties, 'instanceSize', 't3.micro')
      ),
    read: (properties) => stringAt(properties, 'instanceSize', 't3.micro'),
    write: (value) => [{ path: ['instanceSize'], value }]
  }
];

const CACHE_ENGINES = new Set(['valkey', 'redis']);

const REDIS: Definition[] = [
  {
    id: 'instanceSize',
    group: 'size',
    label: 'Node',
    awsTerm: 'Node type',
    path: 'engine.properties.instanceSize',
    about: 'The machine the cache runs on. Pick by memory: the cache holds everything in it.',
    control: 'size',
    priced: true,
    options: (properties) =>
      withCurrent(
        [
          { value: 'cache.t4g.micro', label: 'cache.t4g.micro', detail: '2 vCPU · 0.5 GB' },
          { value: 'cache.t4g.small', label: 'cache.t4g.small', detail: '2 vCPU · 1.4 GB' },
          { value: 'cache.t4g.medium', label: 'cache.t4g.medium', detail: '2 vCPU · 3.1 GB' },
          { value: 'cache.m7g.large', label: 'cache.m7g.large', detail: '2 vCPU · 6.4 GB' },
          { value: 'cache.r7g.large', label: 'cache.r7g.large', detail: '2 vCPU · 13 GB' }
        ],
        stringAt(properties, 'engine.properties.instanceSize', 'cache.t4g.micro')
      ),
    read: (properties) => stringAt(properties, 'engine.properties.instanceSize', 'cache.t4g.micro'),
    write: (value) => [{ path: ['engine', 'properties', 'instanceSize'], value }]
  },
  {
    id: 'replicas',
    group: 'reliability',
    label: 'Standby copies',
    awsTerm: 'Replica nodes',
    path: 'engine.properties.numReplicaNodes',
    about:
      'Copies of the cache in other data centers. One takes over if the main node fails. Each costs as much as it.',
    control: 'choice',
    priced: true,
    options: () => [0, 1, 2].map((count) => ({ value: count, label: count === 0 ? 'None' : String(count) })),
    read: (properties) => numberAt(properties, 'engine.properties.numReplicaNodes', 0),
    write: (value) => {
      const count = Number(value);
      return [
        { path: ['engine', 'properties', 'numReplicaNodes'], ...(count === 0 ? {} : { value: count }) },
        { path: ['engine', 'properties', 'enableAutomaticFailover'], ...(count === 0 ? {} : { value: true }) }
      ];
    }
  }
];

const FUNCTION: Definition[] = [
  lambdaMemory(
    'memory',
    1024,
    'Memory for each run of the function. AWS gives CPU in proportion: 1769 MB is one full vCPU. You pay per request and per GB-second.'
  ),
  lambdaTimeout('timeout', 10, [10, 30, 60, 300, 900])
];

const definitionsFor = (resource: Resource): Definition[] => {
  const properties = resource.properties ?? {};
  switch (resource.type) {
    case 'relational-database':
      return RDS_INSTANCE_ENGINES.has(engineType(properties))
        ? RELATIONAL_DATABASE
        : // Aurora sizes itself through other properties; only what applies to every engine.
          RELATIONAL_DATABASE.filter((definition) =>
            ['access', 'backupRetention', 'deletionProtection', 'version', 'alarmFreeStorage'].includes(definition.id)
          );
    case 'web-service':
      return [...CONTAINER, customDomain];
    case 'private-service':
    case 'worker-service':
      return CONTAINER;
    case 'hosting-bucket':
      return [customDomain];
    case 'bucket':
      return BUCKET;
    case 'efs-filesystem':
      return FILESYSTEM;
    case 'bastion':
      return BASTION;
    case 'redis':
      return CACHE_ENGINES.has(stringAt(properties, 'engine.type', '')) ? REDIS : [];
    case 'function':
      return FUNCTION;
    default:
      return SSR_TYPES.has(resource.type) ? [...SSR_SITE, ...(resource.type === 'nextjs-web' ? NEXTJS_ONLY : [])] : [];
  }
};

const resolve = (definition: Definition, properties: Properties, context: SettingsContext): ResourceSetting => {
  const disabledReason = definition.disabled?.(properties);
  return {
    id: definition.id,
    group: definition.group,
    label: typeof definition.label === 'function' ? definition.label(properties) : definition.label,
    awsTerm: definition.awsTerm,
    path: definition.path,
    about: definition.about,
    control: definition.control,
    options: definition.options(properties, context),
    value: definition.read(properties),
    priced: definition.priced === true,
    advanced: definition.advanced === true,
    ...(definition.preference === undefined ? {} : { preference: definition.preference }),
    ...(disabledReason === undefined ? {} : { disabledReason })
  };
};

/** The settings that apply to a resource, with their current values, in the order they are shown. */
export const settingsForResource = (resource: Resource, context: SettingsContext = {}): ResourceSetting[] => {
  const properties = resource.properties ?? {};
  return definitionsFor(resource)
    .map((definition) => resolve(definition, properties, context))
    .toSorted((a, b) => SETTING_GROUPS.indexOf(a.group) - SETTING_GROUPS.indexOf(b.group));
};

/**
 * The property writes that set `setting` to `value` on `resource`, or a reason it cannot. A value must be one of the
 * setting's own options (or a domain name, for a domain), so a page can never write a property it was not offered.
 */
export const settingWrites = (
  resource: Resource,
  change: Pick<SettingChange, 'setting' | 'value'>,
  context: SettingsContext = {}
): { writes: SettingWrite[] } | { refused: string } => {
  const properties = resource.properties ?? {};
  const definition = definitionsFor(resource).find((candidate) => candidate.id === change.setting);
  if (definition === undefined) return { refused: 'That setting does not apply to this resource.' };
  if (definition.preference !== undefined) return { refused: 'That setting is changed through its preference.' };
  const disabled = definition.disabled?.(properties);
  if (disabled !== undefined) return { refused: disabled };
  if (definition.control === 'domain') {
    if (typeof change.value !== 'string') return { refused: 'A domain is text.' };
    const domain = change.value.trim();
    if (domain !== '' && !isDomainName(domain)) return { refused: `${domain} is not a domain name.` };
    return { writes: definition.write(domain, properties) };
  }
  const option = definition.options(properties, context).find((candidate) => candidate.value === change.value);
  if (option === undefined) return { refused: 'That is not one of the options.' };
  if (option.disabledReason !== undefined) return { refused: option.disabledReason };
  return { writes: definition.write(change.value, properties) };
};

/** The resource's properties with the change made, or undefined when the change is refused. */
export const applySetting = (
  resource: Resource,
  change: Pick<SettingChange, 'setting' | 'value'>,
  context: SettingsContext = {}
): Properties | undefined => {
  const result = settingWrites(resource, change, context);
  return 'refused' in result ? undefined : applyWrites(resource.properties ?? {}, result.writes);
};

/** The shape of a change, before it is checked against the resource it names. */
export const isSettingChange = (input: unknown): input is SettingChange => {
  if (typeof input !== 'object' || input === null) return false;
  const candidate = input as Record<string, unknown>;
  return (
    Object.keys(candidate).length === 3 &&
    typeof candidate.resource === 'string' &&
    candidate.resource.length > 0 &&
    candidate.resource.length <= 128 &&
    typeof candidate.setting === 'string' &&
    candidate.setting.length <= 64 &&
    (typeof candidate.value === 'string' ||
      typeof candidate.value === 'number' ||
      typeof candidate.value === 'boolean') &&
    (typeof candidate.value !== 'string' || candidate.value.length <= 253)
  );
};
