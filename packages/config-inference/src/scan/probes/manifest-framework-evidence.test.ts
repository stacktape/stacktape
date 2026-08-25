import { describe, expect, test } from 'bun:test';
import { hasStartFrameworkProductionCommand, inspectFrameworkConfig } from './manifest-framework-evidence';

const inspectViteConfig = (body: string) =>
  inspectFrameworkConfig(
    'vite.config.ts',
    [`import { tanstackStart } from '@tanstack/react-start/plugin/vite';`, body].join('\n')
  );

describe('framework config reachability', () => {
  test('rejects stale object members and plugin lists mutated directly or through an alias', () => {
    expect(
      inspectViteConfig(
        'let helpers = { make: () => tanstackStart() }; helpers = { make: () => ({}) }; export default { plugins: [helpers.make()] };'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const helpers = { make: () => tanstackStart() }; Object.assign(helpers, { make: () => ({}) }); export default { plugins: [helpers.make()] };'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig('const plugins = [tanstackStart()]; plugins.pop(); export default { plugins };').tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const mutablePlugins = plugins; mutablePlugins.pop(); export default { plugins };'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const config = { plugins }; config.plugins.pop(); export default { plugins };'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const config = { plugins }; const alias = config.plugins; alias.pop(); export default config;'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const config = { plugins }; let alias; alias = config.plugins; alias.pop(); export default config;'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const config = { plugins }; const { plugins: alias } = config; alias.pop(); export default config;'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const config = { plugins }; let alias; ({ plugins: alias } = config); alias.pop(); export default config;'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const config = { plugins }; const clone = { ...config }; clone.plugins.pop(); export default config;'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; Array.prototype.pop.call(plugins); export default { plugins };'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig('const plugins = [tanstackStart()]; plugins.pop.call(plugins); export default { plugins };')
        .tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; plugins.splice.apply(plugins, [0, 1]); export default { plugins };'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const remove = plugins.pop.bind(plugins); remove(); export default { plugins };'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; plugins.splice.bind(plugins, 0, 1)(); export default { plugins };'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; Array.prototype.pop.bind(plugins)(); export default { plugins };'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const remove = plugins.pop.bind(plugins); const alias = remove; alias.call(undefined); export default { plugins };'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const boundPop = plugins.pop.bind(plugins); Reflect.apply(boundPop, null, []); export default { plugins };'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const remove = plugins.pop; remove.call(plugins); export default { plugins };'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const { pop } = plugins; pop.call(plugins); export default { plugins };'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const remove = plugins.pop; Reflect.apply(remove, plugins, []); export default { plugins };'
      ).tanstackStart
    ).toBe(false);
  });

  test('keeps safe aliases and does not mistake a shadowed Object.assign for the global mutator', () => {
    expect(
      inspectViteConfig(
        'const helpers = { make: () => tanstackStart() }; const helperAlias = helpers; export default { plugins: [helperAlias.make()] };'
      ).tanstackStart
    ).toBe(true);
    expect(
      inspectViteConfig(
        'const Object = { assign: () => undefined }; const helpers = { make: () => tanstackStart() }; Object.assign(helpers, {}); export default { plugins: [helpers.make()] };'
      ).tanstackStart
    ).toBe(true);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; let pluginAlias = plugins; pluginAlias = []; export default { plugins };'
      ).tanstackStart
    ).toBe(true);
    expect(
      inspectViteConfig(
        'const Array = { prototype: { pop: { call: () => undefined } } }; const plugins = [tanstackStart()]; Array.prototype.pop.call(plugins); export default { plugins };'
      ).tanstackStart
    ).toBe(true);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const other = []; plugins.pop.call(other); export default { plugins };'
      ).tanstackStart
    ).toBe(true);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const remove = plugins.pop.bind(plugins); export default { plugins };'
      ).tanstackStart
    ).toBe(true);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const other = []; const remove = plugins.pop.bind(other); remove(); export default { plugins };'
      ).tanstackStart
    ).toBe(true);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; let remove = plugins.pop.bind(plugins); remove = () => undefined; remove(); export default { plugins };'
      ).tanstackStart
    ).toBe(true);
    expect(
      inspectViteConfig(
        'const Reflect = { apply: () => undefined }; const plugins = [tanstackStart()]; const boundPop = plugins.pop.bind(plugins); Reflect.apply(boundPop, null, []); export default { plugins };'
      ).tanstackStart
    ).toBe(true);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const other = []; const remove = plugins.pop; remove.call(other); export default { plugins };'
      ).tanstackStart
    ).toBe(true);
    expect(
      inspectViteConfig(
        'const plugins = [tanstackStart()]; const other = []; const { pop } = plugins; pop.call(other); export default { plugins };'
      ).tanstackStart
    ).toBe(true);
  });

  test('follows destructured callable provenance from namespace imports and local helper objects', () => {
    expect(
      inspectFrameworkConfig(
        'vite.config.ts',
        [
          "import * as startPlugin from '@tanstack/react-start/plugin/vite';",
          'const { tanstackStart } = startPlugin;',
          'export default { plugins: [tanstackStart()] };'
        ].join('\n')
      ).tanstackStart
    ).toBe(true);
    expect(
      inspectFrameworkConfig(
        'vite.config.ts',
        [
          "import * as startPlugin from '@tanstack/react-start/plugin/vite';",
          'const alias = startPlugin;',
          'const { tanstackStart } = alias;',
          'export default { plugins: [tanstackStart()] };'
        ].join('\n')
      ).tanstackStart
    ).toBe(true);
    expect(
      inspectFrameworkConfig(
        'vite.config.ts',
        [
          "import * as startPlugin from '@tanstack/react-start/plugin/vite';",
          'const alias = startPlugin;',
          'export default { plugins: [alias.tanstackStart()] };'
        ].join('\n')
      ).tanstackStart
    ).toBe(true);
    expect(
      inspectViteConfig(
        'const helpers = { make: () => tanstackStart() }; const { make: createStart } = helpers; export default { plugins: [createStart()] };'
      ).tanstackStart
    ).toBe(true);
    expect(
      inspectViteConfig(
        'const helpers = { tanstackStart }; const { tanstackStart: createStart } = helpers; export default { plugins: [createStart()] };'
      ).tanstackStart
    ).toBe(true);
    expect(
      inspectFrameworkConfig(
        'vite.config.ts',
        [
          "import * as startPlugin from '@tanstack/react-start/plugin/vite';",
          'const { tanstackStart } = startPlugin;',
          'export default { plugins: [tanstackStart] };'
        ].join('\n')
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'const helpers = { make: () => tanstackStart() }; helpers.make = () => ({}); const { make } = helpers; export default { plugins: [make()] };'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectFrameworkConfig(
        'vite.config.ts',
        [
          "import * as startPlugin from '@tanstack/react-start/plugin/vite';",
          'let alias = startPlugin;',
          'alias = { tanstackStart: () => ({}) };',
          'const { tanstackStart } = alias;',
          'export default { plugins: [tanstackStart()] };'
        ].join('\n')
      ).tanstackStart
    ).toBe(false);
  });

  test('follows a named default-exported config function and terminates on local cycles', () => {
    expect(
      inspectViteConfig('export default function config() { return { plugins: [tanstackStart()] }; }').tanstackStart
    ).toBe(true);
    expect(
      inspectViteConfig('function config() { return { plugins: [tanstackStart()] }; } export default config;')
        .tanstackStart
    ).toBe(true);
    expect(
      inspectViteConfig(
        'function config() { return other(); } function other() { return config(); } export default config;'
      ).tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig('function* config() { return { plugins: [tanstackStart()] }; } export default config;')
        .tanstackStart
    ).toBe(false);
    expect(
      inspectViteConfig(
        'export default function config() { return { plugins: [tanstackStart()] }; } config = () => ({ plugins: [] });'
      ).tanstackStart
    ).toBe(false);
  });
});

describe('Yarn Classic production command parsing', () => {
  test('consumes an optional value when the next token is not another option', () => {
    expect(
      hasStartFrameworkProductionCommand(
        'yarn --emoji false --production true --scripts-prepend-node-path false vinxi start'
      )
    ).toBe(true);
    expect(hasStartFrameworkProductionCommand('yarn --prod vinxi start')).toBe(false);
    expect(hasStartFrameworkProductionCommand('yarn --prod false vinxi start')).toBe(true);
    expect(hasStartFrameworkProductionCommand('yarn --prod 0 vinxi start')).toBe(true);
    expect(hasStartFrameworkProductionCommand('yarn --prod --silent vinxi start')).toBe(true);
    expect(hasStartFrameworkProductionCommand('yarn --emoji=false vinxi start')).toBe(true);
    expect(hasStartFrameworkProductionCommand('yarn --production false echo vinxi start')).toBe(false);
  });
});
