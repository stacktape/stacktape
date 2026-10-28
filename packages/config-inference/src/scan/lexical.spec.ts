import { describe, expect, it } from 'bun:test';
import { maskSource, type MaskedLanguage } from './lexical';

/** `raw` with each listed span, found left to right, replaced by spaces; line breaks stay. */
const withBlanks = (raw: string, spans: readonly string[]): string => {
  let result = raw;
  let from = 0;
  for (const span of spans) {
    const index = result.indexOf(span, from);
    if (index === -1) throw new Error(`${JSON.stringify(span)} is not in ${JSON.stringify(raw)}`);
    result = result.slice(0, index) + span.replace(/[^\n]/g, ' ') + result.slice(index + span.length);
    from = index + span.length;
  }
  return result;
};

/** `comments` are blanked in both modes, `strings` (string, template and regular-expression contents) only in `blank`. */
const CASES: ReadonlyArray<{
  language: MaskedLanguage;
  raw: string;
  comments: readonly string[];
  strings: readonly string[];
}> = [
  {
    language: 'javascript',
    raw: 'app.listen(3000); // app.listen(4000)',
    comments: ['// app.listen(4000)'],
    strings: []
  },
  {
    language: 'javascript',
    raw: "/* export const handler = 1 */ const a = 'x';",
    comments: ['/* export const handler = 1 */'],
    strings: ['x']
  },
  {
    language: 'javascript',
    raw: 'const t = "export const handler = async (event) => 1";',
    comments: [],
    strings: ['export const handler = async (event) => 1']
  },
  {
    // A template's substitution is code; its text, `//` included, is not a comment.
    language: 'javascript',
    raw: 'const u = `listen(${port}) // not a comment`;',
    comments: [],
    strings: ['listen(', ') // not a comment']
  },
  {
    // A quote inside a regular expression does not open a string.
    language: 'javascript',
    raw: 'const q = /[\'"]/; app.listen(1);',
    comments: [],
    strings: ['[\'"]']
  },
  {
    // After the condition of an `if`, a `/` starts a regular expression, and its backtick opens no template.
    language: 'javascript',
    raw: "if (process.env.DEBUG) /`/.test('md'); server.listen(8080);",
    comments: [],
    strings: ['`', 'md']
  },
  {
    // A division is not a regular expression.
    language: 'javascript',
    raw: "const half = total / 2; const s = 'a/b';",
    comments: [],
    strings: ['a/b']
  },
  {
    language: 'python',
    raw: "app = FastAPI()  # app = Flask(__name__)\n'''\napp = Flask(__name__)\n'''",
    comments: ['# app = Flask(__name__)'],
    strings: ['\napp = Flask(__name__)\n']
  },
  {
    language: 'python',
    raw: "x = os.environ['A'] # '#' in a comment",
    comments: ["# '#' in a comment"],
    strings: ['A']
  },
  {
    language: 'go',
    raw: '// lambda.Start(handler)\nfunc main() { http.ListenAndServe(":8080", nil) }',
    comments: ['// lambda.Start(handler)'],
    strings: [':8080']
  },
  {
    language: 'go',
    raw: 'var help = `lambda.Start(x)\n` + "\\"q\\""',
    comments: [],
    strings: ['lambda.Start(x)\n', '\\"q\\"']
  }
];

describe('maskSource', () => {
  for (const { language, raw, comments, strings } of CASES) {
    it(`${language}: ${JSON.stringify(raw)}`, () => {
      const kept = withBlanks(raw, comments);
      expect(maskSource(raw, language, { strings: 'keep' })).toBe(kept);
      const blank = maskSource(raw, language, { strings: 'blank' });
      // Spans are listed in their own order, so the string spans are applied after the comments.
      expect(blank).toBe(withBlanks(kept, strings));
      // Offsets and line breaks never move, so a match in the masked text cites the original line.
      expect(blank.length).toBe(raw.length);
    });
  }
});
