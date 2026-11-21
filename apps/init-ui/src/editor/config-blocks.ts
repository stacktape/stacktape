/**
 * Where each resource is in the configuration file and in the template it compiles to, as 1-based line ranges.
 *
 * Line scanning, not parsing: the text is often mid-edit and does not parse, and the editor still has to know which
 * block the cursor is in and where a picked resource starts.
 */

export type LineRange = { from: number; to: number };

/** `resources:` blocks of a YAML configuration: each resource from its key line to the line before the next. */
export const yamlResourceBlocks = (text: string): Record<string, LineRange> => {
  const lines = text.split('\n');
  const blocks: Record<string, LineRange> = {};
  let inResources = false;
  let current: string | undefined;
  let lastContent = 0;
  const close = () => {
    if (current !== undefined)
      blocks[current] = { from: blocks[current]!.from, to: Math.max(blocks[current]!.from, lastContent) };
    current = undefined;
  };
  lines.forEach((line, index) => {
    const number = index + 1;
    if (/^resources:\s*(#.*)?$/.test(line)) {
      inResources = true;
      return;
    }
    if (!inResources) return;
    if (/^[^\s#]/.test(line)) {
      close();
      inResources = false;
      return;
    }
    const key = /^ {2}([^\s#][^:]*):\s*(#.*)?$/.exec(line);
    if (key !== null) {
      close();
      current = key[1]!.replace(/^["']|["']$/g, '');
      blocks[current] = { from: number, to: number };
    }
    if (line.trim() !== '') lastContent = number;
  });
  close();
  return blocks;
};

/**
 * Resources of a TypeScript configuration: each `const name = new Class({` from that line to the line that closes the
 * call at the same indentation. The variable is the resource's name when the file lists it under the same key, as
 * init writes it; `resources: { api: backend }` maps a different key to it.
 */
export const typescriptResourceBlocks = (text: string): Record<string, LineRange> => {
  const lines = text.split('\n');
  const byVariable: Record<string, LineRange> = {};
  lines.forEach((line, index) => {
    const start = /^(\s*)(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+[A-Za-z_$][\w$]*\s*\(/.exec(line);
    if (start === null) return;
    const indent = start[1]!;
    let to = index + 1;
    for (let next = index + 1; next < lines.length; next += 1) {
      if (lines[next]!.startsWith(`${indent})`) || lines[next]!.startsWith(`${indent}})`)) {
        to = next + 1;
        break;
      }
    }
    byVariable[start[2]!] = { from: index + 1, to };
  });
  // `resources: { api: backend, worker }`: the keys the configuration knows the variables by.
  const listed = /resources\s*:\s*\{([^}]*)\}/.exec(text)?.[1];
  if (listed === undefined) return byVariable;
  const blocks: Record<string, LineRange> = { ...byVariable };
  for (const entry of listed.split(',')) {
    const [key, variable] = entry.split(':').map((part) => part.trim().replace(/^["']|["']$/g, ''));
    if (key === undefined || key === '' || variable === undefined || variable === key) continue;
    const range = byVariable[variable];
    if (range !== undefined) {
      blocks[key] = range;
      delete blocks[variable];
    }
  }
  return blocks;
};

export const resourceBlocks = (text: string, language: 'yaml' | 'typescript') =>
  language === 'yaml' ? yamlResourceBlocks(text) : typescriptResourceBlocks(text);

/** One AWS resource of a compiled template: its logical ID, its type, the lines it spans and who it is for. */
export type TemplateResource = LineRange & {
  logicalId: string;
  /** `AWS::RDS::DBInstance`. */
  type: string;
  /** The configuration's resource it was created for; undefined for the stack's shared ones. */
  owner: string | undefined;
};

/** The template's sections as `stacktape synth` writes them: the head, its resources, then the rest. */
export type TemplateLayout = { resources: TemplateResource[]; head: LineRange; tail: LineRange | undefined };

/** Each resource under `Resources:` of a template in YAML, in order. */
export const templateLayout = (text: string, owners: Record<string, string>): TemplateLayout => {
  const lines = text.split('\n');
  const resources: TemplateResource[] = [];
  let resourcesLine: number | undefined;
  let tailLine: number | undefined;
  lines.forEach((line, index) => {
    const number = index + 1;
    if (resourcesLine === undefined) {
      if (/^Resources:\s*$/.test(line)) resourcesLine = number;
      return;
    }
    if (tailLine !== undefined) return;
    if (/^[^\s#]/.test(line)) {
      tailLine = number;
      return;
    }
    const key = /^ {2}([A-Za-z0-9]+):\s*$/.exec(line);
    if (key !== null) {
      const previous = resources.at(-1);
      if (previous !== undefined) previous.to = number - 1;
      resources.push({ logicalId: key[1]!, type: '', owner: owners[key[1]!], from: number, to: number });
      return;
    }
    const type = /^ {4}Type:\s*(\S+)/.exec(line);
    const last = resources.at(-1);
    if (type !== null && last !== undefined && last.type === '') last.type = type[1]!.replace(/^["']|["']$/g, '');
  });
  const last = resources.at(-1);
  if (last !== undefined) last.to = (tailLine ?? lines.length + 1) - 1;
  // A trailing empty line belongs to nobody.
  if (last !== undefined) while (last.to > last.from && lines[last.to - 1]!.trim() === '') last.to -= 1;
  return {
    resources,
    head: { from: 1, to: resourcesLine ?? lines.length },
    tail: tailLine === undefined ? undefined : { from: tailLine, to: lines.length }
  };
};

/**
 * The template as shown for one group: its head, the `Resources:` of that group only. Line `n` of the result is line
 * `lineMap[n - 1]` of the full template.
 */
export const templateExcerpt = (
  text: string,
  layout: TemplateLayout,
  keep: (resource: TemplateResource) => boolean
): { text: string; lineMap: number[] } => {
  const lines = text.split('\n');
  const lineMap: number[] = [];
  for (let line = layout.head.from; line <= layout.head.to; line += 1) lineMap.push(line);
  for (const resource of layout.resources) {
    if (!keep(resource)) continue;
    for (let line = resource.from; line <= resource.to; line += 1) lineMap.push(line);
  }
  return { text: lineMap.map((line) => lines[line - 1] ?? '').join('\n'), lineMap };
};
