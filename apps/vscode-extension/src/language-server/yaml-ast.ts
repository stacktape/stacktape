import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { ASTNode } from 'yaml-language-server/out/server/src/languageservice/jsonLanguageTypes';
import { parse } from 'yaml-language-server/out/server/src/languageservice/parser/yamlParser07';
import type { SingleYAMLDocument } from 'yaml-language-server/out/server/src/languageservice/parser/yaml-documents';

// yaml-language-server does not expose its parsed AST from the package root. Keep the
// single version-sensitive import here so an upstream upgrade has one review point.
export type YamlAstNode = ASTNode;
export type YamlAstDocument = SingleYAMLDocument;

export const parseYamlAst = (document: TextDocument): YamlAstDocument | undefined =>
  parse(document.getText(), undefined, document).documents[0];
