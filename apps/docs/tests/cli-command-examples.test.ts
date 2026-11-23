import { createProcessor } from '@mdx-js/mdx';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { visit } from 'unist-util-visit';
import { CLI_COMMAND_REFERENCE_DATA } from '../src/build/cli-generated-inputs.ts';
import type { CliCommandArg } from '../src/components/Mdx/CliCommandsApiReference.tsx';
import { APP_ROOT, contentFiles } from './canonical-content.ts';

type CommandReference = { publicName: string; positionals: string[]; args: CliCommandArg[] };
type CodeExample = { code: string; meta: string; line: number };
type Literal = {
  type: string;
  value?: unknown;
  start?: number;
  elements?: Literal[];
  properties?: { key?: { name?: string; value?: string }; value: Literal }[];
  quasis?: { value: { cooked: string } }[];
};

const mdx = createProcessor();
const contentDir = join(APP_ROOT, 'content');

function codeExamples(source: string): CodeExample[] {
  // Astro removes the frontmatter before parsing MDX. Keep its line breaks for diagnostics.
  const body = source.replace(/^(?:---\r?\n)[\s\S]*?\r?\n---(?=\r?\n|$)/, (frontmatter) =>
    frontmatter.replace(/[^\r\n]/g, '')
  );
  const examples: CodeExample[] = [];
  visit(mdx.parse(body), (node) => {
    const line = node.position?.start.line ?? 1;
    if (node.type === 'code') {
      examples.push({ code: String(node.value), meta: String(node.meta ?? ''), line: line + 1 });
    }
    if ((node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') || node.name !== 'CodeBlock') return;

    const attribute = (name: string) =>
      node.attributes.find((item) => item.type === 'mdxJsxAttribute' && item.name === name)?.value;
    const expression = (value: unknown) =>
      (value as { data?: { estree?: { body: { expression: Literal }[] } } } | undefined)?.data?.estree?.body[0]
        ?.expression;
    const add = (value: unknown) => {
      const literal = expression(value) ?? (value as Literal | undefined);
      if (typeof value === 'string') examples.push({ code: value, meta, line });
      else if (typeof literal?.value === 'string') examples.push({ code: literal.value, meta, line });
      else if (literal?.type === 'TemplateLiteral') {
        const codeLine = literal.start === undefined ? line : body.slice(0, literal.start).split('\n').length;
        const code = literal.quasis?.map((quasi) => quasi.value.cooked).join('{value}') ?? '';
        examples.push({ code, meta, line: codeLine });
      }
    };
    const meta = String(attribute('meta') ?? '');
    add(attribute('code'));
    for (const tab of expression(attribute('tabs'))?.elements ?? []) {
      add(tab.properties?.find(({ key }) => (key?.name ?? key?.value) === 'code')?.value);
    }
  });
  return examples;
}

// Keep quoted values, GitHub Actions expressions and documentation placeholders together.
const shellTokens = /(?:\$\{\{[^}]*\}\}|'[^']*'|"(?:\\.|[^"\\])*"|<[\w-]+>|\\.|[^\s'"\\|&;<>])+|[|&;<>]+/g;
const redirect = /^(?:[<>](?:[<>&|])?|&>>?)$/;
const commandPrefix =
  /^(?:(?:env\s+)?(?:\w+=(?:"[^"]*"|'[^']*'|\S+)\s+)*)(?:npx\s+(?:--yes\s+|-y\s+)?|npm\s+exec\s+(?:--\s+)?|(?:pnpm\s+(?:exec|dlx)|yarn\s+dlx|bunx)\s+)?(?:stacktape(?:@[^\s]+)?|stp|\.\/node_modules\/\.bin\/stacktape)(?=\s|$)/;

function invocations(code: string) {
  let offset = 0;
  return code
    .replace(/[\\`]\r?\n/g, '\u0000')
    .split('\n')
    .flatMap((raw) => {
      const lineOffset = offset;
      offset += raw.split('\u0000').length;
      const line = raw.replaceAll('\u0000', ' ').trim();
      // The shell installers forward the arguments after the script to the installed CLI.
      const installArgs =
        line.match(/installs\.stacktape\.com\/(?:macos|linux)\.sh\s*\|\s*sh\s+-s\s+--\s+(.*)/)?.[1] ??
        line.match(/^iex ".*installs\.stacktape\.com\/windows\.ps1\)\s*\}\s+(.*)"$/)?.[1];
      const shell = installArgs
        ? `stacktape ${installArgs}`
        : line
            .replace(/^(?:-\s+)?(?:(?:run|command):\s*|(?:\$|→)\s+)?/, '')
            .replace(/^(['"])((?:npx |stacktape |stp ).*)\1$/, '$2');
      const commands: { args: string[]; offset: number }[] = [];
      const addCommand = (segment: string) => {
        const prefix = segment.match(commandPrefix)?.[0];
        if (prefix)
          commands.push({ args: segment.slice(prefix.length).trim().match(shellTokens) ?? [], offset: lineOffset });
      };
      const scan = (commandLine: string) => {
        const tokens = [...commandLine.matchAll(shellTokens)];
        let segment: string[] = [];
        for (let index = 0; index < tokens.length; index++) {
          const { 0: token, index: tokenOffset } = tokens[index];
          if (token.startsWith('#')) break;
          if (redirect.test(token)) {
            const previous = tokens[index - 1];
            // A descriptor adjacent to the operator belongs to the redirect, as in 2> or 2>&1.
            if (previous && /^\d+$/.test(previous[0]) && previous.index + previous[0].length === tokenOffset)
              segment.pop();
            index++;
          } else if (/^[|&;]+$/.test(token)) {
            addCommand(segment.join(' '));
            segment = [];
          } else {
            segment.push(token);
          }
        }
        addCommand(segment.join(' '));
      };
      const outer = shell.replace(/'[^']*'|\$\(([^()]*)\)/g, (match, inner: string | undefined) => {
        if (inner === undefined) return match;
        scan(inner);
        return '{value}';
      });
      scan(outer);
      return commands;
    });
}

// These flags are recognized globally or intentionally omitted from the displayed option tables.
// See apps/cli/src/utils/cli.ts and apps/cli/src/config/cli/public-names.ts.
const extraFlags = new Map([
  ['--help', true],
  ['-h', true],
  ['--version', true],
  ['-v', true],
  ['--json', true],
  ['--debug', true],
  ['--agent', true],
  ['--quiet', true],
  ['--log-level', false],
  ['--output-format', false]
]);

function commandErrors(input: string[], commands: Map<string, CommandReference>, defaults: string[]): string[] {
  const args = input.slice(0, input.includes('--') ? input.indexOf('--') : undefined);
  let startsAt = 0;
  while (args[startsAt]?.startsWith('-')) {
    const [flag, value] = args[startsAt++].split('=', 2);
    const boolean = extraFlags.get(flag);
    const next = args[startsAt];
    if (value === undefined && next && (boolean === false || (boolean && /^(true|false)$/.test(next)))) startsAt++;
  }
  const isHelp = args.some((token) => ['--help', '-h', '--version', '-v'].includes(token));
  if (startsAt === args.length && isHelp && args.every((token) => extraFlags.has(token))) return [];

  let words = 0;
  while (args[startsAt + words] && !args[startsAt + words].startsWith('-')) words++;
  while (words > 0 && !commands.has(args.slice(startsAt, startsAt + words).join(' '))) words--;
  const name = args.slice(startsAt, startsAt + words).join(' ');
  const command = commands.get(name);
  if (!command) return [`unknown command: ${args[startsAt] ?? '(missing)'}`];

  const flags = new Map<string, CliCommandArg>(
    command.args.flatMap((arg) => [
      [`--${arg.flag}`, arg] as const,
      ...(arg.alias ? [[`-${arg.alias}`, arg] as const] : [])
    ])
  );
  const problems: string[] = [];
  const present = new Set<string>();
  const positionalArgs: string[] = [];
  let positional = 0;
  for (let index = 0; index < args.length; index++) {
    if (index >= startsAt && index < startsAt + words) continue;
    const token = args[index];
    if (!/^-(?!\d)/.test(token)) {
      const argument = command.positionals[positional++];
      if (argument) positionalArgs.push(argument);
      else if (name !== 'help') problems.push(`unexpected positional argument: ${token}`);
      continue;
    }
    const [flag] = token.split('=', 1);
    const arg = flags.get(flag);
    const boolean = arg ? arg.allowedTypes.includes('boolean') : extraFlags.get(flag);
    if (boolean === undefined) {
      problems.push(`unknown flag: ${flag}`);
      continue;
    }
    const next = args[index + 1];
    const hasValue = token.includes('=') && token.length > flag.length + 1;
    if (boolean) {
      if (!hasValue && (next === 'true' || next === 'false') && command.positionals.length === 0) index++;
    } else if (!hasValue && (next === undefined || /^-(?!\d)/.test(next))) {
      problems.push(`missing value for ${flag}`);
      continue;
    } else if (!hasValue) {
      index++;
    }
    if (arg?.allowedTypes.includes('array')) {
      while (args[index + 1] && !/^-(?!\d)/.test(args[index + 1])) index++;
    }
    if (arg) present.add(arg.name);
  }
  for (const argument of positionalArgs) {
    if (present.has(argument)) problems.push(`duplicate argument: ${argument}`);
    present.add(argument);
  }
  if (!isHelp) {
    for (const arg of command.args) {
      if (arg.required && !present.has(arg.name) && !defaults.includes(arg.name))
        problems.push(`missing required argument: --${arg.flag}`);
    }
  }
  return problems;
}

test('recognizes commands in fences, workflow steps, tabs and installer arguments', () => {
  const source = [
    '~~~bash',
    'stp logs <resource> -s {stage} \\',
    '  -r <region> && npx stacktape@latest init --starter-project',
    '~~~',
    '',
    '~~~yaml',
    '- run: npx stacktape deploy --stage pr-${{ github.event.pull_request.number }} --region us-east-1',
    '~~~',
    '',
    '<CodeBlock tabs={[',
    '  { code: `curl -fsSL https://installs.stacktape.com/linux.sh | sh -s -- init --starter-project` },',
    '  { code: `iex "& { $(irm https://installs.stacktape.com/windows.ps1) } init"` }',
    ']} />'
  ].join('\n');
  const commands = codeExamples(source).flatMap(({ code }) => invocations(code).map(({ args }) => args));
  assert.deepEqual(commands, [
    ['logs', '<resource>', '-s', '{stage}', '-r', '<region>'],
    ['init', '--starter-project'],
    ['deploy', '--stage', 'pr-${{ github.event.pull_request.number }}', '--region', 'us-east-1'],
    ['init', '--starter-project'],
    ['init']
  ]);
});

function readCommandReference() {
  const reference = JSON.parse(readFileSync(CLI_COMMAND_REFERENCE_DATA, 'utf8')) as Record<string, CommandReference>;
  return new Map(
    Object.entries(reference).flatMap(([id, command]) => [
      [id, command],
      [command.publicName, command]
    ])
  );
}

test('recognizes prompt hints and substitutions, and validates arguments after redirects', () => {
  const commands = readCommandReference();
  const check = (line: string) => invocations(line).map(({ args }) => commandErrors(args, commands, []));

  assert.deepEqual(check('→ stacktape --log-level info deploy --stage dev --region eu-west-1'), [[]]);
  assert.deepEqual(check('result=$(stacktape deploy --region us-east-1 --stage dev 2> run.log --bogus)'), [
    ['unknown flag: --bogus']
  ]);
  assert.deepEqual(check('stacktape deploy 2>&1 --region us-east-1 > run.log --stage dev && echo done'), [[]]);
  assert.deepEqual(check('stacktape logs api --resource-name api --stage dev --region us-east-1'), [
    ['duplicate argument: resourceName']
  ]);
  assert.deepEqual(check('stacktape logs --resource-name api api --stage dev --region us-east-1'), [
    ['duplicate argument: resourceName']
  ]);
});

test('Stacktape commands in docs code examples match the current CLI', (context) => {
  const commands = readCommandReference();
  const problems: string[] = [];
  let checked = 0;
  for (const file of contentFiles()) {
    for (const example of codeExamples(readFileSync(join(contentDir, file), 'utf8'))) {
      // Use skip only for illustrative commands, and defaults only when the page supplies them.
      if (/\bcli-check=skip:\S/.test(example.meta)) continue;
      const defaults =
        example.meta.match(/\bcli-check=defaults:((?:region|stage)(?:,(?:region|stage))?)(?=\s|$)/)?.[1].split(',') ??
        [];
      for (const { args, offset } of invocations(example.code)) {
        checked++;
        for (const error of commandErrors(args, commands, defaults)) {
          problems.push(`${file}:${example.line + offset}: ${error} (stacktape ${args.join(' ')})`);
        }
      }
    }
  }
  assert.ok(checked > 0, 'expected to find Stacktape commands in the docs');
  assert.ok(problems.length === 0, problems.join('\n'));
  context.diagnostic(`Checked ${checked} command examples.`);
});
