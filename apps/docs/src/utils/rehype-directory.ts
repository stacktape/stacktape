import { visit } from 'unist-util-visit';
import type { AstNode } from './ast';

type HastNode = AstNode & {
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const isBlank = (node: HastNode) => node.type === 'text' && !String(node.value ?? '').trim();

const classesOf = (node: HastNode) => {
  const className = node.properties?.className;
  return Array.isArray(className) ? className : [];
};

const span = (className: string, children: HastNode[]): HastNode => ({
  type: 'element',
  tagName: 'span',
  properties: { className: [className] },
  children
});

const containsLink = (nodes: HastNode[]): boolean =>
  nodes.some((node) => node.tagName === 'a' || containsLink(node.children ?? []));

/** `[name](url) (Tag): description` → `<a class="docs-dir-name">`, `<span class="docs-dir-text">`, `<span class="docs-dir-tag">`. */
const toRow = (item: HastNode) => {
  let content = item.children ?? [];
  const blocks = content.filter((node) => !isBlank(node));
  if (blocks.length === 1 && blocks[0].tagName === 'p') content = blocks[0].children ?? [];
  const start = content.findIndex((node) => !isBlank(node));
  const link = content[start];
  const head = content[start + 1];
  if (link?.tagName !== 'a' || head?.type !== 'text') return;
  const match = /^\s*(?:\(([^)]+)\))?\s*:\s*/.exec(String(head.value ?? ''));
  if (!match) return;

  const description = [{ ...head, value: String(head.value).slice(match[0].length) }, ...content.slice(start + 2)];
  // The whole row is the link's target, unless the description has links of its own to keep clickable.
  const stretched = !containsLink(description);
  link.properties = {
    ...link.properties,
    className: [...classesOf(link), 'docs-dir-name', 'docs-unstyled-link', ...(stretched ? ['is-stretched'] : [])]
  };
  item.properties = { ...item.properties, className: ['docs-dir-row'] };
  item.children = [
    link,
    span('docs-dir-text', description),
    ...(match[1] ? [span('docs-dir-tag', [{ type: 'text', value: match[1] }])] : [])
  ];
};

const attributeOf = (node: HastNode, name: string) =>
  (node.attributes as { name?: string; value?: unknown }[] | undefined)?.find((attribute) => attribute.name === name)
    ?.value;

/** A picker's groups (a label paragraph and its list) each in one element, so they can sit in a grid. */
const groupPicker = (directory: HastNode) => {
  const grouped: HastNode[] = [];
  for (const node of directory.children ?? []) {
    const last = grouped.at(-1);
    if (node.tagName === 'p') {
      grouped.push({
        type: 'element',
        tagName: 'div',
        properties: { className: ['docs-dir-group'] },
        children: [node]
      });
    } else if (last?.tagName === 'div' && (node.tagName === 'ul' || isBlank(node))) {
      last.children?.push(node);
    } else {
      grouped.push(node);
    }
  }
  directory.children = grouped;
};

/**
 * Lookup lists inside `<Directory>` (the command index, the resource catalog). Each Markdown item written as
 * `[name](url) (Tag): description` becomes a row with the name, the description and the optional tag in fixed
 * columns, so readers can scan names and markers down the page. The Markdown stays plain for the LLM corpus and for
 * editors; items in another shape are left as they are.
 */
export function rehypeDirectory() {
  return (tree: AstNode) => {
    visit(tree, 'mdxJsxFlowElement', (directory: HastNode) => {
      if (directory.name !== 'Directory') return;
      visit(directory, 'element', (node: HastNode) => {
        if (node.tagName === 'li') toRow(node);
      });
      if (attributeOf(directory, 'layout') === 'picker') groupPicker(directory);
    });
  };
}
