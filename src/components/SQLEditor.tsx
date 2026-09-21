/**
 * SQL Editor Component
 *
 * Monaco Editor wrapper configured for SQL with our custom
 * completion provider. All completion intelligence comes from
 * our compiler pipeline — Monaco is only the UI host.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type * as monacoTypes from 'monaco-editor';
import { createCompletionProvider } from '../editor/monacoCompletionProvider';
import { PipelineResult } from '../compiler/pipeline';
import { SchemaCatalog } from '../schema/schemaCatalog';

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCursorChange: (offset: number) => void;
  catalog: SchemaCatalog;
  onPipelineResult: (result: PipelineResult) => void;
}

export const SQLEditor: React.FC<SQLEditorProps> = ({
  value,
  onChange,
  onCursorChange,
  catalog,
  onPipelineResult,
}) => {
  const editorRef = useRef<monacoTypes.editor.IStandaloneCodeEditor | null>(null);
  const disposablesRef = useRef<monacoTypes.IDisposable[]>([]);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Register our custom completion provider
    const provider = createCompletionProvider(monaco, catalog, onPipelineResult);
    const disposable = monaco.languages.registerCompletionItemProvider('sql', provider);
    disposablesRef.current.push(disposable);

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      const offset = editor.getModel()?.getOffsetAt(e.position) ?? 0;
      onCursorChange(offset);
    });

    // Define the dark theme for SQL
    monaco.editor.defineTheme('sql-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
        { token: 'identifier', foreground: '9CDCFE' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'operator', foreground: 'D4D4D4' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#e6edf3',
        'editorCursor.foreground': '#58a6ff',
        'editor.lineHighlightBackground': '#161b22',
        'editor.selectionBackground': '#264f78',
        'editorLineNumber.foreground': '#6e7681',
        'editorLineNumber.activeForeground': '#e6edf3',
      },
    });
    monaco.editor.setTheme('sql-dark');

    // Focus editor
    editor.focus();
  }, [catalog, onPipelineResult, onCursorChange]);

  useEffect(() => {
    return () => {
      disposablesRef.current.forEach(d => d.dispose());
    };
  }, []);

  return (
    <div className="panel editor-panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="dot"></span>
          SQL Editor
        </span>
        <span className="panel-badge">
          {value.length} chars
        </span>
      </div>
      <div className="editor-container">
        <Editor
          height="100%"
          defaultLanguage="sql"
          value={value}
          onChange={(v) => onChange(v || '')}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            tabSize: 2,
            renderLineHighlight: 'all',
            padding: { top: 8 },
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>
    </div>
  );
};
