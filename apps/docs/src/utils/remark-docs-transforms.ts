import { visit } from 'unist-util-visit';
import type { AstNode, AstParent, MdxVFile } from './ast';

/**
 * Content transforms that mirror what the old Next.js pipeline did at render time, applied here as
 * a remark plugin so the rendered body AND Astro's extracted `headings` (TOC) stay consistent:
 *
 *  1. Strip a leading body-level `# H1` — the layout renders the page title as the only <h1>.
 *  2. Template the bare `## FAQ` heading into `## {title} FAQ` for query/TOC matching.
 */
export function remarkDocsTransforms() {
  return (tree: AstParent, file: MdxVFile) => {
    const title = file?.data?.astro?.frontmatter?.title;

    const firstContentIndex = tree.children.findIndex(
      (node) => node.type !== 'mdxjsEsm' && node.type !== 'yaml' && node.type !== 'mdxFlowExpression'
    );
    if (firstContentIndex !== -1) {
      const node = tree.children[firstContentIndex];
      if (node.type === 'heading' && node.depth === 1) {
        tree.children.splice(firstContentIndex, 1);
      }
    }

    if (typeof title !== 'string' || !title) return;

    visit(tree, 'heading', (node: AstNode) => {
      if (node.depth !== 2) return;
      const children = node.children as AstNode[] | undefined;
      const only = children?.length === 1 ? children[0] : undefined;
      if (only?.type === 'text' && String(only.value).trim() === 'FAQ') {
        only.value = `${title} FAQ`;
      }
    });
  };
}
