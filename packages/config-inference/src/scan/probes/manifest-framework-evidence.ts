import ts from 'typescript';

export type FrameworkConfigEvidence = {
  solidStart: boolean;
  tanstackStart: boolean;
};

type CallableBinding =
  | {
      kind: 'identifier';
      symbol: ts.Symbol;
      framework: keyof FrameworkConfigEvidence;
      role: 'config' | 'plugin';
    }
  | {
      kind: 'namespace-member';
      symbol: ts.Symbol;
      memberName: string;
      framework: keyof FrameworkConfigEvidence;
      role: 'config' | 'plugin';
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
): { exportName: string; framework: keyof FrameworkConfigEvidence; role: 'config' | 'plugin' } | undefined => {
  if (CURRENT_TANSTACK_START_PLUGIN_MODULES.has(moduleName)) {
    return { exportName: 'tanstackStart', framework: 'tanstackStart', role: 'plugin' };
  }
  if (moduleName === '@tanstack/start/config') {
    return { exportName: 'defineConfig', framework: 'tanstackStart', role: 'config' };
  }
  if (moduleName === '@solidjs/start/config') {
    return { exportName: 'defineConfig', framework: 'solidStart', role: 'config' };
  }
  return undefined;
};

const calledBinding = (
  expression: ts.LeftHandSideExpression,
  bindings: CallableBinding[],
  checker: ts.TypeChecker
): CallableBinding | undefined =>
  bindings.find((binding) => {
    if (binding.kind === 'identifier') {
      return ts.isIdentifier(expression) && checker.getSymbolAtLocation(expression) === binding.symbol;
    }
    if (ts.isPropertyAccessExpression(expression)) {
      return (
        ts.isIdentifier(expression.expression) &&
        checker.getSymbolAtLocation(expression.expression) === binding.symbol &&
        expression.name.text === binding.memberName
      );
    }
    return (
      ts.isElementAccessExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      checker.getSymbolAtLocation(expression.expression) === binding.symbol &&
      ts.isStringLiteralLike(expression.argumentExpression) &&
      expression.argumentExpression.text === binding.memberName
    );
  });

const createSingleFileProgram = (path: string, sourceFile: ts.SourceFile): ts.Program => {
  const options: ts.CompilerOptions = {
    allowJs: true,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest
  };
  const host: ts.CompilerHost = {
    fileExists: (fileName) => fileName === path,
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => '',
    getDefaultLibFileName: () => 'lib.d.ts',
    getNewLine: () => '\n',
    getSourceFile: (fileName) => (fileName === path ? sourceFile : undefined),
    readFile: (fileName) => (fileName === path ? sourceFile.text : undefined),
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {}
  };
  return ts.createProgram([path], options, host);
};

const propertyName = (name: ts.PropertyName | undefined): string | undefined => {
  if (name === undefined) return undefined;
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
};

const unwrapExpression = (expression: ts.Expression): ts.Expression => {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
};

