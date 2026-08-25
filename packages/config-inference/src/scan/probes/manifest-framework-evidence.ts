import ts from 'typescript';

export type FrameworkConfigEvidence = {
  solidStart: boolean;
  tanstackStart: boolean;
};

type CallableBinding =
  | { kind: 'identifier'; localName: string; framework: keyof FrameworkConfigEvidence }
  | {
      kind: 'namespace-member';
      localName: string;
      memberName: string;
      framework: keyof FrameworkConfigEvidence;
    };

const CURRENT_TANSTACK_START_PLUGIN_MODULES = new Set([
  '@tanstack/react-start/plugin/vite',
  '@tanstack/react-start/plugin/rsbuild',
  '@tanstack/solid-start/plugin/vite',
  '@tanstack/solid-start/plugin/rsbuild',
  '@tanstack/vue-start/plugin/vite',
  '@tanstack/vue-start/plugin/rsbuild'
]);

const callableImportFor = (
  moduleName: string
): { exportName: string; framework: keyof FrameworkConfigEvidence } | undefined => {
  if (CURRENT_TANSTACK_START_PLUGIN_MODULES.has(moduleName)) {
    return { exportName: 'tanstackStart', framework: 'tanstackStart' };
  }
  if (moduleName === '@tanstack/start/config') {
    return { exportName: 'defineConfig', framework: 'tanstackStart' };
  }
  if (moduleName === '@solidjs/start/config') {
    return { exportName: 'defineConfig', framework: 'solidStart' };
  }
  return undefined;
};

const calledBinding = (
  expression: ts.LeftHandSideExpression,
  bindings: CallableBinding[]
): CallableBinding | undefined =>
  bindings.find((binding) => {
    if (binding.kind === 'identifier') {
      return ts.isIdentifier(expression) && expression.text === binding.localName;
    }
    if (ts.isPropertyAccessExpression(expression)) {
      return (
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === binding.localName &&
        expression.name.text === binding.memberName
      );
    }
    return (
      ts.isElementAccessExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === binding.localName &&
      ts.isStringLiteralLike(expression.argumentExpression) &&
      expression.argumentExpression.text === binding.memberName
    );
  });

export const inspectFrameworkConfig = (path: string, contents: string): FrameworkConfigEvidence => {
  const sourceFile = ts.createSourceFile(path, contents, ts.ScriptTarget.Latest, true);
  const bindings: CallableBinding[] = [];

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.importClause === undefined ||
      statement.importClause.isTypeOnly
    ) {
      continue;
    }
    const callableImport = callableImportFor(statement.moduleSpecifier.text);
    if (callableImport === undefined) continue;
    const namedBindings = statement.importClause.namedBindings;
    if (namedBindings === undefined) continue;
    if (ts.isNamespaceImport(namedBindings)) {
      bindings.push({
        kind: 'namespace-member',
        localName: namedBindings.name.text,
        memberName: callableImport.exportName,
        framework: callableImport.framework
      });
      continue;
    }
    for (const specifier of namedBindings.elements) {
      if (specifier.isTypeOnly) continue;
      const importedName = specifier.propertyName?.text ?? specifier.name.text;
      if (importedName !== callableImport.exportName) continue;
      bindings.push({
        kind: 'identifier',
        localName: specifier.name.text,
        framework: callableImport.framework
      });
    }
  }

  const evidence: FrameworkConfigEvidence = { solidStart: false, tanstackStart: false };
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const binding = calledBinding(node.expression, bindings);
      if (binding !== undefined) evidence[binding.framework] = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return evidence;
};

type CommandInvocation = { args: string[]; executable: string };

const splitShellSegments = (command: string): string[] => {
  const segments: string[] = [];
  let current = '';
  let quote: "'" | '"' | undefined;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index]!;
    if (quote !== undefined) {
      current += character;
      if (character === quote && command[index - 1] !== '\\') quote = undefined;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      current += character;
      continue;
    }
    if (character === ';' || character === '|' || character === '&') {
      if (current.trim() !== '') segments.push(current.trim());
      current = '';
      while (command[index + 1] === character) index += 1;
      continue;
    }
    current += character;
  }
  if (current.trim() !== '') segments.push(current.trim());
  return segments;
};

