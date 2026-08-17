/**
 * Noticing that a repository is already deployed.
 *
 * The tests that matter here are the negative ones. Claiming to have found somebody's Terraform when
 * all we found was a `.tf` file in a fixtures directory is worse than finding nothing: it is a
 * confident, specific, wrong statement about their infrastructure, made by a tool they have just met.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { composeConfig } from '../../compose/compose';
import { assembleCandidateFacts } from '../assemble';
import { existingDeploymentProbe } from './existing-deployment';
import { environmentProbe } from './environment';
import { manifestProbe } from './manifest';
import { procfileProbe } from './procfile';

const PROBES = [manifestProbe, existingDeploymentProbe];

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-deployment-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

const APP_MANIFEST = JSON.stringify({ name: 'api', scripts: { start: 'node index.js' } });

describe('the existing-deployment probe', () => {
  it('finds an unambiguous deployment declaration and cites it', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'serverless.yml': 'service: orders-api\nprovider:\n  name: aws\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments).toHaveLength(1);
    expect(facts.existingDeployments[0]).toMatchObject({ tool: 'serverless-framework', managesAws: true });
    expect(facts.existingDeployments[0]?.evidence[0]).toMatchObject({ file: 'serverless.yml', line: 1 });
  });

  it('asks the Terraform files which cloud they are for', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'infra/main.tf': 'provider "google" {\n  project = "example"\n}\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    // Terraform deploys anywhere. Reporting "you have AWS resources" for a Google project would send
    // a future takeover flow looking for things that are not there.
    expect(facts.existingDeployments[0]).toMatchObject({ tool: 'terraform', managesAws: false });
  });

  it('ignores a stray .tf file that is not somebody’s infrastructure', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'src/__fixtures__/sample.tf': 'provider "aws" {}\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments).toHaveLength(0);
  });

  it('does not read every template.yaml as CloudFormation', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      // The most common filename in the world, and here it is a mail template.
      'template.yaml': 'subject: Welcome\nbody: Hello {{name}}\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments).toHaveLength(0);
  });

  it('does not call a platform-neutral Procfile a live Heroku deployment', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node src/index.js' },
        dependencies: { express: '^5.0.0', pg: '^8.0.0' }
      }),
      Procfile: 'web: node src/index.js\nrelease: node migrate.js\n',
      '.env.example': 'DATABASE_URL=postgres://localhost/example\n'
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [manifestProbe, procfileProbe, environmentProbe, existingDeploymentProbe]
    });
    const composed = composeConfig({ facts, projectName: 'api' });

    expect(facts.existingDeployments).toEqual([]);
    expect(composed.gaps.some((gap) => gap.subject === 'heroku')).toBe(false);
    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]).toMatchObject({
      name: 'api',
      exposesHttp: true,
      executionModel: 'long-running',
      // A Procfile's web command is the exact production declaration; a matching package script is
      // only an alias and must not displace it.
      startCommand: 'node src/index.js'
    });
    expect(facts.dependencies).toContainEqual(
      expect.objectContaining({ kind: 'postgres', addressedBy: ['DATABASE_URL'] })
    );
    expect(facts.migrations[0]).toMatchObject({ command: 'node migrate.js', runsAt: 'ci' });
    expect(composed.config.resources.api).toMatchObject({
      type: 'web-service',
      properties: {
        packaging: { properties: { startCmd: 'node src/index.js' } },
        connectTo: ['mainDatabase'],
        environment: [{ name: 'DATABASE_URL', value: "$ResourceParam('mainDatabase', 'connectionString')" }]
      }
    });
    expect(composed.config.scripts?.migrateDatabase).toMatchObject({
      properties: { executeCommand: 'node migrate.js', connectTo: ['mainDatabase'] }
    });
  });

  it('recognises a Heroku-specific app manifest without relying on a Procfile', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'app.json': JSON.stringify({
        name: 'orders',
        addons: ['heroku-postgresql:essential-0'],
        env: { API_TOKEN: { value: 'existing-deployment-citation-must-not-copy-this' } }
      })
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments[0]).toMatchObject({ tool: 'heroku', managesAws: false });
    expect(JSON.stringify(facts)).not.toContain('existing-deployment-citation-must-not-copy-this');
  });

  it('recognises a platform deployment and says the right thing about it', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'fly.toml': 'app = "orders-api"\n\n[http_service]\n  internal_port = 8080\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts, projectName: 'orders' });
    const message = composed.gaps.find((gap) => gap.subject === 'fly')?.message ?? '';

    expect(facts.existingDeployments[0]).toMatchObject({ tool: 'fly', managesAws: false });
    // Somebody deploying this without realising they now have two copies running will blame us for
    // the bill, so the second copy has to be stated before the deploy, not discovered after it.
    expect(message).toContain('second copy on AWS');
    expect(message).toContain('Fly.io');
  });

  it('recognises an app-local deployment manifest in a monorepo', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'apps/api/fly.toml': 'app = "orders-api"\n\n[http_service]\n  internal_port = 8080\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments[0]).toMatchObject({ tool: 'fly', managesAws: false });
    expect(facts.existingDeployments[0]?.evidence[0]).toMatchObject({ file: 'apps/api/fly.toml' });
  });

  it('does not call a deployment example the repository’s current platform', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'examples/fly.toml': 'app = "sample"\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments).toHaveLength(0);
  });

  it('tells an infrastructure-as-code user that we are not taking anything over', async () => {
    root = await makeRepo({
      'package.json': APP_MANIFEST,
      'infra/main.tf': 'provider "aws" {\n  region = "eu-west-1"\n}\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
    const composed = composeConfig({ facts, projectName: 'orders' });

    expect(composed.gaps.find((gap) => gap.subject === 'terraform')?.message).toContain(
      'does not read, change, or take over anything those files may manage'
    );
  });

  it('says nothing at all about a repository nobody deploys yet', async () => {
    root = await makeRepo({ 'package.json': APP_MANIFEST });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.existingDeployments).toHaveLength(0);
    expect(composeConfig({ facts, projectName: 'orders' }).gaps).toHaveLength(0);
  });
});
