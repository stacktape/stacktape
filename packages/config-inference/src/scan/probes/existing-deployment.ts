/**
 * What already deploys this project.
 *
 * Every other probe answers "what does this application need". This one answers "who is already
 * running it", and the two lead somewhere different. A repository with `serverless.yml` in it is not
 * a blank slate: there is a stack in an AWS account somewhere, it has a database in it, and the
 * person running `stacktape init` knows that even if we pretend not to.
 *
 * The detection is deliberately conservative. A file's presence is only evidence when that file
 * means one thing — `sst.config.ts` does, `template.yaml` and `app.yaml` do not, so the ambiguous
 * ones have to prove themselves from their contents before they count. A false positive here is
 * worse than a miss: telling somebody we found their Terraform when we found a `.tf` file belonging
 * to a tutorial they never ran is the kind of wrongness that makes the rest of the output suspect.
 */

import {
  AWS_DEPLOYMENT_TOOLS,
  type DeploymentTool,
  type ExistingDeploymentFact
} from '../../facts/existing-deployment';
import { citeLine, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

/** Files whose presence, on its own, identifies the tool that owns this repository's deployment. */
const UNAMBIGUOUS_FILES: ReadonlyArray<{ files: readonly string[]; tool: DeploymentTool }> = [
  {
    files: ['serverless.yml', 'serverless.yaml', 'serverless.ts', 'serverless.js'],
    tool: 'serverless-framework'
  },
  { files: ['sst.config.ts', 'sst.config.js', 'sst.json'], tool: 'sst' },
  { files: ['cdk.json'], tool: 'aws-cdk' },
  { files: ['Pulumi.yaml', 'Pulumi.yml'], tool: 'pulumi' },
  { files: ['samconfig.toml', 'samconfig.yaml'], tool: 'aws-sam' },
  { files: ['Procfile'], tool: 'heroku' },
  { files: ['render.yaml', 'render.yml'], tool: 'render' },
  { files: ['fly.toml'], tool: 'fly' },
  { files: ['vercel.json'], tool: 'vercel' },
  { files: ['netlify.toml'], tool: 'netlify' },
  { files: ['railway.json', 'railway.toml'], tool: 'railway' },
  { files: ['Chart.yaml', 'kustomization.yaml', 'kustomization.yml'], tool: 'kubernetes' }
];

/**
 * Files that need their contents read before they count.
 *
 * `template.yaml` is the most common filename in the world; only the CloudFormation marker inside
 * makes it a deployment. The same reasoning applies to a `*.tf` that configures a provider we do not
 * care about.
 */
const CONFIRMED_BY_CONTENTS: ReadonlyArray<{
  files: readonly string[];
  pattern: RegExp;
  tool: DeploymentTool;
}> = [
  {
    files: ['template.yaml', 'template.yml'],
    pattern: /^(AWSTemplateFormatVersion|Transform:\s*AWS::Serverless)/m,
    tool: 'aws-sam'
  }
];

/** Where a project keeps Terraform, so a stray `.tf` in a fixtures directory does not count. */
const isTerraformFile = (path: string): boolean => {
  if (!path.endsWith('.tf') && !path.endsWith('.tf.json')) return false;
  const directory = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
  return (
    directory === '' ||
    directory === 'infra' ||
    directory === 'infrastructure' ||
    directory === 'terraform' ||
    directory === 'deploy' ||
    directory.startsWith('terraform/') ||
    directory.startsWith('infra/') ||
    directory.startsWith('infrastructure/')
  );
};

/**
 * Does this Terraform, or Pulumi, actually point at AWS?
 *
 * No word-boundary anchors. The alternative that matters most ends in a double quote, and a word
 * boundary after a quote requires a word character next — the next character is a space, so the
 * anchor made the one pattern this function exists for unmatchable.
 */
const MENTIONS_AWS = /provider\s+"aws"|hashicorp\/aws|@pulumi\/aws|pulumi_aws|aws:region/;

/**
 * Whether any of these files says this project targets AWS.
 *
 * Reads a bounded sample rather than everything: eight files is plenty to find a provider block, and
 * a large infrastructure repository has hundreds.
 */
const anyMentionsAws = async (context: ProbeContext, candidates: readonly string[]): Promise<boolean> => {
  const sampled = await Promise.all(candidates.slice(0, 8).map(async (file) => readText(context, file)));
  return sampled.some((contents) => contents !== undefined && MENTIONS_AWS.test(contents));
};

export const existingDeploymentProbe: Probe = {
  name: 'existing-deployment',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const has = (name: string): boolean => context.files.includes(name);

    // Which files to look at is decided first, and entirely from the file list, so the reads that
    // follow can all happen at once.
    const candidates: Array<{ tool: DeploymentTool; path: string; confirm?: RegExp }> = [];
    for (const { files, tool } of UNAMBIGUOUS_FILES) {
      const path = files.find(has);
      if (path !== undefined) candidates.push({ tool, path });
    }
    for (const { files, pattern, tool } of CONFIRMED_BY_CONTENTS) {
      const path = files.find(has);
      if (path !== undefined) candidates.push({ tool, path, confirm: pattern });
    }

    const terraformFiles = context.files.filter(isTerraformFile);
    if (terraformFiles[0] !== undefined) candidates.push({ tool: 'terraform', path: terraformFiles[0] });

    if (candidates.length === 0) return {};

    const read = await Promise.all(
      candidates.map(async (candidate) => ({ ...candidate, raw: await readText(context, candidate.path) }))
    );

    // Terraform and Pulumi deploy to any cloud, so whether they manage AWS is a question about their
    // files rather than about the tool. Pulumi's own `Pulumi.yaml` rarely names a cloud — the
    // provider is a dependency of the program and the region lives in the per-stack file — so the
    // answer comes from wherever this project would have had to declare it.
    const [terraformTargetsAws, pulumiTargetsAws] = await Promise.all([
      terraformFiles.length > 0 ? anyMentionsAws(context, terraformFiles) : Promise.resolve(false),
      candidates.some((candidate) => candidate.tool === 'pulumi')
        ? anyMentionsAws(
            context,
            context.files.filter(
              (file) =>
                /^Pulumi\..+\.ya?ml$/.test(file) || ['package.json', 'requirements.txt', 'go.mod'].includes(file)
            )
          )
        : Promise.resolve(false)
    ]);

    const found = new Map<DeploymentTool, ExistingDeploymentFact>();
    for (const { tool, path, confirm, raw } of read) {
      if (found.has(tool)) continue;
      if (confirm !== undefined && (raw === undefined || !confirm.test(raw))) continue;

      const lines = (raw ?? '').split(/\r?\n/);
      // The first line that says something. A citation pointing at a blank line or a licence header
      // is technically accurate and useless to the person reading it in the wizard.
      const index = Math.max(
        0,
        lines.findIndex((line) => line.trim() !== '' && !line.trimStart().startsWith('#'))
      );
      const managesAws =
        tool === 'terraform'
          ? terraformTargetsAws
          : tool === 'pulumi'
            ? pulumiTargetsAws
            : AWS_DEPLOYMENT_TOOLS.has(tool);

      found.set(tool, { tool, managesAws, evidence: [citeLine(path, lines, index)], source: 'probe' });
    }

    return found.size === 0 ? {} : { existingDeployments: [...found.values()] };
  }
};
