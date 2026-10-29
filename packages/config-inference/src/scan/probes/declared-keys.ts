/**
 * The keys an importer maps, and what happens to every other key a manifest declares.
 *
 * Two audits in a row found importers dropping settings they did not read: resource policies, conditions, profiles,
 * internal networks, MFA, read-only root filesystems. Each importer therefore lists, per kind of declaration, every
 * key it knows and what it does with it. A key outside that list is never ignored: it becomes an import gap, and the
 * rule for unknown keys decides whether the declaration is still written.
 */

import type { DependencyFact } from '../../facts/dependency';
import type { ImportConcern, ImportGap } from '../../facts/project-facts';
import type { ServiceFactInput } from '../../facts/service';
import type { ProbeOutput } from '../probe';

/**
 * - `carried`: the importer maps it (or deliberately reads it elsewhere).
 * - `ignored`: Stacktape needs no equivalent: a description, tags, a physical name Stacktape chooses itself.
 * - `not-carried`: init writes the declaration without it and says so.
 * - `omit`, or a concern: leaving the key out would make the result less safe, so the declaration is left out.
 */
export type KeyRule = 'carried' | 'ignored' | 'not-carried' | 'omit' | ImportConcern;

export type KeyRules = Readonly<Record<string, KeyRule>>;

/** What reviewing a declaration found: the keys that leave it out, and the keys it is written without. */
export type KeyReview = {
  omitted: Array<{ key: string; concern?: ImportConcern }>;
  notCarried: string[];
};

export const emptyReview = (): KeyReview => ({ omitted: [], notCarried: [] });

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Declaration names and keys come from repository bytes; only a plain identifier shape reaches the user. */
export const safeDeclaredName = (value: string): string => {
  const cleaned = value.replace(/[^A-Za-z0-9_.:$@/*+-]/g, '_').slice(0, 120);
  return cleaned === '' ? '_' : cleaned;
};

/**
 * Check every key of `declaration` against `rules`, adding what it finds to `review`.
 *
 * `unknown` is the rule for a key the importer does not list. Event and trigger declarations use `omit`: what they
 * accept is a short, closed vocabulary, and a modifier init does not know may change which events arrive.
 */
export const reviewKeys = (
  declaration: unknown,
  rules: KeyRules,
  {
    prefix = '',
    unknown = 'not-carried',
    review = emptyReview()
  }: {
    prefix?: string;
    unknown?: KeyRule;
    review?: KeyReview;
  } = {}
): KeyReview => {
  if (!isRecord(declaration)) return review;
  for (const key of Object.keys(declaration)) {
    // Compose extension fields and YAML anchors' holders are not settings.
    if (key.startsWith('x-')) continue;
    const rule = rules[key] ?? unknown;
    const path = `${prefix}${key}`;
    if (rule === 'carried' || rule === 'ignored') continue;
    if (rule === 'not-carried') review.notCarried.push(path);
    else review.omitted.push(rule === 'omit' ? { key: path } : { key: path, concern: rule });
  }
  return review;
};

/** Leave a declaration out because of `key`, as a carried key whose value init cannot read requires. */
export const omitFor = (review: KeyReview, key: string, concern?: ImportConcern): KeyReview => {
  review.omitted.push(concern === undefined ? { key } : { key, concern });
  return review;
};

export const isOmitted = (review: KeyReview): boolean => review.omitted.length > 0;

/**
 * The gaps a review produces for one declaration. An omitted declaration needs no list of the other keys it would
 * have been written without; it is not written at all.
 */
export const reviewGaps = (file: string, object: string, review: KeyReview): ImportGap[] => {
  const name = safeDeclaredName(object);
  if (review.omitted.length > 0) {
    const keys = [...new Set(review.omitted.map((entry) => safeDeclaredName(entry.key)))].slice(0, 20);
    const concern = review.omitted.find((entry) => entry.concern !== undefined)?.concern;
    return [{ file, object: name, keys, effect: 'omitted', ...(concern === undefined ? {} : { concern }) }];
  }
  if (review.notCarried.length === 0) return [];
  return [
    {
      file,
      object: name,
      keys: [...new Set(review.notCarried.map(safeDeclaredName))].slice(0, 20),
      effect: 'not-carried'
    }
  ];
};

/** Declarations init did not import, such as template resources of a type no importer reads. */
export const notImportedGap = (file: string, names: readonly string[]): ImportGap[] =>
  names.length === 0
    ? []
    : [
        {
          file,
          object: 'Resources',
          keys: [...new Set(names.map(safeDeclaredName))].slice(0, 20),
          effect: 'not-imported'
        }
      ];

/**
 * What a function importer found. An entry file is reported as left out only when no function it kept uses it: two
 * functions can share one file, and the kept one must not be suppressed with the other.
 */
export const importerOutput = ({
  services,
  dependencies,
  importGaps,
  omittedEntrypoints,
  keptEntrypoints
}: {
  services: ServiceFactInput[];
  dependencies: DependencyFact[];
  importGaps: ImportGap[];
  omittedEntrypoints: ReadonlySet<string>;
  keptEntrypoints: ReadonlySet<string>;
}): ProbeOutput => {
  const omitted = [...omittedEntrypoints].filter((entry) => !keptEntrypoints.has(entry));
  return {
    ...(services.length === 0 ? {} : { services }),
    ...(dependencies.length === 0 ? {} : { dependencies }),
    ...(importGaps.length === 0 ? {} : { importGaps }),
    ...(omitted.length === 0 ? {} : { omittedEntrypoints: omitted })
  };
};
