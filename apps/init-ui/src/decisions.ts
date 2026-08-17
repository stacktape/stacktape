/**
 * Every word the wizard says about a decision it made for you.
 *
 * This file replaced a set of *questions*, and the change is more than wording. A question stops
 * someone and demands they understand something before they can continue. A decision that has
 * already been made can be read in two seconds, ignored, or changed — and it only has to be
 * understood by the people who care.
 *
 * The reader is a developer who has shipped things, probably on Heroku or Vercel, and has never had
 * to think about an availability zone. So: no instance classes, no "provisioned throughput", no
 * "ephemeral filesystem". Say what will happen to their app, in the words they would use.
 *
 * The wording still lives here rather than coming from the analysis, for the same reason as before:
 * an agent that reads untrusted files must never be able to put a sentence in front of a user.
 */

export type DecisionCopy = {
  /** What we did, as a statement. Shown as the headline of the row. */
  summary: (parameters: Record<string, unknown>, chosen: string) => string;
  /** Why, and what it means for them. One sentence, no jargon. */
  detail: (parameters: Record<string, unknown>, chosen: string) => string;
  /** The label for each alternative, for the control that changes it. */
  option: (value: string, parameters: Record<string, unknown>) => string;
  /** What choosing that alternative would mean. Optional; shown under the label. */
  consequence?: (value: string, parameters: Record<string, unknown>) => string | undefined;
};

const text = (parameters: Record<string, unknown>, key: string, fallback = ''): string =>
  typeof parameters[key] === 'string' ? (parameters[key] as string) : fallback;

const PROVIDER_LABELS: Record<string, string> = {
  supabase: 'Supabase',
  neon: 'Neon',
  planetscale: 'PlanetScale',
  railway: 'Railway',
  render: 'Render',
  heroku: 'Heroku',
  upstash: 'Upstash',
  'mongodb-atlas': 'MongoDB Atlas',
  aws: 'AWS',
  'self-hosted': 'your own server'
};

const ENGINE_LABELS: Record<string, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  mssql: 'SQL Server',
  mongodb: 'MongoDB',
  sqlite: 'SQLite'
};

const providerName = (parameters: Record<string, unknown>): string => {
  const raw = text(parameters, 'provider', 'another provider');
  return PROVIDER_LABELS[raw] ?? raw;
};

const dependencyName = (parameters: Record<string, unknown>): string => {
  const kind = text(parameters, 'dependencyKind', 'database');
  return (
    {
      postgres: 'database',
      mysql: 'database',
      mssql: 'database',
      mongodb: 'database',
      redis: 'cache',
      'object-storage': 'storage bucket',
      dynamodb: 'table',
      queue: 'queue',
      topic: 'topic',
      amqp: 'message broker',
      search: 'search index',
      kafka: 'event stream'
    }[kind] ?? kind
  );
};

