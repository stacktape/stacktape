/** The Console screens behind the hero's tabs: the real Console's pages, rebuilt in HTML with `acme-shop`'s data. */
export const SCREENS = [
  {
    file: 'infrastructure',
    tab: 'Infrastructure',
    description:
      'The Stacktape Console showing the production stage of acme-shop: the deployed version, requests, failures and latency for the last 24 hours, and its six resources: the website, the API service, the worker, the job queue, the Postgres database and Redis, each with its cost this month.'
  },
  {
    file: 'deploys',
    tab: 'Deploys',
    description:
      'A deploy of acme-shop to production in the Console: started by a push to main, built, packaged, uploaded and deployed in 2 minutes 38 seconds, with the API image it changed.'
  },
  {
    file: 'monitoring',
    tab: 'Monitoring',
    description:
      'Uptime checks in the Console: all four checks of acme-shop up, the API down for five minutes three hours ago, and a warning that the TLS certificate expires in 14 days.'
  },
  {
    file: 'incidents',
    tab: 'Incidents',
    description:
      'The incident list in the Console: an open warning about an expiring certificate, and three resolved incidents, including an API error rate above 5 % fixed by the next deploy.'
  },
  {
    file: 'security',
    tab: 'Security',
    description:
      'The Console security overview for acme-shop: two high findings to fix now with the package upgrade that fixes each, and two smaller findings on the staging stage.'
  },
  {
    file: 'costs',
    tab: 'Costs',
    description:
      'Costs in the Console for acme-shop production: $286.40 so far in November, split by resource, from the API service and the database to the job queue.'
  }
] as const;
