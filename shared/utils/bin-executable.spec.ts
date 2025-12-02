import { describe, expect, test } from 'bun:test';
import { getDevModeBinPath, getInstallationScript, getPlatform } from './bin-executable';

describe('bin-executable utilities', () => {
  describe('getPlatform', () => {
    test('should return a valid supported platform', () => {
      const platform = getPlatform();
      const validPlatforms: SupportedPlatform[] = ['win', 'linux', 'macos', 'macos-arm', 'alpine', 'linux-arm'];
      expect(validPlatforms).toContain(platform);
    });

    test('should return platform as string', () => {
      const platform = getPlatform();
      expect(typeof platform).toBe('string');
    });

    test('should consistently return same platform', () => {
      const platform1 = getPlatform();
      const platform2 = getPlatform();
      expect(platform1).toBe(platform2);
    });

    test('should return win for win32', () => {
      if (process.platform === 'win32') {
        expect(getPlatform()).toBe('win');
      }
    });

    test('should return linux for linux platform', () => {
      if (process.platform === 'linux') {
        expect(getPlatform()).toBe('linux');
      }
    });

    test('should return macos or macos-arm for darwin', () => {
      if (process.platform === 'darwin') {
        const platform = getPlatform();
        expect(['macos', 'macos-arm']).toContain(platform);
      }
    });

    test('should differentiate macOS by architecture', () => {
      if (process.platform === 'darwin') {
        const platform = getPlatform();
        if (process.arch === 'x64') {
          expect(platform).toBe('macos');
        } else if (process.arch === 'arm64') {
          expect(platform).toBe('macos-arm');
        }
      }
    });
  });

  describe('getInstallationScript', () => {
    test('should return installation script as string', () => {
      const script = getInstallationScript();
      expect(typeof script).toBe('string');
      expect(script.length).toBeGreaterThan(0);
    });

    test('should return script with https URL', () => {
      const script = getInstallationScript();
      expect(script).toContain('https://installs.stacktape.com/');
    });

    test('should return curl command for Unix-like systems', () => {
      const platform = getPlatform();
      const script = getInstallationScript();

      if (['linux', 'linux-arm', 'alpine', 'macos', 'macos-arm'].includes(platform)) {
        expect(script).toContain('curl');
        expect(script).toContain('-L');
        expect(script).toContain('.sh');
      }
    });

    test('should return PowerShell command for Windows', () => {
      if (getPlatform() === 'win') {
        const script = getInstallationScript();
        expect(script).toContain('iwr');
        expect(script).toContain('.ps1');
        expect(script).toContain('iex');
      }
    });

    test('should include platform-specific script name', () => {
      const platform = getPlatform();
      const script = getInstallationScript();

      const platformScriptMap = {
        win: 'windows.ps1',
        linux: 'linux.sh',
        'linux-arm': 'linux-arm.sh',
        alpine: 'alpine.sh',
        macos: 'macos.sh',
        'macos-arm': 'macos-arm.sh'
      };

      expect(script).toContain(platformScriptMap[platform]);
    });

    test('should return consistent script for same platform', () => {
      const script1 = getInstallationScript();
      const script2 = getInstallationScript();
      expect(script1).toBe(script2);
    });

    test('should not contain newlines or extra whitespace', () => {
      const script = getInstallationScript();
      expect(script).not.toContain('\n');
      expect(script.trim()).toBe(script);
    });

    test('should be a valid shell/PowerShell one-liner', () => {
      const script = getInstallationScript();
      // Should not have multiple commands separated by semicolons or &&
      // except for the pipe operator which is expected
      const pipes = script.split('|');
      expect(pipes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getDevModeBinPath', () => {
    test('should return path as string', () => {
      const path = getDevModeBinPath();
      expect(typeof path).toBe('string');
    });

    test('should include __binary-dist directory', () => {
      const path = getDevModeBinPath();
      expect(path).toContain('__binary-dist');
    });

    test('should include stacktape executable name', () => {
      const path = getDevModeBinPath();
      expect(path).toContain('stacktape');
    });

    test('should return platform-specific path', () => {
      const path = getDevModeBinPath();

      if (process.platform === 'win32') {
        expect(path).toContain('windows');
        expect(path).toContain('.exe');
      } else if (process.platform === 'linux') {
        expect(path).toContain('linux');
        expect(path).not.toContain('.exe');
      } else if (process.platform === 'darwin') {
        expect(path).toContain('macos');
        expect(path).not.toContain('.exe');
      }
    });

    test('should use current working directory', () => {
      const path = getDevModeBinPath();
      expect(path).toContain(process.cwd());
    });

    test('should return consistent path', () => {
      const path1 = getDevModeBinPath();
      const path2 = getDevModeBinPath();
      expect(path1).toBe(path2);
    });

    test('should use forward or backward slashes', () => {
      const path = getDevModeBinPath();
      const hasSlash = path.includes('/') || path.includes('\\');
      expect(hasSlash).toBe(true);
    });

    test('should end with stacktape or stacktape.exe', () => {
      const path = getDevModeBinPath();
      expect(path.endsWith('stacktape') || path.endsWith('stacktape.exe')).toBe(true);
    });
  });

  describe('platform-specific behaviors', () => {
    test('should handle Windows platform correctly', () => {
      if (process.platform === 'win32') {
        expect(getPlatform()).toBe('win');
        expect(getInstallationScript()).toContain('iwr');
        expect(getDevModeBinPath()).toContain('windows');
      }
    });

    test('should handle Linux platform correctly', () => {
      if (process.platform === 'linux') {
        expect(getPlatform()).toBe('linux');
        expect(getInstallationScript()).toContain('curl');
        expect(getDevModeBinPath()).toContain('linux');
      }
    });

    test('should handle macOS platform correctly', () => {
      if (process.platform === 'darwin') {
        const platform = getPlatform();
        expect(['macos', 'macos-arm']).toContain(platform);
        expect(getInstallationScript()).toContain('curl');
        expect(getDevModeBinPath()).toContain('macos');
      }
    });
  });
});
