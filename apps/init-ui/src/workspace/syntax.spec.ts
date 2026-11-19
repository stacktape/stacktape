import { describe, expect, it } from 'bun:test';
import { languageOf, tokenizeFile, tokenizeLine } from './syntax';

const kinds = (line: string, path: string) =>
  tokenizeLine(line, languageOf(path))
    .tokens.filter((token) => token.kind !== 'plain')
    .map((token) => `${token.kind}:${token.text}`);

describe('quiet syntax colouring', () => {
  it.each([
    ['package.json', '  "postgres": "^3.4.5",', ['key:"postgres"', 'string:"^3.4.5"']],
    [
      'lib/db.ts',
      "import postgres from 'postgres'; // the driver",
      ['keyword:import', 'keyword:from', "string:'postgres'", 'comment:// the driver']
    ],
    ['main.py', 'app = FastAPI(title="api")  # entry', ['string:"api"', 'comment:# entry']],
    ['compose.yml', '    image: postgres:18', ['key:image', 'number:18']],
    ['.env.example', 'POSTGRES_URL=••••', ['key:POSTGRES_URL']],
    ['Dockerfile', 'FROM node:22 AS base', ['keyword:FROM', 'number:22', 'keyword:AS']],
    ['go.mod', 'require github.com/jackc/pgx/v5 v5.7.6', []],
    [
      'a.ts',
      'const url = `${base}#x`; const n = v2 + 10',
      ['keyword:const', 'string:`${base}#x`', 'keyword:const', 'number:10']
    ]
  ])('%p: %p', (path, line, expected) => {
    expect(kinds(line, path)).toEqual(expected);
  });

  it('keeps every character of the line', () => {
    const line = '  "scripts": { "build": "next build" }, // 1';
    expect(
      tokenizeLine(line, 'json')
        .tokens.map((token) => token.text)
        .join('')
    ).toBe(line);
  });

  it('carries a block comment across lines', () => {
    const lines = tokenizeFile('/* one\n two */ const a = 1', 'a.ts');
    expect(lines[0]).toEqual([{ text: '/* one', kind: 'comment' }]);
    expect(lines[1]![0]).toEqual({ text: ' two */', kind: 'comment' });
  });
});
