import Editor, { type OnMount } from "@monaco-editor/react";
import { Code2, FileCode2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Card, CardHeader } from "./ui/card";

interface CodeEditorProps {
  source: string;
  error?: string;
  onChange: (value: string) => void;
}

export function CodeEditor({ source, error, onChange }: CodeEditorProps) {
  const configureEditor: OnMount = (editor, monaco) => {
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    editor.focus();
  };

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
          ⌘ K · FORMAT
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
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "line",
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
