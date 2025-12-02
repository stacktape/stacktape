import { describe, mock } from 'bun:test';

// Mock exec
mock.module('./exec', () => ({
  exec: mock(async () => ({ stdout: 'pack output', stderr: '' }))
}));

mock.module('./misc', () => ({
  getError: mock((opts) => new Error(opts.message))
}));

mock.module('./bin-executable', () => ({
  getPlatform: mock(() => 'linux')
}));

mock.module('./constants', () => ({
  PACK_BINARY_FILE_NAMES: {
    linux: 'pack-linux',
    darwin: 'pack-darwin',
    win: 'pack.exe'
  }
}));

mock.module('@config', () => ({
  IS_DEV: false
}));

mock.module('@shared/naming/project-fs-paths', () => ({
  SCRIPTS_ASSETS_PATH: '/assets'
}));

describe('pack-exec', () => {
  describe('execPack', () => {});
});
