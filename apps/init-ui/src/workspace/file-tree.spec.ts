import { describe, expect, it } from 'bun:test';
import { buildTree, fileCountLabel, fitTree, importanceOf, moreLabel, type TreeRow } from './file-tree';

/** Rows as an indented outline: `▾ lib`, `▸ docs (16)`, `  main.go`, `  +3 more`. */
const outline = (rows: readonly TreeRow[]): string[] =>
  rows.map((row) => {
    const pad = '  '.repeat(row.depth);
    if (row.kind === 'directory')
      return `${pad}${row.open ? '▾' : '▸'} ${row.label}${row.open ? '' : ` (${row.fileCount})`}`;
    if (row.kind === 'file') return `${pad}${row.name}`;
    return `${pad}${moreLabel(row)}`;
  });

const fit = (paths: string[], budget: number, pinned: string[] = []) =>
  outline(fitTree(buildTree(paths), { budget, pinned: new Set(pinned) }));

describe('importance', () => {
  const cases: Array<[path: string, importance: number]> = [
    ['package.json', 2],
    ['backend/pyproject.toml', 2],
    ['requirements-dev.txt', 2],
    ['go.mod', 2],
    ['Dockerfile', 2],
    ['other/Dockerfile.dev', 2],
    ['docker-compose.yml', 2],
    ['compose.override.yaml', 2],
    ['.env.example', 2],
    ['fly.toml', 2],
    ['prisma/schema.prisma', 2],
    ['next.config.ts', 1],
    ['drizzle.config.ts', 1],
    ['backend/app/main.py', 1],
    ['cmd/app/main.go', 1],
    ['server/index.ts', 1],
    ['src/index.ts', 1],
    ['src/components/button/index.ts', 0],
    ['README.md', 0],
    ['pnpm-lock.yaml', 0],
    ['tsconfig.json', 0],
    ['lib/db/schema.ts', 0]
  ];
  for (const [path, importance] of cases) {
    it(`${path} is ${importance}`, () => expect(importanceOf(path)).toBe(importance));
  }
});

describe('fitting the tree', () => {
  it('lists files first, at most two a folder, says how many it left out, then the folders', () => {
    expect(
      fit(['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts', 'README.md', 'LICENSE', 'notes.txt', 'z.ts'], 40)
    ).toEqual(['README.md', 'z.ts', '+2 more', '▾ src', '  a.ts', '  b.ts', '  +2 more']);
  });

  it('shows the files that matter and the ones the analysis read, wherever they are', () => {
    expect(
      fit(
        [
          'package.json',
          'next.config.ts',
          '.env.example',
          'pnpm-lock.yaml',
          'README.md',
          'lib/db/drizzle.ts',
          'lib/db/queries.ts',
          'lib/db/schema.ts',
          'lib/db/seed.ts'
        ],
        40,
        ['lib/db/drizzle.ts']
      )
    ).toEqual([
      '.env.example',
      'next.config.ts',
      'package.json',
      '+2 more',
      '▾ lib/db',
      '  drizzle.ts',
      '  queries.ts',
      '  +2 more'
    ]);
  });

  it('never says "+1 more" when the file itself fits on that row', () => {
    expect(fit(['a.ts', 'b.ts', 'c.ts'], 40)).toEqual(['a.ts', 'b.ts', 'c.ts']);
  });

  it('draws a folder with one file as that file, its folder in the name', () => {
    expect(fit(['app/api/user/route.ts', 'app/api/team/route.ts', 'app/layout.tsx'], 40)).toEqual([
      '▾ app',
      '  layout.tsx',
      '  ▾ api',
      '    team/route.ts',
      '    user/route.ts'
    ]);
  });

  it('opens folded folders from the top while they fit, and leaves the rest folded with a count', () => {
    const paths = ['package.json', ...['a', 'b', 'c', 'd'].map((name) => `docs/${name}.md`), 'src/x.ts', 'src/y.ts'];
    expect(fit(paths, 4)).toEqual(['package.json', '▸ docs (4)', '▸ src (2)']);
    expect(fit(paths, 5)).toEqual(['package.json', '▸ docs (4)', '▾ src', '  x.ts', '  y.ts']);
    expect(fit(paths, 9)).toEqual([
      'package.json',
      '▾ docs',
      '  a.md',
      '  b.md',
      '  +2 more',
      '▾ src',
      '  x.ts',
      '  y.ts'
    ]);
  });

  it('folds, stops filling and then counts folders with nothing read, until the read files fit', () => {
    const paths = [
      'package.json',
      'README.md',
      ...Array.from({ length: 6 }, (_, index) => `app/route-${index}/page.tsx`),
      ...Array.from({ length: 6 }, (_, index) => `app/route-${index}/layout.tsx`),
      'lib/auth/session.ts',
      'lib/auth/middleware.ts',
      'lib/auth/password.ts',
      'lib/db/drizzle.ts',
      'lib/db/schema.ts',
      'lib/db/seed.ts'
    ];
    expect(fit(paths, 8, ['lib/auth/session.ts', 'lib/db/drizzle.ts', 'package.json'])).toEqual([
      'package.json',
      '+1 folder, 1 file',
      '▾ lib',
      '  ▾ auth',
      '    session.ts',
      '    +2 more',
      '  ▾ db',
      '    drizzle.ts',
      '    +2 more'
    ]);
  });

  it('keeps every read file even when they alone are more than the budget', () => {
    const pinned = ['a/1.ts', 'b/2.ts', 'c/3.ts'];
    const others = ['a/x.ts', 'a/y.ts', 'b/x.ts', 'b/y.ts', 'c/x.ts', 'c/y.ts'];
    expect(fit([...pinned, ...others], 2, pinned)).toEqual([
      '▾ a',
      '  1.ts',
      '  +2 more',
      '▾ b',
      '  2.ts',
      '  +2 more',
      '▾ c',
      '  3.ts',
      '  +2 more'
    ]);
  });

  it('counts files once and names counts plainly', () => {
    const tree = buildTree(['a.ts', 'a.ts', 'src/b.ts']);
    expect(tree.fileCount).toBe(2);
    expect(fileCountLabel(1, false)).toBe('1 file');
    expect(fileCountLabel(5000, true)).toBe('5,000+ files');
  });
});
