import { afterEach, describe, expect, test } from 'bun:test';
import type { PackagingProgressLogger } from '../../runtime-contracts';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEsBundle } from './index';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

const progressLogger: PackagingProgressLogger = {
  eventContext: {},
  startEvent: () => {},
  updateEvent: () => {},
  finishEvent: () => {}
};

const requireBuiltBundle = createRequire(import.meta.url);

/**
 * The bundled workload records what the emitted decorator metadata hands to `Reflect.metadata`, so the assertions
 * observe metadata the built artifact really emits at runtime instead of the shape of the build options.
 */
const DECORATED_HANDLER_SOURCE = `
import { Repository } from '@app/repository';

const recorded: Record<string, unknown> = {};
(Reflect as unknown as { metadata: unknown }).metadata =
  (key: string, value: unknown) => () => {
    recorded[key] = value;
  };

const Injectable = (): ClassDecorator => (target) => target;

@Injectable()
class Service {
  constructor(private readonly repository: Repository) {}
}

export const service = new Service(new Repository());
export const designParamTypeNames = () =>
  ((recorded['design:paramtypes'] as ({ name: string } | undefined)[] | undefined) ?? []).map((type) => type?.name);
export const repositoryMarker = new Repository().marker;
`;

const PLAIN_HANDLER_SOURCE = `
import { Repository } from '@app/repository';

/** @deprecated Kept here to prove JSDoc tags are not mistaken for decorators. */
export const handler = async () => ({ statusCode: 200, body: new Repository().marker });
`;

const REPOSITORY_SOURCE = `
export class Repository {
  readonly marker = 'resolved-through-tsconfig-paths';
}
`;

/** A decorated component in a JSX file, which the project's own `jsxFactory` has to keep compiling. */
const DECORATED_VIEW_SOURCE = `
const recorded: Record<string, unknown> = {};
(Reflect as unknown as { metadata: unknown }).metadata =
  (key: string, value: unknown) => () => {
    recorded[key] = value;
  };

export const h = (tag: string, props: Record<string, unknown> | null, ...children: unknown[]) => ({
  tag,
  props,
  children
});

const Component = (): ClassDecorator => (target) => target;

class Theme {}

@Component()
class View {
  constructor(private readonly theme: Theme) {}
  render() {
    return <div id="root">rendered</div>;
  }
}

export const rendered = new View(new Theme()).render();
export const designParamTypeNames = () =>
  ((recorded['design:paramtypes'] as ({ name: string } | undefined)[] | undefined) ?? []).map((type) => type?.name);
`;

const VIEW_HANDLER_SOURCE = `
export { designParamTypeNames, rendered } from './view';
`;

const TSCONFIG_SOURCE = JSON.stringify({
  compilerOptions: {
    target: 'ES2022',
    module: 'ESNext',
    moduleResolution: 'bundler',
    experimentalDecorators: true,
    // A project that compiles its helpers out of `tslib` must not make the packaged workload depend on it.
    importHelpers: true,
    jsx: 'react',
    jsxFactory: 'h',
    baseUrl: '.',
    paths: { '@app/*': ['src/*'] }
  }
});

const createProject = async ({
  sources,
  tsconfigSource = TSCONFIG_SOURCE
}: {
  sources: Record<string, string>;
  tsconfigSource?: string;
}): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'stacktape-es-decorators-'));
  temporaryDirectories.push(cwd);
  await mkdir(join(cwd, 'src'));
  await Promise.all([
    writeFile(join(cwd, 'tsconfig.json'), tsconfigSource),
    writeFile(join(cwd, 'src', 'repository.ts'), REPOSITORY_SOURCE),
    ...Object.entries(sources).map(([fileName, contents]) => writeFile(join(cwd, 'src', fileName), contents))
  ]);
  return cwd;
};

const bundle = ({
  cwd,
  distFolderName = 'dist',
  emitTsDecoratorMetadata,
  sourceMaps = 'disabled'
}: {
  cwd: string;
  distFolderName?: string;
  emitTsDecoratorMetadata?: boolean;
  sourceMaps?: 'inline' | 'external' | 'disabled';
}) =>
  createEsBundle({
    name: 'handler',
    cwd,
    entryfilePath: join(cwd, 'src', 'handler.ts'),
    distFolderPath: join(cwd, '.stacktape', distFolderName),
    existingDigests: [],
    invocationId: 'test',
    progressLogger,
    minify: false,
    nodeTarget: '24',
    sourceMaps,
    sourceMapBannerType: 'disabled',
    tsConfigPath: join(cwd, 'tsconfig.json'),
    ...(emitTsDecoratorMetadata === undefined ? {} : { emitTsDecoratorMetadata }),
    installNonStaticallyBuiltDepsInDocker: false,
    nativeDependencyInstallationRootPath: join(cwd, '.stacktape', 'native'),
    installDependencies: async () => {},
    runDocker: async () => {
      throw new Error('Docker should not be needed for this bundle.');
    },
    createPackagingError: ({ message, cause }) => new Error(message, cause === undefined ? undefined : { cause })
  });

