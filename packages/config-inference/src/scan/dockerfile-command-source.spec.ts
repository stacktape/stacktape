import { describe, expect, it } from 'bun:test';
import { sourceFileForDockerPath } from './dockerfile-command-source';

const FILES = ['root.js', 'apps/api/index.js', 'alternate/index.js'];

// These source identities are also checked against real Docker COPY output by the opt-in oracle.
const COPY_CASES = [
  {
    name: 'identity',
    raw: 'FROM scratch\nWORKDIR /app\nCOPY . .\n',
    workdir: '/app',
    source: 'apps/api/index.js'
  },
  {
    name: 'file rename',
    raw: 'FROM scratch\nWORKDIR /\nCOPY root.js /apps/api/index.js\n',
    workdir: '/',
    source: 'root.js'
  },
  {
    name: 'directory rename',
    raw: 'FROM scratch\nWORKDIR /app\nCOPY alternate ./apps/api\n',
    workdir: '/app',
    source: 'alternate/index.js'
  },
  {
    name: 'later file overwrite',
    raw: 'FROM scratch\nWORKDIR /app\nCOPY . .\nCOPY root.js ./apps/api/index.js\n',
    workdir: '/app',
    source: 'root.js'
  },
  {
    name: 'named stage',
    raw: 'FROM scratch AS deps\nWORKDIR /app\nCOPY apps ./apps\nFROM scratch\nWORKDIR /app\nCOPY --from=deps /app /app\n',
    workdir: '/app',
    source: 'apps/api/index.js'
  },
  {
    name: 'numeric stage',
    raw: 'FROM scratch AS deps\nWORKDIR /app\nCOPY apps ./apps\nFROM scratch\nWORKDIR /app\nCOPY --from=0 /app /app\n',
    workdir: '/app',
    source: 'apps/api/index.js'
  },
  {
    name: 'inherited stage',
    raw: 'FROM scratch AS base\nWORKDIR /app\nCOPY apps ./apps\nFROM base\n',
    workdir: '/app',
    source: 'apps/api/index.js'
  },
  {
    name: 'changed WORKDIR',
    raw: 'FROM scratch\nWORKDIR /app\nCOPY . .\nWORKDIR /other\nCOPY root.js ./apps/api/index.js\n',
    workdir: '/other',
    source: 'root.js'
  }
];

