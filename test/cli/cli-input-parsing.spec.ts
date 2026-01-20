import { beforeEach, describe, expect, it } from 'bun:test';

// We need to mock process.argv for testing getCliInput
const originalArgv = process.argv;

describe('CLI Input Parsing', () => {
  beforeEach(() => {
    process.argv = ['node', 'stacktape'];
  });

  describe('getCliInput', () => {
    it('should parse command correctly', async () => {
      process.argv = ['node', 'stacktape', 'deploy'];
      const { getCliInput } = await import('../../src/utils/cli');
      const result = getCliInput();
      expect(result.commands).toContain('deploy');
    });

    it('should parse stage argument with long form', async () => {
      process.argv = ['node', 'stacktape', 'deploy', '--stage', 'production'];
      delete require.cache[require.resolve('../../src/utils/cli')];
      const { getCliInput } = await import('../../src/utils/cli');
      const result = getCliInput();
      expect(result.options.stage).toBe('production');
    });

    it('should parse stage argument with short alias', async () => {
      process.argv = ['node', 'stacktape', 'deploy', '-s', 'staging'];
      delete require.cache[require.resolve('../../src/utils/cli')];
      const { getCliInput } = await import('../../src/utils/cli');
      const result = getCliInput();
      expect(result.options.stage).toBe('staging');
    });

    it('should parse region argument', async () => {
      process.argv = ['node', 'stacktape', 'deploy', '--region', 'us-east-1'];
      delete require.cache[require.resolve('../../src/utils/cli')];
      const { getCliInput } = await import('../../src/utils/cli');
      const result = getCliInput();
      expect(result.options.region).toBe('us-east-1');
    });

    it('should parse boolean flags', async () => {
      process.argv = ['node', 'stacktape', 'deploy', '--hotSwap'];
      delete require.cache[require.resolve('../../src/utils/cli')];
      const { getCliInput } = await import('../../src/utils/cli');
      const result = getCliInput();
      expect(result.options.hotSwap).toBe(true);
    });

    it('should convert help flag to help command', async () => {
      process.argv = ['node', 'stacktape', 'deploy', '--help'];
      delete require.cache[require.resolve('../../src/utils/cli')];
      const { getCliInput } = await import('../../src/utils/cli');
      const result = getCliInput();
      expect(result.commands).toContain('help');
      expect(result.options.command).toBe('deploy');
    });

    it('should convert -h to help command', async () => {
      process.argv = ['node', 'stacktape', '-h'];
      delete require.cache[require.resolve('../../src/utils/cli')];
      const { getCliInput } = await import('../../src/utils/cli');
      const result = getCliInput();
      expect(result.commands).toContain('help');
    });

    it('should convert version flag to version command', async () => {
      process.argv = ['node', 'stacktape', '--version'];
      delete require.cache[require.resolve('../../src/utils/cli')];
      const { getCliInput } = await import('../../src/utils/cli');
      const result = getCliInput();
      expect(result.commands).toContain('version');
    });

    it('should parse array arguments (dockerArgs)', async () => {
      process.argv = ['node', 'stacktape', 'deploy', '--dockerArgs', 'build-arg=FOO', '--dockerArgs', 'no-cache'];
      delete require.cache[require.resolve('../../src/utils/cli')];
      const { getCliInput } = await import('../../src/utils/cli');
      const result = getCliInput();
      expect(Array.isArray(result.options.dockerArgs)).toBe(true);
      expect(result.options.dockerArgs).toContain('build-arg=FOO');
      expect(result.options.dockerArgs).toContain('no-cache');
    });

    it('should parse multiple options together', async () => {
      process.argv = [
        'node',
        'stacktape',
        'deploy',
        '--stage',
        'prod',
        '--region',
        'eu-west-1',
        '--profile',
        'my-profile',
        '--hotSwap'
      ];
      delete require.cache[require.resolve('../../src/utils/cli')];
      const { getCliInput } = await import('../../src/utils/cli');
      const result = getCliInput();
      expect(result.options.stage).toBe('prod');
      expect(result.options.region).toBe('eu-west-1');
      expect(result.options.profile).toBe('my-profile');
      expect(result.options.hotSwap).toBe(true);
    });

    it('should handle additional args after --', async () => {
      process.argv = ['node', 'stacktape', 'script:run', '--scriptName', 'test', '--', '--custom', 'value'];
      delete require.cache[require.resolve('../../src/utils/cli')];
      const { getCliInput } = await import('../../src/utils/cli');
      const result = getCliInput();
      expect(result.commands).toContain('script:run');
      expect(result.options.scriptName).toBe('test');
      expect(result.additionalArgs).toBeDefined();
      expect(result.additionalArgs?.custom).toBe('value');
    });

    it('should handle kebab-case to camelCase conversion', async () => {
      process.argv = ['node', 'stacktape', 'deploy', '--config-path', './my-config.yml'];
      delete require.cache[require.resolve('../../src/utils/cli')];
      const { getCliInput } = await import('../../src/utils/cli');
      const result = getCliInput();
      expect(result.options.configPath).toBe('./my-config.yml');
    });
  });

  describe('transformToCliArgs', () => {
    it('should transform args object to CLI array', async () => {
      const { transformToCliArgs } = await import('../../src/utils/cli');
      const result = transformToCliArgs({
        stage: 'prod',
        region: 'us-east-1',
        hotSwap: true
      });
      expect(result).toContain('--stage');
      expect(result).toContain('prod');
      expect(result).toContain('--region');
      expect(result).toContain('us-east-1');
      expect(result).toContain('--hotSwap');
    });

    it('should skip false boolean values', async () => {
      const { transformToCliArgs } = await import('../../src/utils/cli');
      const result = transformToCliArgs({
        stage: 'prod',
        hotSwap: false
      });
      expect(result).toContain('--stage');
      expect(result).not.toContain('--hotSwap');
    });
  });
});
