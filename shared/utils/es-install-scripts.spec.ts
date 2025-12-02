import { describe, expect, test } from 'bun:test';
import { getEsInstallScript } from './es-install-scripts';

describe('es-install-scripts', () => {
  describe('getEsInstallScript', () => {
    test('should return npm normal install script', () => {
      const script = getEsInstallScript('npm', 'normal');
      expect(script).toEqual(['npm', 'install']);
    });
  });
});
