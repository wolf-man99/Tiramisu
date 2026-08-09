'use client';

import { useRef } from 'react';
import Editor, { type OnMount, loader } from '@monaco-editor/react';

// Serve Monaco from our own /public copy instead of the default CDN, so the
// editor works offline and matches the monaco-editor version we depend on.
loader.config({ paths: { vs: '/monaco/vs' } });

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
    // Light theme on cream, matching the Tiramisu palette.
    monaco.editor.defineTheme('tiramisu', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '6c3bff', fontStyle: 'bold' },
        { token: 'string.sql', foreground: '0f8f74' },
        { token: 'number.sql', foreground: 'b46f04' },
        { token: 'operator.sql', foreground: '045099' },
        { token: 'comment', foreground: '8d9aa6', fontStyle: 'italic' },
        { token: 'predefined.sql', foreground: '17a398' },
      ],
      colors: {
        'editor.background': '#fbf8f2',
        'editor.foreground': '#0f2438',
        'editorLineNumber.foreground': '#b3bcc4',
        'editorLineNumber.activeForeground': '#0f2438',
        'editor.selectionBackground': '#f5a62366',
        'editor.lineHighlightBackground': '#f1e9da',
        'editorCursor.foreground': '#0f2438',
        'editorIndentGuide.background1': '#e6ddcc',
        'editorGutter.background': '#fbf8f2',
      },
    });
    monaco.editor.setTheme('tiramisu');
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.());
  };

  return (
    <Editor
      height={height}
      defaultLanguage="sql"
      language="sql"
      value={value}
      theme="tiramisu"
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
