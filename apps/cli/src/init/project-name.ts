/**
 * The name `stacktape init` gives a new project.
 *
 * The project's own manifest names it better than the directory does: a checkout in `app-init-agent/` or a worktree
 * called `feature-x` is still the `r2p-files` project its `package.json` declares. The name ends up in stack and
 * secret names, so it is reduced to lowercase letters, digits and dashes.
 */

import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

export const toProjectName = (name: string): string =>
  name
    .replace(/^@[^/]+\//, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const readOptional = async (path: string): Promise<string | undefined> => {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
};

/** `name` under `[project]` (PEP 621) or `[tool.poetry]`. */
const pyprojectName = (contents: string): string | undefined => {
  let inNamedSection = false;
  for (const line of contents.split(/\r?\n/)) {
    const section = /^\s*\[([^\]]+)\]\s*$/.exec(line)?.[1]?.trim();
    if (section !== undefined) {
      inNamedSection = section === 'project' || section === 'tool.poetry';
      continue;
    }
    const name = inNamedSection ? /^\s*name\s*=\s*["']([^"']+)["']/.exec(line)?.[1] : undefined;
    if (name !== undefined) return name;
  }
  return undefined;
};

const packageJsonName = (contents: string): string | undefined => {
  try {
    const { name } = JSON.parse(contents) as { name?: unknown };
    return typeof name === 'string' ? name : undefined;
  } catch {
    return undefined;
  }
};

export const projectNameFor = async (repositoryRoot: string): Promise<string> => {
  const packageJson = await readOptional(join(repositoryRoot, 'package.json'));
  const pyproject = await readOptional(join(repositoryRoot, 'pyproject.toml'));
  for (const declared of [
    packageJson === undefined ? undefined : packageJsonName(packageJson),
    pyproject === undefined ? undefined : pyprojectName(pyproject)
  ]) {
    const name = declared === undefined ? '' : toProjectName(declared);
    if (name !== '') return name;
  }
  return toProjectName(basename(repositoryRoot)) || 'app';
};
