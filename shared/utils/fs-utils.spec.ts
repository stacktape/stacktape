import { Buffer } from 'node:buffer';
import { describe, mock } from 'bun:test';

// Mock dependencies
mock.module('node:fs', () => ({
  default: {
    existsSync: mock(() => true),
    statSync: mock(() => ({ isDirectory: () => true, isFile: () => false })),
    readFileSync: mock(() => 'test content'),
    readdirSync: mock(() => [])
  },
  promises: {
    access: mock(async () => {}),
    stat: mock(async () => ({ isDirectory: () => true, isFile: () => false, size: 1024 })),
    readdir: mock(async () => []),
    readFile: mock(async () => Buffer.from('test'))
  }
}));

mock.module('node:crypto', () => ({
  createHash: mock(() => ({
    update: mock(function () {
      // @ts-expect-error - just ignore
      return this;
    }),
    digest: mock(() => 'abc123hash')
  }))
}));

mock.module('fs-extra', () => ({
  pathExists: mock(async () => true),
  stat: mock(async () => ({ isDirectory: () => true, size: 1024 })),
  readdir: mock(async () => []),
  readFile: mock(async () => 'content'),
  ensureDir: mock(async () => {}),
  copy: mock(async () => {}),
  remove: mock(async () => {})
}));

describe('fs-utils', () => {
  describe('isDirAccessible', () => {});

  describe('getFileExtension', () => {});

  describe('getFileHash', () => {});

  describe('getFileSize', () => {});

  describe('dirExists', () => {});

  describe('fileExists', () => {});

  describe('getAllFilesInDir', () => {});

  describe('getFolderSize', () => {});

  describe('ensureDirExists', () => {});

  describe('getDirectoriesInDir', () => {});
});
