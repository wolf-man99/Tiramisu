'use client';

import { useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';

/** Monaco, themed to match the app, with BigQuery-flavoured SQL highlighting. */
export function SqlEditor({
  value,
  onChange,
  onRun,
  height = '100%',
  readOnly = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun?: () => void;
  height?: string | number;
  readOnly?: boolean;
}) {
  const runRef = useRef(onRun);
  runRef.current = onRun;

  const handleMount: OnMount = (editor, monaco) => {
    monaco.editor.defineTheme('growthsql', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'b3a9ff', fontStyle: 'bold' },
        { token: 'string.sql', foreground: '34d399' },
        { token: 'number.sql', foreground: 'fbbf24' },
        { token: 'operator.sql', foreground: '60a5fa' },
        { token: 'comment', foreground: '52525f', fontStyle: 'italic' },
        { token: 'predefined.sql', foreground: '22d3ee' },
      ],
      colors: {
        'editor.background': '#0c0c11',
        'editor.foreground': '#ededf2',
        'editorLineNumber.foreground': '#33333f',
        'editorLineNumber.activeForeground': '#a1a1b0',
        'editor.selectionBackground': '#7c6cf633',
        'editor.lineHighlightBackground': '#17171f',
        'editorCursor.foreground': '#7c6cf6',
        'editorIndentGuide.background1': '#1e1e28',
        'editorGutter.background': '#0c0c11',
      },
    });
    monaco.editor.setTheme('growthsql');
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.());
  };

  return (
    <Editor
      height={height}
      defaultLanguage="sql"
      language="sql"
      value={value}
      theme="growthsql"
      onChange={(v) => onChange(v ?? '')}
      onMount={handleMount}
      loading={<div className="p-4 text-sm text-[var(--text-subtle)]">Loading editor…</div>}
      options={{
        readOnly,
        fontSize: 13.5,
        fontFamily: 'var(--font-mono)',
        fontLigatures: true,
        minimap: { enabled: false },
        lineNumbersMinChars: 3,
        scrollBeyondLastLine: false,
        padding: { top: 14, bottom: 14 },
        renderLineHighlight: 'line',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      }}
    />
  );
}
