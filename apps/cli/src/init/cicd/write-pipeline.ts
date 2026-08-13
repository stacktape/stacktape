/**
 * Putting a generated pipeline on disk.
 *
 * Same rule as the configuration: an existing pipeline is someone's work and is never overwritten. A
 * repository that already has `.github/workflows/deploy.yml` gets `deploy.stacktape.yml` beside it,
 * and is told so — merging two pipelines is a judgement call, and a tool that makes it silently gets
 * it wrong in the one case that matters.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { GitHost } from './detect-host';
import { pipelineFor, type PipelineInputs, type PipelineTemplate } from './templates';

export type WrittenPipeline = {
  path: string;
  /** Relative to the repository root, which is how the user will refer to it. */
  filename: string;
  host: GitHost;
  requiredSecrets: PipelineTemplate['requiredSecrets'];
  authSummary: string;
  /** Set when a pipeline was already there and this one was written beside it. */
  existingPath?: string;
};

/** `deploy.yml` → `deploy.stacktape.yml`, keeping the extension where the host expects it. */
const alongside = (filename: string): string => {
  const dot = filename.lastIndexOf('.');
  return dot <= 0 ? `${filename}.stacktape` : `${filename.slice(0, dot)}.stacktape${filename.slice(dot)}`;
};

export const writePipeline = async ({
  repositoryRoot,
  host,
  inputs
}: {
  repositoryRoot: string;
  host: GitHost;
  inputs: PipelineInputs;
}): Promise<WrittenPipeline> => {
  const template = pipelineFor(host, inputs);
  const preferred = join(repositoryRoot, template.path);
  const taken = existsSync(preferred);
  const filename = taken
    ? `${template.path.slice(0, template.path.lastIndexOf('/') + 1)}${alongside(template.path.split('/').pop()!)}`
    : template.path;
  const path = join(repositoryRoot, filename);

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, template.contents, 'utf8');

  return {
    path,
    filename,
    host,
    requiredSecrets: template.requiredSecrets,
    authSummary: template.authSummary,
    ...(taken ? { existingPath: preferred } : {})
  };
};
