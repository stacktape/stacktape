/**
 * Reading dependency lists that are not `package.json`.
 *
 * One case per ecosystem, each checking the thing that ecosystem gets wrong in its own way: Go's
 * indirect requires, Maven's group/artifact split, PHP's PDO extensions, Elixir's tuple syntax.
 *
 * Plus the negative that matters most: a library that talks to several databases proves nothing.
 * Guessing there produces a database the application cannot connect to.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { assembleCandidateFacts } from '../assemble';
import { languageManifestProbe } from './language-manifests';
import { manifestProbe } from './manifest';

const PROBES = [manifestProbe, languageManifestProbe];

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-langs-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

const kindsIn = async (files: Record<string, string>): Promise<string[]> => {
  root = await makeRepo(files);
  const { facts } = await assembleCandidateFacts({ root, probes: PROBES });
  return facts.dependencies.map((dependency) => dependency.kind).toSorted();
};

describe('dependency lists in other languages', () => {
  it('reads a Python requirements file', async () => {
    expect(
      await kindsIn({
        'requirements.txt': ['Django==5.0', 'psycopg2-binary==2.9.9', 'redis>=5', '# a comment', '-e .', ''].join('\n')
      })
    ).toEqual(['postgres', 'redis']);
  });

  it('does not mistake Celery using Kombu with Redis for a RabbitMQ requirement', async () => {
    expect(
      await kindsIn({
        'requirements.txt': ['celery==5.4.0', 'kombu==5.3.5', 'redis==5.0.8'].join('\n'),
        'celeryconfig.py': 'broker_url = "redis://localhost:6379/0"\n'
      })
    ).toEqual(['redis']);
  });

  it('reads a Poetry project', async () => {
    expect(
      await kindsIn({
        'pyproject.toml': [
          '[tool.poetry.dependencies]',
          'python = "^3.12"',
          'fastapi = "^0.110"',
          'asyncpg = "^0.29"',
          ''
        ].join('\n')
      })
    ).toEqual(['postgres']);
  });

  it('reads a Gemfile, and gives Sidekiq the Redis it actually needs', async () => {
    expect(
      await kindsIn({
        Gemfile: ['source "https://rubygems.org"', 'gem "rails", "~> 7.1"', 'gem "pg"', 'gem "sidekiq"', ''].join('\n')
      })
      // Redis and no SQS queue. Sidekiq stores its jobs in Redis; a queue would be a resource the
      // application never connects to, billed monthly, looking deliberate.
    ).toEqual(['postgres', 'redis']);
  });

  it('reads go.mod and ignores indirect requirements', async () => {
    expect(
      await kindsIn({
        'go.mod': [
          'module example.com/api',
          'go 1.22',
          'require (',
          '\tgithub.com/gin-gonic/gin v1.9.1',
          '\tgithub.com/lib/pq v1.10.9',
          '\tgithub.com/redis/go-redis/v9 v9.5.1 // indirect',
          ')',
          ''
        ].join('\n')
      })
      // Redis is only there transitively, which is not a statement that this application uses it.
    ).toEqual(['postgres']);
  });

  it('reads composer.json, including the PDO extension that names the engine', async () => {
    expect(
      await kindsIn({
        'composer.json': JSON.stringify({
          require: {
            'laravel/framework': '^11.0',
            'ext-pdo_mysql': '*',
            'predis/predis': '^2.0'
          }
        })
      })
    ).toEqual(['mysql', 'redis']);
  });

  it('knows WordPress requires a MySQL-compatible database', async () => {
    expect(
      await kindsIn({
        'composer.json': JSON.stringify({
          name: 'agency/store',
          require: {
            'johnpbloch/wordpress': '^6.6',
            'woocommerce/woocommerce': '^9.1'
          }
        })
      })
    ).toEqual(['mysql']);
  });

  it('reads a Maven pom', async () => {
    expect(
      await kindsIn({
        'pom.xml': [
          '<project>',
          '  <dependencies>',
          '    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>',
          '    <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId></dependency>',
          '  </dependencies>',
          '</project>',
          ''
        ].join('\n')
      })
    ).toEqual(['postgres']);
  });

  it('recognises the current Quarkus REST artifact name', async () => {
    root = await makeRepo({
      'pom.xml': [
        '<project>',
        '<artifactId>quarkus-api</artifactId>',
        '<dependency><artifactId>quarkus-resteasy-reactive</artifactId></dependency>',
        '</project>'
      ].join('\n')
    });
    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.services[0]).toMatchObject({
      framework: 'quarkus',
      exposesHttp: true
    });
  });

  it('reads a .csproj', async () => {
    expect(
      await kindsIn({
        'Api.csproj': [
          '<Project Sdk="Microsoft.NET.Sdk.Web">',
          '  <ItemGroup>',
          '    <PackageReference Include="Npgsql" Version="8.0.2" />',
          '    <PackageReference Include="StackExchange.Redis" Version="2.7.33" />',
          '  </ItemGroup>',
          '</Project>',
          ''
        ].join('\n')
      })
    ).toEqual(['postgres', 'redis']);
  });

  it('reads Cargo.toml', async () => {
    expect(
      await kindsIn({
        'Cargo.toml': ['[dependencies]', 'axum = "0.7"', 'tokio-postgres = "0.7"', ''].join('\n')
      })
    ).toEqual(['postgres']);
  });

  it('reads mix.exs', async () => {
    expect(
      await kindsIn({
        'mix.exs': [
          'defp deps do',
          '  [',
          '    {:phoenix, "~> 1.7"},',
          '    {:postgrex, ">= 0.0.0"}',
          '  ]',
          'end',
          ''
        ].join('\n')
      })
    ).toEqual(['postgres']);
  });

  it('sees through Go major-version import paths', async () => {
    expect(
      await kindsIn({
        'go.mod': [
          'module example.com/orders-api',
          'go 1.22',
          'require (',
          '\tgithub.com/go-chi/chi/v5 v5.0.12',
          '\tgithub.com/redis/go-redis/v9 v9.5.1',
          ')',
          ''
        ].join('\n')
      })
      // `/v9` is the major version, not the library. Reading it as the name made every Go library
      // on a second major version silently stop matching — which is most of the popular ones.
    ).toEqual(['redis']);
  });

  it('names a Maven project after itself, not after its Spring parent', async () => {
    root = await makeRepo({
      'pom.xml': [
        '<project>',
        '  <parent>',
        '    <groupId>org.springframework.boot</groupId>',
        '    <artifactId>spring-boot-starter-parent</artifactId>',
        '    <version>3.3.0</version>',
        '  </parent>',
        '  <artifactId>orders-api</artifactId>',
        '  <dependencies>',
        '    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>',
        '    <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId></dependency>',
        '  </dependencies>',
        '</project>',
        ''
      ].join('\n')
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    // The first artifactId in a Spring Boot pom is the parent's. A service called
    // "spring-boot-starter-parent" would be confidently, visibly wrong in the generated file.
    expect(facts.services[0]?.name).toBe('orders-api');
  });

  it('says nothing when the library does not name an engine', async () => {
    // SQLAlchemy drives Postgres, MySQL, SQLite and more. Picking one produces a database the
    // application cannot connect to, which is worse than producing none.
    expect(
      await kindsIn({
        'requirements.txt': 'SQLAlchemy==2.0.29\nalembic==1.13\n'
      })
    ).toEqual([]);
  });

  it('finds the service and its framework, and the migration tool it declares', async () => {
    root = await makeRepo({
      'requirements.txt': 'Django==5.0\ngunicorn==22.0\npsycopg2==2.9\n'
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    expect(facts.services[0]).toMatchObject({
      language: 'python',
      framework: 'django',
      exposesHttp: true
    });
    expect(facts.migrations[0]).toMatchObject({
      tool: 'django',
      command: 'python manage.py migrate'
    });
  });

  it('leaves JavaScript to the probe that reads far more than a dependency list', async () => {
    root = await makeRepo({
      'package.json': JSON.stringify({
        name: 'api',
        scripts: { start: 'node index.js' },
        dependencies: { pg: '^8' }
      })
    });

    const { facts } = await assembleCandidateFacts({ root, probes: PROBES });

    // One service named from the manifest, not a second one called `app`.
    expect(facts.services).toHaveLength(1);
    expect(facts.services[0]?.name).toBe('api');
  });
});
