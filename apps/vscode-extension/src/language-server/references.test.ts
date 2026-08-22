import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  getReferenceCompletions,
  getReferenceDefinition,
  getReferenceDiagnostics,
  getReferenceHover
} from './references';

const source = [
  'variables:',
  '  appName: example',
  'resources:',
  '  postsTable:',
  '    type: dynamo-db-table',
  '  api:',
  '    type: function',
  '    properties:',
  '      connectTo:',
  '        - postsTable',
  '        - missingTable',
  '      environment:',
  "        RESOURCE: $ResourceParam('postsTable', 'arn')",
  "        PARTIAL: $ResourceParam('po",
  "        VARIABLE: $Var('missingVariable')",
  "        GENERATED: $CfResourceParam('GeneratedChildLogicalId', 'Arn')",
  ''
].join('\n');

const document = TextDocument.create('file:///app.stacktape.yml', 'stacktape', 1, source);

const positionInside = (text: string, relativeOffset = 1) => {
  const offset = source.indexOf(text);
  if (offset === -1) {
    throw new Error(`Missing fixture text: ${text}`);
  }
  return document.positionAt(offset + relativeOffset);
};

describe('Stacktape references', () => {
  test('validates only references that can be proven from one config file', () => {
    const messages = getReferenceDiagnostics(document).map((diagnostic) => diagnostic.message);
    expect(messages).toContain(
      'Unknown resource "missingTable". No resource with this name is defined in this config.'
    );
    expect(messages).toContain(
      'Unknown variable "missingVariable". No variable with this name is defined in this config.'
    );
    expect(messages.some((message) => message.includes('postsTable'))).toBe(false);
    expect(messages.some((message) => message.includes('GeneratedChildLogicalId'))).toBe(false);
  });

  test('resolves definitions and hover details', () => {
    const position = positionInside("postsTable', 'arn", 3);
    const definition = getReferenceDefinition(document, position);
    const hover = getReferenceHover(document, position);

    expect(definition).toHaveLength(1);
    expect(definition?.[0]?.targetUri).toBe(document.uri);
    expect(JSON.stringify(hover?.contents)).toContain('dynamo-db-table');
  });

  test('completes names from the matching top-level map', () => {
    const position = positionInside("$ResourceParam('po", "$ResourceParam('po".length);
    const completion = getReferenceCompletions(document, position);

    expect(completion?.items.map((item) => item.label)).toEqual(['postsTable', 'api']);
    expect(completion?.items[0]?.textEdit).toBeDefined();
  });
});
