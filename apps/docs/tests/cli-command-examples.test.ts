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
            .replace(/^(?:-\s+)?(?:(?:run|command):\s*|\$ )?/, '')
            .replace(/^(['"])((?:npx |stacktape |stp ).*)\1$/, '$2');
      const tokens = shell.match(shellTokens) ?? [];
      const commands: { args: string[]; offset: number }[] = [];
      let start = 0;
      while (start < tokens.length) {
        let end = start;
        while (end < tokens.length && !/^[|&;<>]+$/.test(tokens[end]) && !tokens[end].startsWith('#')) end++;
        const segment = tokens.slice(start, end).join(' ');
        const prefix = segment.match(commandPrefix)?.[0];
        if (prefix)
          commands.push({ args: segment.slice(prefix.length).trim().match(shellTokens) ?? [], offset: lineOffset });
        if (tokens[end]?.startsWith('#')) break;
        start = end + 1;
      }
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
  const present = new Set(defaults);
  let positional = 0;
  for (let index = 0; index < args.length; index++) {
    if (index >= startsAt && index < startsAt + words) continue;
    const token = args[index];
    if (!/^-(?!\d)/.test(token)) {
      const argument = command.positionals[positional++];
      if (argument) {
        if (present.has(argument)) problems.push(`duplicate argument: ${argument}`);
        present.add(argument);
      } else if (name !== 'help') problems.push(`unexpected positional argument: ${token}`);
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
  if (!isHelp) {
    for (const arg of command.args) {
      if (arg.required && !present.has(arg.name)) problems.push(`missing required argument: --${arg.flag}`);
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

test('Stacktape commands in docs code examples match the current CLI', (context) => {
  const reference = JSON.parse(readFileSync(CLI_COMMAND_REFERENCE_DATA, 'utf8')) as Record<string, CommandReference>;
  const commands = new Map(
    Object.entries(reference).flatMap(([id, command]) => [
      [id, command],
      [command.publicName, command]
    ])
  );
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
