import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { checkDocumentLinks } from './check-docs.ts';

test('repository docs catch stale paths while accepting local images and reference links', () => {
  const root = mkdtempSync(join(tmpdir(), 'stacktape-doc-links-'));
  try {
    writeFileSync(join(root, 'guide.md'), 'A guide.');
    writeFileSync(join(root, 'cover.png'), 'fixture');
    writeFileSync(
      join(root, 'README.md'),
      '[Guide](guide.md#setup)\n![Cover](cover.png)\n[Policy][policy]\n\n[policy]: old-policy.md\n'
    );
    assert.deepEqual(checkDocumentLinks(join(root, 'README.md'), root), [
      'README.md:5: missing link target old-policy.md'
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('private links are optional in public clones and checked with Console initialized', () => {
  const root = mkdtempSync(join(tmpdir(), 'stacktape-doc-links-'));
  try {
    writeFileSync(join(root, 'README.md'), '[Console](apps/console/README.md)\n[Other app](apps/missing/README.md)\n');
    assert.deepEqual(checkDocumentLinks(join(root, 'README.md'), root), [
      'README.md:2: missing link target apps/missing/README.md'
    ]);
    mkdirSync(join(root, 'apps/console/api'), { recursive: true });
    writeFileSync(join(root, 'apps/console/api/package.json'), '{}');
    assert.deepEqual(checkDocumentLinks(join(root, 'README.md'), root), [
      'README.md:1: missing link target apps/console/README.md',
      'README.md:2: missing link target apps/missing/README.md'
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('remote links and examples do not require local files; quoted paths resolve', () => {
  const root = mkdtempSync(join(tmpdir(), 'stacktape-doc-links-'));
  try {
    writeFileSync(join(root, 'my guide.md'), 'A guide.');
    writeFileSync(
      join(root, 'README.md'),
      '[Guide](<my%20guide.md> "Read this")\n[Docs](https://docs.stacktape.com/)\n[Route](/cli/deploy/)\n[Heading](#setup)\n```md\n[Example](missing.md)\n```\n'
    );
    assert.deepEqual(checkDocumentLinks(join(root, 'README.md'), root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
