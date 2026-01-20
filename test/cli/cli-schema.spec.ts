import { describe, expect, it } from 'bun:test';
import { cliCommands } from '../../src/config/cli/commands';
import { allowedArgs, getArgInfo, getCommandInfo, requiredArgs } from '../../src/config/cli/utils';

describe('Zod CLI Schema', () => {
  describe('getCommandInfo', () => {
    it('should return info for all CLI commands', () => {
      for (const cmd of cliCommands) {
        const info = getCommandInfo(cmd);
        expect(info.description).toBeDefined();
        expect(typeof info.description).toBe('string');
        expect(info.description.length).toBeGreaterThan(10);
        expect(info.args).toBeDefined();
      }
    });

    it('should have args matching allowedArgs', () => {
      for (const cmd of cliCommands) {
        const info = getCommandInfo(cmd);
        const infoArgs = Object.keys(info.args);
        const configArgs = allowedArgs[cmd];
        expect(infoArgs.sort()).toEqual([...configArgs].sort());
      }
    });

    it('should mark required args correctly', () => {
      for (const cmd of cliCommands) {
        const info = getCommandInfo(cmd);
        const required = [...requiredArgs[cmd]];
        for (const arg of required) {
          expect(info.args[arg]?.required).toBe(true);
        }
      }
    });
  });

  describe('getArgInfo', () => {
    it('deploy stage should have string type', () => {
      const info = getArgInfo('deploy', 'stage');
      expect(info.allowedTypes).toContain('string');
      expect(info.alias).toBe('s');
    });

    it('deploy region should have allowed values', () => {
      const info = getArgInfo('deploy', 'region');
      expect(info.allowedValues).toBeDefined();
      expect(info.allowedValues!.length).toBeGreaterThan(10);
    });

    it('logFormat should have enum values', () => {
      const info = getArgInfo('deploy', 'logFormat');
      expect(info.allowedValues).toContain('fancy');
      expect(info.allowedValues).toContain('json');
    });
  });

  describe('Schema consistency', () => {
    it('most args should have descriptions', () => {
      let totalArgs = 0;
      let argsWithDescriptions = 0;
      for (const cmd of cliCommands) {
        const info = getCommandInfo(cmd);
        for (const [argName, argData] of Object.entries(info.args)) {
          totalArgs++;
          if (argData.description && typeof argData.description === 'string') {
            argsWithDescriptions++;
            expect(argData.description.length).toBeGreaterThan(0);
          }
        }
      }
      // At least 90% of args should have descriptions
      expect(argsWithDescriptions / totalArgs).toBeGreaterThan(0.9);
    });

    it('allowedTypes should be valid type names', () => {
      const validTypes = ['string', 'boolean', 'number', 'array', 'object'];
      for (const cmd of cliCommands) {
        const info = getCommandInfo(cmd);
        for (const [argName, argData] of Object.entries(info.args)) {
          for (const type of argData.allowedTypes || []) {
            expect(validTypes).toContain(type);
          }
        }
      }
    });
  });
});

describe('Arg Type Validation Rules', () => {
  it('boolean args should have boolean type', () => {
    // Test boolean args that are in deploy command
    const deployBooleanArgs = [
      'hotSwap',
      'disableAutoRollback',
      'preserveTempFiles',
      'noCache',
      'disableDriftDetection'
    ];
    for (const arg of deployBooleanArgs) {
      const info = getArgInfo('deploy', arg);
      expect(info.allowedTypes).toContain('boolean');
    }
    // Test watch which is in dev command
    const watchInfo = getArgInfo('dev', 'watch');
    expect(watchInfo.allowedTypes).toContain('boolean');
  });

  it('array args should have array type', () => {
    // dockerArgs is in deploy, resourcesToSkip is in rollback
    const dockerArgsInfo = getArgInfo('deploy', 'dockerArgs');
    expect(dockerArgsInfo.allowedTypes).toContain('array');

    const resourcesToSkipInfo = getArgInfo('rollback', 'resourcesToSkip');
    expect(resourcesToSkipInfo.allowedTypes).toContain('array');
  });

  it('enum args should have allowedValues', () => {
    // logFormat and logLevel are in deploy
    const logFormatInfo = getArgInfo('deploy', 'logFormat');
    expect(logFormatInfo.allowedValues).toBeDefined();
    expect(logFormatInfo.allowedValues!.length).toBeGreaterThan(0);

    // region is in deploy
    const regionInfo = getArgInfo('deploy', 'region');
    expect(regionInfo.allowedValues).toBeDefined();
    expect(regionInfo.allowedValues!.length).toBeGreaterThan(0);

    // outFormat is in stack:info
    const outFormatInfo = getArgInfo('stack:info', 'outFormat');
    expect(outFormatInfo.allowedValues).toBeDefined();
    expect(outFormatInfo.allowedValues!.length).toBeGreaterThan(0);
  });
});
