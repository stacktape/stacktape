/**
 * Where a claim came from.
 *
 * Every statement this pipeline makes about a repository has to point at the place in the
 * repository that supports it. That serves three separate purposes, and it is worth being clear
 * that they are separate, because they pull the design in different directions:
 *
 *  1. Verification — we re-read the cited place and check it says what was claimed.
 *  2. Explanation — the wizard shows the user why a database appeared in their infrastructure.
 *  3. Freshness — a claim is only as current as the bytes it was drawn from.
 *
 * What a citation does *not* do is prove entailment. A model can quote a real line that does not
 * actually support its claim. Citations kill fabricated files and invented line numbers, and they
 * force the model to genuinely perform the read; the closed vocabulary and the deterministic
 * composer are what stop a wrong reading from becoming wrong infrastructure.
 */

import { z } from 'zod';

export const citationSchema = z.object({
  /**
   * Which field of the enclosing object this citation supports.
   *
   * Optional because demanding a citation per field destroys recall on smaller models, which then
   * report less rather than reporting carefully. Verification requires the tag only for the fields
   * where a wrong answer changes infrastructure — see `HIGH_STAKES_FIELDS`.
   */
  field: z.string().min(1).optional(),
  /** Repository-relative POSIX path. Never absolute, never Windows-separated. */
  file: z.string().min(1),
  /** 1-based line number the quote was taken from. */
  line: z.number().int().positive(),
  /**
   * Text copied from that line.
   *
   * Matched after whitespace normalisation within a small window around the line, then as a
   * whole-file substring. Models paraphrase and re-indent; insisting on byte equality at an exact
   * offset would reject correct claims far more often than it would catch wrong ones.
   */
  quote: z.string().min(1)
});

export type Citation = z.infer<typeof citationSchema>;

/**
 * Fields where a wrong value produces wrong infrastructure rather than a cosmetic mistake.
 *
 * A claim touching one of these must carry a citation tagged with that field name. Everything else
 * is satisfied by the enclosing object's general evidence.
 */
export const HIGH_STAKES_FIELDS: ReadonlySet<string> = new Set([
  'buildCommand',
  'dependencies.kind',
  'exposesHttp',
  'executionModel',
  'port',
  'schedule',
  'startCommand',
  'writesLocalFilesystem'
]);

/**
 * Who produced a claim.
 *
 * Probes run before any model and emit claims of their own, so most of a facts document is already
 * populated by the time an agent sees it. Keeping the origin lets verification treat the two
 * differently — a probe's citation was constructed from the bytes it just read and cannot be
 * misattributed, so it needs checking only for freshness.
 */
export const factSourceSchema = z.enum(['probe', 'agent']);
export type FactSource = z.infer<typeof factSourceSchema>;

/**
 * How firmly a claim is held.
 *
 * `uncertain` is not a failure state. A pipeline that can say "there is a database here but I
 * cannot tell which engine" routes that to a question the user answers in seconds. A pipeline that
 * must choose guesses, and a wrong guess is discovered at runtime by someone with no infrastructure
 * experience.
 */
export const confidenceSchema = z.enum(['observed', 'inferred', 'uncertain']);
export type Confidence = z.infer<typeof confidenceSchema>;
