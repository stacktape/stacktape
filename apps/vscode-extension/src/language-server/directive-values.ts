import type { Diagnostic } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

/** One whole directive call, optionally followed by a property path: `$Var().memory`, `$Stage()`. */
const WHOLE_DIRECTIVE = /^\$[A-Za-z_$][\w$]*\(.*\)(?:\.[\w$-]+(?:\[\d+\])*)*$/s;

/**
 * Whether a schema diagnostic is about a value that is a whole directive, such as
 * `deletionProtection: $IfStageStartsWith('pr-', false, true)` or `memory: $Var().memory`. The CLI resolves directives
 * before it validates the config, so the type, format or allowed values the schema names apply to the result, not to
 * the directive text.
 */
export const isDirectiveValueDiagnostic = (diagnostic: Diagnostic, document: TextDocument): boolean =>
  WHOLE_DIRECTIVE.test(
    document
      .getText(diagnostic.range)
      .trim()
      .replace(/^(['"])(.*)\1$/s, '$2')
  );
