import { parseDocument, isMap, isSeq, isScalar, isPair } from 'yaml';

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

// Build the raw markdown text that will be rendered as HTML by CodeBlockNew's post-processor.
// The `short---long---link` format from the schema is split and rejoined into clean markdown.
const formatHoverMarkdown = (description: string, defaultValue?: string): string => {
  const [short, long, link] = description.split('---').map((s) => s.trim());
  const parts: string[] = [];
  if (short) parts.push(short);
  if (long) parts.push(long);
  if (defaultValue != null) parts.push(`**Default**: \`${defaultValue}\``);
  if (link && /^https?:\/\//.test(link)) parts.push(`[Documentation ↗](${link})`);
  return parts.join('\n\n');
};

// --- Schema loading (lazy singleton) ---

let schemaPromise: Promise<Record<string, unknown>> | null = null;

const loadConfigSchema = () => {
  if (!schemaPromise) {
    schemaPromise = import('../../../../@generated/schemas/config-schema.json').then(
      (m: Record<string, unknown>) => (m.default || m) as Record<string, unknown>
    );
  }
  return schemaPromise;
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

// Resolve a $ref while preserving sibling properties (e.g. description alongside $ref)
const resolvePreservingSiblings = (raw: unknown, root: Record<string, unknown>): Record<string, unknown> | null => {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const resolved = resolve(obj, root);
  if (!resolved) return null;
  // When $ref coexists with description (common in Stacktape schema), merge them
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
      } catch { /* invalid regex, skip */ }
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

const createPopup = (hover: HoverData): HastEl =>
  // Popup is just the docs container — no code/type section.
  // Raw markdown text goes in; CodeBlockNew's decorateRenderedHtml renders it as HTML post-shiki.
  el('span', { class: 'twoslash-popup-container' }, [
    el('div', { class: 'twoslash-popup-docs' }, [txt(formatHoverMarkdown(hover.description, hover.defaultValue))])
  ]);

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
      // Description priority: property schema description → definition description (for discriminator keys like `type`)
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

const createTransformer = (hovers: HoverData[]) => {
  const byLine = new Map<number, HoverData[]>();
  for (const h of hovers) {
    const arr = byLine.get(h.line);
    if (arr) arr.push(h);
    else byLine.set(h.line, [h]);
  }

  return {
    name: 'yaml-schema-hover',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code(codeNode: any) {
      if (!codeNode.children) return;

      let lineIdx = 0;
      for (let li = 0; li < codeNode.children.length; li++) {
        const lineEl = codeNode.children[li];
        if (lineEl.type !== 'element' || !lineEl.children) continue;

        const lineHovers = byLine.get(lineIdx);
        lineIdx++;
        if (!lineHovers) continue;

        let charPos = 0;
        const newChildren: HastChild[] = [];

        for (const child of lineEl.children) {
          const tokenText = getTextContent(child as HastChild);
          const tStart = charPos;
          charPos += tokenText.length;

          const match = lineHovers.find((h) => h.charStart >= tStart && h.charStart < charPos);
          if (match && child.type === 'element') {
            const popup = createPopup(match);
            const hoverStart = match.charStart - tStart;
            const hoverEnd = Math.min(match.charEnd - tStart, tokenText.length);

            if (hoverStart === 0 && hoverEnd >= tokenText.length) {
              // Hover covers entire token — popup before token (matches TypeScript twoslash order)
              newChildren.push(el('span', { class: 'twoslash-hover' }, [popup, child]));
            } else {
              // Hover covers partial token — split to get exact underline positioning
              const style = (child as HastEl).properties?.style;
              const props = style ? { style } : {};
              if (hoverStart > 0) {
                newChildren.push(el('span', props, [txt(tokenText.substring(0, hoverStart))]));
              }
              newChildren.push(
                el('span', { class: 'twoslash-hover' }, [
                  popup,
                  el('span', props, [txt(tokenText.substring(hoverStart, hoverEnd))])
                ])
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

const STACKTAPE_CONFIG_RE =
  /^(?:resources|scripts|hooks|serviceName|variables|directives|deploymentConfig|providerConfig|budgetControl|stackConfig|cloudformationResources)\s*:/m;

// Compute hovers for a YAML code block.
// `originalCode` is the full valid YAML (before any focus filtering).
// `lineMap` (if provided) maps rendered line indices → original source line indices, so we can
// translate hover positions from the original document into the positions shiki actually tokenizes.
// When a hover falls on an original line that isn't in the rendered output, it's dropped.
export const computeYamlHovers = async (originalCode: string, lineMap?: number[]) => {
  try {
    if (!STACKTAPE_CONFIG_RE.test(originalCode)) return null;

    const doc = parseDocument(originalCode);
    if (!doc.contents || !isMap(doc.contents)) return null;

    const schema = await loadConfigSchema();
    const lineStarts = buildLineStarts(originalCode);
    const rawHovers: HoverData[] = [];

    collectHovers(doc.contents, schema, schema, rawHovers, lineStarts);

    if (rawHovers.length === 0) return null;

    // Translate line numbers from original → rendered coordinates if a lineMap was given.
    let hovers = rawHovers;
    if (lineMap) {
      const originalToRendered = new Map<number, number>();
      for (let rendered = 0; rendered < lineMap.length; rendered++) {
        const original = lineMap[rendered];
        if (original >= 0) originalToRendered.set(original, rendered);
      }
      hovers = rawHovers
        .map((h) => {
          const rendered = originalToRendered.get(h.line);
          return rendered === undefined ? null : { ...h, line: rendered };
        })
        .filter((h): h is HoverData => h !== null);
      if (hovers.length === 0) return null;
    }

    return createTransformer(hovers);
  } catch (err) {
    console.warn('YAML hover computation failed:', err);
    return null;
  }
};
