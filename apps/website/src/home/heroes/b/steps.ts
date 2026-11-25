import type { ImageMetadata } from 'astro';
import { type Bar, bars } from './bench';
import costsLarge from './shots/costs-2880.webp';
import costsSmall from './shots/costs-1440.webp';
import guardrailsLarge from './shots/guardrails-2880.webp';
import guardrailsSmall from './shots/guardrails-1440.webp';
import incidentLarge from './shots/incident-2880.webp';
import incidentSmall from './shots/incident-1440.webp';
import errorsLarge from './shots/errors-2880.webp';
import errorsSmall from './shots/errors-1440.webp';
import reviewPhoneLarge from './shots/review-phone-810.webp';
import reviewPhoneSmall from './shots/review-phone-405.webp';
import reviewLarge from './shots/review-2880.webp';
import reviewSmall from './shots/review-1440.webp';

/**
 * The eight capabilities, in the order one app meets them: from the first command in the repository to the
 * first incident and the first bill. `when` is the moment in that app's life, not a measured time.
 */
export type Step = {
  id: string;
  name: string;
  when: string;
  /** Where the step happens, shown in the picture's title bar. */
  where: string;
  /** The problem the step removes; each section opens with it. */
  problem: string;
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
    where: 'stacktape init  ·  wizard in your browser',
    problem: 'Nobody on the team knows which AWS services the app needs, or what they will cost.',
    title: 'It starts from your code',
    line: 'Stacktape reads your repo and proposes each AWS resource, with the code line behind it and its monthly cost.',
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
    problem:
      'From an empty build cache, AWS CDK, SST and Serverless take 17.6 to 28.4 seconds to package 25 Lambda functions.',
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
    problem: 'With AWS CDK, a code change to 25 Lambda functions takes over a minute to go live.',
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
    where: 'console.stacktape.com  ·  guardrails',
    problem: 'One wrong setting can leave a database open to the internet.',
    title: 'Safe defaults, and rules you set',
    line: 'Each workload gets only the access it needs. Guardrails stop a public database or a wrong region before deploy.',
    shot: {
      small: guardrailsSmall,
      large: guardrailsLarge,
      alt: 'The Console’s guardrails page with organization rules and how each one is enforced.'
    }
  },
  {
    id: 'monitors',
    name: 'Monitor',
    when: 'From then on',
    where: 'console.stacktape.com  ·  errors',
    problem: 'Logs, errors and uptime checks usually mean another vendor to buy and wire up.',
    title: 'Monitoring comes with the stack',
    line: 'Logs, metrics and error tracking work from the first deploy. Tracing is one config property, uptime checks need a URL and browser tests your script. No extra vendor.',
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
    where: 'console.stacktape.com  ·  incident',
    problem: 'When something breaks, one problem arrives as a dozen separate alerts.',
    title: 'One incident per problem, handled from Slack',
    line: 'Related errors, alarms and failed checks become one incident. Acknowledge, mute or roll back from Slack.',
    shot: {
      small: incidentSmall,
      large: incidentLarge,
      alt: 'An incident in the Console: API error rate above 5%, with an AI assessment and a draft fix opened as a pull request.'
    }
  },
  {
    id: 'costs',
    name: 'Costs',
    when: 'End of the month',
    where: 'console.stacktape.com  ·  costs',
    problem: 'The AWS bill arrives once a month, as one number for everything.',
    title: 'See what every stage costs',
    line: 'Your AWS spend per project, stage and resource, updated daily. Budgets alert before the bill does.',
    shot: {
      small: costsSmall,
      large: costsLarge,
      alt: 'Monthly spend in the Console for one project, with a projection and a breakdown by stage.'
    }
  },
  {
    id: 'expert-help',
    name: 'Help',
    when: 'When you’re stuck',
    where: 'Slack  #stacktape-shared',
    problem: 'A ticket queue doesn’t know how your stack is built.',
    title: 'Engineers, not a ticket queue',
    line: 'On Flexible, you get a shared Slack channel with the founders who build Stacktape.'
  }
];
