/**
 * What "minify" means for a Stacktape JS/TS build, for both ES bundlers.
 *
 * Whitespace and syntax are compressed whenever minification is on. Identifiers are not, unless
 * asked: shortening them takes local function and variable names out of stack traces and out of
 * error messages (`TypeError: Ln is not a function`), and the short names change with every build.
 * The Console's issue detector groups runtime errors by message and function name, so mangled names
 * would open a fresh issue after each deployment. Identifier minification is therefore an explicit
 * opt-in, and nothing here depends on the target: a container bundle reads the same way in a log.
 */
export type BunMinifyConfig = { whitespace: boolean; syntax: boolean; identifiers: boolean } | false;

export const getBunMinifyConfig = ({
  minify = true,
  minifyIdentifiers = false
}: {
  minify?: boolean | undefined;
  minifyIdentifiers?: boolean | undefined;
}): BunMinifyConfig => (minify ? { whitespace: true, syntax: true, identifiers: minifyIdentifiers } : false);
