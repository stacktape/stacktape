import { findGroup } from './benchmarks';

type SectionPack = {
  id: 'designs' | 'packages' | 'deploys' | 'monitors' | 'secures' | 'incidents' | 'costs' | 'expert-help';
  name: string;
  title: string;
  /** Backticks mark inline code in the section copy. */
  text: string;
  gets: readonly string[];
};

const { group: deployRun } = findGroup('lambda-deploy', 'handler', 'lambda-25');
const stacktapeDeploy = deployRun.values.find(({ tool }) => tool === 'stacktape');
if (!stacktapeDeploy) throw new Error('Missing Stacktape time for the Lambda deploy benchmark');

/** The default Node.js service image, in whole megabytes, for Stacktape and the larger SST and AWS CDK images. */
const nodeImage = (() => {
  const { group } = findGroup('image-size', 'default-image', 'container-node');
  const megabytes = (tool: string) => {
    const value = group.values.find((candidate) => candidate.tool === tool);
    if (!value) throw new Error(`No image size for ${tool}`);
    return Math.round(value.median);
  };
  const others = [megabytes('sst'), megabytes('cdk')];
  if (others[0] !== others[1]) throw new Error('The Packages point assumes SST and AWS CDK images are the same size');
  return { stacktape: megabytes('stacktape'), others: others[0] };
})();

export const SECTION_PACKS: SectionPack[] = [
  {
    id: 'designs',
    name: 'Designs',
    title: 'Designs the stack your app needs',
    text: 'Stacktape reads your code and picks the AWS resources it needs, from Fargate services to RDS and SQS. Change any default and save it as one YAML or TypeScript file.',
    gets: ['Init can start from your Render Blueprint or Docker Compose file.']
  },
  {
    id: 'packages',
    name: 'Packages',
    title: 'Packages it',
    text: 'Stacktape builds functions and container images in parallel and reuses what hasn’t changed. No Dockerfile needed for Node.js, Python, Go, Java, Ruby, PHP, .NET or Rust.',
    gets: [
      'Python dependencies build in AWS’s build image for your Lambda runtime.',
      `In our benchmark, the default Node.js image was ${nodeImage.stacktape} MB compressed, versus ${nodeImage.others} MB with SST or AWS CDK.`
    ]
  },
  {
    id: 'deploys',
    name: 'Deploys',
    title: 'Deploys it',
    text: `Deploy from your terminal or CI, or push to a connected branch. In our CLI test, 25 updated Lambda handlers were serving requests in ${stacktapeDeploy.median.toFixed(1)} seconds.`,
    gets: [
      'Turn on preview stages for pull requests from branches in your repo.',
      '`stacktape dev` runs containers locally against your AWS dev stack.'
    ]
  },
  {
    id: 'monitors',
    name: 'Monitors',
    title: 'Monitors it',
    text: 'Turn on tracing to see which call failed or took the longest. Traces stay in your AWS account.',
    gets: [
      'Supported Lambda runtimes are instrumented without code changes.',
      'Logs, metrics, errors and multi-region uptime checks are in the same Console.'
    ]
  },
  {
    id: 'secures',
    name: 'Secures',
    title: 'Secures it',
    text: 'The Console flags plain-text secrets, public databases and vulnerable packages, and rechecks packages every night. A guardrail can block a deploy that would make a database public.',
    gets: [
      '`connectTo: [jobQueue]` gives the worker its IAM permissions and the queue URL.',
      'Secrets live in AWS Secrets Manager, referenced with `$Secret()`.'
    ]
  },
  {
    id: 'incidents',
    name: 'Incidents',
    title: 'Handles incidents',
    text: 'Related errors, alarms and failed checks become one incident, tied to the live release. Acknowledge it or roll back from Slack.',
    gets: [
      'Ask an agent to investigate, or to open a fix PR on GitHub that your team reviews.',
      'Connect an Anthropic, OpenAI or xAI key for automatic incident summaries.'
    ]
  },
  {
    id: 'costs',
    name: 'Costs',
    title: 'Tracks costs',
    text: 'See what each project, stage and resource costs, updated daily. Budgets alert on actual or forecast AWS account spend.',
    gets: ['Choose Show drivers on a Slack budget alert to see the five costliest stacks.']
  },
  {
    id: 'expert-help',
    name: 'Help',
    title: 'Talk to us when you get stuck',
    text: 'On Flexible, your team gets a shared Slack channel with the founders. Ask us about networking, IAM or your AWS bill.',
    gets: []
  }
];
