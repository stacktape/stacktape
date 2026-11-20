import type { editor as MonacoEditorTypes } from 'monaco-editor/editor/editor.api.js';
import { useEffect, useRef } from 'react';
import { monaco } from './monaco-setup';

/**
 * What the user changed by hand: the generated file and the edited one, the changes in one column with the lines that
 * did not change folded away. Read-only; the edit itself stays in the editor.
 *
 * The default export is a lazy chunk boundary, like the editor's.
 */
export default function ConfigDiff({
  original,
  modified,
  language
}: {
  original: string;
  modified: string;
  language: 'yaml' | 'typescript';
}) {
  const container = useRef<HTMLDivElement>(null);
  const diff = useRef<MonacoEditorTypes.IStandaloneDiffEditor | null>(null);
  useEffect(() => {
    if (container.current === null) return;
    const editor = monaco.editor.createDiffEditor(container.current, {
      theme: 'stacktape-wizard',
      automaticLayout: true,
      readOnly: true,
      originalEditable: false,
      renderSideBySide: false,
      hideUnchangedRegions: { enabled: true, contextLineCount: 2, minimumLineCount: 4, revealLineCount: 10 },
      renderOverviewRuler: false,
      renderIndicators: true,
      fontFamily: "ui-monospace, 'SFMono-Regular', 'JetBrains Mono', Menlo, Consolas, monospace",
      fontSize: 13,
      lineHeight: 20,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      wrappingIndent: 'indent',
      padding: { top: 12, bottom: 12 },
      lineNumbersMinChars: 3,
      glyphMargin: false,
      folding: false,
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 }
    });
    diff.current = editor;
    return () => {
      const models = editor.getModel();
      editor.dispose();
      models?.original.dispose();
      models?.modified.dispose();
      diff.current = null;
    };
  }, []);
  useEffect(() => {
    const editor = diff.current;
    if (editor === null) return;
    const before = editor.getModel();
    editor.setModel({
      original: monaco.editor.createModel(original, language),
      modified: monaco.editor.createModel(modified, language)
    });
    before?.original.dispose();
    before?.modified.dispose();
  }, [original, modified, language]);
  return <div className="h-full w-full" ref={container} />;
}
