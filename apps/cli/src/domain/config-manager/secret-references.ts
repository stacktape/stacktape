import { getDirectiveName, getDirectiveParams, getIsDirective } from '@utils/directives';

/** The secret a `$Secret` directive reads, and the top-level JSON key it selects, if any. */
export type SecretReference = { secretName: string; jsonKey?: string };

/**
 * Reads the arguments of a `$Secret` directive.
 *
 * - `$Secret('name', 'key')`: the first argument is the literal secret name, dots included, and the second selects a
 *   top-level JSON key. An empty key selects the whole secret.
 * - `$Secret('name.key')`: the Stacktape 3 form. The text before the first dot is the secret name and the text after it,
 *   up to a second dot, is the JSON key. It keeps this meaning, so existing configurations read the same secrets.
 */
export const parseSecretReference = (args: readonly unknown[]): SecretReference => {
  const [first, second] = args as string[];
  if (args.length >= 2) {
    return { secretName: first, ...(second ? { jsonKey: second } : {}) };
  }
  const [secretName, jsonKey] = first.split('.');
  return { secretName, ...(jsonKey ? { jsonKey } : {}) };
};

/** The directive as the configuration wrote it, for error messages. */
export const describeSecretDirective = (args: readonly unknown[]) =>
  `$Secret(${args.map((arg) => `'${String(arg)}'`).join(', ')})`;

/**
 * The secret references of every `$Secret(...)` in a directive expression whose arguments are literal, including ones
 * nested in another directive: `$Format('redis://:{}@host', $Secret('cache', 'password'))` reads `cache`/`password`.
 */
export const getNestedSecretReferences = (node: unknown): SecretReference[] => {
  if (!getIsDirective(node)) return [];
  const references: SecretReference[] = [];
  const visit = (definition: string) => {
    const name = getDirectiveName(definition);
    const params = getDirectiveParams(name, definition);
    if (name === 'Secret' && params.length > 0 && params.every((param) => typeof param.value === 'string')) {
      references.push(parseSecretReference(params.map((param) => param.value)));
    }
    for (const param of params) if (param.isDirective) visit(param.definition);
  };
  visit(node as string);
  return references;
};