const tokenizeCommand = (segment: string): string[] => {
  const tokens: string[] = [];
  let current = '';
  let quote: "'" | '"' | undefined;
  for (let index = 0; index < segment.length; index += 1) {
    const character = segment[index]!;
    if (quote !== undefined) {
      if (character === quote && segment[index - 1] !== '\\') {
        quote = undefined;
      } else {
        current += character;
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (/\s/.test(character)) {
      if (current !== '') tokens.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  if (current !== '') tokens.push(current);
  return tokens;
};

const isEnvironmentAssignment = (token: string) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(token);

const executableName = (token: string): string => {
  const normalized = token.replace(/\\/g, '/');
  return (normalized.split('/').at(-1) ?? normalized).replace(/\.(?:cmd|exe)$/i, '').toLowerCase();
};

const unwrapInvocation = (tokens: string[]): CommandInvocation | undefined => {
  let remaining = [...tokens];
  while (remaining[0] !== undefined && isEnvironmentAssignment(remaining[0])) remaining = remaining.slice(1);
  let executable = executableName(remaining[0] ?? '');
  if (executable === 'env' || executable === 'cross-env' || executable === 'cross-env-shell') {
    remaining = remaining.slice(1);
    while (remaining[0] !== undefined && isEnvironmentAssignment(remaining[0])) remaining = remaining.slice(1);
    executable = executableName(remaining[0] ?? '');
  }
  if (executable === 'command') {
    remaining = remaining.slice(1);
    executable = executableName(remaining[0] ?? '');
  }
  if (executable === 'npx' || executable === 'bunx') {
    remaining = remaining.slice(1);
    while (remaining[0]?.startsWith('-')) remaining = remaining.slice(1);
    executable = executableName(remaining[0] ?? '');
  } else if (
    (executable === 'npm' && (remaining[1] === 'exec' || remaining[1] === 'x')) ||
    (executable === 'pnpm' && (remaining[1] === 'exec' || remaining[1] === 'dlx')) ||
    (executable === 'yarn' && remaining[1] === 'dlx')
  ) {
    remaining = remaining.slice(2);
    while (remaining[0]?.startsWith('-')) remaining = remaining.slice(1);
    executable = executableName(remaining[0] ?? '');
  }
  if (executable === '') return undefined;
  return { executable, args: remaining.slice(1) };
};

const lifecycleCommandInvocations = (command: string | undefined): CommandInvocation[] =>
  command === undefined
    ? []
    : splitShellSegments(command)
        .map((segment) => unwrapInvocation(tokenizeCommand(segment)))
        .filter((invocation): invocation is CommandInvocation => invocation !== undefined);

const invokes = (command: string | undefined, executable: string, subcommand?: string) =>
  lifecycleCommandInvocations(command).some(
    (invocation) =>
      invocation.executable === executable &&
      (subcommand === undefined || invocation.args[0]?.toLowerCase() === subcommand)
  );

export const frameworkBuildCommand = (
  command: string | undefined
): 'astro' | 'nextjs' | 'nuxt' | 'remix' | 'sveltekit' | undefined => {
  if (invokes(command, 'next', 'build')) return 'nextjs';
  if (invokes(command, 'remix', 'build') || invokes(command, 'remix', 'vite:build')) return 'remix';
  if (invokes(command, 'nuxt', 'build') || invokes(command, 'nuxi', 'build')) return 'nuxt';
  if (invokes(command, 'astro', 'build')) return 'astro';
  if (invokes(command, 'svelte-kit', 'build') || invokes(command, 'sveltekit', 'build')) return 'sveltekit';
  return undefined;
};

export const frameworkStartCommand = (
  command: string | undefined
): 'astro' | 'nextjs' | 'nuxt' | 'remix' | 'sveltekit' | undefined => {
  if (invokes(command, 'next', 'start')) return 'nextjs';
  if (invokes(command, 'remix-serve') || invokes(command, 'remix', 'serve')) return 'remix';
  if (invokes(command, 'nuxt', 'start') || invokes(command, 'nuxi', 'preview')) return 'nuxt';
  if (invokes(command, 'astro', 'preview')) return 'astro';
  if (invokes(command, 'svelte-kit', 'preview') || invokes(command, 'sveltekit', 'preview')) return 'sveltekit';
  return undefined;
};

export const frameworkDevCommand = (
  command: string | undefined
): 'astro' | 'nextjs' | 'nuxt' | 'remix' | 'sveltekit' | undefined => {
  if (invokes(command, 'next', 'dev')) return 'nextjs';
  if (invokes(command, 'remix', 'dev') || invokes(command, 'remix', 'vite:dev')) return 'remix';
  if (invokes(command, 'nuxt', 'dev') || invokes(command, 'nuxi', 'dev')) return 'nuxt';
  if (invokes(command, 'astro', 'dev')) return 'astro';
  if (invokes(command, 'svelte-kit', 'dev') || invokes(command, 'sveltekit', 'dev')) return 'sveltekit';
  return undefined;
};

export const hasStartFrameworkProductionCommand = (command: string | undefined): boolean => {
  if (
    invokes(command, 'vinxi', 'start') ||
    invokes(command, 'vinxi', 'serve') ||
    invokes(command, 'tanstack', 'start') ||
    invokes(command, 'rsbuild', 'start')
  ) {
    return true;
  }
  return lifecycleCommandInvocations(command).some((invocation) => {
    if (invocation.executable !== 'node' || invocation.args.length === 0) return false;
    const entrypoint = invocation.args
      .find((argument) => !argument.startsWith('-'))
      ?.replace(/\\/g, '/')
      .replace(/^\.\//, '');
    return (
      entrypoint === '.output/server/index.mjs' ||
      entrypoint === 'dist/server/server.js' ||
      entrypoint === 'dist/server/index.js'
    );
  });
};
