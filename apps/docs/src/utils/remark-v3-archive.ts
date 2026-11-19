import { relative } from 'node:path';
import { visit } from 'unist-util-visit';
import type { AstNode, JsxElementNode, MdxVFile } from './ast';
import { entryToUrlSlug, slugToUrl } from './route-slugs';
import { ARCHIVE_CONTENT_DIR, isV3ArchiveFile, toV3Href } from './v3-archive';

/**
 * Render-time adaptation of the frozen v3 pages. Applies only to `archive/v3/content`; current pages
 * pass through untouched.
 *
 *  - v3 pages use `#` for their top-level sections, while the layout renders the page title as the
 *    only H1. Every heading moves down one level so the outline and the table of contents keep v3's
 *    structure. Heading text and generated ids are unchanged, so old `#fragment` links still work.
 *  - Links to v3 pages (root-relative, relative `.mdx` and absolute docs.stacktape.com links) point to
 *    their `/v3/` copies, so a reader stays in the archive.
 *  - v3 code blocks marked highlighted lines with `{start-highlight}`/`{stop-highlight}` comment lines
 *    and hid lines between `{start-ignore}`/`{stop-ignore}`. They become the current code block's
 *    `[!code highlight-start]`/`[!code highlight-end]` markers, and ignored lines are dropped.
 */
const convertV3CodeDirectives = (code: string) => {
  const lines: string[] = [];
  let ignoring = false;
  for (const line of code.split('\n')) {
    if (line.includes('{start-ignore}')) ignoring = true;
    else if (line.includes('{stop-ignore}')) ignoring = false;
    else if (line.includes('{start-highlight}')) lines.push('# [!code highlight-start]');
    else if (line.includes('{stop-highlight}')) lines.push('# [!code highlight-end]');
    else if (!ignoring) lines.push(line);
  }
  return lines.join('\n');
};

export function remarkV3Archive() {
  return (tree: AstNode, file: MdxVFile) => {
    if (!isV3ArchiveFile(file?.path)) return;
    const fromV3Path = slugToUrl(
      entryToUrlSlug(relative(ARCHIVE_CONTENT_DIR, String(file.path)).replace(/\.mdx$/, ''))
    );

    visit(tree, (node: AstNode) => {
      if (node.type === 'code' && typeof node.value === 'string') {
        node.value = convertV3CodeDirectives(node.value);
      } else if (node.type === 'heading' && typeof node.depth === 'number') {
        node.depth = Math.min(6, node.depth + 1);
      } else if ((node.type === 'link' || node.type === 'definition') && typeof node.url === 'string') {
        node.url = toV3Href(node.url, fromV3Path);
      } else if ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && node.name === 'a') {
        for (const attribute of (node as JsxElementNode).attributes ?? []) {
          if (attribute.name === 'href' && typeof attribute.value === 'string') {
            attribute.value = toV3Href(attribute.value, fromV3Path);
          }
        }
      }
    });
  };
}
