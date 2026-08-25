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
  const reassignedSymbols = new Set<ts.Symbol>();
  const valueMutatedSymbols = new Set<ts.Symbol>();
  const valueAliases: Array<[ts.Symbol, ts.Symbol]> = [];

  const symbolAtValue = (target: ts.Expression): ts.Symbol | undefined => {
    const expression = unwrapExpression(target);
    if (ts.isIdentifier(expression)) return checker.getSymbolAtLocation(expression);
    if (ts.isPropertyAccessExpression(expression)) return checker.getSymbolAtLocation(expression.name);
    if (ts.isElementAccessExpression(expression)) return checker.getSymbolAtLocation(expression.argumentExpression);
    return undefined;
  };

  const recordReassignment = (target: ts.Expression): void => {
    const expression = unwrapExpression(target);
    if (ts.isIdentifier(expression)) {
      const symbol = checker.getSymbolAtLocation(expression);
      if (symbol !== undefined) reassignedSymbols.add(symbol);
    } else if (ts.isArrayLiteralExpression(expression)) {
      for (const element of expression.elements) {
        if (!ts.isOmittedExpression(element))
          recordReassignment(ts.isSpreadElement(element) ? element.expression : element);
      }
    } else if (ts.isObjectLiteralExpression(expression)) {
      for (const property of expression.properties) {
        if (ts.isShorthandPropertyAssignment(property)) recordReassignment(property.name);
        if (ts.isPropertyAssignment(property)) recordReassignment(property.initializer);
        if (ts.isSpreadAssignment(property)) recordReassignment(property.expression);
      }
    }
  };

  function symbolsStoredInProperty(
    rawBase: ts.Expression,
    memberName: string,
    seenObjects = new Set<ts.Symbol>()
  ): Set<ts.Symbol> {
    const result = new Set<ts.Symbol>();
    const base = unwrapExpression(rawBase);
    const inspectObjectValue = (expression: ts.Expression): void => {
      const value = unwrapExpression(expression);
      if (ts.isIdentifier(value)) {
        const symbol = checker.getSymbolAtLocation(value);
        if (symbol === undefined || seenObjects.has(symbol)) return;
        seenObjects.add(symbol);
        for (const declaration of symbol.declarations ?? []) {
          if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
            inspectObjectValue(declaration.initializer);
          }
        }
        return;
      }
      if (!ts.isObjectLiteralExpression(value)) return;
      for (const property of value.properties) {
        if (ts.isSpreadAssignment(property)) {
          for (const symbol of symbolsStoredInProperty(property.expression, memberName, seenObjects)) {
            result.add(symbol);
          }
          continue;
        }
        if (propertyName(property.name) !== memberName) continue;
        const propertySymbol = property.name === undefined ? undefined : checker.getSymbolAtLocation(property.name);
        if (propertySymbol !== undefined) result.add(propertySymbol);
        if (ts.isShorthandPropertyAssignment(property)) {
          const valueSymbol = checker.getShorthandAssignmentValueSymbol(property);
          if (valueSymbol !== undefined) result.add(valueSymbol);
        } else if (ts.isPropertyAssignment(property)) {
          for (const symbol of symbolsForExpressionValue(property.initializer, seenObjects)) result.add(symbol);
        }
      }
    };
    inspectObjectValue(base);
    return result;
  }

  function symbolsForExpressionValue(rawExpression: ts.Expression, seenObjects = new Set<ts.Symbol>()): Set<ts.Symbol> {
    const result = new Set<ts.Symbol>();
    const expression = unwrapExpression(rawExpression);
    if (ts.isIdentifier(expression)) {
      const symbol = checker.getSymbolAtLocation(expression);
      if (symbol !== undefined) result.add(symbol);
      return result;
    }
    if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
      const memberName = ts.isPropertyAccessExpression(expression)
        ? expression.name.text
        : ts.isStringLiteralLike(expression.argumentExpression)
          ? expression.argumentExpression.text
          : undefined;
      const propertySymbol = checker.getSymbolAtLocation(
        ts.isPropertyAccessExpression(expression) ? expression.name : expression.argumentExpression
      );
      if (propertySymbol !== undefined) result.add(propertySymbol);
      if (memberName !== undefined) {
        for (const symbol of symbolsStoredInProperty(expression.expression, memberName, seenObjects)) {
          result.add(symbol);
        }
      }
    }
    return result;
  }

  const addValueAliases = (left: ts.Symbol | undefined, right: ts.Expression): void => {
    if (left === undefined) return;
    for (const rightSymbol of symbolsForExpressionValue(right)) {
      if (left !== rightSymbol) valueAliases.push([left, rightSymbol]);
    }
  };

  const recordBindingAliases = (name: ts.BindingName, initializer: ts.Expression): void => {
    if (ts.isIdentifier(name)) {
      addValueAliases(checker.getSymbolAtLocation(name), initializer);
      return;
    }
    if (ts.isObjectBindingPattern(name)) {
      for (const element of name.elements) {
        if (element.dotDotDotToken !== undefined || !ts.isIdentifier(element.name)) continue;
        const memberName = propertyName(element.propertyName) ?? element.name.text;
        const left = checker.getSymbolAtLocation(element.name);
        if (memberName === undefined || left === undefined) continue;
        for (const right of symbolsStoredInProperty(initializer, memberName)) {
          if (left !== right) valueAliases.push([left, right]);
        }
      }
      return;
    }
    const value = unwrapExpression(initializer);
    if (!ts.isArrayLiteralExpression(value)) return;
    for (let index = 0; index < name.elements.length; index += 1) {
      const binding = name.elements[index];
      const source = value.elements[index];
      if (
        binding === undefined ||
        ts.isOmittedExpression(binding) ||
        source === undefined ||
        !ts.isIdentifier(binding.name)
      ) {
        continue;
      }
      addValueAliases(
        checker.getSymbolAtLocation(binding.name),
        ts.isSpreadElement(source) ? source.expression : source
      );
    }
  };

  const recordAssignmentAliases = (target: ts.Expression, source: ts.Expression): void => {
    const left = unwrapExpression(target);
    if (ts.isIdentifier(left)) {
      addValueAliases(checker.getSymbolAtLocation(left), source);
      return;
    }
    if (ts.isObjectLiteralExpression(left)) {
      for (const property of left.properties) {
        if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(unwrapExpression(property.initializer))) continue;
        const memberName = propertyName(property.name);
        const alias = unwrapExpression(property.initializer);
        if (memberName === undefined || !ts.isIdentifier(alias)) continue;
        const aliasSymbol = checker.getSymbolAtLocation(alias);
        for (const right of symbolsStoredInProperty(source, memberName)) {
          if (aliasSymbol !== undefined && aliasSymbol !== right) valueAliases.push([aliasSymbol, right]);
        }
      }
    }
  };

  const recordStoredPropertyValueMutation = (
    access: ts.PropertyAccessExpression | ts.ElementAccessExpression
  ): void => {
    const memberName = ts.isPropertyAccessExpression(access)
      ? access.name.text
      : ts.isStringLiteralLike(access.argumentExpression)
        ? access.argumentExpression.text
        : undefined;
    if (memberName === undefined) return;
    for (const symbol of symbolsStoredInProperty(access.expression, memberName)) valueMutatedSymbols.add(symbol);
  };

  const recordValueMutation = (target: ts.Expression, mutatesStoredPropertyValue = false): void => {
    const expression = unwrapExpression(target);
    const symbol = symbolAtValue(expression);
    if (symbol !== undefined) valueMutatedSymbols.add(symbol);
    if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
      if (mutatesStoredPropertyValue) recordStoredPropertyValueMutation(expression);
      recordValueMutation(expression.expression, mutatesStoredPropertyValue);
    }
  };

  const INSTANCE_MUTATION_METHODS = new Set([
    'add',
    'clear',
    'copyWithin',
    'delete',
    'fill',
    'pop',
    'push',
    'reverse',
    'set',
    'shift',
    'sort',
    'splice',
    'unshift'
  ]);
  const GLOBAL_MUTATION_METHODS = new Map([
    ['Object', new Set(['assign', 'defineProperties', 'defineProperty', 'setPrototypeOf'])],
    ['Reflect', new Set(['defineProperty', 'deleteProperty', 'set', 'setPrototypeOf'])]
  ]);
  const PROTOTYPE_MUTATION_GLOBALS = new Set(['Array', 'Map', 'Set']);
  const PROTOTYPE_INVOCATION_METHODS = new Set(['apply', 'call']);

  const calledMember = (expression: ts.LeftHandSideExpression): { base: ts.Expression; name: string } | undefined => {
    const callee = unwrapExpression(expression);
    if (ts.isPropertyAccessExpression(callee)) return { base: callee.expression, name: callee.name.text };
    if (ts.isElementAccessExpression(callee) && ts.isStringLiteralLike(callee.argumentExpression)) {
      return { base: callee.expression, name: callee.argumentExpression.text };
    }
    return undefined;
  };

  const isUnshadowedPrototypeMutation = (expression: ts.LeftHandSideExpression): boolean => {
    const invocation = calledMember(expression);
    if (invocation === undefined || !PROTOTYPE_INVOCATION_METHODS.has(invocation.name)) return false;
    const mutation = calledMember(unwrapExpression(invocation.base) as ts.LeftHandSideExpression);
    if (mutation === undefined || !INSTANCE_MUTATION_METHODS.has(mutation.name)) return false;
    const prototype = calledMember(unwrapExpression(mutation.base) as ts.LeftHandSideExpression);
    if (prototype?.name !== 'prototype') return false;
    const globalObject = unwrapExpression(prototype.base);
    return (
      ts.isIdentifier(globalObject) &&
      PROTOTYPE_MUTATION_GLOBALS.has(globalObject.text) &&
      checker.getSymbolAtLocation(globalObject) === undefined
    );
  };

  const mutationMemberIsUsable = (mutation: { base: ts.Expression; name: string }): boolean => {
    if (!INSTANCE_MUTATION_METHODS.has(mutation.name)) return false;
    const prototype = calledMember(unwrapExpression(mutation.base) as ts.LeftHandSideExpression);
    if (prototype?.name !== 'prototype') return true;
    const globalObject = unwrapExpression(prototype.base);
    if (!ts.isIdentifier(globalObject) || !PROTOTYPE_MUTATION_GLOBALS.has(globalObject.text)) return true;
    return checker.getSymbolAtLocation(globalObject) === undefined;
  };

  const callExpressions: ts.CallExpression[] = [];

  const collectMutations = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      recordBindingAliases(node.name, node.initializer);
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) {
      const target = unwrapExpression(node.left);
      recordAssignmentAliases(target, node.right);
      if (ts.isIdentifier(target) || ts.isArrayLiteralExpression(target) || ts.isObjectLiteralExpression(target)) {
        recordReassignment(target);
      } else {
        recordValueMutation(target);
      }
    } else if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)
    ) {
      const target = unwrapExpression(node.operand);
      if (ts.isIdentifier(target)) recordReassignment(target);
      else recordValueMutation(target);
    } else if (ts.isDeleteExpression(node)) {
      recordValueMutation(node.expression);
    } else if (ts.isCallExpression(node)) {
      callExpressions.push(node);
      if (isUnshadowedPrototypeMutation(node.expression) && node.arguments[0] !== undefined) {
        recordValueMutation(node.arguments[0]);
      }
      const member = calledMember(node.expression);
      if (member !== undefined) {
        const base = unwrapExpression(member.base);
        const globalMethods = ts.isIdentifier(base) ? GLOBAL_MUTATION_METHODS.get(base.text) : undefined;
        const isUnshadowedGlobalMutation =
          globalMethods?.has(member.name) === true && checker.getSymbolAtLocation(base) === undefined;
        if (isUnshadowedGlobalMutation && node.arguments[0] !== undefined) {
          recordValueMutation(node.arguments[0]);
        } else if (INSTANCE_MUTATION_METHODS.has(member.name)) {
          recordValueMutation(member.base, true);
        }
      }
    }
    ts.forEachChild(node, collectMutations);
  };
  collectMutations(sourceFile);

  const boundMutationTarget = (
    rawExpression: ts.Expression,
    seenSymbols = new Set<ts.Symbol>()
  ): ts.Expression | undefined => {
    const expression = unwrapExpression(rawExpression);
    if (ts.isIdentifier(expression)) {
      const symbol = checker.getSymbolAtLocation(expression);
      if (symbol === undefined || seenSymbols.has(symbol) || reassignedSymbols.has(symbol)) return undefined;
      seenSymbols.add(symbol);
      for (const declaration of symbol.declarations ?? []) {
        if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
          const target = boundMutationTarget(declaration.initializer, seenSymbols);
          if (target !== undefined) return target;
        }
      }
      return undefined;
    }
    if (!ts.isCallExpression(expression)) return undefined;
    const binding = calledMember(expression.expression);
    if (binding?.name !== 'bind') return undefined;

    // Rebinding an already-bound mutator preserves its original receiver.
    const existingTarget = boundMutationTarget(binding.base, seenSymbols);
    if (existingTarget !== undefined) return existingTarget;
    const mutation = calledMember(unwrapExpression(binding.base) as ts.LeftHandSideExpression);
    return mutation !== undefined && mutationMemberIsUsable(mutation) ? expression.arguments[0] : undefined;
  };

  for (const call of callExpressions) {
    const callee = unwrapExpression(call.expression);
    let target = boundMutationTarget(callee);
    const invocation = calledMember(call.expression);
    if (target === undefined && invocation !== undefined && PROTOTYPE_INVOCATION_METHODS.has(invocation.name)) {
      target = boundMutationTarget(invocation.base);
      if (target === undefined) {
        const mutation = calledMember(unwrapExpression(invocation.base) as ts.LeftHandSideExpression);
        if (mutation !== undefined && mutationMemberIsUsable(mutation)) target = call.arguments[0];
      }
    }
    if (target !== undefined) recordValueMutation(target);
  }

  // Reassigning an alias changes only that binding. Mutating the referenced array/object changes every direct local
  // alias of the same value, so propagate only value mutations across alias edges.
  let foundValueAliasMutation = true;
  while (foundValueAliasMutation) {
    foundValueAliasMutation = false;
    for (const [left, right] of valueAliases) {
      if (valueMutatedSymbols.has(left) && !valueMutatedSymbols.has(right)) {
        valueMutatedSymbols.add(right);
        foundValueAliasMutation = true;
      } else if (valueMutatedSymbols.has(right) && !valueMutatedSymbols.has(left)) {
        valueMutatedSymbols.add(left);
        foundValueAliasMutation = true;
      }
    }
  }

  const symbolIsUnchanged = (symbol: ts.Symbol | undefined): boolean =>
    symbol === undefined || (!reassignedSymbols.has(symbol) && !valueMutatedSymbols.has(symbol));

  const accessPathIsUnchanged = (rawExpression: ts.Expression): boolean => {
    const expression = unwrapExpression(rawExpression);
    if (ts.isIdentifier(expression)) return symbolIsUnchanged(checker.getSymbolAtLocation(expression));
    if (ts.isPropertyAccessExpression(expression)) {
      return (
        accessPathIsUnchanged(expression.expression) && symbolIsUnchanged(checker.getSymbolAtLocation(expression.name))
      );
    }
    if (ts.isElementAccessExpression(expression)) {
      return (
        accessPathIsUnchanged(expression.expression) &&
        symbolIsUnchanged(checker.getSymbolAtLocation(expression.argumentExpression))
      );
    }
    return true;
  };

  const bindingIsUnchanged = (expression: ts.LeftHandSideExpression, binding: CallableBinding): boolean => {
    return symbolIsUnchanged(binding.symbol) && accessPathIsUnchanged(expression);
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
    if (!symbolIsUnchanged(symbol)) return;
    if (invoked) {
      const importedBinding = bindings.find(
        (binding) => binding.kind === 'identifier' && binding.symbol === symbol && binding.role === mode
      );
      if (importedBinding !== undefined) evidence[importedBinding.framework] = true;
    }
    for (const declaration of symbol.declarations ?? []) {
      if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
        const initializer = unwrapExpression(declaration.initializer);
        if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
          if (invoked || mode === 'config') inspectFunctionBody(initializer.body, mode);
        } else {
          inspectExpression(initializer, mode, invoked);
        }
      } else if (
        ts.isFunctionDeclaration(declaration) &&
        declaration.body !== undefined &&
        declaration.asteriskToken === undefined
      ) {
        if (invoked || mode === 'config') inspectFunctionBody(declaration.body, mode);
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
      } else if (
        ts.isBindingElement(declaration) &&
        ts.isObjectBindingPattern(declaration.parent) &&
        ts.isVariableDeclaration(declaration.parent.parent) &&
        declaration.parent.parent.initializer !== undefined
      ) {
        const memberName =
          propertyName(declaration.propertyName) ??
          (ts.isIdentifier(declaration.name) ? declaration.name.text : undefined);
        const initializer = declaration.parent.parent.initializer;
        if (memberName === undefined || !accessPathIsUnchanged(initializer)) continue;

        const base = unwrapExpression(initializer);
        if (invoked && ts.isIdentifier(base)) {
          const baseSymbol = checker.getSymbolAtLocation(base);
          const namespaceBinding = bindings.find(
            (binding) =>
              binding.kind === 'namespace-member' &&
              binding.symbol === baseSymbol &&
              binding.memberName === memberName &&
              binding.role === mode
          );
          if (namespaceBinding !== undefined && symbolIsUnchanged(namespaceBinding.symbol)) {
            evidence[namespaceBinding.framework] = true;
          }
        }
        for (const sourceSymbol of symbolsStoredInProperty(initializer, memberName)) {
          if (sourceSymbol !== symbol) inspectSymbolValue(sourceSymbol, mode, invoked);
        }
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
        if (accessPathIsUnchanged(callee)) {
          const symbol = checker.getSymbolAtLocation(
            ts.isPropertyAccessExpression(callee) ? callee.name : callee.argumentExpression
          );
          if (symbol !== undefined) inspectSymbolValue(symbol, mode, true);
        }
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
          if (
            !symbolIsUnchanged(property.name === undefined ? undefined : checker.getSymbolAtLocation(property.name))
          ) {
            continue;
          }
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
      if (!accessPathIsUnchanged(expression)) return;
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
      statement.asteriskToken === undefined &&
      ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
    ) {
      const symbol = statement.name === undefined ? undefined : checker.getSymbolAtLocation(statement.name);
      if (symbolIsUnchanged(symbol)) inspectFunctionBody(statement.body, 'config');
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

const YARN_OPTIONS_WITH_OPTIONAL_VALUES = new Set(['--emoji', '--prod', '--production', '--scripts-prepend-node-path']);

const skipYarnOptions = (tokens: string[]): string[] => {
  let remaining = tokens;
  while (remaining[0]?.startsWith('-')) {
    const option = remaining[0]!;
    const normalizedOption = option.toLowerCase();
    // Yarn Classic consumes any following non-option token as the optional value. That includes values such as `0`
    // and command-looking names; only another option proves that the value was omitted.
    const consumesFollowingToken =
      !option.includes('=') &&
      (YARN_OPTIONS_WITH_VALUES.has(normalizedOption) ||
        (YARN_OPTIONS_WITH_OPTIONAL_VALUES.has(normalizedOption) &&
          remaining[1] !== undefined &&
          !remaining[1].startsWith('-')));
    remaining = remaining.slice(consumesFollowingToken ? 2 : 1);
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
