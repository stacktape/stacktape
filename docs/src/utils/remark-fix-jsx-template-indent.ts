import { visit } from 'unist-util-visit';

/**
 * MDX strips the common (minimum non-zero) indentation from multi-line template literals inside JSX
 * attribute expressions. This corrupts code samples authored as
 * `<CodeBlock tabs={[{ code: `...multi-line code...` }]} />` — e.g. a YAML block's second level
 * collapses onto the first, so `resources:` / `myFunction:` end up at the same column. The stripped
 * amount is gone from the parsed value, so it can't be recovered downstream in the island.
 *
 * The estree the MDX parser attaches to each attribute expression keeps FILE-relative `start`/`end`
 * offsets on every `TemplateElement` (template-literal quasi). We slice the verbatim source back out
 * and restore it, undoing the dedent for every JSX-attribute template literal with zero authoring
 * changes. `raw` is what the JS codegen emits (the runtime recomputes `cooked` from it), and a quasi
 * never spans an unescaped `` ` `` or `${`, so the slice is always valid template-literal source.
 */
export function remarkFixJsxTemplateIndent() {
  return (tree: any, file: any) => {
    const source = String(file?.value ?? '');
    if (!source) return;

    const restore = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'TemplateElement' && typeof node.start === 'number' && typeof node.end === 'number') {
        const raw = source.slice(node.start, node.end).replace(/\r\n/g, '\n');
        if (node.value && raw !== node.value.raw) {
          node.value = { raw, cooked: raw };
        }
      }
      for (const key in node) {
        if (key === 'loc' || key === 'range' || key === 'position') continue;
        const child = node[key];
        if (Array.isArray(child)) child.forEach(restore);
        else if (child && typeof child === 'object') restore(child);
      }
    };

    visit(tree, (node: any) => {
      if (!Array.isArray(node.attributes)) return;
      for (const attr of node.attributes) {
        const estree = attr?.value?.data?.estree;
        if (estree) restore(estree);
      }
    });
  };
}

export default remarkFixJsxTemplateIndent;
