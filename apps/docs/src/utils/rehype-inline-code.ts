import { visit } from 'unist-util-visit';
import type { AstNode } from './ast';

/** Longest inline code that never breaks across lines, spaces included. Longer code still wraps on a phone. */
const SHORT_TOKEN_MAX = 24;

const textOf = (node: AstNode): string =>
  node.type === 'text'
    ? String(node.value ?? '')
    : (Array.isArray(node.children) ? (node.children as AstNode[]) : []).map(textOf).join('');

/**
 * Marks short inline code (a flag, a file name, a short command) so it stays on one line. Browsers may otherwise break
 * `--file` after its hyphens, or `stacktape help <command>` at a space, and draw it as two chips at a line end.
 */
export function rehypeInlineCode() {
  return (tree: AstNode) => {
    visit(tree, 'element', (node: AstNode, _index: number | undefined, parent: AstNode | undefined) => {
      if (node.tagName !== 'code' || parent?.tagName === 'pre') return;
      const text = textOf(node);
      const properties = (node.properties ?? {}) as Record<string, unknown>;
      const className = Array.isArray(properties.className) ? properties.className : [];
      if (text.length <= SHORT_TOKEN_MAX) {
        node.properties = { ...properties, className: [...className, 'docs-code-token'] };
        return;
      }
      // Longer code (`--project hono-api --region eu-west-1`) breaks between its words, never after a hyphen.
      const children = Array.isArray(node.children) ? (node.children as AstNode[]) : [];
      if (children.length !== 1 || children[0].type !== 'text') return;
      node.children = text
        .split(/(\s+)/)
        .filter(Boolean)
        .map((part) =>
          /^\s/.test(part) || part.length > SHORT_TOKEN_MAX
            ? { type: 'text', value: part }
            : {
                type: 'element',
                tagName: 'span',
                properties: { className: ['docs-code-token'] },
                children: [{ type: 'text', value: part }]
              }
        );
    });
  };
}
