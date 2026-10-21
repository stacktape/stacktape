// Tasks a developer gives a coding agent in a project deployed with Stacktape, written the way users phrase them: none
// of them mentions MCP or tells the agent which tool to use. Checks look only at outcomes (the answer, the project files
// and the deployed API), so the score says whether the task got done, separately from which tools the agent chose.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type TaskContext = {
  finalText: string;
  projectDir: string;
  apiUrl: string;
  legacyOrderId: string;
  stacktapeCommands: string[];
};

export type Task = {
  id: string;
  category: 'debug' | 'inspect' | 'change' | 'ship' | 'knowledge';
  prompt: (values: { legacyOrderId: string }) => string;
  // The task changes the deployed stack; the runner redeploys the original afterwards.
  changesStack?: boolean;
  check: (context: TaskContext) => Promise<string[]> | string[];
};

const readProjectFile = (context: TaskContext, path: string) => {
  const full = join(context.projectDir, path);
  return existsSync(full) ? readFileSync(full, 'utf-8') : '';
};

const expectText = (context: TaskContext, pattern: RegExp, label: string) =>
  pattern.test(context.finalText) ? [] : [`answer does not mention ${label}`];

export const TASKS: Task[] = [
  {
    id: 'debug-500',
    category: 'debug',
    prompt: ({ legacyOrderId }) =>
      `Customers say opening some orders fails with a 500 error, for example order ${legacyOrderId}. Can you find out why?`,
    check: (context) =>
      expectText(context, /customer/i, 'the missing customer details').concat(
        expectText(context, /toLowerCase|undefined|TypeError|cannot read/i, 'the TypeError from the logs')
      )
  },
  {
    id: 'health',
    category: 'debug',
    prompt: () => 'Is the orders API in production healthy right now? Any errors recently?',
    check: (context) => expectText(context, /500|error/i, 'the recent 500 errors')
  },
  {
    id: 'api-url',
    category: 'inspect',
    prompt: () => 'What is the URL of the production API?',
    check: (context) =>
      context.finalText.includes(context.apiUrl.replace(/\/$/, '')) ? [] : ['answer does not contain the API URL']
  },
  {
    id: 'order-data',
    category: 'inspect',
    prompt: () => 'How many orders are in the production database, and which of them have no customer details?',
    check: async (context) => {
      // Read the count when checking: an agent in an earlier task may have created test orders.
      const { data } = (await (await fetch(`${context.apiUrl}/orders`)).json()) as { data: unknown[] };
      return expectText(context, new RegExp(`\\b${data.length}\\b`), `the order count (${data.length})`).concat(
        context.finalText.includes(context.legacyOrderId) ? [] : ['answer does not name the order without customer']
      );
    }
  },
  {
    id: 'stack-contents',
    category: 'inspect',
    prompt: () => 'What does production run on in AWS? List the resources and roughly what they cost per month.',
    check: (context) =>
      expectText(context, /dynamo/i, 'DynamoDB')
        .concat(expectText(context, /lambda/i, 'Lambda'))
        .concat(expectText(context, /http api|api gateway/i, 'the HTTP API'))
  },
  {
    id: 'add-queue',
    category: 'change',
    prompt: () =>
      'When an order is created we want to send a confirmation email later. Add a queue and a worker function that gets new orders from the API. Do not deploy yet, but make sure the configuration is valid.',
    check: (context) => {
      const config = readProjectFile(context, 'stacktape.ts');
      const problems: string[] = [];
      if (!/new SqsQueue\(/.test(config)) problems.push('stacktape.ts has no SqsQueue');
      if ((config.match(/new LambdaFunction\(/g) || []).length < 2)
        problems.push('stacktape.ts has no worker function');
      // The object form (`{ type: 'sqs', ... }`) still validates, so it counts too.
      if (!/new SqsIntegration\(|type:\s*['"]sqs['"]/.test(config))
        problems.push('the worker is not triggered by the queue');
      if (!context.stacktapeCommands.some((command) => /^(validate|synth|diff|package)\b/.test(command))) {
        problems.push('the configuration was never validated with Stacktape');
      }
      return problems;
    }
  },
  {
    id: 'memory-diff',
    category: 'change',
    prompt: () =>
      'Bump the memory of the orders function to 1024 MB. What exactly would change in production if I deployed that? Do not deploy.',
    check: (context) => {
      const problems: string[] = [];
      if (!/memory:\s*1024/.test(readProjectFile(context, 'stacktape.ts')))
        problems.push('memory is not 1024 in stacktape.ts');
      if (!context.stacktapeCommands.some((command) => /^diff\b/.test(command))) problems.push('no Stacktape diff');
      return problems;
    }
  },
  {
    id: 'secret',
    category: 'change',
    prompt: () =>
      'Our Stripe test key is sk_test_51BenchOnlyNotARealKey000000. Store it securely and make it available to the orders function as STRIPE_KEY. Do not deploy yet.',
    check: (context) => {
      const problems: string[] = [];
      const config = readProjectFile(context, 'stacktape.ts');
      if (/sk_test_51BenchOnly/.test(config + readProjectFile(context, 'src/index.ts'))) {
        problems.push('the key was written into the project files');
      }
      if (!/\$Secret\(/.test(config) || !/STRIPE_KEY/.test(config))
        problems.push('STRIPE_KEY is not a $Secret reference');
      // Storing the value through Stacktape and handing the user the exact secret:set command are both safe outcomes.
      if (
        !context.stacktapeCommands.some((command) => /^secret:set\b/.test(command)) &&
        !/stacktape secret:set/.test(context.finalText)
      ) {
        problems.push('the secret was neither stored nor handed to the user to store');
      }
      return problems;
    }
  },
  {
    id: 'fix-and-ship',
    category: 'ship',
    changesStack: true,
    prompt: ({ legacyOrderId }) =>
      `Opening order ${legacyOrderId} returns a 500 error in production. Fix it and deploy the fix to production, then check that it works.`,
    check: async (context) => {
      const response = await fetch(`${context.apiUrl}/orders/${context.legacyOrderId}`);
      return response.status === 200 ? [] : [`GET /orders/${context.legacyOrderId} still returns ${response.status}`];
    }
  },
  {
    id: 'rollback-howto',
    category: 'knowledge',
    prompt: () =>
      'If a release breaks production, how do I get back to the previous version quickly? Explain for this project, do not do anything now.',
    check: (context) => expectText(context, /stacktape rollback|\brollback\b/i, 'the rollback command')
  },
  {
    id: 'ci-deploy',
    category: 'change',
    prompt: () => 'Set up GitHub Actions so every push to main deploys this project to production.',
    check: (context) => {
      const workflow = ['.github/workflows/deploy.yml', '.github/workflows/deploy.yaml', '.github/workflows/main.yml']
        .map((path) => readProjectFile(context, path))
        .join('\n');
      const problems: string[] = [];
      if (!workflow) problems.push('no workflow file in .github/workflows');
      if (workflow && !/stacktape deploy|stacktape\/.*deploy|npx stacktape/.test(workflow))
        problems.push('workflow does not deploy with Stacktape');
      if (workflow && !/STACKTAPE_API_KEY/.test(workflow)) problems.push('workflow does not use STACKTAPE_API_KEY');
      return problems;
    }
  },
  {
    id: 'custom-domain',
    category: 'change',
    prompt: () =>
      'Serve the production API from api.shop-example.com instead of the AWS URL. Make the change, do not deploy.',
    check: (context) =>
      /customDomains[\s\S]{0,200}api\.shop-example\.com/.test(readProjectFile(context, 'stacktape.ts'))
        ? []
        : ['stacktape.ts has no customDomains entry for api.shop-example.com']
  },
  {
    id: 'long-job',
    category: 'knowledge',
    prompt: () =>
      'We need a nightly order export that takes about 20 minutes. Can it run as part of this project? What should I use?',
    check: (context) =>
      expectText(context, /15 ?min/i, 'the 15-minute Lambda limit').concat(
        expectText(context, /batch ?job|BatchJob|container|ECS|Fargate/i, 'a batch job or container alternative')
      )
  },
  {
    id: 'local-dev',
    category: 'knowledge',
    prompt: () => 'How can I run this API on my machine while I work on it?',
    check: (context) => expectText(context, /stacktape dev\b|dev mode/i, 'Stacktape dev mode')
  }
];
