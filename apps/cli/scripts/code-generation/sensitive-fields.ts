/**
 * Config fields whose value is a credential. A field is marked with the `@sensitive` JSDoc tag in `@stacktape/config`;
 * the schema compiler turns the tag into the keyword `sensitive`, and this module lists the marked fields as
 * `@stacktape/config/sensitive-fields.json` for readers that must hide them without loading the whole schema (the
 * Console hides them from members who may not view secrets).
 */
export const SENSITIVE_KEYWORD = 'sensitive';

export type SensitiveConfigField = {
  /** The property's name. */
  field: string;
  /** The properties of each object type in which this property is a credential. */
  sensitiveWithin: string[][];
  /**
   * The properties of each other object type that has a property of this name which is not a credential (an uptime
   * check's `url` against a webhook's). The schema closes every object type, so an object whose properties all belong
   * to one of these types, and to none of the `sensitiveWithin` ones, is that other type.
   */
  plainWithin: string[][];
};

type SchemaNode = { [key: string]: unknown };

const isNode = (value: unknown): value is SchemaNode => Boolean(value) && typeof value === 'object';
const compare = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

/**
 * Normalizes each `sensitive` keyword to `true` (a bare tag compiles to an empty string) and returns the marked fields
 * with the object types they occur in, sorted.
 */
export const extractSensitiveFields = (schema: SchemaNode): SensitiveConfigField[] => {
  // Every closed object type of the schema that has a property of a given name, keyed by its sorted property names.
  const occurrences = new Map<string, { sensitive: Map<string, string[]>; plain: Map<string, string[]> }>();
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isNode(node)) return;
    const properties = node.properties;
    if (isNode(properties) && node.type === 'object' && node.additionalProperties === false) {
      const within = Object.keys(properties).sort(compare);
      for (const [field, property] of Object.entries(properties)) {
        if (!isNode(property)) continue;
        const isSensitive = SENSITIVE_KEYWORD in property;
        if (isSensitive) property[SENSITIVE_KEYWORD] = true;
        const entry = occurrences.get(field) ?? { sensitive: new Map(), plain: new Map() };
        occurrences.set(field, entry);
        (isSensitive ? entry.sensitive : entry.plain).set(within.join(','), within);
      }
    } else if (isNode(properties)) {
      for (const [field, property] of Object.entries(properties)) {
        if (isNode(property) && SENSITIVE_KEYWORD in property) {
          throw new Error(`The sensitive field "${field}" sits in an object that accepts any property.`);
        }
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (key !== 'description') visit(value);
    }
  };
  visit(schema);
  const sorted = (shapes: Map<string, string[]>) =>
    [...shapes.entries()].sort(([left], [right]) => compare(left, right)).map(([, within]) => within);
  return [...occurrences.entries()]
    .filter(([, { sensitive }]) => sensitive.size > 0)
    .sort(([left], [right]) => compare(left, right))
    .map(([field, { sensitive, plain }]) => ({
      field,
      sensitiveWithin: sorted(sensitive),
      plainWithin: sorted(plain)
    }));
};
