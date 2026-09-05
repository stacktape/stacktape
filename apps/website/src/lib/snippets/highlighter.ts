/*
 * The one Shiki highlighter this build uses.
 *
 * Created once per process and shared by every snippet: loading a theme and two grammars costs
 * ~200 ms, and a static build renders the same five snippets on every page that embeds them.
 */
import { createHighlighter, type Highlighter } from 'shiki';

/**
 * `catppuccin-mocha`, the same theme the documentation site uses.
 *
 * Kept deliberately: the two properties this site needs from a code theme are that it sits on a
 * near-black teal-charcoal surface without fighting it, and that a reader who lands on the docs
 * afterwards sees the same colours for the same YAML. Its background is never painted — the
 * stylesheet forces `<pre>` transparent so the surrounding panel shows through.
 */
export const SHIKI_THEME = 'catppuccin-mocha';

/** The only two languages a Stacktape config is ever shown in. */
const SHIKI_LANGS = ['yaml', 'typescript'] as const;

let highlighterPromise: Promise<Highlighter> | undefined;

export const getHighlighter = (): Promise<Highlighter> => {
  highlighterPromise ??= createHighlighter({ themes: [SHIKI_THEME], langs: [...SHIKI_LANGS] });
  return highlighterPromise;
};
