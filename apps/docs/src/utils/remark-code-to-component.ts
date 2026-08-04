import { visit } from 'unist-util-visit';
import type { AstNode, AstParent } from './ast';

/**
 * Convert every fenced/indented code block (`code` mdast node) into a `<CodeBlock>` MDX element so
 * it renders through our interactive CodeBlock island (Shiki + Twoslash + copy + tabs), exactly as
 * the old `code` component mapping did.
 *
 * The verbatim source is passed base64-encoded in a `codeBase64` attribute — this sidesteps every
 * JSX-attribute escaping pitfall (quotes, backticks, newlines) and preserves the code byte-for-byte.
 * The island decodes it. Explicit `<CodeBlock tabs={[...]}>` authoring is untouched (no `code` node).
 */
export function remarkCodeToComponent() {
  return (tree: AstNode) => {
    visit(tree, 'code', (node: AstNode, index: number | undefined, parent: AstParent | undefined) => {
      if (!parent || typeof index !== 'number') return;

      const attributes: AstNode[] = [
        { type: 'mdxJsxAttribute', name: 'lang', value: node.lang || 'text' },
        {
          type: 'mdxJsxAttribute',
          name: 'codeBase64',
          value: Buffer.from(String(node.value ?? ''), 'utf-8').toString('base64')
        }
      ];
      if (node.meta) {
        attributes.push({ type: 'mdxJsxAttribute', name: 'meta', value: String(node.meta) });
      }

      parent.children[index] = {
        type: 'mdxJsxFlowElement',
        name: 'CodeBlock',
        attributes,
        children: []
      };
    });
  };
}
