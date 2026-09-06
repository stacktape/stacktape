/*
 * Turning one YAML config into the two blocks of HTML the hero editor renders.
 *
 * Everything here runs at build time. Nothing in this file — Shiki, the 3.5 MB config schema,
 * `marked`, the YAML parser — is allowed to reach the browser, which is why the module is only ever
 * imported from `.astro` frontmatter (see `snippets.ts`).
 */
import { marked } from 'marked';
import { format } from 'prettier';
import { convertYamlToTypescript } from '@stacktape/config-authoring/converter';
import { getHighlighter, SHIKI_THEME } from './highlighter';
import type { RenderedCode, RenderedSnippet, SnippetId } from './types';
import { computeYamlHovers, HOVER_DOC_PLACEHOLDER_PATTERN } from './yaml-hover';

/** Markdown → HTML for one popup body, with external links opening away from the page. */
const renderHoverDocs = (markdown: string): string => {
  const html = marked.parse(markdown, { async: false }) as string;
  return html.replaceAll('<a href=', '<a target="_blank" rel="noopener noreferrer" href=');
};

const countLines = (code: string): number => code.replace(/\n+$/, '').split('\n').length;

/**
 * Highlights YAML and attaches the schema hover layer.
 *
 * The hover popups leave the transformer carrying `@@STP-HOVER-DOC-n@@` placeholders rather than
 * markdown, because Shiki serializes its HAST without `allowDangerousHtml` and would escape any
 * HTML we put in a text node. Shiki's `postprocess` hook runs on the finished HTML string, which is
 * exactly the moment the rendered markdown can be swapped in safely.
 */
const renderYaml = async (yaml: string): Promise<{ rendered: RenderedCode; hoverCount: number }> => {
  const highlighter = await getHighlighter();
  const hovers = computeYamlHovers(yaml);

  const html = highlighter.codeToHtml(yaml, {
    lang: 'yaml',
    theme: SHIKI_THEME,
    transformers: hovers
      ? [
          hovers.transformer,
          {
            name: 'stacktape-hover-docs',
            postprocess: (rendered: string) =>
              rendered.replaceAll(HOVER_DOC_PLACEHOLDER_PATTERN, (_match, index: string) =>
                renderHoverDocs(hovers.docsMarkdown[Number(index)] ?? '')
              )
          }
        ]
      : []
  });

  return { rendered: { html, lineCount: countLines(yaml) }, hoverCount: hovers?.docsMarkdown.length ?? 0 };
};

/**
 * The TypeScript twin of the same config, produced by the product's own converter.
 *
 * v1 renders it with plain Shiki and no Twoslash: type hovers would mean shipping the `stacktape`
 * declaration files and a TypeScript instance into the build for a surface where the YAML tab is
 * the one carrying the documentation story. The YAML hovers are the point; the TS tab proves the
 * config is the same object in a typed language.
 */
const renderTypescript = async (yaml: string, printWidth: number): Promise<RenderedCode | null> => {
  let source: string;
  try {
    source = await formatTypescript(convertYamlToTypescript(yaml), printWidth);
  } catch (err) {
    console.warn('YAML → TypeScript conversion failed:', err);
    return null;
  }

  const highlighter = await getHighlighter();
  return {
    html: highlighter.codeToHtml(source, { lang: 'typescript', theme: SHIKI_THEME }),
    lineCount: countLines(source)
  };
};

/**
 * The converter emits working code with the indentation of the template it came from; Prettier
 * makes it read like code someone wrote. The leading import stays on one line whatever the width:
 * a wrapped import list would take a third of the pane before the config starts.
 */
const formatTypescript = async (source: string, printWidth: number): Promise<string> => {
  const match = /^(?:import[^\n]*\n)+/.exec(source);
  const imports = match ? match[0] : '';
  const body = source.slice(imports.length);
  const formatted = await format(body, {
    parser: 'typescript',
    printWidth,
    singleQuote: true,
    trailingComma: 'none'
  });
  return `${imports.trimEnd()}\n\n${formatted.trimStart()}`.trimEnd();
};

export const renderSnippet = async (input: {
  id: SnippetId;
  label: string;
  summary: string;
  yaml: string;
  /** Prettier's print width for the TypeScript twin. The default suits a full-width editor. */
  typescriptPrintWidth?: number;
}): Promise<RenderedSnippet> => {
  const [{ rendered, hoverCount }, typescript] = await Promise.all([
    renderYaml(input.yaml),
    renderTypescript(input.yaml, input.typescriptPrintWidth ?? 96)
  ]);

  return {
    id: input.id,
    label: input.label,
    summary: input.summary,
    yaml: rendered,
    typescript,
    hoverCount
  };
};
