import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { parse } from 'yaml';
import { detectRepository } from './detect-host';
import { pipelineFor } from './templates';
import { writePipeline } from './write-pipeline';

let root: string | undefined;

afterEach(async () => {
  if (root !== undefined) await rm(root, { recursive: true, force: true });
  root = undefined;
});

const repoWithRemote = async (url: string, remoteName = 'origin'): Promise<string> => {
  root = await mkdtemp(join(tmpdir(), 'stp-cicd-'));
  await mkdir(join(root, '.git'), { recursive: true });
  await writeFile(
    join(root, '.git', 'config'),
    `[core]\n\trepositoryformatversion = 0\n[remote "${remoteName}"]\n\turl = ${url}\n\tfetch = +refs/heads/*:refs/remotes/${remoteName}/*\n`,
    'utf8'
  );
  return root;
};

const inputs = {
  configPath: 'stacktape.yml',
  stage: 'production',
  region: 'eu-west-1',
  projectName: 'orders',
  cliVersion: '4.0.0'
};

describe('working out where the project lives', () => {
  it('recognises each host, in either URL form', async () => {
    expect(await detectRepository(await repoWithRemote('git@github.com:acme/orders.git'))).toEqual({
      host: 'github',
      slug: 'acme/orders'
    });
    expect(await detectRepository(await repoWithRemote('https://gitlab.com/acme/orders.git'))).toEqual({
      host: 'gitlab',
      slug: 'acme/orders'
    });
    expect(await detectRepository(await repoWithRemote('git@bitbucket.org:acme/orders.git'))).toEqual({
      host: 'bitbucket',
      slug: 'acme/orders'
    });
  });

  it('says nothing rather than guessing for a host we do not generate for', async () => {
    // A self-hosted Gitea is a perfectly good place to keep code, and a GitHub Actions workflow would
    // be no use there at all.
    expect(await detectRepository(await repoWithRemote('git@git.internal.acme:acme/orders.git'))).toBeUndefined();
  });

  it('works without a repository, and without git installed', async () => {
    root = await mkdtemp(join(tmpdir(), 'stp-cicd-'));
    expect(await detectRepository(root)).toBeUndefined();
  });
});

describe('the pipelines', () => {
  it('produce valid YAML for every host', () => {
    for (const host of ['github', 'gitlab', 'bitbucket'] as const) {
      const template = pipelineFor(host, inputs);
      expect(() => parse(template.contents)).not.toThrow();
      expect(parse(template.contents)).toBeTruthy();
    }
  });

  it('never contain a credential, on any host', () => {
    for (const host of ['github', 'gitlab', 'bitbucket'] as const) {
      const template = pipelineFor(host, inputs);
      // The whole point of the design: the file names what it needs and the user supplies it.
      expect(template.contents).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(template.requiredSecrets.length).toBeGreaterThan(0);
    }
  });

  it('pins the CLI so a release cannot change what a pipeline does', () => {
    for (const host of ['github', 'gitlab', 'bitbucket'] as const) {
      expect(pipelineFor(host, inputs).contents).toContain('stacktape@4.0.0');
    }
  });

  it('deploys the configuration it was given, to the stage it was given', () => {
    for (const host of ['github', 'gitlab', 'bitbucket'] as const) {
      const contents = pipelineFor(host, inputs).contents;
      expect(contents).toContain('--configPath stacktape.yml');
      expect(contents).toContain('--stage production');
      expect(contents).toContain('--region eu-west-1');
      // Nothing in CI can answer a prompt.
      expect(contents).toContain('--autoConfirmOperation');
    }
  });

  it('asks GitHub for an OIDC role rather than a stored key', () => {
    const template = pipelineFor('github', inputs);
    expect(template.requiredSecrets.map((secret) => secret.name)).toEqual(['AWS_DEPLOY_ROLE_ARN']);
    expect(template.contents).toContain('id-token: write');
    expect(template.contents).not.toContain('AWS_SECRET_ACCESS_KEY');
  });
});

describe('writing a pipeline', () => {
  it('writes it where the host looks for it', async () => {
    root = await mkdtemp(join(tmpdir(), 'stp-cicd-'));
    const written = await writePipeline({ repositoryRoot: root, host: 'github', inputs });

    expect(written.filename).toBe('.github/workflows/deploy.yml');
    expect(await readFile(written.path, 'utf8')).toContain('name: Deploy');
  });

  it('never replaces a pipeline that is already there', async () => {
    root = await mkdtemp(join(tmpdir(), 'stp-cicd-'));
    await mkdir(join(root, '.github', 'workflows'), { recursive: true });
    await writeFile(join(root, '.github', 'workflows', 'deploy.yml'), '# hand written\n', 'utf8');

    const written = await writePipeline({ repositoryRoot: root, host: 'github', inputs });

    expect(written.filename).toBe('.github/workflows/deploy.stacktape.yml');
    expect(written.existingPath).toBe(join(root, '.github', 'workflows', 'deploy.yml'));
    // Merging two pipelines is a judgement call, and this one is not ours to make.
    expect(await readFile(join(root, '.github', 'workflows', 'deploy.yml'), 'utf8')).toContain('hand written');
  });
});