const constantBoolean = (expression: ts.Expression): boolean | undefined => {
  const current = unwrapExpression(expression);
  if (current.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (current.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isPrefixUnaryExpression(current) && current.operator === ts.SyntaxKind.ExclamationToken) {
    const operand = constantBoolean(current.operand);
    return operand === undefined ? undefined : !operand;
  }
  return undefined;
};

export const inspectFrameworkConfig = (path: string, contents: string): FrameworkConfigEvidence => {
  const sourceFile = ts.createSourceFile(path, contents, ts.ScriptTarget.Latest, true);
  const program = createSingleFileProgram(path, sourceFile);
  if (
    program
      .getSyntacticDiagnostics(sourceFile)
      .some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
  ) {
    return { solidStart: false, tanstackStart: false };
  }
  const checker = program.getTypeChecker();
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
      const symbol = checker.getSymbolAtLocation(namedBindings.name);
      if (symbol === undefined) continue;
      bindings.push({
        kind: 'namespace-member',
        symbol,
        memberName: callableImport.exportName,
        framework: callableImport.framework,
        role: callableImport.role
      });
      continue;
    }
    for (const specifier of namedBindings.elements) {
      if (specifier.isTypeOnly) continue;
      const importedName = specifier.propertyName?.text ?? specifier.name.text;
      if (importedName !== callableImport.exportName) continue;
      const symbol = checker.getSymbolAtLocation(specifier.name);
      if (symbol === undefined) continue;
      bindings.push({
        kind: 'identifier',
        symbol,
        framework: callableImport.framework,
        role: callableImport.role
      });
    }
  }

  const evidence: FrameworkConfigEvidence = { solidStart: false, tanstackStart: false };
  type ReachabilityMode = 'config' | 'plugin';
  type ReachabilityState = `${ReachabilityMode}:${'called' | 'value'}`;
  const visited = new Map<ts.Node, Set<ReachabilityState>>();
  const mutatedSymbols = new Set<ts.Symbol>();

  const symbolAtMutationTarget = (target: ts.Expression): ts.Symbol | undefined => {
    const expression = unwrapExpression(target);
    if (ts.isIdentifier(expression)) return checker.getSymbolAtLocation(expression);
    if (ts.isPropertyAccessExpression(expression)) return checker.getSymbolAtLocation(expression.name);
    if (ts.isElementAccessExpression(expression)) return checker.getSymbolAtLocation(expression.argumentExpression);
    return undefined;
  };

  const recordMutationTarget = (target: ts.Expression): void => {
    const expression = unwrapExpression(target);
    const symbol = symbolAtMutationTarget(expression);
    if (symbol !== undefined) mutatedSymbols.add(symbol);
    if (ts.isArrayLiteralExpression(expression)) {
      for (const element of expression.elements) {
        if (!ts.isOmittedExpression(element))
          recordMutationTarget(ts.isSpreadElement(element) ? element.expression : element);
      }
    } else if (ts.isObjectLiteralExpression(expression)) {
      for (const property of expression.properties) {
        if (ts.isShorthandPropertyAssignment(property)) recordMutationTarget(property.name);
        if (ts.isPropertyAssignment(property)) recordMutationTarget(property.initializer);
        if (ts.isSpreadAssignment(property)) recordMutationTarget(property.expression);
      }
    }
  };

  const collectMutations = (node: ts.Node): void => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) {
      recordMutationTarget(node.left);
    } else if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)
    ) {
      recordMutationTarget(node.operand);
    }
    ts.forEachChild(node, collectMutations);
  };
  collectMutations(sourceFile);

  const bindingIsUnchanged = (expression: ts.LeftHandSideExpression, binding: CallableBinding): boolean => {
    if (mutatedSymbols.has(binding.symbol)) return false;
    if (binding.kind === 'identifier') return true;
    if (ts.isPropertyAccessExpression(expression)) {
      const memberSymbol = checker.getSymbolAtLocation(expression.name);
      return memberSymbol === undefined || !mutatedSymbols.has(memberSymbol);
    }
    if (ts.isElementAccessExpression(expression)) {
      const memberSymbol = checker.getSymbolAtLocation(expression.argumentExpression);
      return memberSymbol === undefined || !mutatedSymbols.has(memberSymbol);
    }
    return true;
  };

  const enter = (node: ts.Node, mode: ReachabilityMode, invoked: boolean): boolean => {
    const state: ReachabilityState = `${mode}:${invoked ? 'called' : 'value'}`;
    const states = visited.get(node) ?? new Set<ReachabilityState>();
    if (states.has(state)) return false;
    states.add(state);
    visited.set(node, states);
    return true;
  };

  function inspectFunctionBody(body: ts.ConciseBody, mode: ReachabilityMode): void {
    if (!ts.isBlock(body)) {
      inspectExpression(body, mode);
      return;
    }
    const inspectStatement = (statement: ts.Statement): void => {
      if (ts.isReturnStatement(statement) && statement.expression !== undefined) {
        inspectExpression(statement.expression, mode);
      } else if (ts.isBlock(statement)) {
        for (const child of statement.statements) inspectStatement(child);
      } else if (ts.isIfStatement(statement)) {
        const condition = constantBoolean(statement.expression);
        if (condition !== false) inspectStatement(statement.thenStatement);
        if (condition !== true && statement.elseStatement !== undefined) inspectStatement(statement.elseStatement);
      }
    };
    for (const statement of body.statements) inspectStatement(statement);
  }

  function inspectSymbolValue(symbol: ts.Symbol, mode: ReachabilityMode, invoked: boolean): void {
    // A reassigned local or object member no longer has the value represented by its declaration. Refuse to follow
    // that stale declaration instead of treating a plugin factory that has been overwritten as active config.
    if (mutatedSymbols.has(symbol)) return;
    for (const declaration of symbol.declarations ?? []) {
      if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
        const initializer = unwrapExpression(declaration.initializer);
        if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
          if (invoked || mode === 'config') inspectFunctionBody(initializer.body, mode);
        } else {
          inspectExpression(initializer, mode, invoked);
        }
      } else if (ts.isFunctionDeclaration(declaration) && declaration.body !== undefined && invoked) {
        inspectFunctionBody(declaration.body, mode);
      } else if (ts.isPropertyAssignment(declaration)) {
        const initializer = unwrapExpression(declaration.initializer);
        if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
          if (invoked || mode === 'config') inspectFunctionBody(initializer.body, mode);
        } else {
          inspectExpression(initializer, mode, invoked);
        }
      } else if (ts.isMethodDeclaration(declaration) && declaration.body !== undefined && invoked) {
        inspectFunctionBody(declaration.body, mode);
      } else if (ts.isShorthandPropertyAssignment(declaration)) {
        const valueSymbol = checker.getShorthandAssignmentValueSymbol(declaration);
        if (valueSymbol !== undefined) inspectSymbolValue(valueSymbol, mode, invoked);
      }
    }
  }

  function inspectExpression(rawExpression: ts.Expression, mode: ReachabilityMode, invoked = false): void {
    const expression = unwrapExpression(rawExpression);
    if (!enter(expression, mode, invoked)) return;

    if (ts.isCallExpression(expression)) {
      const binding = calledBinding(expression.expression, bindings, checker);
      if (binding !== undefined && binding.role === mode && bindingIsUnchanged(expression.expression, binding)) {
        evidence[binding.framework] = true;
      }

      const callee = unwrapExpression(expression.expression);
      if (ts.isIdentifier(callee)) {
        const symbol = checker.getSymbolAtLocation(callee);
        if (symbol !== undefined) inspectSymbolValue(symbol, mode, true);
      } else if (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) {
        const symbol = checker.getSymbolAtLocation(
          ts.isPropertyAccessExpression(callee) ? callee.name : callee.argumentExpression
        );
        if (symbol !== undefined) inspectSymbolValue(symbol, mode, true);
      } else if (ts.isArrowFunction(callee) || ts.isFunctionExpression(callee)) {
        inspectFunctionBody(callee.body, mode);
      }
      for (const argument of expression.arguments) inspectExpression(argument, mode);
      return;
    }

    if (ts.isIdentifier(expression)) {
      if (invoked) {
        const binding = calledBinding(expression, bindings, checker);
        if (binding !== undefined && binding.role === mode && bindingIsUnchanged(expression, binding)) {
          evidence[binding.framework] = true;
        }
      }
      const symbol = checker.getSymbolAtLocation(expression);
      if (symbol !== undefined) inspectSymbolValue(symbol, mode, invoked);
      return;
    }

    if (ts.isObjectLiteralExpression(expression)) {
      for (const property of expression.properties) {
        if (ts.isSpreadAssignment(property)) {
          inspectExpression(property.expression, mode);
        } else if (mode === 'config' && propertyName(property.name) === 'plugins') {
          if (ts.isPropertyAssignment(property)) inspectExpression(property.initializer, 'plugin');
          if (ts.isShorthandPropertyAssignment(property)) inspectExpression(property.name, 'plugin');
        }
      }
      return;
    }

    if (ts.isArrayLiteralExpression(expression)) {
      for (const element of expression.elements) {
        inspectExpression(ts.isSpreadElement(element) ? element.expression : element, mode);
      }
      return;
    }

    if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
      if (mode === 'config') inspectFunctionBody(expression.body, mode);
      return;
    }

    if (ts.isConditionalExpression(expression)) {
      const condition = constantBoolean(expression.condition);
      if (condition !== false) inspectExpression(expression.whenTrue, mode, invoked);
      if (condition !== true) inspectExpression(expression.whenFalse, mode, invoked);
      return;
    }

    if (ts.isBinaryExpression(expression)) {
      const condition = constantBoolean(expression.left);
      if (expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        if (condition !== false) inspectExpression(expression.right, mode, invoked);
      } else if (expression.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
        if (condition !== true) inspectExpression(expression.right, mode, invoked);
      } else if (expression.operatorToken.kind === ts.SyntaxKind.CommaToken) {
        inspectExpression(expression.right, mode, invoked);
      } else if (expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
        inspectExpression(expression.left, mode, invoked);
        inspectExpression(expression.right, mode, invoked);
      }
      return;
    }

    if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
      if (invoked) {
        const binding = calledBinding(expression, bindings, checker);
        if (binding !== undefined && binding.role === mode && bindingIsUnchanged(expression, binding)) {
          evidence[binding.framework] = true;
        }
      }
      const symbol = checker.getSymbolAtLocation(
        ts.isPropertyAccessExpression(expression) ? expression.name : expression.argumentExpression
      );
      if (symbol !== undefined) inspectSymbolValue(symbol, mode, invoked);
    }
  }

  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      inspectExpression(statement.expression, 'config');
      continue;
    }
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.body !== undefined &&
      ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
    ) {
      inspectFunctionBody(statement.body, 'config');
    }
  }
  return evidence;
};

