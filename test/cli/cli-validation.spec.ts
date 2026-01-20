import { describe, expect, it } from 'bun:test';
import { cliCommands } from '../../src/config/cli/commands';
import { argAliases as cliArgsAliases } from '../../src/config/cli/options';
import { allowedArgs, requiredArgs } from '../../src/config/cli/utils';

describe('CLI Definition', () => {
  describe('cliCommands', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(cliCommands)).toBe(true);
      expect(cliCommands.length).toBeGreaterThan(0);
    });

    it('should contain essential commands', () => {
      const essentialCommands = ['deploy', 'delete', 'help', 'version', 'dev', 'logs'];
      for (const cmd of essentialCommands) {
        expect(cliCommands).toContain(cmd);
      }
    });

    it('should have unique command names', () => {
      const uniqueCommands = new Set(cliCommands);
      expect(uniqueCommands.size).toBe(cliCommands.length);
    });
  });

  describe('allowedArgs', () => {
    it('should have entries for all CLI commands', () => {
      for (const cmd of cliCommands) {
        expect(allowedArgs[cmd]).toBeDefined();
        expect(Array.isArray(allowedArgs[cmd])).toBe(true);
      }
    });

    it('should have common args for most commands', () => {
      const commandsWithCommonArgs = cliCommands.filter(
        (cmd) =>
          ![
            'help',
            'version',
            'defaults:configure',
            'defaults:list',
            'upgrade',
            'init',
            'aws-profile:create',
            'aws-profile:update',
            'aws-profile:delete',
            'aws-profile:list'
          ].includes(cmd)
      );
      for (const cmd of commandsWithCommonArgs) {
        const args = allowedArgs[cmd];
        expect(args).toContain('profile');
      }
    });

    it('deploy command should have expected args', () => {
      const deployArgs = allowedArgs['deploy'];
      expect(deployArgs).toContain('stage');
      expect(deployArgs).toContain('region');
      expect(deployArgs).toContain('configPath');
      expect(deployArgs).toContain('hotSwap');
      expect(deployArgs).toContain('disableAutoRollback');
    });

    it('dev command should have expected args', () => {
      const devArgs = allowedArgs['dev'];
      expect(devArgs).toContain('stage');
      expect(devArgs).toContain('region');
      expect(devArgs).toContain('watch');
      expect(devArgs).toContain('resourceName');
    });
  });

  describe('requiredArgs', () => {
    it('should have entries for all CLI commands', () => {
      for (const cmd of cliCommands) {
        expect(requiredArgs[cmd]).toBeDefined();
        expect(Array.isArray(requiredArgs[cmd]) || requiredArgs[cmd][Symbol.iterator]).toBe(true);
      }
    });

    it('required args should be subset of allowed args', () => {
      for (const cmd of cliCommands) {
        const required = requiredArgs[cmd];
        const allowed = allowedArgs[cmd];
        for (const arg of required) {
          expect(allowed).toContain(arg);
        }
      }
    });

    it('deploy command should require stage and region', () => {
      expect(requiredArgs['deploy']).toContain('stage');
      expect(requiredArgs['deploy']).toContain('region');
    });

    it('help and version should have no required args', () => {
      expect([...requiredArgs['help']]).toEqual([]);
      expect([...requiredArgs['version']]).toEqual([]);
    });
  });

  describe('cliArgsAliases', () => {
    it('should have short aliases for common args', () => {
      expect(cliArgsAliases['stage']).toBe('s');
      expect(cliArgsAliases['region']).toBe('r');
      expect(cliArgsAliases['profile']).toBe('p');
      expect(cliArgsAliases['configPath']).toBe('cp');
      expect(cliArgsAliases['help']).toBe('h');
    });

    it('aliases should be unique', () => {
      const aliases = Object.values(cliArgsAliases);
      const uniqueAliases = new Set(aliases);
      expect(uniqueAliases.size).toBe(aliases.length);
    });

    it('aliases should be short (1-4 chars)', () => {
      for (const alias of Object.values(cliArgsAliases)) {
        expect(alias.length).toBeLessThanOrEqual(4);
        expect(alias.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
