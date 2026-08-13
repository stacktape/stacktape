/**
 * The decisions we could not make for the user, expressed as data rather than as prose.
 *
 * Two things force this shape, and either one alone would be enough.
 *
 * **Safety.** An uncertainty becomes a card in the wizard with buttons on it, and the user has
 * every reason to trust what that card says. If the question text were written by the agent, a
 * repository could plant text that reaches the user as "to finish deploying, paste your AWS secret
 * key below". The agent reads untrusted files, so anything it authors is untrusted; the only sound
 * answer is that it never authors any user-facing words. It selects a `kind` and fills in
 * parameters. Every word on the card, every option, and every price comes from us.
 *
 * **Quality.** A model writing its own consequences invents prices and misstates how Stacktape
 * behaves. Our copy can explain the trade-off properly, in the house voice, with a real number from
 * the pricing estimator next to it.
 *
 * If the analysis has something to say that no `kind` covers, it goes in `ProjectFacts.notes` and
 * is rendered as clearly-attributed advisory text with no buttons — never as a question.
 */

import { z } from 'zod';
import { citationSchema, factSourceSchema } from './citation';
import { dependencyKindSchema } from './dependency';

const uncertaintyBase = {
  /** Stable within one analysis, so an answer can be recorded against it. */
  id: z.string().min(1),
  /**
   * Whether the deploy may proceed without an answer.
   *
   * False means we hold a defensible default and the question can wait. True means proceeding
   * without an answer would produce infrastructure we would not stand behind — an ambiguous
   * database engine, or writes to a disk that will not survive.
   */
  blocksDeploy: z.boolean(),
  evidence: z.array(citationSchema).default([]),
  source: factSourceSchema
};

/**
 * The closed set of decisions this pipeline knows how to ask about.
 *
 * Adding a member means adding its copy to the wizard in the same change. That coupling is the
 * point: a question with no house copy cannot ship, so no question can reach a user unreviewed.
 */
