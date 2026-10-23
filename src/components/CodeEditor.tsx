import { useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Code2, FileCode2 } from "lucide-react";
import type { SourceLocation } from "../core";
import { Badge } from "./ui/badge";
import { Card, CardHeader } from "./ui/card";

type EditorInstance = Parameters<OnMount>[0];
type MonacoInstance = Parameters<OnMount>[1];

interface CodeEditorProps {
  source: string;
  error?: string;
  currentLocation?: SourceLocation;
  onChange: (value: string) => void;
}

export function CodeEditor({
  source,
  error,
  currentLocation,
  onChange,
}: CodeEditorProps) {
  const editorRef = useRef<EditorInstance | undefined>(undefined);
  const monacoRef = useRef<MonacoInstance | undefined>(undefined);
  const decorationsRef = useRef<string[]>([]);
  const currentLine = currentLocation?.start.line;
  const currentLineSource =
    currentLine === undefined ? undefined : source.split("\n")[currentLine - 1]?.trim();

  const configureEditor: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    editor.focus();
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const lineCount = source.split("\n").length;
    if (currentLocation === undefined || currentLocation.start.line > lineCount) {
      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        [],
      );
      return;
    }
    const startLine = currentLocation.start.line;
    const endLine = Math.min(
      lineCount,
      Math.max(startLine, currentLocation.end.line),
    );
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(startLine, 1, endLine, 1),
        options: {
          isWholeLine: true,
          className: "algovis-current-line",
          glyphMarginClassName: "algovis-current-line-glyph",
          linesDecorationsClassName: "algovis-current-line-gutter",
          hoverMessage: { value: "The interpreter is paused here." },
        },
      },
    ]);
    editor.revealLineInCenterIfOutsideViewport(startLine);
  }, [currentLocation, source]);

  return (
    <Card className="flex min-h-122.5 flex-col lg:min-h-0">
      <CardHeader className="shrink-0">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-lime-300" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
            Algorithm.js
          </span>
          <Badge className="border-lime-300/20 text-lime-300">JS-LIKE</Badge>
        </div>
        <span className="font-mono text-[10px] text-zinc-600">
          {currentLine === undefined ? "READY" : `LINE ${currentLine}`}
        </span>
      </CardHeader>
      <div className="min-h-0 flex-1 bg-[#111411] py-2">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          language="javascript"
          theme="algovis-dark"
          value={source}
          onChange={(value) => onChange(value ?? "")}
          onMount={configureEditor}
          options={{
            automaticLayout: true,
            fontSize: 13,
            lineHeight: 22,
            fontFamily: "JetBrains Mono, Consolas, monospace",
            minimap: { enabled: false },
            glyphMargin: true,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "none",
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            suggest: { showMethods: true, showFunctions: true },
            tabSize: 2,
          }}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme("algovis-dark", {
              base: "vs-dark",
              inherit: true,
              rules: [
                { token: "comment", foreground: "687566", fontStyle: "italic" },
                { token: "keyword", foreground: "d8f27a" },
                { token: "string", foreground: "c4d98a" },
                { token: "number", foreground: "e8b76a" },
              ],
              colors: {
                "editor.background": "#111411",
                "editor.foreground": "#d7ded4",
                "editorLineNumber.foreground": "#485248",
                "editorLineNumber.activeForeground": "#d8f27a",
                "editor.lineHighlightBackground": "#1b241b",
                "editorCursor.foreground": "#d8f27a",
                "editor.selectionBackground": "#475d3d",
              },
            });
          }}
        />
      </div>
      {currentLineSource ? (
        <div className="flex items-center gap-2 border-t border-white/8 bg-[#141a14] px-4 py-2 font-mono text-[11px] text-zinc-400">
          <span className="text-lime-300">›</span>
          <span className="truncate">{currentLineSource}</span>
        </div>
      ) : null}
      {error ? (
        <div className="border-t border-red-400/20 bg-red-400/6 px-4 py-2 font-mono text-[11px] text-red-300">
          {error}
        </div>
      ) : null}
      <div className="flex shrink-0 items-center justify-between border-t border-white/8 px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
        <span className="flex items-center gap-1.5">
          <Code2 className="h-3 w-3" /> IntelliSense enabled
        </span>
        <span>{source.split("\n").length} lines</span>
      </div>
    </Card>
  );
}
