import { MonacoEditor } from '@stacktape/ui-react/monaco-editor';
import { getYamlModelPath } from '@stacktape/ui-react/monaco-yaml/model-path';
import { useEffect, useState } from 'react';
import { monaco, sharedMonaco, stacktapeYaml } from './monaco-setup';

const YAML_PATH = getYamlModelPath({ editorNumber: 1, intellisense: true });

export type EditorProblems = { count: number; first?: { line: number; message: string } };

/**
 * The configuration file in Monaco: YAML editable with the Stacktape schema (hover documentation, Ctrl+Space
 * completion, validation), TypeScript shown read-only.
 *
 * The default export is the lazy chunk boundary: Monaco and its workers load only when this is rendered.
 */
export default function ConfigFileEditor({
  value,
  language,
  readOnly,
  onChange,
  onProblems
}: {
  value: string;
  language: 'yaml' | 'typescript';
  readOnly: boolean;
  onChange: (value: string) => void;
  onProblems: (problems: EditorProblems) => void;
}) {
  const [path] = useState(() => (language === 'yaml' ? YAML_PATH : 'file:///stacktape.ts'));

  useEffect(() => {
    if (language !== 'yaml') return;
    stacktapeYaml.setModelSettings(YAML_PATH, {
      isIntellisenseEnabled: true,
      rootSchemaIdentifier: null,
      onDiagnostics: (diagnostics) => {
        const errors = diagnostics.filter((entry) => entry.severity >= monaco.MarkerSeverity.Warning);
        const first = errors[0];
        onProblems({
          count: errors.length,
          ...(first === undefined ? {} : { first: { line: first.startLineNumber, message: first.message } })
        });
      }
    });
    return () => stacktapeYaml.removeModelSettings(YAML_PATH);
  }, [language, onProblems]);

  return (
    <MonacoEditor
      className="h-full w-full"
      language={language}
      monaco={sharedMonaco}
      onChange={(next) => onChange(next)}
      options={{
        fontFamily: "ui-monospace, 'SFMono-Regular', 'JetBrains Mono', Menlo, Consolas, monospace",
        fontSize: 13,
        lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        renderLineHighlight: 'line',
        padding: { top: 12, bottom: 12 },
        quickSuggestions: { other: true, strings: true, comments: false },
        hover: { delay: 250 },
        fixedOverflowWidgets: true,
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 }
      }}
      path={path}
      readOnly={readOnly}
      theme="stacktape-wizard"
      value={value}
    />
  );
}