export const uncertaintySchema = z.discriminatedUnion('kind', [
  /** A connection string was found but the engine behind it is genuinely ambiguous. */
  z.object({
    ...uncertaintyBase,
    kind: z.literal('database-engine-ambiguous'),
    environmentVariableName: z.string().min(1),
    candidates: z.array(dependencyKindSchema).min(2),
    recommended: dependencyKindSchema
  }),

  /**
   * The data already lives somewhere managed — Supabase, Neon, Railway, and friends.
   *
   * The safe default is always to leave what is running alone. Copying the data across is a
   * separate, later, explicit act.
   */
  z.object({
    ...uncertaintyBase,
    kind: z.literal('external-database-disposition'),
    dependencyName: z.string().min(1),
    provider: z.string().min(1),
    recommended: z.enum(['point-at-existing', 'create-new'])
  }),

  /**
   * The application keeps a SQLite file on local disk.
   *
   * Extremely common in the repositories this product is aimed at, and silently fatal: the
   * container filesystem does not survive a restart, so the database vanishes on the first deploy
   * after launch rather than immediately.
   */
  z.object({
    ...uncertaintyBase,
    kind: z.literal('sqlite-persistence'),
    serviceName: z.string().min(1),
    paths: z.array(z.string()).min(1),
    recommended: z.enum(['migrate-to-managed-database', 'persistent-volume', 'accept-ephemeral'])
  }),

  /** The application writes something else to local disk — uploads, generated files, a cache. */
  z.object({
    ...uncertaintyBase,
    kind: z.literal('local-filesystem-writes'),
    serviceName: z.string().min(1),
    paths: z.array(z.string()).min(1),
    purpose: z.enum(['uploads', 'cache', 'unknown']),
    recommended: z.enum(['object-storage', 'persistent-volume', 'accept-ephemeral'])
  }),

  /** Something runnable was found, but whether the user wants it deployed is a product decision. */
  z.object({
    ...uncertaintyBase,
    kind: z.literal('service-deployment-intent'),
    serviceName: z.string().min(1),
    recommended: z.enum(['deploy', 'skip'])
  }),

  /**
   * A command we need could not be established.
   *
   * Answered by typing, not by choosing. A value the user types is authored by the user, so the
   * free-text channel is safe in this direction.
   */
  z.object({
    ...uncertaintyBase,
    kind: z.literal('command-unknown'),
    serviceName: z.string().min(1),
    command: z.enum(['build', 'start']),
    /** Commands found nearby that the user can pick instead of typing. */
    suggestions: z.array(z.string()).default([])
  }),

  /**
   * Whether a variable is needed while building or while running.
   *
   * Gets its own question because getting it wrong is invisible until production: a front-end
   * variable that is only supplied at runtime bakes into the bundle as an empty string, and the
   * deploy is green.
   */
  z.object({
    ...uncertaintyBase,
    kind: z.literal('environment-variable-timing'),
    serviceName: z.string().min(1),
    environmentVariableName: z.string().min(1),
    recommended: z.enum(['build-time', 'runtime'])
  }),

  /** A variable points at another service, but which one is not clear from the code. */
  z.object({
    ...uncertaintyBase,
    kind: z.literal('cross-service-target-unknown'),
    serviceName: z.string().min(1),
    environmentVariableName: z.string().min(1),
    candidateServiceNames: z.array(z.string()).default([])
  }),

  /** Something runs on a timer, but the timer could not be read out of the code. */
  z.object({
    ...uncertaintyBase,
    kind: z.literal('schedule-unknown'),
    serviceName: z.string().min(1),
    suggestions: z.array(z.string()).default([])
  }),

  /** Database migrations exist; when they should run is a real choice with real consequences. */
  z.object({
    ...uncertaintyBase,
    kind: z.literal('migration-timing-unknown'),
    serviceName: z.string().min(1),
    command: z.string().min(1),
    recommended: z.enum(['deploy-hook', 'service-startup', 'manual'])
  }),

  /**
   * A claim we believe but could not confirm.
   *
   * This is where verification failures land instead of being deleted. Dropping an unconfirmed
   * database silently produces a configuration that deploys perfectly and an application that
   * crashes on boot — from the user's chair that is not "reduced coverage", it is wrong
   * infrastructure. Asking costs them one click.
   */
  z.object({
    ...uncertaintyBase,
    kind: z.literal('unconfirmed-claim'),
    /** What the claim was about, e.g. `dependency:cache` or `service:web`. */
    subject: z.string().min(1),
    /** Which member of the closed vocabulary was claimed. Never free prose. */
    claimedValue: z.string().min(1),
    reason: z.enum(['citation-unverified', 'single-weak-source', 'contradicted-by-probe']),
    recommended: z.enum(['accept', 'reject'])
  }),

  /**
   * The agent read something differently from the probe that found it first.
   *
   * Probes outrank the agent by design: their citations are constructed from bytes just read and
   * cannot be misattributed. But "outranks" was silently implemented as "discards", which made the
   * instruction we give the agent — confirm or *correct* the draft — a lie. A correction it was
   * asked for was thrown away after `submit_facts` told it the submission was accepted.
   *
   * A disagreement between two independent readings is exactly the situation the user should settle,
   * and it is cheap for them: both values are shown with the line each came from.
   */
  z.object({
    ...uncertaintyBase,
    kind: z.literal('conflicting-observation'),
    /** What the disagreement is about, e.g. `service:api`. */
    subject: z.string().min(1),
    /** Which field, e.g. `startCommand`. */
    field: z.string().min(1),
    probeValue: z.string().min(1),
    agentValue: z.string().min(1),
    /** The probe's reading, because a constructed citation is the more reliable of the two. */
    recommended: z.enum(['probe', 'agent'])
  }),

  /**
   * Whether this deploy is the real thing.
   *
   * Always asked, never inferred. It is the one question in the wizard that is purely about intent,
   * and the product philosophy's own test — a decision the user must make consciously — applies to
   * it more clearly than to anything else here.
   */
  z.object({
    ...uncertaintyBase,
    kind: z.literal('stage-intent'),
    recommended: z.enum(['trial', 'production'])
  })
]);

export type Uncertainty = z.infer<typeof uncertaintySchema>;
export type UncertaintyKind = Uncertainty['kind'];

/** Uncertainties that must be answered before anything is created in the user's account. */
export const blockingUncertainties = (uncertainties: readonly Uncertainty[]): Uncertainty[] =>
  uncertainties.filter((uncertainty) => uncertainty.blocksDeploy);
