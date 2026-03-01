import color from 'picocolors';
import stripAnsi from 'strip-ansi';

export const TODO_ENV_VAR_PLACEHOLDER = 'TODO_SET_VALUE';

export const formatPrice = (price: number): string => {
  if (price < 0.01) return color.green('<$0.01');
  if (price < 1) return color.green(`$${price.toFixed(2)}`);
  return color.yellow(`$${price.toFixed(2)}`);
};

export const getResourceCostLabel = (costInfo?: {
  priceInfo: { totalMonthlyFlat: number; costBreakdown: any[] };
}): string => {
  if (!costInfo) return color.dim('-');
  const monthly = costInfo.priceInfo.totalMonthlyFlat;
  if (monthly > 0) return `~${formatPrice(monthly)}/mo`;
  const hasPayPerUse = costInfo.priceInfo.costBreakdown.some((item: any) => item.priceModel === 'pay-per-use');
  if (hasPayPerUse) return color.dim('pay-per-use');
  return color.dim('-');
};

export const formatResourceType = (type: string, resource?: any): string => {
  if (type === 'relational-database') {
    const engineType = resource?.properties?.engine?.type;
    if (engineType?.includes('postgres')) return 'Relational database (Postgres)';
    if (engineType?.includes('mysql')) return 'Relational database (MySQL)';
    return 'Relational database';
  }

  if (type === 'hosting-bucket') {
    const contentType = resource?.properties?.hostingContentType;
    if (contentType === 'single-page-app') return 'Hosting bucket (SPA)';
    if (contentType === 'gatsby-static-website') return 'Hosting bucket (Gatsby)';
    if (contentType === 'static-website') return 'Hosting bucket (Static)';
    return 'Hosting bucket';
  }

  const typeLabels: Record<string, string> = {
    'web-service': 'Web service',
    'worker-service': 'Worker service',
    function: 'Function',
    'nextjs-web': 'Next.js web',
    'astro-web': 'Astro web',
    'nuxt-web': 'Nuxt web',
    'sveltekit-web': 'SvelteKit web',
    'solidstart-web': 'SolidStart web',
    'tanstack-web': 'TanStack web',
    'remix-web': 'Remix web',
    'redis-cluster': 'Redis cluster',
    'dynamo-db-table': 'DynamoDB table',
    'mongo-db-atlas-cluster': 'MongoDB Atlas cluster',
    'open-search-domain': 'OpenSearch domain',
    bucket: 'S3 bucket',
    'sqs-queue': 'SQS queue',
    'sns-topic': 'SNS topic',
    bastion: 'Bastion',
    'web-app-firewall': 'Web application firewall',
    'http-api-gateway': 'HTTP API Gateway'
  };

  return typeLabels[type] || type;
};

export const appendResourceRows = ({
  lines,
  heading,
  rows,
  hasCosts,
  makeBold
}: {
  lines: string[];
  heading: string;
  rows: { name: string; type: string; cost: string }[];
  hasCosts: boolean;
  makeBold: (value: string) => string;
}) => {
  if (!rows.length) return;
  lines.push(makeBold(heading));
  const nameWidth = Math.max(...rows.map((row) => stripAnsi(row.name).length));
  const typeWidth = Math.max(...rows.map((row) => stripAnsi(row.type).length));
  for (const row of rows) {
    const namePad = ' '.repeat(Math.max(0, nameWidth - stripAnsi(row.name).length));
    const typePad = ' '.repeat(Math.max(0, typeWidth - stripAnsi(row.type).length));
    const line = hasCosts
      ? `  ${makeBold(row.name)}${namePad}  ${row.type}${typePad}  ${row.cost}`
      : `  ${makeBold(row.name)}${namePad}  ${row.type}`;
    lines.push(line);
  }
};

export const countUnsetEnvVarsInConfig = (config: StacktapeConfig): number => {
  let count = 0;
  const resources = config.resources || {};
  for (const resource of Object.values(resources)) {
    const env = (resource as any)?.environment;
    if (!env || typeof env !== 'object') continue;
    for (const value of Object.values(env)) {
      if (value === TODO_ENV_VAR_PLACEHOLDER) {
        count++;
      }
    }
  }
  return count;
};

export const summarizeDeployableUnits = (units: { type: string }[]): string[] => {
  const labels: Record<string, string> = {
    'static-website': 'static website',
    'web-service': 'web service',
    'worker-service': 'worker service',
    'lambda-function': 'lambda function',
    'next-js-app': 'Next.js app',
    'astro-app': 'Astro app',
    'nuxt-app': 'Nuxt app',
    'sveltekit-app': 'SvelteKit app',
    'solidstart-app': 'SolidStart app',
    'tanstack-app': 'TanStack app',
    'remix-app': 'Remix app'
  };

  const counts = new Map<string, number>();
  for (const unit of units) {
    counts.set(unit.type, (counts.get(unit.type) || 0) + 1);
  }

  return Array.from(counts.entries()).map(([type, count]) => {
    const label = labels[type] || type;
    return `${count} ${label}${count > 1 ? 's' : ''}`;
  });
};
