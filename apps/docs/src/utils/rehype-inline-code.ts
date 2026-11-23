import { visit } from 'unist-util-visit';
import type { AstNode } from './ast';

/** Longest inline code that never breaks across lines. Longer tokens still wrap rather than overflow a phone. */
const SHORT_TOKEN_MAX = 24;

const textOf = (node: AstNode): string =>
  node.type === 'text'
    ? String(node.value ?? '')
    : (Array.isArray(node.children) ? (node.children as AstNode[]) : []).map(textOf).join('');

/**
 * Marks short inline code (a flag, a file name, a property) so it stays on one line. Browsers may otherwise break
 * `--file` after its hyphens and draw it as two chips at a line end.
 */
export function rehypeInlineCode() {
  return (tree: AstNode) => {
    visit(tree, 'element', (node: AstNode, _index: number | undefined, parent: AstNode | undefined) => {
      if (node.tagName !== 'code' || parent?.tagName === 'pre') return;
      const text = textOf(node);
      if (text.length > SHORT_TOKEN_MAX || /\s/.test(text)) return;
      const properties = (node.properties ?? {}) as Record<string, unknown>;
      const className = Array.isArray(properties.className) ? properties.className : [];
      node.properties = { ...properties, className: [...className, 'docs-code-token'] };
    });
  };
}
