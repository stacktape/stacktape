/**
 * Minimal structural types for the mdast/hast trees the documentation plugins walk.
 *
 * The full `mdast`/`hast`/`mdast-util-mdx-jsx` type graph adds four packages and a lot of union
 * narrowing for four small plugins that only read a handful of fields and mutate in place. These
 * aliases keep the plugins honest about what they touch without pulling that in — and, unlike
 * `any`, a typo in a field name is still an error.
 */

export type AstNode = {
  type: string;
  [field: string]: unknown;
};

export type AstParent = AstNode & { children: AstNode[] };

/** Node carrying JSX attributes (`mdxJsxFlowElement` / `mdxJsxTextElement`). */
export type JsxElementNode = AstNode & { attributes?: AstNode[] };

/** Frontmatter Astro attaches to the vfile while compiling an MDX page. */
export type MdxVFile = { value?: unknown; data?: { astro?: { frontmatter?: Record<string, unknown> } } };