type DecoratedBundleExports = {
  designParamTypeNames: () => (string | undefined)[];
  repositoryMarker: string;
};

describe('ECMAScript decorator metadata', () => {
  test('emits design metadata that the built artifact records at runtime', async () => {
    const cwd = await createProject({ sources: { 'handler.ts': DECORATED_HANDLER_SOURCE } });

    const result = await bundle({ cwd, emitTsDecoratorMetadata: true });
    const built = requireBuiltBundle(result.distIndexFilePath) as DecoratedBundleExports;

    // The recorded constructor type is the aliased class itself, so the project's `paths` still resolve and the
    // import the metadata depends on survives bundling.
    expect(built.designParamTypeNames()).toEqual(['Repository']);
    expect(built.repositoryMarker).toBe('resolved-through-tsconfig-paths');
    // Decorator helpers are inlined, so the transform must not pull `tslib` into the workload.
    expect(result.resolvedModules).toContain('@app/repository');
    expect(result.resolvedModules).not.toContain('tslib');
    expect(await readFile(result.distIndexFilePath, 'utf8')).not.toContain('tslib');
  });

  test.each([
    ['a line break', '@\nInjectable()'],
    ['an intervening comment', '@ /* generated */ Injectable()'],
    ['a parenthesized expression', '@(Injectable())']
  ])('recognizes a decorator with %s', async (_description, decoratorExpression) => {
    const cwd = await createProject({
      sources: {
        'handler.ts': DECORATED_HANDLER_SOURCE.replace('@Injectable()', decoratorExpression)
      }
    });

    const result = await bundle({ cwd, emitTsDecoratorMetadata: true });
    const built = requireBuiltBundle(result.distIndexFilePath) as DecoratedBundleExports;

    expect(built.designParamTypeNames()).toEqual(['Repository']);
  });

  test('emits no design metadata when the option is not requested', async () => {
    const cwd = await createProject({ sources: { 'handler.ts': DECORATED_HANDLER_SOURCE } });

    const result = await bundle({ cwd });
    const built = requireBuiltBundle(result.distIndexFilePath) as DecoratedBundleExports;

    expect(built.designParamTypeNames()).toEqual([]);
    expect(built.repositoryMarker).toBe('resolved-through-tsconfig-paths');
  });

  test('emits design metadata for a decorated JSX source while its JSX factory keeps applying', async () => {
    const cwd = await createProject({
      sources: { 'handler.ts': VIEW_HANDLER_SOURCE, 'view.tsx': DECORATED_VIEW_SOURCE }
    });

    const result = await bundle({ cwd, emitTsDecoratorMetadata: true });
    const built = requireBuiltBundle(result.distIndexFilePath) as {
      designParamTypeNames: () => (string | undefined)[];
      rendered: { tag: string; props: { id: string } };
    };

    expect(built.designParamTypeNames()).toEqual(['Theme']);
    expect(built.rendered).toMatchObject({ tag: 'div', props: { id: 'root' } });
  });

  test('disables source maps rather than emitting misleading transformed locations', async () => {
    const cwd = await createProject({ sources: { 'handler.ts': DECORATED_HANDLER_SOURCE } });

    const result = await bundle({ cwd, emitTsDecoratorMetadata: true, sourceMaps: 'external' });
    const code = await readFile(result.distIndexFilePath, 'utf8');

    expect(code).not.toContain('sourceMappingURL=');
    expect(await Bun.file(`${result.distIndexFilePath}.map`).exists()).toBe(false);
  });

  test('preserves an explicitly configured CommonJS module contract', async () => {
    const cwd = await createProject({
      tsconfigSource: JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'CommonJS',
          moduleResolution: 'node',
          experimentalDecorators: true
        }
      }),
      sources: {
        'legacy.ts': `
const Injectable = (): ClassDecorator => (target) => target;

@Injectable()
class LegacyService {
  static readonly marker = 'commonjs-export-preserved';
}

export = LegacyService;
`,
        'handler.ts': `
import LegacyService = require('./legacy');

export const marker = LegacyService.marker;
`
      }
    });

    const result = await bundle({ cwd, emitTsDecoratorMetadata: true });
    const built = requireBuiltBundle(result.distIndexFilePath) as { marker: string };

    expect(built.marker).toBe('commonjs-export-preserved');
  });

  test('leaves sources without decorators byte-identical to a build that does not ask for metadata', async () => {
    const cwd = await createProject({ sources: { 'handler.ts': PLAIN_HANDLER_SOURCE } });

    const withMetadata = await bundle({ cwd, distFolderName: 'with', emitTsDecoratorMetadata: true });
    const withoutMetadata = await bundle({ cwd, distFolderName: 'without' });

    expect(await readFile(withMetadata.distIndexFilePath, 'utf8')).toBe(
      await readFile(withoutMetadata.distIndexFilePath, 'utf8')
    );
  });
});
