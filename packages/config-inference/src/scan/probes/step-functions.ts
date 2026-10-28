/**
 * The order of the functions a Step Functions workflow runs.
 *
 * Code that calls `StartExecution` with an ARN from a variable needs a state machine (the lambda-source probe finds the
 * call). Which states it runs is business logic the repository rarely writes down, so the order is read only from the
 * data flow: the input the code starts an execution with is what the first function reads, and each function's result
 * is what the next one reads. Anything less clear is left for the user, never guessed.
 */

import { sliceBalancedBraces } from '../balanced-slice';

/** Splits an object or dict body at its top-level commas. */
const topLevelEntries = (body: string): string[] => {
  const entries: string[] = [];
  let depth = 0;
  let quote: string | undefined;
  let start = 0;
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index]!;
    if (quote !== undefined) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') quote = character;
    else if ('([{'.includes(character)) depth += 1;
    else if (')]}'.includes(character)) depth -= 1;
    else if (character === ',' && depth === 0) {
      entries.push(body.slice(start, index).trim());
      start = index + 1;
    }
  }
  entries.push(body.slice(start).trim());
  return entries.filter((entry) => entry !== '');
};

/** The keys of an object literal or dict, and the names it spreads (`...input`, `**event`). */
export const objectShape = (body: string): { keys: string[]; spreads: string[] } => {
  const keys: string[] = [];
  const spreads: string[] = [];
  for (const entry of topLevelEntries(body)) {
    const spread = /^(?:\.\.\.|\*\*)\s*([\w$]+)/.exec(entry);
    if (spread !== null) {
      spreads.push(spread[1]!);
      continue;
    }
    const key = /^(?:(['"])([\w$-]+)\1|([\w$]+))\s*(?::|$)/.exec(entry);
    if (key !== null) keys.push(key[2] ?? key[3]!);
  }
  return { keys, spreads };
};

/** What a handler reads from its event and what it returns, for ordering it among the other steps. */
export type StepShape = { reads: string[]; returns: string[]; passesInputThrough: boolean };

const JS_EVENT_PARAMETER =
  /export\s+(?:default\s+(?:async\s+)?(?:function\s*[\w$]*\s*)?|const\s+handler\s*=\s*(?:async\s+)?(?:function\s*[\w$]*\s*)?|(?:async\s+)?function\s+handler\s*)\(\s*([\w$]+|\{[^}]*\})/;
const PYTHON_EVENT_PARAMETER = /^def\s+(?:lambda_handler|handler)\s*\(\s*(\w+)/m;

/**
 * The fields a handler reads from its event (`input.amount`, `event["approved"]`), the keys of the objects it returns,
 * and whether it returns its input with them (`{ ...input, approved }`). Undefined when the handler reads no field.
 */
export const stepShapeOf = (path: string, raw: string): StepShape | undefined => {
  const python = path.endsWith('.py');
  const parameter = (python ? PYTHON_EVENT_PARAMETER : JS_EVENT_PARAMETER).exec(raw)?.[1];
  if (parameter === undefined) return undefined;
  const reads = new Set<string>();
  if (parameter.startsWith('{')) {
    for (const name of objectShape(parameter.slice(1, -1)).keys) reads.add(name);
  } else {
    const name = parameter.replace(/\$/g, '\\$');
    const patterns = [
      new RegExp(`(?<![\\w$.])${name}\\s*(?:\\?\\.|\\.)\\s*([A-Za-z_$][\\w$]*)`, 'g'),
      new RegExp(`(?<![\\w$.])${name}\\s*\\[\\s*['"]([\\w$-]+)['"]\\s*\\]`, 'g'),
      new RegExp(`(?<![\\w$.])${name}\\.get\\(\\s*['"]([\\w$-]+)['"]`, 'g'),
      new RegExp(`(?:const|let|var)\\s*\\{([^}]*)\\}\\s*=\\s*${name}\\b`, 'g')
    ];
    for (const [index, pattern] of patterns.entries()) {
      for (const match of raw.matchAll(pattern)) {
        if (index === 3) for (const key of objectShape(match[1]!).keys) reads.add(key);
        else if (!(python && index === 0 && match[1] === 'get')) reads.add(match[1]!);
      }
    }
  }
  if (reads.size === 0) return undefined;
  const returns = new Set<string>();
  let passesInputThrough = false;
  for (const match of raw.matchAll(/\breturn\s+(?=\{)/g)) {
    const body = sliceBalancedBraces(raw, match.index + match[0].length)?.body;
    if (body === undefined) continue;
    const shape = objectShape(body);
    for (const key of shape.keys) returns.add(key);
    if (shape.spreads.includes(parameter)) passesInputThrough = true;
  }
  return { reads: [...reads], returns: [...returns], passesInputThrough };
};

/**
 * The order the steps run in, or undefined when the data flow does not settle it. At each point exactly one remaining
 * step may read only what the previous state holds, and it must need something the previous step added; every
 * candidate has to find its place.
 */
export const orderWorkflowSteps = <Step extends { shape: StepShape | undefined }>(
  inputKeys: readonly string[] | undefined,
  candidates: readonly Step[]
): Step[] | undefined => {
  if (inputKeys === undefined || candidates.length === 0) return undefined;
  if (candidates.some((candidate) => candidate.shape === undefined)) return undefined;
  const order: Step[] = [];
  let state = new Set(inputKeys);
  let added = new Set(inputKeys);
  const remaining = [...candidates];
  while (remaining.length > 0) {
    const ready = remaining.filter(
      ({ shape }) => shape!.reads.every((field) => state.has(field)) && shape!.reads.some((field) => added.has(field))
    );
    if (ready.length !== 1) return undefined;
    const [next] = ready;
    order.push(next!);
    remaining.splice(remaining.indexOf(next!), 1);
    const shape = next!.shape!;
    added = new Set(shape.returns.filter((key) => !state.has(key) || !shape.passesInputThrough));
    state = new Set([...(shape.passesInputThrough ? state : []), ...shape.returns]);
  }
  return order;
};
