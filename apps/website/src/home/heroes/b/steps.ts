import type { ImageMetadata } from 'astro';
import { type Bar, bars } from './bench';
import accessLarge from './shots/access-2880.webp';
import accessSmall from './shots/access-1440.webp';
import budgetLarge from './shots/budget-2880.webp';
import budgetSmall from './shots/budget-1440.webp';
import incidentsLarge from './shots/incidents-2880.webp';
import incidentsSmall from './shots/incidents-1440.webp';
import errorsLarge from './shots/errors-2880.webp';
import errorsSmall from './shots/errors-1440.webp';
import reviewPhoneLarge from './shots/review-phone-810.webp';
import reviewPhoneSmall from './shots/review-phone-405.webp';
import reviewLarge from './shots/review-2880.webp';
import reviewSmall from './shots/review-1440.webp';

/**
 * The eight capabilities, in the order one app meets them: from the first command in the repository to the
 * first incident and the first bill. `when` is the moment in that app's life, not a measured time.
 *
 * The screens are examples from different demo projects, and the window bars say which. They are overview screens
 * on purpose: the home page sections (section packs, structure b) show a different task for the same step.
 */
export type Step = {
  id: string;
  name: string;
  when: string;
  /** Where the step happens, shown in the picture's title bar. */
  where: string;
  title: string;
  line: string;
  /** The line quotes a benchmark figure, so the caption links to the run. */
  bench?: boolean;
  shot?: {
    small: ImageMetadata;
    large: ImageMetadata;
    alt: string;
    /** A crop that stays readable on a phone. */
    phone?: { small: ImageMetadata; large: ImageMetadata };
  };
  /** A benchmark shown instead of a screenshot: the demo data's own build and deploy times are not realistic. */
  race?: { title: string; detail: string; bars: Bar[] };
};

export const STEPS: Step[] = [
  {
    id: 'designs',
    name: 'Design',
    when: 'First command',
    where: 'Example: saas-starter  ·  init wizard in your browser',
    title: 'It starts from your code',
    line: 'Stacktape reads your repo and proposes each AWS resource, with the code line behind it and its estimated monthly cost.',
    shot: {
      small: reviewSmall,
      large: reviewLarge,
      phone: { small: reviewPhoneSmall, large: reviewPhoneLarge },
      alt: 'The init wizard’s Review: a diagram of a Next.js site and its Postgres database, a $32 a month estimate and the generated stacktape.yml.'
    }
  },
  {
    id: 'packages',
    name: 'Package',
    when: 'First push',
    where: 'deploy benchmarks  ·  packaging',
    title: '25 functions packaged in 3.8 seconds',
    line: 'Parallel builds made for Lambda. Python, Go, Java, Ruby, .NET and Rust need no Dockerfile.',
    bench: true,
    race: {
      title: 'Package 25 Lambda functions',
      detail: 'Empty build cache, median of 10 runs',
      bars: bars('packaging', 'empty-cache', 'lambda-25')
    }
  },
  {
    id: 'deploys',
    name: 'Deploy',
    when: 'Seconds later',
    where: 'deploy benchmarks  ·  Lambda deploy',
    title: 'Push, and it’s live',
    line: 'A change to one Lambda function is live in 10.7 seconds. Pull requests can get their own preview stage.',
    bench: true,
    race: {
      title: 'Deploy a code change to one Lambda function',
      detail: 'Until the new code answers, median of 10 runs',
      bars: bars('lambda-deploy', 'handler', 'lambda-1')
    }
  },
  {
    id: 'secures',
    name: 'Secure',
    when: 'Before anything changes',
    where: 'Example: checkout-api  ·  production diagram, access layer',
    title: 'Safe defaults, and rules you set',
    line: 'Each workload gets only the access it needs. Guardrails stop a public database or a wrong region before deploy.',
    shot: {
      small: accessSmall,
      large: accessLarge,
      alt: 'The access layer of checkout-api’s production diagram: the public HTTP API, its function, and a Postgres database marked “Open to the internet” and “Security risk”.'
    }
  },
  {
    id: 'monitors',
    name: 'Monitor',
    when: 'From then on',
    where: 'Example: Northwind Labs  ·  error tracking',
    title: 'Monitoring comes with the stack',
    line: 'Logs and metrics work from the first deploy, and with the Console error tracking is on by default. Tracing is one config property, uptime checks need a URL and browser tests your script. No extra vendor.',
    shot: {
      small: errorsSmall,
      large: errorsLarge,
      alt: 'Grouped application errors in the Console, with how often each happens and where.'
    }
  },
  {
    id: 'incidents',
    name: 'Incident',
    when: 'When it breaks',
    where: 'Example: Northwind Labs  ·  incidents',
    title: 'One incident per problem, handled from Slack',
    line: 'Related errors, alarms and failed checks become one incident. Acknowledge, mute or roll back from Slack.',
    shot: {
      small: incidentsSmall,
      large: incidentsLarge,
      alt: 'The Console’s incident list: API error rate above 5% on checkout-api production with 5 failing signals, a function running too long, an expiring TLS certificate and an uptime check that stopped reporting.'
    }
  },
  {
    id: 'costs',
    name: 'Costs',
    when: 'End of the month',
    where: 'Example: checkout-api  ·  production budget',
    title: 'See what every stage costs',
    line: 'Your AWS spend per project, stage and resource, updated daily. Budgets alert before the bill does.',
    shot: {
      small: budgetSmall,
      large: budgetLarge,
      alt: 'A production budget in the Console: $60.45 of a $60.00 limit, with the alerts it sent at 80%, on a forecast and over the limit. It alerts; nothing stops.'
    }
  },
  {
    id: 'expert-help',
    name: 'Help',
    when: 'When you’re stuck',
    where: 'Support by plan',
    title: 'Engineers, not a ticket queue',
    line: 'On Flexible, you get a shared Slack channel with the founders who build Stacktape.'
  }
];
