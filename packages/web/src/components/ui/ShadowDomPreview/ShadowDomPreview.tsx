import { useEffect, useRef } from 'react';

export interface ShadowDomPreviewProps {
    htmlContent: string;
    className?: string;
}

const ShadowDomPreview = ({
    htmlContent,
    className,
}: ShadowDomPreviewProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(htmlContent, window.location.origin);
        }
    }, [htmlContent]);

    return (
        <iframe
            ref={iframeRef}
            sandbox="allow-scripts"
            title="Shadow DOM preview"
            srcDoc={`
<html>
    <head>
        <style>
            body { margin: 0; padding: 0; overflow-x: hidden; }
        </style>
    </head>
    <body>
        <script>
            window.addEventListener('message', (event) => {
                if (event.source !== window.parent) return;
                if (typeof event.data === 'string') {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(event.data, 'text/html');

                    document.head.innerHTML = doc.head.innerHTML;
                    document.body.innerHTML = doc.body.innerHTML;
                }
            });
        </script>
    </body>
</html>
            `}
            src='about:blank'
            className={[
                'h-full w-full overflow-auto rounded-lg border border-sky-100 bg-white shadow-[inset_0_2px_4px_rgba(17,148,255,0.1)]',
                className || ''
            ].join(' ').trim()}
        />
    );
};

export default ShadowDomPreview;
