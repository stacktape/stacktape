import { describe, mock } from 'bun:test';

// Mock dependencies
mock.module('@config', () => ({
  IS_DEV: false
}));

mock.module('@shared/naming/project-fs-paths', () => ({
  SCRIPTS_ASSETS_PATH: '/assets'
}));

mock.module('./bin-executable', () => ({
  getPlatform: mock(() => 'linux')
}));

mock.module('./constants', () => ({
  NIXPACKS_BINARY_FILE_NAMES: {
    linux: 'nixpacks-linux',
    darwin: 'nixpacks-darwin',
    win: 'nixpacks.exe'
  }
}));

mock.module('./exec', () => ({
  exec: mock(async () => ({ stdout: 'nixpacks output', stderr: '' }))
}));

mock.module('./misc', () => ({
  getError: mock((opts) => new Error(opts.message))
}));

describe('nixpack-exec', () => {
  describe('execNixpacks', () => {});
});
