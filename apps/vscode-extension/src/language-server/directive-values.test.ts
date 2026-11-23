import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLanguageService } from 'yaml-language-server';
import { isDirectiveValueDiagnostic } from './directive-values';

const schema = readFileSync(join(import.meta.dir, '../../../../packages/config/generated/config-schema.json'), 'utf8');

let documentNumber = 0;

const diagnosticsOf = async (text: string) => {
  const languageService = getLanguageService({
    schemaRequestService: async () => schema,
    workspaceContext: { resolveRelativePath: (path: string) => path }
  });
  languageService.configure({
    validate: true,
    yamlVersion: '1.2',
    schemas: [{ uri: 'file:///config-schema.json', fileMatch: ['*.yml'] }]
  });
  // The language service caches parsed documents by URI and version, so every case gets its own.
  documentNumber += 1;
  const document = TextDocument.create(`file:///case-${documentNumber}/stacktape.yml`, 'yaml', 1, text);
  return (await languageService.doValidation(document, false))
    .filter((diagnostic) => !isDirectiveValueDiagnostic(diagnostic, document))
    .map((diagnostic) => document.getText(diagnostic.range));
};

const database = (deletionProtection: string, retention: string) => `resources:
  db:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db.password')
      engine:
        type: postgres
        properties:
          version: '16'
          primaryInstance:
            instanceSize: db.t4g.micro
      deletionProtection: ${deletionProtection}
      automatedBackupRetentionDays: ${retention}
`;

describe('schema diagnostics on directive values', () => {
  test('a directive in a boolean or number field is not a type error: the CLI validates its result', async () => {
    expect(await diagnosticsOf(database("$IfStageStartsWith('pr-', false, true)", '$Var().days'))).toEqual([]);
    expect(await diagnosticsOf(database('"$IfStageStartsWith(\'pr-\', false, true)"', "'$Var().days'"))).toEqual([]);
  });

  test('a wrong literal value is still reported', async () => {
    expect(await diagnosticsOf(database("'yes'", 'seven'))).toEqual(["'yes'", 'seven']);
    expect(await diagnosticsOf(database('$notADirective', '7'))).toEqual(['$notADirective']);
  });
});
