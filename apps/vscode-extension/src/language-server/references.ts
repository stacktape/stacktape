import {
  CompletionItemKind,
  Diagnostic,
  DiagnosticSeverity,
  LocationLink,
  Position,
  Range,
  TextEdit,
  type CompletionList,
  type Hover
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { parseYamlAst, type YamlAstDocument, type YamlAstNode } from './yaml-ast';

type ReferenceKind = 'cloudformation-resource' | 'resource' | 'variable';

type Definition = {
  keyNode: YamlAstNode;
  resourceType?: string;
};

type ParsedReference = {
  argumentEnd: number;
  argumentStart: number;
  kind: ReferenceKind;
  name: string;
};

type ResolvedReference = ParsedReference & {
  definition?: Definition;
};

const REFERENCE_LABELS: Record<ReferenceKind, string> = {
  'cloudformation-resource': 'CloudFormation resource',
  resource: 'resource',
  variable: 'variable'
};

const DIRECTIVE_REFERENCE_KINDS: Record<string, ReferenceKind> = {
  CfResourceParam: 'cloudformation-resource',
  ResourceParam: 'resource',
  Var: 'variable'
};

const DEFINITION_MAPS: Record<ReferenceKind, string[]> = {
  'cloudformation-resource': ['cloudformationResources', 'resources'],
  resource: ['resources'],
  variable: ['variables']
};

const directiveReferences = (value: string): ParsedReference[] => {
  const result: ParsedReference[] = [];
  const matcher = /\$(\w+)\(\s*(['"])([^'"]*)/g;
  for (const match of value.matchAll(matcher)) {
    const kind = DIRECTIVE_REFERENCE_KINDS[match[1] ?? ''];
    const name = match[3];
    if (!kind || name === undefined || match.index === undefined) {
      continue;
    }
    const argumentStart = match.index + match[0].length - name.length;
    result.push({
      argumentEnd: argumentStart + name.length,
      argumentStart,
      kind,
      name
    });
  }
  return result;
};

const getMapDefinitions = (root: YamlAstNode | undefined, mapName: string): Map<string, Definition> => {
  const result = new Map<string, Definition>();
  if (!root || root.type !== 'object') {
    return result;
  }

  const mapNode = root.properties.find((property) => property.keyNode.value === mapName)?.valueNode;
  if (!mapNode || mapNode.type !== 'object') {
    return result;
  }

  for (const property of mapNode.properties) {
    const name = property.keyNode.value;
    if (typeof name !== 'string') {
      continue;
    }
    const typeNode =
      property.valueNode?.type === 'object'
        ? property.valueNode.properties.find((candidate) => candidate.keyNode.value === 'type')?.valueNode
        : undefined;
    const resourceType = typeNode?.type === 'string' ? typeNode.value : undefined;
    result.set(name, {
      keyNode: property.keyNode,
      ...(resourceType ? { resourceType } : {})
    });
  }
  return result;
};

const getDefinitions = (document: YamlAstDocument, kind: ReferenceKind): Map<string, Definition> => {
  const result = new Map<string, Definition>();
  for (const mapName of DEFINITION_MAPS[kind]) {
    for (const [name, definition] of getMapDefinitions(document.root, mapName)) {
      if (!result.has(name)) {
        result.set(name, definition);
      }
    }
  }
  return result;
};

const isConnectToItem = (node: YamlAstNode): boolean => {
  const array = node.parent;
  const property = array?.type === 'array' ? array.parent : undefined;
  return property?.type === 'property' && property.keyNode.value === 'connectTo';
};

const visitStrings = (node: YamlAstNode | undefined, visit: (node: YamlAstNode) => void): void => {
  if (!node) {
    return;
  }
  if (node.type === 'string') {
    visit(node);
  }
  node.children?.forEach((child) => visitStrings(child, visit));
};

const scalarValueOffset = (node: YamlAstNode, document: TextDocument): number => {
  if (node.type !== 'string') {
    return node.offset;
  }
  const source = document.getText().slice(node.offset, node.offset + node.length);
  const valueOffset = source.indexOf(node.value);
  return valueOffset === -1 ? node.offset : node.offset + valueOffset;
};

const findStringNode = (document: YamlAstDocument, offset: number): YamlAstNode | undefined => {
  const exact = document.getNodeFromOffset(offset);
  if (exact?.type === 'string') {
    return exact;
  }
  const preceding = offset > 0 ? document.getNodeFromOffset(offset - 1) : undefined;
  return preceding?.type === 'string' ? preceding : undefined;
};

const getStringAtPosition = (textDocument: TextDocument, position: Position) => {
  const document = parseYamlAst(textDocument);
  if (!document) {
    return undefined;
  }
  const offset = textDocument.offsetAt(position);
  const node = findStringNode(document, offset);
  if (!node || node.type !== 'string') {
    return undefined;
  }
  return {
    document,
    node,
    offset,
    valueOffset: scalarValueOffset(node, textDocument)
  };
};

const resolveReference = (document: YamlAstDocument, reference: ParsedReference): ResolvedReference => {
  const definition = getDefinitions(document, reference.kind).get(reference.name);
  return { ...reference, ...(definition ? { definition } : {}) };
};

export const getReferenceDiagnostics = (textDocument: TextDocument): Diagnostic[] => {
  const document = parseYamlAst(textDocument);
  if (!document) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];
  const addDiagnostic = (reference: ParsedReference, start: number, end: number): void => {
    // CloudFormation logical IDs can refer to generated child resources, so an editor
    // cannot prove that an unknown ID is invalid from the config file alone.
    if (reference.kind === 'cloudformation-resource') {
      return;
    }
    const definitions = getDefinitions(document, reference.kind);
    if (reference.name.length === 0 || definitions.size === 0 || definitions.has(reference.name)) {
      return;
    }
    const label = REFERENCE_LABELS[reference.kind];
    diagnostics.push(
      Diagnostic.create(
        Range.create(textDocument.positionAt(start), textDocument.positionAt(end)),
        `Unknown ${label} "${reference.name}". No ${label} with this name is defined in this config.`,
        DiagnosticSeverity.Warning,
        undefined,
        'Stacktape'
      )
    );
  };

  visitStrings(document.root, (node) => {
    if (node.type !== 'string') {
      return;
    }
    const valueOffset = scalarValueOffset(node, textDocument);
    for (const reference of directiveReferences(node.value)) {
      addDiagnostic(reference, valueOffset + reference.argumentStart, valueOffset + reference.argumentEnd);
    }
    if (isConnectToItem(node) && node.value) {
      addDiagnostic(
        { argumentEnd: node.value.length, argumentStart: 0, kind: 'resource', name: node.value },
        valueOffset,
        valueOffset + node.value.length
      );
    }
  });

  return diagnostics;
};

const getReferenceAtPosition = (
  textDocument: TextDocument,
  position: Position
): { reference: ResolvedReference; sourceRange: Range } | undefined => {
  const located = getStringAtPosition(textDocument, position);
  if (!located) {
    return undefined;
  }
  const { document, node, offset, valueOffset } = located;
  for (const parsed of directiveReferences(node.value)) {
    const start = valueOffset + parsed.argumentStart;
    const end = valueOffset + parsed.argumentEnd;
    if (offset >= start && offset <= end) {
      return {
        reference: resolveReference(document, parsed),
        sourceRange: Range.create(textDocument.positionAt(start), textDocument.positionAt(end))
      };
    }
  }

  if (isConnectToItem(node)) {
    return {
      reference: resolveReference(document, {
        argumentEnd: node.value.length,
        argumentStart: 0,
        kind: 'resource',
        name: node.value
      }),
      sourceRange: Range.create(
        textDocument.positionAt(valueOffset),
        textDocument.positionAt(valueOffset + node.value.length)
      )
    };
  }
  return undefined;
};

export const getReferenceDefinition = (textDocument: TextDocument, position: Position): LocationLink[] | undefined => {
  const located = getReferenceAtPosition(textDocument, position);
  const target = located?.reference.definition?.keyNode;
  if (!located || !target) {
    return undefined;
  }
  const targetRange = Range.create(
    textDocument.positionAt(target.offset),
    textDocument.positionAt(target.offset + target.length)
  );
  return [LocationLink.create(textDocument.uri, targetRange, targetRange, located.sourceRange)];
};

export const getReferenceHover = (textDocument: TextDocument, position: Position): Hover | undefined => {
  const located = getReferenceAtPosition(textDocument, position);
  if (!located) {
    return undefined;
  }
  const { definition, kind, name } = located.reference;
  const label = REFERENCE_LABELS[kind];
  const detail = definition?.resourceType ? ` of type \`${definition.resourceType}\`` : '';
  const value = definition
    ? `References ${label} **${name}**${detail}.`
    : `⚠️ Unknown ${label} **${name}** — it is not defined in this config.`;
  return {
    contents: { kind: 'markdown', value },
    range: located.sourceRange
  };
};

export const getReferenceCompletions = (textDocument: TextDocument, position: Position): CompletionList | undefined => {
  const located = getStringAtPosition(textDocument, position);
  if (!located) {
    return undefined;
  }
  const { document, node, offset, valueOffset } = located;
  const beforeCursor = node.value.slice(0, Math.max(0, offset - valueOffset));
  const match = /\$(\w+)\(\s*['"]([^'"]*)$/.exec(beforeCursor);
  const kind = DIRECTIVE_REFERENCE_KINDS[match?.[1] ?? ''];
  const partial = match?.[2];
  if (!kind || partial === undefined) {
    return undefined;
  }

  const range = Range.create(textDocument.positionAt(offset - partial.length), position);
  return {
    isIncomplete: false,
    items: Array.from(getDefinitions(document, kind), ([name, definition]) => ({
      label: name,
      kind: CompletionItemKind.Reference,
      ...(definition.resourceType ? { detail: definition.resourceType } : {}),
      textEdit: TextEdit.replace(range, name)
    }))
  };
};
