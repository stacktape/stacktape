import type { ImageMetadata } from 'astro';
import costs from './shots/costs-by-stage-tape.png';
import deploys from './shots/deploys-finished-tape.png';
import designs from './shots/designs-review-wizard.png';
import incidents from './shots/incidents-assessment-tape.png';
import monitors from './shots/monitors-error-tracking-tape.png';
import packages from './shots/packages-build-and-package-tape.png';
import secures from './shots/secures-guardrails-tape.png';

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
  shot?: { src: ImageMetadata; alt: string };
};

export const STEPS: Step[] = [
  {
    id: 'design',
    name: 'Design',
    when: 'First command',
    where: 'stacktape init  ·  wizard in your browser',
    problem: 'Nobody on the team knows which AWS services the app needs, or what they will cost.',
    title: 'It starts from your code',
    line: 'Stacktape reads your repo and proposes each AWS resource, with the code line behind it and its monthly cost.',
    shot: {
      src: designs,
      alt: 'The init wizard’s Review: a diagram of a Next.js site and its Postgres database, a $32 a month estimate and the generated stacktape.yml.'
    }
  },
  {
    id: 'package',
    name: 'Package',
    when: 'First push',
    where: 'console.stacktape.com  ·  staging deploy',
    problem: 'AWS CDK, SST and Serverless take 17.6 to 28.4 seconds to package 25 Lambda functions.',
    title: '25 functions packaged in 3.8 seconds',
    line: 'Parallel builds made for Lambda. Python, Go, Java, Ruby, .NET and Rust need no Dockerfile.',
    bench: true,
    shot: {
      src: packages,
      alt: 'A staging deploy in the Console with its Build and package step open, listing each packaged Lambda function.'
    }
  },
  {
    id: 'deploy',
    name: 'Deploy',
    when: 'Seconds later',
    where: 'console.stacktape.com  ·  production deploy',
    problem: 'With AWS CDK, a code change to 25 Lambda functions takes over a minute to go live.',
    title: 'Push, and it’s live',
    line: 'A change to one Lambda function is live in 10.7 seconds. Every pull request can get its own preview.',
    bench: true,
    shot: {
      src: deploys,
      alt: 'A finished production deploy in the Console, with its steps, durations, commit and release.'
    }
  },
  {
    id: 'secure',
    name: 'Secure',
    when: 'Before anything changes',
    where: 'console.stacktape.com  ·  guardrails',
    problem: 'One wrong setting can leave a database open to the internet.',
    title: 'Safe defaults, and rules you set',
    line: 'Each workload gets only the access it needs. Guardrails stop a public database or a wrong region before deploy.',
    shot: {
      src: secures,
      alt: 'The Console’s guardrails page with organization rules and how each one is enforced.'
    }
  },
  {
    id: 'monitor',
    name: 'Monitor',
    when: 'From then on',
    where: 'console.stacktape.com  ·  errors',
    problem: 'Logs, errors and uptime checks usually mean another vendor to buy and wire up.',
    title: 'Monitoring is already set up',
    line: 'Logs, metrics, traces, errors, uptime checks and browser tests come with the stack. No extra vendor.',
    shot: {
      src: monitors,
      alt: 'Grouped application errors in the Console, with how often each happens and where.'
    }
  },
  {
    id: 'incident',
    name: 'Incident',
    when: 'When it breaks',
    where: 'console.stacktape.com  ·  incident',
    problem: 'When something breaks, one problem arrives as a dozen separate alerts.',
    title: 'One incident per problem, handled from Slack',
    line: 'Related errors, alarms and failed checks become one incident. Acknowledge, mute or roll back from Slack.',
    shot: {
      src: incidents,
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
      src: costs,
      alt: 'Monthly spend in the Console for one project, with a projection and a breakdown by stage.'
    }
  },
  {
    id: 'help',
    name: 'Help',
    when: 'When you’re stuck',
    where: 'Slack  #stacktape-shared',
    problem: 'A ticket queue doesn’t know how your stack is built.',
    title: 'Engineers, not a ticket queue',
    line: 'On Flexible, you get a shared Slack channel with the founders who build Stacktape.'
  }
];
