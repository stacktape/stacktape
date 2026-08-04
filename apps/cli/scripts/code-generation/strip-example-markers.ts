/**
 * Generation-time processing of embedded examples in schema descriptions.
 *
 * Examples are authored in the source *.d.ts with focus markers (# stp-focus / // stp-focus) and with the
 * comment-terminating star-slash sequence escaped as `*\/` (so a glob like `**\/*.html` does not end the JSDoc block).
 * Neither belongs in what users see. This module:
 *   - removes focus-marker lines from fenced code blocks,
 *   - unescapes the escaped `*\/` back to a real star-slash,
 *   - records the focused line range per fence as `x-stp-focus` metadata (consumed only by the web docs).
 *
 * Result: the published JSON schema `description` (VS Code YAML hover + docs) is clean; the web build
 * gets the focus ranges separately so it can highlight/collapse.
 */
export type FenceFocus = { lang: string; focusStart: number | null; focusEnd: number | null };

const FENCE_OPEN = /^```([a-zA-Z0-9]+)?\s*$/;
const FENCE_CLOSE = /^```\s*$/;
export const cleanExampleText = (description: string): { description: string; fences: FenceFocus[] } => {
  const lines = description.split('\n');
  const out: string[] = [];
  const fences: FenceFocus[] = [];

  let inFence = false;
  let fenceLang = '';
  let fenceLineIdx = 0; // index of emitted code lines within the current fence
  let focusStart: number | null = null;
  let focusEnd: number | null = null;

  for (const line of lines) {
    if (!inFence) {
      const m = line.match(FENCE_OPEN);
      if (m && !FENCE_CLOSE.test(line.trim())) {
        // opening fence with a language (``` alone is a close, handled below)
      }
      if (m && m[1]) {
        inFence = true;
        fenceLang = m[1];
        fenceLineIdx = 0;
        focusStart = null;
        focusEnd = null;
        out.push(line);
        continue;
      }
      out.push(line);
      continue;
    }

    // inside a fence
    if (FENCE_CLOSE.test(line.trim())) {
      fences.push({ lang: fenceLang, focusStart, focusEnd });
      inFence = false;
      out.push(line);
      continue;
    }
    // Markers may be standalone (`# stp-focus` on its own line) or trailing comments on a content line
    // (e.g. `- # stp-focus`, which the YAML parser ignores but must not reach the rendered docs).
    const endM = line.match(/^(.*?)[ \t]*(?:#|\/\/)[ \t]*stp-end-focus[ \t]*$/);
    if (endM) {
      if (endM[1].trim() === '') {
        focusEnd = fenceLineIdx - 1; // standalone: previous emitted line was the last focused line
      } else {
        out.push(endM[1].replaceAll('*\\/', '*/'));
        focusEnd = fenceLineIdx;
        fenceLineIdx += 1;
      }
      continue;
    }
    const startM = line.match(/^(.*?)[ \t]*(?:#|\/\/)[ \t]*stp-focus[ \t]*$/);
    if (startM) {
      if (startM[1].trim() === '') {
        focusStart = fenceLineIdx; // standalone: next emitted line is the first focused line
      } else {
        out.push(startM[1].replaceAll('*\\/', '*/'));
        focusStart = fenceLineIdx; // trailing: this content line is the first focused line
        fenceLineIdx += 1;
      }
      continue;
    }
    out.push(line.replaceAll('*\\/', '*/'));
    fenceLineIdx += 1;
  }

  return { description: out.join('\n'), fences };
};

// Walk a JSON-schema object, cleaning every `description`, attaching `x-stp-focus` where examples are
// focused, and mirroring the result into `markdownDescription`.
//
// VS Code and the Red Hat YAML extension render schema `description` as (mostly) plain text in hovers,
// but `markdownDescription` as full Markdown — headings (`####`), bold, and fenced code blocks. The
// `description` field is kept for other consumers (docs enhancer, llm-docs, zod `.describe()`).
export const stripExampleMarkersInSchema = (node: any): any => {
  if (Array.isArray(node)) {
    node.forEach(stripExampleMarkersInSchema);
    return node;
  }
  if (node && typeof node === 'object') {
    if (typeof node.description === 'string') {
      if (node.description.includes('```')) {
        const { description, fences } = cleanExampleText(node.description);
        node.description = description;
        const focused = fences.filter((f) => f.focusStart !== null);
        if (focused.length) node['x-stp-focus'] = fences;
      }
      node.markdownDescription = node.description;
    }
    for (const key of Object.keys(node)) {
      // Skip the STRING description/markdownDescription of this node (handled above), but still recurse
      // into child VALUES — including a config property literally named `description`/`markdownDescription`.
      if ((key === 'description' || key === 'markdownDescription') && typeof node[key] === 'string') continue;
      stripExampleMarkersInSchema(node[key]);
    }
  }
  return node;
};
