/*
 * Schema-driven hover documentation for Stacktape YAML.
 *
 * Adapted from `apps/docs/src/components/Mdx/yaml-hover.ts`. The schema walk, the `$ref` resolution
 * that preserves sibling descriptions, the discriminated-union narrowing on `type:`, and the
 * token-splitting Shiki transformer are all kept verbatim, because they are the reason the hover
 * text can never drift from the real product schema. Three things changed for this site:
 *
 *  1. The schema is read from disk once at build time instead of being lazily `import()`ed in the
 *     browser (the docs site highlights at runtime; this one does not).
 *  2. The popup body carries a placeholder token rather than raw markdown. Shiki serializes HAST
 *     with `hast-util-to-html` and no `allowDangerousHtml`, so a `raw` node would be escaped; the
 *     renderer swaps the placeholder for `marked` output in Shiki's `postprocess` hook instead.
 *  3. The hovered span gets `data-stp-hover="<key>"`, so the popup can be positioned (and asserted
 *     on) without depending on Shiki's internal class names.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { isMap, isPair, isScalar, isSeq, parseDocument } from 'yaml';

type HoverData = {
  line: number;
  charStart: number;
  charEnd: number;
  title: string;
  description: string;
  defaultValue?: string;
};

type HastEl = { type: 'element'; tagName: string; properties: Record<string, unknown>; children: HastChild[] };
type HastText = { type: 'text'; value: string };
type HastChild = HastEl | HastText;

/**
 * The markdown a popup shows, before `marked` turns it into HTML.
 *
 * Stacktape schema descriptions are a single string in `short---long---docs-link` form; splitting
 * and rejoining is what turns them into readable prose.
 */
export const formatHoverMarkdown = (description: string, defaultValue?: string): string => {
  const [short, long, link] = description.split('---').map((s) => s.trim());
  const parts: string[] = [];
  if (short) parts.push(short);
  if (long) parts.push(long);
  if (defaultValue != null) parts.push(`**Default**: \`${defaultValue}\``);
  if (link && /^https?:\/\//.test(link)) parts.push(`[Documentation ↗](${link})`);
  return parts.join('\n\n');
};

// --- Schema loading (module-level singleton) ---

let cachedSchema: Record<string, unknown> | null = null;

/**
 * The published configuration schema, straight from the package that owns it.
 *
 * Read through `createRequire` rather than `import`ed: it is a ~3.5 MB JSON document, and letting
 * Vite pull it into the module graph would turn it into a multi-megabyte JS module that slows every
 * dev-server restart. This module only ever runs in `.astro` frontmatter, so `node:fs` is available.
 */
const loadConfigSchema = (): Record<string, unknown> => {
  if (!cachedSchema) {
    const schemaPath = createRequire(import.meta.url).resolve('@stacktape/config/config-schema.json');
    cachedSchema = JSON.parse(readFileSync(schemaPath, 'utf8')) as Record<string, unknown>;
  }
  return cachedSchema;
};

// --- Schema helpers ---

const resolveRef = (root: Record<string, unknown>, ref: string): Record<string, unknown> | null => {
  const parts = ref.replace(/^#\//, '').split('/');
  let current: unknown = root;
  for (const part of parts) {
    current = (current as Record<string, unknown>)?.[part];
    if (current == null) return null;
  }
  return current as Record<string, unknown>;
};

const resolve = (schema: unknown, root: Record<string, unknown>, depth = 0): Record<string, unknown> | null => {
  if (!schema || typeof schema !== 'object' || depth > 20) return null;
  const s = schema as Record<string, unknown>;
  if (typeof s.$ref === 'string') return resolve(resolveRef(root, s.$ref), root, depth + 1);
  return s;
};

const getTypeValue = (yamlMap: unknown): string | null => {
  if (!isMap(yamlMap)) return null;
  for (const pair of yamlMap.items) {
    if (isPair(pair) && isScalar(pair.key) && String(pair.key.value) === 'type' && isScalar(pair.value)) {
      return String(pair.value.value);
    }
  }
  return null;
};

/**
 * Picks the right branch of an `anyOf`/`oneOf` for a mapping node.
 *
 * Stacktape's resource unions are discriminated by `type:`, so the YAML value decides which branch's
 * property documentation applies. Without this a `properties:` block would show the first branch's
 * docs regardless of the resource it belongs to.
 */
const resolveForNode = (
  schema: unknown,
  yamlNode: unknown,
  root: Record<string, unknown>
): { schema: Record<string, unknown> | null; defDesc?: string } => {
  const s = resolve(schema, root);
  if (!s) return { schema: null };

  const alts = (s.anyOf || s.oneOf) as unknown[] | undefined;
  if (alts && isMap(yamlNode)) {
    const typeVal = getTypeValue(yamlNode);
    if (typeVal) {
      for (const alt of alts) {
        const r = resolve(alt, root);
        if (!r) continue;
        const props = r.properties as Record<string, unknown> | undefined;
        const tp = resolve(props?.type, root);
        if (tp?.const === typeVal || (Array.isArray(tp?.enum) && (tp.enum as unknown[]).includes(typeVal))) {
          return { schema: r, defDesc: r.description as string | undefined };
        }
      }
    }
    for (const alt of alts) {
      const r = resolve(alt, root);
      if (r?.properties) return { schema: r };
    }
    return { schema: resolve(alts[0], root) };
  }

  return { schema: s };
};

/** Resolves a `$ref` while keeping sibling keys — Stacktape puts `description` next to `$ref`. */
const resolvePreservingSiblings = (raw: unknown, root: Record<string, unknown>): Record<string, unknown> | null => {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const resolved = resolve(obj, root);
  if (!resolved) return null;
  if (typeof obj.$ref === 'string' && obj.description && !resolved.description) {
    return { ...resolved, description: obj.description };
  }
  return resolved;
};

const findPropSchema = (
  parent: Record<string, unknown> | null,
  key: string,
  root: Record<string, unknown>
): Record<string, unknown> | null => {
  if (!parent) return null;

  const props = parent.properties as Record<string, unknown> | undefined;
  if (props?.[key]) return resolvePreservingSiblings(props[key], root);

  if (Array.isArray(parent.allOf)) {
    for (const sub of parent.allOf) {
      const result = findPropSchema(resolve(sub, root), key, root);
      if (result) return result;
    }
  }

  if (parent.patternProperties && typeof parent.patternProperties === 'object') {
    for (const [pattern, schema] of Object.entries(parent.patternProperties as Record<string, unknown>)) {
      try {
        if (new RegExp(pattern).test(key)) return resolvePreservingSiblings(schema, root);
      } catch {
        /* invalid regex, skip */
      }
    }
  }

  if (parent.additionalProperties && typeof parent.additionalProperties === 'object') {
    return resolvePreservingSiblings(parent.additionalProperties, root);
  }

  return null;
};

// --- Position helpers ---

const buildLineStarts = (code: string): number[] => {
  const starts = [0];
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '\n') starts.push(i + 1);
  }
  return starts;
};

