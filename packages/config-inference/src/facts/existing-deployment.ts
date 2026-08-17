/**
 * Which deployment configuration this project carries, whether or not it has been applied.
 *
 * A repository with `serverless.yml`, `*.tf` or `sst.config.ts` may already have infrastructure
 * managed elsewhere. The file cannot prove it was applied, but writing a separate Stacktape config
 * silently is how a tool lets a user discover a second production copy from the bill.
 *
 * So this is recorded as a fact with evidence, exactly like a database or a service. Three things
 * downstream want it, in increasing order of ambition:
 *
 * 1. **Saying so.** The wizard tells the user what it found and that we do not touch it. Cheap, and
 *    it is the difference between a tool that noticed and a tool that did not.
 * 2. **Reading it.** A `Procfile` states the start command without proving any platform. A `fly.toml`
 *    states Fly-specific deployment settings. Both remove questions without claiming runtime state.
 * 3. **Pointing at it.** The resources these tools manage are the ones an `adopt` flow would wire a
 *    new stack into rather than duplicate. That needs its own design; this is the input to it.
 *
 * `managesAws` is the distinction that matters for (3): Terraform and CDK create AWS resources that
 * could be pointed at, while Vercel and Fly do not, so only the first group is interesting to a
 * takeover. Both groups are interesting for (1) and (2).
 */

import { z } from 'zod';
import { citationSchema, factSourceSchema } from './citation';

export const deploymentToolSchema = z.enum([
  // Infrastructure-as-code that creates AWS resources.
  'serverless-framework',
  'sst',
  'terraform',
  'aws-cdk',
  'aws-sam',
  'pulumi',
  // Platforms that run the application somewhere that is not the user's AWS account.
  'heroku',
  'render',
  'fly',
  'vercel',
  'netlify',
  'railway',
  // Container orchestration, which may be anywhere.
  'kubernetes'
]);

export type DeploymentTool = z.infer<typeof deploymentToolSchema>;

/** The tools whose resources live in the user's own AWS account, and could therefore be pointed at. */
export const AWS_DEPLOYMENT_TOOLS: ReadonlySet<DeploymentTool> = new Set([
  'serverless-framework',
  'sst',
  'terraform',
  'aws-cdk',
  'aws-sam',
  'pulumi'
]);

export const existingDeploymentSchema = z.object({
  tool: deploymentToolSchema,
  /**
   * Whether this tool manages resources in the user's AWS account.
   *
   * Stored rather than derived from `tool` because it is not always a property of the tool: Pulumi
   * and Terraform deploy to any cloud, and a repository's `*.tf` may not touch AWS at all. A probe
   * that can see the provider block should say so; one that cannot may fall back to the set above.
   */
  managesAws: z.boolean(),
  evidence: z.array(citationSchema).default([]),
  source: factSourceSchema
});

export type ExistingDeploymentFact = z.infer<typeof existingDeploymentSchema>;

/** How the tool is named when we say it out loud, which is not always how its files are named. */
export const DEPLOYMENT_TOOL_LABELS: Record<DeploymentTool, string> = {
  'serverless-framework': 'the Serverless Framework',
  sst: 'SST',
  terraform: 'Terraform',
  'aws-cdk': 'the AWS CDK',
  'aws-sam': 'AWS SAM',
  pulumi: 'Pulumi',
  heroku: 'Heroku',
  render: 'Render',
  fly: 'Fly.io',
  vercel: 'Vercel',
  netlify: 'Netlify',
  railway: 'Railway',
  kubernetes: 'Kubernetes'
};
