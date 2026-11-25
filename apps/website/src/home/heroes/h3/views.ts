/** The Console screens the hero window switches between. Captured from the real Console with demo data. */
export const VIEWS = [
  {
    key: 'infrastructure',
    label: 'Infrastructure',
    alt: 'The Stacktape Console showing the storefront staging stage as a diagram: CDN, HTTP API, load balancer, containers, Postgres, Redis, DynamoDB and buckets, with the VPC drawn around them.'
  },
  {
    key: 'deploys',
    label: 'Deploys',
    alt: 'A Git push deploy in the Console, updating five of nine staging resources, with build, package and upload timings.'
  },
  {
    key: 'monitoring',
    label: 'Monitoring',
    alt: 'Uptime checks in the Console: one check down, with availability, latency and the last 24 hours for each.'
  },
  {
    key: 'incidents',
    label: 'Incidents',
    alt: 'The incident list in the Console: four active incidents with their severity, failing signals, stage and status.'
  },
  {
    key: 'security',
    label: 'Security',
    alt: 'The Console security overview: findings across stacks, sorted by severity, with where each one is.'
  },
  {
    key: 'costs',
    label: 'Costs',
    alt: 'Costs in the Console for the orders-platform production stage: $96.00 so far this month, split by resource, from the HTTP API to each Lambda function.'
  }
] as const;
