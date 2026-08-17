/**
 * The convention pack: ecosystem knowledge turned from dead ends into decided-for-you cards.
 *
 * The property under protection is the whole point of move ②: a repository that follows its
 * ecosystem's conventions faithfully — and therefore writes nothing down — must compose a
 * deployable configuration with a visible, changeable assumption, not stop with a blocking
 * finding. And the reverse: where the convention cannot be stated without guessing, nothing is
 * raised and the honest dead end remains.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { checkFactsCompleteness } from '../facts/project-facts';
import { composeConfig } from '../compose/compose';
import { assembleCandidateFacts } from './assemble';
import { conventionalCommandsFor } from './conventions';
import { languageManifestProbe } from './probes/language-manifests';

const context = ({
  framework,
  language = 'java',
  files = []
}: {
  framework?: string | undefined;
  language?: string;
  files?: string[];
}) => ({
  framework,
  language,
  has: (path: string) => files.includes(path),
  filesUnderRoot: files
});

describe('conventionalCommandsFor', () => {
  it('prefers the checked-in wrapper for JVM builds', () => {
    expect(conventionalCommandsFor(context({ framework: 'spring-boot', files: ['pom.xml', 'mvnw'] }))?.start[0]).toBe(
      './mvnw spring-boot:run'
    );
    expect(conventionalCommandsFor(context({ framework: 'spring-boot', files: ['pom.xml'] }))?.start[0]).toBe(
      'mvn spring-boot:run'
    );
    expect(
      conventionalCommandsFor(context({ framework: 'spring-boot', files: ['build.gradle.kts', 'gradlew'] }))?.start[0]
    ).toBe('./gradlew bootRun');
  });

  it('recommends the packaged form for Quarkus, with the build that produces it', () => {
    const commands = conventionalCommandsFor(context({ framework: 'quarkus', files: ['pom.xml', 'mvnw'] }));
    expect(commands?.start[0]).toBe('java -jar target/quarkus-app/quarkus-run.jar');
    expect(commands?.build?.[0]).toBe('./mvnw -DskipTests package');
  });

  it('knows the Go layouts, and refuses the ambiguous one', () => {
    expect(conventionalCommandsFor(context({ language: 'go', files: ['go.mod', 'main.go'] }))?.start[0]).toBe(
      'go run .'
    );
    expect(
      conventionalCommandsFor(context({ language: 'go', files: ['go.mod', 'cmd/server/main.go'] }))?.start[0]
    ).toBe('go run ./cmd/server');
    // Two commands: picking one would be a coin toss with the user's traffic.
    expect(
      conventionalCommandsFor(
        context({ language: 'go', files: ['go.mod', 'cmd/server/main.go', 'cmd/worker/main.go'] })
      )
    ).toBeUndefined();
  });

  it('covers the interpreted-ecosystem conventions', () => {
    expect(
      conventionalCommandsFor(context({ framework: 'rails', language: 'ruby', files: ['bin/rails'] }))?.start[0]
    ).toBe('bin/rails server -b 0.0.0.0');
    expect(conventionalCommandsFor(context({ framework: 'phoenix', language: 'elixir' }))?.start[0]).toBe(
      'mix phx.server'
    );
    expect(conventionalCommandsFor(context({ framework: 'laravel', language: 'php' }))?.start[0]).toBe(
      'php artisan serve --host 0.0.0.0 --port 8000'
    );
    expect(conventionalCommandsFor(context({ framework: 'aspnet', language: 'csharp' }))?.start[0]).toBe('dotnet run');
  });

  it('says nothing where the convention would be a guess', () => {
    // Django's production command needs the WSGI module path, which the scan does not know.
    expect(conventionalCommandsFor(context({ framework: 'django', language: 'python' }))).toBeUndefined();
    expect(conventionalCommandsFor(context({ framework: undefined, language: 'python' }))).toBeUndefined();
  });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-conventions-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

describe('a conventions-following repository, end to end', () => {
  let root: string;

  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  const SPRING_POM = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<project>',
    '  <groupId>com.example</groupId>',
    '  <artifactId>orders</artifactId>',
    '  <dependencies>',
    '    <dependency>',
    '      <groupId>org.springframework.boot</groupId>',
    '      <artifactId>spring-boot-starter-web</artifactId>',
    '    </dependency>',
    '  </dependencies>',
    '</project>',
    ''
  ].join('\n');

  it('turns the eval’s blocked shape into a deployable config with a visible decision', async () => {
    // The exact shape the eval called failure class 1: a framework is declared, nothing states how
    // it starts, and generation used to stop here.
    root = await makeRepo({ 'pom.xml': SPRING_POM, mvnw: '#!/bin/sh\n' });

    const { facts } = await assembleCandidateFacts({ root, probes: [languageManifestProbe] });

    const question = facts.uncertainties.find((entry) => entry.kind === 'command-unknown');
    expect(question).toMatchObject({ serviceName: 'orders', command: 'start' });
    expect(question?.kind === 'command-unknown' ? question.suggestions[0] : undefined).toBe('./mvnw spring-boot:run');
    // The question is the honest escape hatch the completeness check names, so nothing blocks.
    expect(checkFactsCompleteness(facts).filter((issue) => issue.severity === 'blocking')).toEqual([]);

    const composition = composeConfig({ facts });
    expect(composition.deployable).toBe(true);
    expect(composition.config.resources.orders?.type).toBe('web-service');
    expect(composition.config.resources.orders?.properties.packaging).toMatchObject({
      type: 'nixpacks',
      properties: { startCmd: './mvnw spring-boot:run' }
    });
    // Decided for you, changeable, with the alternative on the card.
    const assumption = composition.assumptions.find((entry) => entry.kind === 'command-unknown');
    expect(assumption?.chosen).toBe('./mvnw spring-boot:run');
    expect(assumption?.alternatives).toContain('java -jar target/*.jar');
  });

  it('leaves an ecosystem without a stateable convention exactly as blocked as before', async () => {
    root = await makeRepo({
      'requirements.txt': 'django==5.0\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: [languageManifestProbe] });

    expect(facts.uncertainties.filter((entry) => entry.kind === 'command-unknown')).toEqual([]);
    expect(checkFactsCompleteness(facts).some((issue) => issue.severity === 'blocking')).toBe(true);
  });

  it('lets the container builder answer where the curated table refused', async () => {
    // Django again — but this time the injected planner stands in for `nixpacks plan`, whose
    // answer is what the packaged container would run anyway.
    root = await makeRepo({ 'requirements.txt': 'django==5.0\n' });
    const planned: string[] = [];

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe],
      planner: {
        planStart: async (path) => {
          planned.push(path);
          return 'python manage.py runserver 0.0.0.0:8000';
        }
      }
    });

    expect(planned).toEqual(['.']);
    const question = facts.uncertainties.find((entry) => entry.kind === 'command-unknown');
    expect(question?.kind === 'command-unknown' ? question.suggestions : undefined).toEqual([
      'python manage.py runserver 0.0.0.0:8000'
    ]);
    expect(checkFactsCompleteness(facts).filter((issue) => issue.severity === 'blocking')).toEqual([]);
  });

  it('never asks the planner where the curated table or the repository already answered', async () => {
    root = await makeRepo({ 'pom.xml': SPRING_POM, mvnw: '#!/bin/sh\n' });
    const planned: string[] = [];

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [languageManifestProbe],
      planner: {
        planStart: async (path) => {
          planned.push(path);
          return 'never used';
        }
      }
    });

    // The Spring convention answered first, so the subprocess is never spawned.
    expect(planned).toEqual([]);
    const question = facts.uncertainties.find((entry) => entry.kind === 'command-unknown' && entry.command === 'start');
    expect(question?.kind === 'command-unknown' ? question.suggestions[0] : undefined).toBe('./mvnw spring-boot:run');
  });
});
