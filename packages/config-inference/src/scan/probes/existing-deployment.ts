/**
 * What already deploys this project.
 *
 * Every other probe answers "what does this application need". This one answers "which deployment
 * system has a declaration in the repository", and the two lead somewhere different. A manifest is
 * not proof that anything is running, but it is enough to warn that Stacktape will create a separate
 * stack and will not adopt or change whatever that declaration may manage.
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
import type { Citation } from '../../facts/citation';
import { readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

/** Files whose presence, on its own, identifies the tool that owns this repository's deployment. */
const UNAMBIGUOUS_FILES: ReadonlyArray<{
  files: readonly string[];
  tool: DeploymentTool;
}> = [
  {
    files: ['serverless.yml', 'serverless.yaml', 'serverless.ts', 'serverless.js'],
    tool: 'serverless-framework'
  },
  { files: ['sst.config.ts', 'sst.config.js', 'sst.json'], tool: 'sst' },
  { files: ['cdk.json'], tool: 'aws-cdk' },
  { files: ['Pulumi.yaml', 'Pulumi.yml'], tool: 'pulumi' },
  { files: ['samconfig.toml', 'samconfig.yaml'], tool: 'aws-sam' },
  { files: ['render.yaml', 'render.yml'], tool: 'render' },
  { files: ['fly.toml'], tool: 'fly' },
  { files: ['vercel.json'], tool: 'vercel' },
  { files: ['netlify.toml'], tool: 'netlify' },
  { files: ['railway.json', 'railway.toml'], tool: 'railway' },
  {
    files: ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc'],
    tool: 'cloudflare-workers'
  },
  {
    files: ['Chart.yaml', 'kustomization.yaml', 'kustomization.yml'],
    tool: 'kubernetes'
  }
];

const IGNORED_NESTED_DIRECTORIES = new Set([
  '__fixtures__',
  'fixture',
  'fixtures',
  'example',
  'examples',
  'sample',
  'samples',
  'test',
  'tests'
]);

/**
 * Deployment manifests often live beside an app in a monorepo (`apps/api/fly.toml`). Consider a
 * bounded nested location, but never turn a tutorial or test fixture into a claim about what runs
 * in production. Four directory segments covers conventional workspace layouts without searching
 * arbitrary vendored trees.
 */
const findManifest = (files: readonly string[], names: readonly string[]): string | undefined =>
  files.find((path) => {
    const segments = path.split('/');
    const name = segments.at(-1);
    const directories = segments.slice(0, -1);
    return (
      name !== undefined &&
      names.includes(name) &&
      directories.length <= 4 &&
      !directories.some((segment) => IGNORED_NESTED_DIRECTORIES.has(segment.toLowerCase()))
    );
  });

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
  },
  {
    // A Procfile is platform-neutral process metadata. Heroku's app manifest needs a field that is
    // specific to its deployment schema before we name Heroku in front of the user.
    files: ['app.json'],
    pattern: /"(?:addons|formation|buildpacks|stack)"\s*:/,
    tool: 'heroku'
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

/** Cite only a declaration key/token, never a whole one-line manifest that may also contain values. */
const declarationCitation = (path: string, raw: string | undefined, confirm?: RegExp): Citation | undefined => {
  if (raw === undefined) return undefined;
  const lines = raw.split(/\r?\n/);
  if (confirm !== undefined) {
    for (const [index, line] of lines.entries()) {
      const match = new RegExp(confirm.source, confirm.flags.replaceAll('g', '').replaceAll('y', '')).exec(line)?.[0];
      if (match !== undefined)
        return {
          file: path,
          line: index + 1,
          quote: match.trim().slice(0, 200)
        };
    }
  }

  const index = lines.findIndex((line) => {
    const trimmed = line.trim();
    return (
      trimmed !== '' &&
      !trimmed.startsWith('#') &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('/*') &&
      !trimmed.startsWith('*')
    );
  });
  if (index === -1) return undefined;
  const line = lines[index]!;
  const token = /(?:["'][A-Za-z_$][A-Za-z0-9_$.-]*["']|[A-Za-z_$][A-Za-z0-9_$.-]*)\s*(?=[:=({])/.exec(line)?.[0];
  return {
    file: path,
    line: index + 1,
    quote: (token?.trim() || line.trim().slice(0, 1)).slice(0, 200)
  };
};

export const existingDeploymentProbe: Probe = {
  name: 'existing-deployment',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    // Which files to look at is decided first, and entirely from the file list, so the reads that
    // follow can all happen at once.
    const candidates: Array<{
      tool: DeploymentTool;
      path: string;
      confirm?: RegExp;
    }> = [];
    for (const { files, tool } of UNAMBIGUOUS_FILES) {
      const path = findManifest(context.files, files);
      if (path !== undefined) candidates.push({ tool, path });
    }
    for (const { files, pattern, tool } of CONFIRMED_BY_CONTENTS) {
      const path = findManifest(context.files, files);
      if (path !== undefined) candidates.push({ tool, path, confirm: pattern });
    }

    const terraformFiles = context.files.filter(isTerraformFile);
    if (terraformFiles[0] !== undefined) candidates.push({ tool: 'terraform', path: terraformFiles[0] });

    if (candidates.length === 0) return {};

    const read = await Promise.all(
      candidates.map(async (candidate) => ({
        ...candidate,
        raw: await readText(context, candidate.path)
      }))
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

      const managesAws =
        tool === 'terraform'
          ? terraformTargetsAws
          : tool === 'pulumi'
            ? pulumiTargetsAws
            : AWS_DEPLOYMENT_TOOLS.has(tool);

      const citation = declarationCitation(path, raw, confirm);
      found.set(tool, {
        tool,
        managesAws,
        evidence: citation === undefined ? [] : [citation],
        source: 'probe'
      });
    }

    return found.size === 0 ? {} : { existingDeployments: [...found.values()] };
  }
};
