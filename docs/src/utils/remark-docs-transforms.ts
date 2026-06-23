import { visit } from 'unist-util-visit';

/**
 * Content transforms that mirror what the old Next.js pipeline did at render time, applied here as
 * a remark plugin so the rendered body AND Astro's extracted `headings` (TOC) stay consistent:
 *
 *  1. Strip a leading body-level `# H1` — the layout renders the page title as the only <h1>.
 *  2. Template the bare `## FAQ` heading into `## {title} FAQ` for query/TOC matching.
 */
export function remarkDocsTransforms() {
  return (tree: any, file: any) => {
    const frontmatter = file?.data?.astro?.frontmatter ?? {};
    const title: string | undefined = frontmatter.title;

    const firstContentIndex = tree.children.findIndex(
      (n: any) => n.type !== 'mdxjsEsm' && n.type !== 'yaml' && n.type !== 'mdxFlowExpression'
    );
    if (firstContentIndex !== -1) {
      const node = tree.children[firstContentIndex];
      if (node.type === 'heading' && node.depth === 1) {
        tree.children.splice(firstContentIndex, 1);
      }
    }

    if (title) {
      visit(tree, 'heading', (node: any) => {
        if (node.depth !== 2) return;
        if (
          node.children.length === 1 &&
          node.children[0].type === 'text' &&
          node.children[0].value.trim() === 'FAQ'
        ) {
          node.children[0].value = `${title} FAQ`;
        }
      });
    }
  };
}

export default remarkDocsTransforms;