type CommandInvocation = { args: string[]; executable: string };

const NODE_OPTIONS_WITH_VALUES = new Set([
  '-r',
  '--require',
  '--import',
  '--env-file',
  '--env-file-if-exists',
  '--loader',
  '--experimental-loader',
  '--conditions'
]);

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

// Required-value global options declared by Yarn Classic 1.22's CLI. Keeping this explicit prevents an option value
// such as `vinxi` from being mistaken for the executable while still allowing real scripts to put global flags before
// either `run` or the script name.
const YARN_OPTIONS_WITH_VALUES = new Set([
  '--cache-folder',
  '--cwd',
  '--global-folder',
  '--https-proxy',
  '--link-folder',
  '--modules-folder',
  '--mutex',
  '--network-concurrency',
  '--network-timeout',
  '--otp',
  '--preferred-cache-folder',
  '--proxy',
  '--registry',
  '--use-yarnrc'
]);

const skipYarnOptions = (tokens: string[]): string[] => {
  let remaining = tokens;
  while (remaining[0]?.startsWith('-')) {
    const option = remaining[0]!;
    remaining = remaining.slice(!option.includes('=') && YARN_OPTIONS_WITH_VALUES.has(option.toLowerCase()) ? 2 : 1);
  }
  return remaining;
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
  } else if (executable === 'yarn') {
    remaining = skipYarnOptions(remaining.slice(1));
    if (remaining[0]?.toLowerCase() === 'run') remaining = skipYarnOptions(remaining.slice(1));
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
    let entrypoint: string | undefined;
    for (let index = 0; index < invocation.args.length; index += 1) {
      const argument = invocation.args[index]!;
      if (argument === '--') {
        entrypoint = invocation.args[index + 1];
        break;
      }
      if (NODE_OPTIONS_WITH_VALUES.has(argument)) {
        index += 1;
        continue;
      }
      if (argument.startsWith('-')) continue;
      entrypoint = argument;
      break;
    }
    entrypoint = entrypoint?.replace(/\\/g, '/').replace(/^\.\//, '');
    return (
      entrypoint === '.output/server/index.mjs' ||
      entrypoint === 'dist/server/server.js' ||
      entrypoint === 'dist/server/index.js'
    );
  });
};
