import { useRef } from 'react';
import Editor from '@monaco-editor/react';

export interface MonacoEditorProps {
    value: string;
    onChange: (value: string) => void;
    language?: string;
    height?: string;
    className?: string;
}

const MonacoEditor = ({
    value,
    onChange,
    language = 'html',
    height = '400px',
    className,
}: MonacoEditorProps) => {
    const editorRef = useRef<any>(null);

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
    };

    const handleEditorChange = (nextValue: string | undefined) => {
        if (nextValue !== undefined) {
            onChange(nextValue);
        }
    };

    return (
        <div
            className={[
                'overflow-hidden rounded-lg border border-sky-100 bg-slate-50 shadow-[0_2px_4px_rgba(17,148,255,0.1)]',
                'focus-within:border-sky-500 focus-within:ring-3 focus-within:ring-sky-100',
                className || ''
            ].join(' ').trim()}
        >
            <Editor
                height={height}
                language={language}
                value={value}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    wordWrap: 'on',
                    automaticLayout: true,
                    tabSize: 2,
                    formatOnPaste: true,
                    formatOnType: true,
                }}
                className="h-full w-full bg-slate-50 font-mono text-sm text-slate-700"
            />
        </div>
    );
};

export default MonacoEditor;