const offsetToLineCol = (offset: number, lineStarts: number[]): [number, number] => {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return [lo, offset - lineStarts[lo]];
};

// --- HAST helpers ---

const el = (tag: string, props: Record<string, unknown>, children: HastChild[]): HastEl => ({
  type: 'element',
  tagName: tag,
  properties: props,
  children
});

const txt = (value: string): HastText => ({ type: 'text', value });

/**
 * The placeholder a popup body carries through Shiki, and the pattern that finds it afterwards.
 *
 * Deliberately made of characters HTML escaping leaves alone, so the token survives serialization
 * byte-for-byte and a plain string replace is enough to swap in the rendered markdown.
 */
const hoverDocPlaceholder = (index: number) => `@@STP-HOVER-DOC-${index}@@`;
export const HOVER_DOC_PLACEHOLDER_PATTERN = /@@STP-HOVER-DOC-(\d+)@@/g;

// --- Hover collection ---

const collectHovers = (
  node: unknown,
  schema: unknown,
  root: Record<string, unknown>,
  hovers: HoverData[],
  lineStarts: number[],
  defDesc?: string
) => {
  if (!schema || !node) return;

  if (isMap(node)) {
    const { schema: resolved, defDesc: dd } = resolveForNode(schema, node, root);
    if (!resolved) return;
    const currentDefDesc = dd || defDesc;

    for (const pair of node.items) {
      if (!isPair(pair) || !isScalar(pair.key)) continue;

      const key = String(pair.key.value);
      const keyRange = pair.key.range;
      if (!keyRange) continue;

      const propSchema = findPropSchema(resolved, key, root);
      if (!propSchema) continue;

      // Always hover on the KEY — matches Monaco yaml-language-server behavior.
      // Description priority: property schema description → definition description (for
      // discriminator keys like `type`).
      const desc = (propSchema.description || propSchema.markdownDescription) as string | undefined;
      const hoverDesc = desc || (key === 'type' ? currentDefDesc : undefined);
      if (hoverDesc) {
        const [line, col] = offsetToLineCol(keyRange[0], lineStarts);
        hovers.push({
          line,
          charStart: col,
          charEnd: col + key.length,
          title: key,
          description: hoverDesc,
          defaultValue: propSchema.default != null ? String(propSchema.default) : undefined
        });
      }

      if (isMap(pair.value) || isSeq(pair.value)) {
        collectHovers(pair.value, propSchema, root, hovers, lineStarts, currentDefDesc);
      }
    }
  }

  if (isSeq(node)) {
    const s = resolve(schema, root);
    const itemSchema = s?.items;
    if (itemSchema && !Array.isArray(itemSchema)) {
      for (const item of node.items) {
        if (isMap(item) || isSeq(item)) {
          collectHovers(item, itemSchema, root, hovers, lineStarts);
        }
      }
    }
  }
};