export const DECISION_COPY: Record<string, DecisionCopy> = {
  'external-database-disposition': {
    summary: (parameters, chosen) =>
      chosen === 'point-at-existing'
        ? text(parameters, 'basis') === 'deployment-manifest'
          ? `Not creating a second ${dependencyName(parameters)} beside the one declared on ${providerName(parameters)}`
          : `Keeping the ${dependencyName(parameters)} your app already points to on ${providerName(parameters)}`
        : `Creating a new ${dependencyName(parameters)} on AWS`,
    detail: (parameters, chosen) =>
      chosen === 'point-at-existing'
        ? text(parameters, 'basis') === 'deployment-manifest'
          ? `Your project declares this ${dependencyName(parameters)}, but a file cannot tell us whether it was deployed or has data. We left it alone so a first Stacktape run cannot create a convincing empty replacement by accident.`
          : `Your app already has its address, so we left that ${dependencyName(parameters)} alone. Nothing is created and nothing changes.`
        : `This is a separate, empty ${dependencyName(parameters)}. Anything already running on ${providerName(parameters)} is untouched; move data or traffic across only if you need it.`,
    option: (value, parameters) =>
      value === 'point-at-existing'
        ? text(parameters, 'basis') === 'deployment-manifest'
          ? `Use the ${dependencyName(parameters)} already declared on ${providerName(parameters)}`
          : `Keep using ${providerName(parameters)}`
        : 'Create a new one on AWS',
    consequence: (value, parameters) =>
      value === 'point-at-existing'
        ? 'Nothing new is created.'
        : `A separate, empty ${dependencyName(parameters)} is created on AWS.`
  },

  'sqlite-persistence': {
    summary: () => 'Moving your SQLite data to a real database',
    detail: () =>
      'SQLite keeps everything in a file next to your app. On AWS your app is replaced on every deploy, and the file goes with it — so this moves that data somewhere it survives.',
    option: (value) =>
      value === 'migrate-to-managed-database'
        ? 'Move it to a managed database'
        : value === 'persistent-volume'
          ? 'Keep the file on a disk that survives'
          : 'It is only a cache, losing it is fine',
    consequence: (value) =>
      value === 'migrate-to-managed-database'
        ? 'You point your app at it once, and it survives every deploy after that.'
        : value === 'persistent-volume'
          ? 'Closest to how it works today, but only one copy of your app can run.'
          : 'Nothing is created. The file is gone on every deploy.'
  },

  'local-filesystem-writes': {
    summary: () => 'Putting uploaded files in storage instead of on disk',
    detail: (parameters) =>
      `${text(parameters, 'serviceName', 'Your app')} saves files next to itself. On AWS the app is replaced on every deploy and those files go with it, so they go to a storage bucket instead.`,
    option: (value) =>
      value === 'object-storage'
        ? 'Store them in a bucket'
        : value === 'persistent-volume'
          ? 'Keep writing to a disk that survives'
          : 'They are temporary, losing them is fine',
    consequence: (value) =>
      value === 'object-storage'
        ? 'Scales to any size. Pennies a month.'
        : value === 'persistent-volume'
          ? 'No code changes, but only one copy of your app can run.'
          : 'Nothing is created.'
  },

  'database-engine-ambiguous': {
    summary: (_parameters, chosen) => `Using ${ENGINE_LABELS[chosen] ?? chosen}`,
    detail: (parameters) =>
      `Your code reads ${text(parameters, 'environmentVariableName', 'a database URL')} but never says which database is behind it. This is the one almost everything uses.`,
    option: (value) => ENGINE_LABELS[value] ?? value
  },

  'command-unknown': {
    summary: (parameters, chosen) =>
      `Starting ${text(parameters, 'serviceName', 'your app')} with ${text({ chosen }, 'chosen', chosen)}`,
    detail: () => 'This is the command that runs your app. If you start it differently, change it here.',
    option: (value) => value
  },

  'dockerfile-ownership': {
    summary: (parameters, chosen) =>
      chosen === 'stacktape-packaging'
        ? `Packaging ${text(parameters, 'serviceName', 'your app')} with Stacktape instead of the Dockerfile`
        : `Using your Dockerfile for ${text(parameters, 'serviceName', 'your app')}`,
    detail: () =>
      'Your Dockerfile looks like a standard template, and Stacktape’s own packaging is tuned and kept up to date — so we use that. The Dockerfile stays in your repository untouched; switch back here anytime.',
    option: (value) => (value === 'stacktape-packaging' ? 'Stacktape packaging' : 'Your Dockerfile')
  },

  'schedule-unknown': {
    summary: (parameters, chosen) => `Running ${text(parameters, 'serviceName', 'this job')} on a schedule (${chosen})`,
    detail: () => 'It looks like a scheduled job, but nothing in the code says how often. Daily is the safe guess.',
    option: (value) => value
  },

  'environment-variable-timing': {
    summary: (parameters, chosen) =>
      chosen === 'build-time'
        ? `Baking ${text(parameters, 'environmentVariableName', 'a value')} in when your app is built`
        : `Giving ${text(parameters, 'environmentVariableName', 'a value')} to your app when it starts`,
    detail: (_parameters, chosen) =>
      chosen === 'build-time'
        ? 'Anything a browser can see has to be built into the code. Supplied later, it would just be empty.'
        : 'Server-side values are read when the app starts, which means you can change one without rebuilding.',
    option: (value) => (value === 'build-time' ? 'When the app is built' : 'When the app starts'),
    consequence: (value) =>
      value === 'build-time'
        ? 'For anything the browser reads — NEXT_PUBLIC_, VITE_, and so on.'
        : 'For anything only your server reads.'
  },

  'cross-service-target-unknown': {
    summary: (parameters, chosen) =>
      `Pointing ${text(parameters, 'environmentVariableName', 'this address')} at ${chosen}`,
    detail: () => 'The real address does not exist until it is deployed, so we fill it in for you at that point.',
    option: (value) => value
  },

  'migration-timing-unknown': {
    summary: (_parameters, chosen) =>
      chosen === 'deploy-hook'
        ? 'Running your database migrations on every deploy'
        : chosen === 'service-startup'
          ? 'Leaving migrations to run when your app starts'
          : 'Leaving migrations for you to run',
    detail: () => 'Your project has migrations. They have to run against the database before your app serves traffic.',
    option: (value) =>
      value === 'deploy-hook'
        ? 'As part of each deploy'
        : value === 'service-startup'
          ? 'When the app starts (it already does this)'
          : "I'll run them myself",
    consequence: (value) => (value === 'deploy-hook' ? 'Nothing for you to remember.' : undefined)
  },

  'service-deployment-intent': {
    summary: (parameters, chosen) =>
      chosen === 'deploy'
        ? `Deploying ${text(parameters, 'serviceName', 'this')}`
        : `Leaving ${text(parameters, 'serviceName', 'this')} out`,
    detail: () => 'It can run, but it was not obvious whether it is part of what you want online.',
    option: (value) => (value === 'deploy' ? 'Deploy it' : 'Leave it out')
  },

  'unconfirmed-claim': {
    summary: (parameters) => `Including ${text(parameters, 'claimedValue', 'this')}`,
    detail: (parameters) =>
      `We are fairly sure your project uses ${text(parameters, 'claimedValue', 'this')}, but could not point at a line that proves it. Leaving it in costs a little if we are wrong; taking it out breaks your app if we are right.`,
    option: (value) => (value === 'accept' ? 'Yes, include it' : "No, I don't use that"),
    consequence: (value) => (value === 'accept' ? undefined : 'Nothing is created for it.')
  },

  'conflicting-observation': {
    summary: (parameters, chosen) =>
      `Using ${chosen === 'probe' ? text(parameters, 'probeValue', 'the scanned value') : text(parameters, 'agentValue', 'the reviewed value')} for ${text(parameters, 'field', 'one setting')}`,
    detail: (parameters) =>
      `Two readings of your project disagreed about ${text(parameters, 'field', 'this')}. We went with what the files say directly.`,
    option: (value, parameters) =>
      value === 'probe'
        ? text(parameters, 'probeValue', 'the scanned value')
        : text(parameters, 'agentValue', 'the reviewed value'),
    consequence: (value) =>
      value === 'probe' ? 'Read straight out of your files.' : 'Concluded from reading the surrounding code.'
  },

  'stage-intent': {
    summary: () => 'Set up as one environment you can throw away',
    detail: () => 'You can add more environments later; each one is completely separate.',
    option: (value) => (value === 'trial' ? 'Just trying it out' : 'This is production')
  }
};
