/** The Console screens behind the hero's tabs, captured from the real Console with demo data. */
export const SCREENS = [
  {
    file: 'infrastructure',
    tab: 'Infrastructure',
    description:
      'The Stacktape Console showing the storefront staging stage as a diagram: CDN, HTTP API, load balancer, containers, Postgres, Redis, DynamoDB and buckets, with the VPC drawn around them.'
  },
  {
    file: 'deploys',
    tab: 'Deploys',
    description:
      'A Git push deploy in the Console, updating five of nine staging resources, with build, package and upload timings.'
  },
  {
    file: 'monitoring',
    tab: 'Monitoring',
    description:
      'Uptime checks in the Console: one check down, with availability, latency and the last 24 hours for each.'
  },
  {
    file: 'incidents',
    tab: 'Incidents',
    description:
      'The incident list in the Console: four active incidents with their severity, failing signals, stage and status.'
  },
  {
    file: 'security',
    tab: 'Security',
    description: 'The Console security overview: findings across stacks, sorted by severity, with where each one is.'
  },
  {
    file: 'costs',
    tab: 'Costs',
    description:
      'Costs in the Console for the orders-platform production stage: $96.00 so far this month, split by resource, from the HTTP API to each Lambda function.'
  }
] as const;