// --- Shiki transformer ---

const getTextContent = (node: HastChild): string => {
  if (node.type === 'text') return node.value;
  return node.children.map(getTextContent).join('');
};

const createPopup = (hover: HoverData, index: number): HastEl =>
  el('span', { class: 'stp-hover-popup', role: 'tooltip' }, [
    el('span', { class: 'stp-hover-popup-title' }, [txt(hover.title)]),
    el('span', { class: 'stp-hover-popup-docs' }, [txt(hoverDocPlaceholder(index))])
  ]);

/**
 * Wraps every documented key token in a hover span carrying its popup.
 *
 * The popup is a DESCENDANT of the hovered span on purpose: `:hover` alone then shows it, and the
 * client script is left with nothing to do but clamp a popup that would leave the viewport.
 */
const createTransformer = (hovers: HoverData[]) => {
  const byLine = new Map<number, { hover: HoverData; index: number }[]>();
  hovers.forEach((hover, index) => {
    const arr = byLine.get(hover.line);
    if (arr) arr.push({ hover, index });
    else byLine.set(hover.line, [{ hover, index }]);
  });

  return {
    name: 'stacktape-yaml-schema-hover',
    code(codeNode: { children?: unknown[] }) {
      if (!codeNode.children) return;

      let lineIdx = 0;
      for (const node of codeNode.children) {
        const lineEl = node as HastEl;
        if (lineEl.type !== 'element' || !lineEl.children) continue;

        const lineHovers = byLine.get(lineIdx);
        lineIdx++;
        if (!lineHovers) continue;

        let charPos = 0;
        const newChildren: HastChild[] = [];

        for (const child of lineEl.children) {
          const tokenText = getTextContent(child);
          const tStart = charPos;
          charPos += tokenText.length;

          const match = lineHovers.find(({ hover }) => hover.charStart >= tStart && hover.charStart < charPos);
          if (match && child.type === 'element') {
            const popup = createPopup(match.hover, match.index);
            const hoverProps = { class: 'stp-hover', 'data-stp-hover': match.hover.title, tabindex: 0 };
            const hoverStart = match.hover.charStart - tStart;
            const hoverEnd = Math.min(match.hover.charEnd - tStart, tokenText.length);

            if (hoverStart === 0 && hoverEnd >= tokenText.length) {
              newChildren.push(el('span', hoverProps, [child, popup]));
            } else {
              // Hover covers part of a token — split it so the underline sits under the key only.
              const style = child.properties?.style;
              const props = style ? { style } : {};
              if (hoverStart > 0) {
                newChildren.push(el('span', props, [txt(tokenText.substring(0, hoverStart))]));
              }
              newChildren.push(
                el('span', hoverProps, [el('span', props, [txt(tokenText.substring(hoverStart, hoverEnd))]), popup])
              );
              if (hoverEnd < tokenText.length) {
                newChildren.push(el('span', props, [txt(tokenText.substring(hoverEnd))]));
              }
            }
            continue;
          }
          newChildren.push(child);
        }

        lineEl.children = newChildren;
      }
    }
  };
};

// --- Entry point ---

/** Cheap guard so a non-Stacktape YAML sample never pays for a schema walk. */
const STACKTAPE_CONFIG_RE =
  /^(?:resources|scripts|hooks|projectName|variables|directives|deploymentConfig|providerConfig|budgetControl|stackConfig|cloudformationResources)\s*:/m;

export type YamlHoverResult = {
  /** Shiki transformer that injects the hover spans and their placeholder-carrying popups. */
  transformer: ReturnType<typeof createTransformer>;
  /** Popup bodies as markdown, indexed by the placeholder number the transformer emitted. */
  docsMarkdown: string[];
};

/**
 * Computes the hover overlay for one Stacktape YAML document.
 *
 * Returns `null` when the sample is not a Stacktape config or the schema documents none of its
 * keys — callers then highlight the code with no hover layer at all.
 */
export const computeYamlHovers = (code: string): YamlHoverResult | null => {
  try {
    if (!STACKTAPE_CONFIG_RE.test(code)) return null;

    const doc = parseDocument(code);
    if (!doc.contents || !isMap(doc.contents)) return null;

    const schema = loadConfigSchema();
    const lineStarts = buildLineStarts(code);
    const hovers: HoverData[] = [];

    collectHovers(doc.contents, schema, schema, hovers, lineStarts);
    if (hovers.length === 0) return null;

    return {
      transformer: createTransformer(hovers),
      docsMarkdown: hovers.map((hover) => formatHoverMarkdown(hover.description, hover.defaultValue))
    };
  } catch (err) {
    console.warn('YAML hover computation failed:', err);
    return null;
  }
};
