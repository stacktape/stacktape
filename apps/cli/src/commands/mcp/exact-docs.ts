import type { DocKind, LexicalIndex } from './lexical-index';
import { clampInteger, type ToolOutput } from './tool-output';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractPropertySections = (content: string, propertyName: string): string[] => {
  const escapedPropertyName = escapeRegExp(propertyName);
  const propertyLinePattern = new RegExp(`^\\s*(?:readonly\\s+)?${escapedPropertyName}\\??\\s*[:(]`);
  const lines = content.split(/\r?\n/);
  const sections: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    if (!propertyLinePattern.test(lines[index])) continue;

    let start = index;
    let previous = index - 1;
    while (previous >= 0 && lines[previous].trim() === '') previous--;
    if (previous >= 0 && lines[previous].trim().endsWith('*/')) {
      start = previous;
      while (start > 0 && !lines[start].includes('/**')) start--;
    }

    let end = index;
    while (end < lines.length - 1 && !/[;,]\s*$/.test(lines[end].trim())) {
      end++;
    }

    sections.push(`\`\`\`typescript\n${lines.slice(start, end + 1).join('\n')}\n\`\`\``);
  }

  if (sections.length > 0) return sections;

  const inlinePattern = new RegExp(`\\b${escapedPropertyName}\\??\\s*:`, 'i');
  const fallbackIndex = lines.findIndex((line) => inlinePattern.test(line));
  if (fallbackIndex === -1) return [];

  const start = Math.max(0, fallbackIndex - 5);
  const end = Math.min(lines.length, fallbackIndex + 6);
  return [lines.slice(start, end).join('\n')];
};

export const getExactDocs = ({
  index,
  route,
  resourceType,
  definitionName,
  propertyName,
  sourcePath,
  headingPath,
  docKind,
  maxChars,
  includeFullPage
}: {
  index: LexicalIndex;
  route?: string;
  resourceType?: string;
  definitionName?: string;
  propertyName?: string;
  sourcePath?: string;
  headingPath?: string[];
  docKind?: DocKind;
  maxChars?: number;
  includeFullPage?: boolean;
}): ToolOutput => {
  if (!route && !resourceType && !definitionName && !propertyName && !sourcePath && !headingPath) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message:
        'Provide at least one selector: route, resourceType, definitionName, propertyName, sourcePath, or headingPath.'
    };
  }

  const normalizedRoute = route ? (route.startsWith('/') ? route : `/${route}`) : undefined;
  const normalizedSourcePath = sourcePath?.replace(/\\/g, '/');
  const normalizedHeadingPath = headingPath?.map((part) => part.trim()).filter(Boolean);
  const filterDocs = (definitionNameSelector?: string) =>
    index.docs.filter((doc) => {
      if (docKind && doc.docKind !== docKind) return false;
      if (normalizedRoute && doc.route !== normalizedRoute) return false;
      if (resourceType && doc.resourceType !== resourceType) return false;
      if (definitionNameSelector && !doc.definitionNames.includes(definitionNameSelector)) return false;
      if (normalizedSourcePath && doc.sourcePath !== normalizedSourcePath) return false;
      if (
        normalizedHeadingPath?.length &&
        normalizedHeadingPath.some((heading, index) => doc.headingPath[index] !== heading)
      ) {
        return false;
      }
      return true;
    });

  let effectivePropertyName = propertyName;
  let selectorFallback: string | undefined;
  let docs = filterDocs(definitionName);

  if (docs.length === 0 && definitionName && !propertyName) {
    const propertyMatches = filterDocs().filter(
      (doc) => extractPropertySections(doc.content, definitionName).length > 0
    );
    if (propertyMatches.length > 0) {
      docs = propertyMatches;
      effectivePropertyName = definitionName;
      selectorFallback = 'definitionName-as-propertyName';
    }
  }

  if (effectivePropertyName) {
    docs = docs.filter((doc) => extractPropertySections(doc.content, effectivePropertyName).length > 0);
  }

  if (docs.length === 0) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      message: 'No generated Stacktape docs matched the provided selector.'
    };
  }

  const isRouteOnlyLongPage =
    route &&
    !sourcePath &&
    !normalizedHeadingPath?.length &&
    !definitionName &&
    !effectivePropertyName &&
    !includeFullPage &&
    docs.length > 20 &&
    docs.every((doc) => doc.docKind === 'docs-page');

  if (isRouteOnlyLongPage) {
    return {
      ok: true,
      code: 'MULTIPLE_SECTIONS',
      message:
        'This route has many generated docs sections. Fetch a specific headingPath, or set includeFullPage=true if you really need the full route content.',
      data: {
        route: normalizedRoute,
        totalSections: docs.length,
        availableHeadingPaths: docs.slice(0, 40).map((doc) => doc.headingPath),
        references: docs.slice(0, 40).map((doc) => ({
          title: doc.title,
          route: doc.route,
          docKind: doc.docKind,
          sourcePath: doc.sourcePath,
          headingPath: doc.headingPath
        }))
      },
      nextActions: ['Call stacktape_docs with action=get again with one of the returned headingPath arrays.']
    };
  }

  const limit = clampInteger({ value: maxChars, defaultValue: 16000, min: 1000, max: 20000 });
  let totalChars = 0;
  const sections: string[] = [];
  for (const doc of docs) {
    const remaining = limit - totalChars;
    if (remaining <= 0) break;
    const propertySections = effectivePropertyName ? extractPropertySections(doc.content, effectivePropertyName) : [];
    const content = propertySections.length > 0 ? propertySections.join('\n\n') : doc.content;
    const section = `## ${doc.headingPath.join(' > ')}\n\nSource: ${doc.sourcePath}\nRoute: ${doc.route}\n\n${content}`;
    sections.push(section.slice(0, remaining));
    totalChars += section.length;
  }

  const references = docs.map((doc) => ({
    title: doc.title,
    route: doc.route,
    docKind: doc.docKind,
    sourcePath: doc.sourcePath,
    headingPath: doc.headingPath
  }));

  return {
    ok: true,
    code: 'OK',
    message: `Fetched ${docs.length} generated docs chunk(s).`,
    data: {
      content: sections.join('\n\n---\n\n'),
      truncated: totalChars > limit,
      references,
      ...(effectivePropertyName ? { propertyName: effectivePropertyName } : {}),
      ...(selectorFallback ? { selectorFallback } : {})
    }
  };
};
