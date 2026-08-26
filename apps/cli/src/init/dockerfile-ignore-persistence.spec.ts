import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { parse } from 'yaml';
import { composeConfig, type CompositionResult } from '@stacktape/config-inference/compose';
import { runGreenfieldMission } from './missions/greenfield';
import { findExistingConfig, writeComposedConfig } from './write-config';

let repositoryRoot: string;
afterEach(async () => {
  if (repositoryRoot) await rm(repositoryRoot, { recursive: true, force: true });
});

const cases = (['linked', 'materialized'] as const).flatMap((representation) =>
  (['root-chain', 'compose-root', 'compose-nested', 'render-implicit-root', 'render-explicit-root'] as const).flatMap(
    (layout) =>
      (['custom', 'boilerplate'] as const).flatMap((style) =>
        (layout === 'root-chain' && style === 'boilerplate' ? ['different', 'unverifiable'] : ['different']).map(
          (ignoreState) => ({ representation, layout, style, ignoreState })
        )
      )
  )
);

describe('saved init config preserves an unsafe Dockerfile alias', () => {
  it.each(cases)(
    '$representation / $layout / $style / $ignoreState',
    async ({ representation, layout, style, ignoreState }) => {
      repositoryRoot = await mkdtemp(join(tmpdir(), 'stp-ignore-persistence-'));
      const buildRoot = layout === 'compose-nested' ? 'apps/api' : '.';
      const alias = layout === 'root-chain' ? 'Dockerfile' : posix.join(buildRoot, 'deploy/Dockerfile.alias');
      const canonical = layout === 'root-chain' ? 'docker/production.dockerfile' : posix.join(buildRoot, 'Dockerfile');
      const image = `FROM node:24\nWORKDIR /app\nCOPY . /app\nEXPOSE 8080\nCMD ["node", "server.js"]\n${style === 'custom' ? 'STOPSIGNAL SIGINT\n' : ''}`;
      const files: Record<string, string> = {
        [posix.join(buildRoot, 'package.json')]: JSON.stringify({
          name: 'orders',
          scripts: { start: 'node server.js' },
          dependencies: { express: '5' }
        }),
        [posix.join(buildRoot, 'server.js')]: 'require("express")().listen(8080);\n',
        [posix.join(buildRoot, 'private-marker.txt')]: 'synthetic private content',
        [`${alias}.dockerignore`]: `${ignoreState === 'unverifiable' ? '# policy\n'.repeat(25_000) : ''}private-marker.txt\n`,
        [canonical]: image,
        ...(layout === 'root-chain'
          ? {}
          : layout.startsWith('render-')
            ? {
                'render.yaml': `services:\n  - type: web\n    name: orders\n    runtime: docker\n${layout === 'render-explicit-root' ? '    rootDir: .\n' : ''}    dockerContext: .\n    dockerfilePath: deploy/Dockerfile.alias\n`
              }
            : {
                'compose.yml': `services:\n  web:\n    build: {context: ${buildRoot}, dockerfile: deploy/Dockerfile.alias}\n    ports: ["8080:8080"]\n    command: node server.js\n`
              })
      };
      await Promise.all(
        Object.entries(files).map(async ([path, contents]) => {
          await mkdir(join(repositoryRoot, posix.dirname(path)), { recursive: true });
          await writeFile(join(repositoryRoot, path), contents, 'utf8');
        })
      );
      const links =
        layout === 'root-chain'
          ? { Dockerfile: 'docker/Dockerfile.alias', 'docker/Dockerfile.alias': 'production.dockerfile' }
          : { [alias]: '../Dockerfile' };
      await Promise.all(
        Object.entries(links).map(async ([path, target]) => {
          await mkdir(join(repositoryRoot, posix.dirname(path)), { recursive: true });
          if (representation === 'linked') await symlink(target, join(repositoryRoot, path), 'file');
          else await writeFile(join(repositoryRoot, path), `${target}\n`, 'utf8');
        })
      );

      // Run the real normal probe order, verification and default decisions, not a Compose-only scan.
      const result = await runGreenfieldMission({ repositoryRoot, projectName: 'ignore-regression' });
      expect(result.facts.services).toHaveLength(1);
      expect(result.facts.services[0]).toMatchObject({ dockerfile: canonical, dockerfileAlias: alias });
      expect(result.facts.deploymentRequirements).toHaveLength(1);
      const ownership = result.facts.uncertainties.find(({ kind }) => kind === 'dockerfile-ownership');
      if (style === 'boilerplate') expect(ownership).toBeDefined();
      const composition =
        ownership === undefined
          ? result.composition
          : composeConfig({
              facts: result.facts,
              decisions: { [ownership.id]: 'stacktape-packaging' }
            });
      expect(result.composition.deployable).toBe(false);
      expect(composition.deployable).toBe(false);
      expect(composition.assumptions.some(({ kind }) => kind === 'dockerfile-ownership')).toBe(false);

      const written = await writeComposedConfig({ repositoryRoot, composition });
      expect(written.filename).toBe('stacktape.yml');
      expect(findExistingConfig(repositoryRoot)).toBe(written.path);
      const saved = parse(await readFile(written.path, 'utf8')) as CompositionResult['config'];
      expect(Object.keys(saved.resources)).toHaveLength(1);
      const packaging = Object.values(saved.resources)[0]?.properties.packaging;
      expect(packaging).toMatchObject({
        type: 'custom-dockerfile',
        properties: { buildContextPath: buildRoot, dockerfilePath: posix.relative(buildRoot, alias) }
      });
      // Normal packaging consumes this YAML without the in-memory blocking gap. Its selected path
      // must still have the original ignore file; a materialized pointer is not a valid Dockerfile.
      expect(
        (await readFile(join(repositoryRoot, `${alias}.dockerignore`), 'utf8')).endsWith('private-marker.txt\n')
      ).toBe(true);
      expect(/^FROM\s/m.test(await readFile(join(repositoryRoot, alias), 'utf8'))).toBe(representation === 'linked');
    }
  );
});