describe('Docker command source ownership', () => {
  for (const fixture of COPY_CASES) {
    for (const absolute of [false, true]) {
      it(`${fixture.name}, ${absolute ? 'absolute' : 'relative'} command path`, () => {
        expect(
          sourceFileForDockerPath({
            raw: fixture.raw,
            files: FILES,
            containerPath: `${absolute ? `${fixture.workdir.replace(/\/$/, '')}/` : ''}apps/api/index.js`
          })
        ).toBe(fixture.source);
      });
    }
  }

  it('retains JobDesk source identity through dependency installation and the final stage copy', () => {
    const raw = [
      '# syntax=docker/dockerfile:1',
      'FROM oven/bun:1.3.14-debian AS deps',
      'WORKDIR /app',
      'COPY package.json bun.lock tsconfig.json drizzle.config.ts ./',
      'COPY apps ./apps',
      'COPY packages ./packages',
      'RUN bun install --frozen-lockfile',
      'FROM oven/bun:1.3.14-debian AS runner',
      'WORKDIR /app',
      'ENV NODE_ENV=production \\',
      '    HOST=0.0.0.0 \\',
      '    PORT=3000',
      'COPY --from=deps /app /app',
      'COPY drizzle ./drizzle',
      'COPY sample ./sample',
      'USER bun',
      'EXPOSE 3000',
      'CMD ["bun", "apps/api/src/index.ts"]'
    ].join('\n');
    const entries = ['apps/api/src/index.ts', 'apps/worker/src/index.ts', 'packages/core/src/db/migrate.ts'];
    const files = [
      ...entries,
      'apps/api/src/index.test.ts',
      'package.json',
      'bun.lock',
      'tsconfig.json',
      'drizzle.config.ts',
      'drizzle/0000_initial.sql',
      'sample/request.json'
    ];
    const dockerignore = '.git\nnode_modules\ndist\n.env\n*.log\ncoverage\n**/*.test.ts\n';
    for (const containerPath of entries)
      expect(sourceFileForDockerPath({ raw, files, dockerignore, containerPath, installScriptsAbsent: true })).toBe(
        containerPath
      );
    expect(
      sourceFileForDockerPath({
        raw,
        files,
        dockerignore,
        containerPath: 'apps/api/src/index.test.ts',
        installScriptsAbsent: true
      })
    ).toBeUndefined();
  });

  it('resolves COPY sources relative to the build context, not the repository or Dockerfile', () => {
    expect(
      sourceFileForDockerPath({
        raw: 'FROM scratch\nWORKDIR /srv\nCOPY ["api", "./apps/api"]\n',
        files: FILES,
        buildRoot: 'apps',
        containerPath: 'apps/api/index.js'
      })
    ).toBe('apps/api/index.js');
  });

  it('selects the requested target and supports a literal Compose working directory', () => {
    const raw =
      'FROM scratch AS api\nWORKDIR /app\nCOPY apps ./apps\nFROM scratch AS other\nCOPY root.js /apps/api/index.js\n';
    expect(sourceFileForDockerPath({ raw, files: FILES, target: 'api', containerPath: 'apps/api/index.js' })).toBe(
      'apps/api/index.js'
    );
    expect(
      sourceFileForDockerPath({ raw, files: FILES, target: 'missing', containerPath: 'apps/api/index.js' })
    ).toBeUndefined();
    expect(sourceFileForDockerPath({ raw, files: FILES, containerPath: 'apps/api/index.js' })).toBe('root.js');
    expect(
      sourceFileForDockerPath({
        raw,
        files: FILES,
        target: 'api',
        workingDirectory: '/app/apps/api',
        containerPath: 'index.js'
      })
    ).toBe('apps/api/index.js');
  });

  for (const mutation of [
    'COPY root.js ./apps/api/index.js',
    'COPY alternate ./apps/api',
    'COPY ["alternate", "./apps/api"]'
  ]) {
    it(`does not retain an overwritten identity after ${mutation}`, () => {
      expect(
        sourceFileForDockerPath({
          raw: `FROM scratch\nWORKDIR /app\nCOPY . .\n${mutation}\n`,
          files: FILES,
          containerPath: 'apps/api/index.js'
        })
      ).toBe(mutation.includes('root.js') ? 'root.js' : 'alternate/index.js');
    });
  }

  for (const mutation of [
    'ARG SOURCE=root.js\nCOPY $SOURCE ./apps/api/index.js',
    'COPY *.js ./apps/api/',
    'COPY --from=unknown /index.js ./apps/api/index.js',
    'COPY --from=0 /app /app',
    'COPY --link root.js ./apps/api/index.js',
    'COPY missing ./apps/api',
    'COPY root.js ../apps/api/index.js',
    'COPY ["root.js", "apps/api/index.js"',
    'WORKDIR $APP_ROOT',
    'RUN cp root.js apps/api/index.js',
    'RUN npm install && cp root.js apps/api/index.js',
    'ADD root.js ./apps/api/index.js',
    'ENTRYPOINT ["./rewrite-and-start.sh"]',
    'VOLUME /app/apps'
  ]) {
    it(`does not guess after unsupported or unknown mutation: ${mutation.replaceAll('\n', '; ')}`, () => {
      expect(
        sourceFileForDockerPath({
          raw: `FROM scratch\nWORKDIR /app\nCOPY . .\n${mutation}\n`,
          files: FILES,
          containerPath: 'apps/api/index.js'
        })
      ).toBeUndefined();
    });
  }

  it('does not assume an external base image working directory', () => {
    expect(
      sourceFileForDockerPath({ raw: 'FROM node:24\nCOPY . /app\n', files: FILES, containerPath: 'apps/api/index.js' })
    ).toBeUndefined();
  });

  for (const install of ['npm install', 'npm ci', 'bun install --frozen-lockfile', 'pnpm install', 'yarn install']) {
    it(`requires explicit absence of repository lifecycle hooks for ${install}`, () => {
      const input = {
        raw: `FROM scratch\nWORKDIR /app\nCOPY . .\nRUN ${install}\n`,
        files: FILES,
        containerPath: 'apps/api/index.js'
      };
      expect(sourceFileForDockerPath(input)).toBeUndefined();
      expect(sourceFileForDockerPath({ ...input, installScriptsAbsent: false })).toBeUndefined();
      expect(sourceFileForDockerPath({ ...input, installScriptsAbsent: true })).toBe('apps/api/index.js');
      expect(sourceFileForDockerPath({ ...input, raw: `${input.raw.trim()} --ignore-scripts\n` })).toBe(
        'apps/api/index.js'
      );
    });
  }

  it('bounds adversarial ignore patterns in a subprocess with a hard timeout', async () => {
    const moduleUrl = new URL('./dockerfile-command-source.ts', import.meta.url).href;
    const input = {
      raw: 'FROM scratch\nCOPY . /app\n',
      files: ['a'.repeat(120)],
      dockerignore: `${'*'.repeat(32)}z\n${'*a'.repeat(32)}z\n`,
      containerPath: `/app/${'a'.repeat(120)}`
    };
    const child = Bun.spawn(
      [
        process.execPath,
        '-e',
        `import { sourceFileForDockerPath } from ${JSON.stringify(moduleUrl)}; if (sourceFileForDockerPath(${JSON.stringify(input)}) !== ${JSON.stringify(input.files[0])}) process.exit(2);`
      ],
      { stdout: 'pipe', stderr: 'pipe', timeout: 2000 }
    );
    expect(await child.exited).toBe(0);
  });

  for (const dockerignore of ['a'.repeat(1025), Array(257).fill('absent').join('\n'), `${'*a'.repeat(500)}z`]) {
    it(`refuses ignore rules beyond the bounded analysis budget (${dockerignore.length} characters)`, () => {
      expect(
        sourceFileForDockerPath({
          raw: 'FROM scratch\nCOPY . /app\n',
          files: ['a'.repeat(3000)],
          containerPath: '/app/root.js',
          dockerignore
        })
      ).toBeUndefined();
    });
  }

  for (const dockerignore of [
    'apps',
    './apps/',
    'apps/api/index.js',
    '**/index.js',
    'apps\n!apps/api/index.js',
    '[a]pps'
  ]) {
    it(`does not claim excluded or uncertain context files: ${dockerignore.replaceAll('\n', '; ')}`, () => {
      expect(
        sourceFileForDockerPath({
          raw: 'FROM scratch\nWORKDIR /app\nCOPY . .\n',
          files: FILES,
          dockerignore,
          containerPath: 'apps/api/index.js'
        })
      ).toBeUndefined();
    });
  }
});
