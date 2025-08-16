import React, { useMemo } from 'react';
import { useMathJax } from '../hooks/useMathJax';

declare global {
    interface Window {
        marked: {
            parse: (markdown: string) => string;
        };
    }
}

const MarkdownRenderer: React.FC<{ content: string; inline?: boolean }> = ({ content, inline = false }) => {
    const htmlContent = useMemo(() => {
        if (typeof window.marked?.parse === 'function') {
            const parsed = window.marked.parse(content || "");
            // If inline, strip the outer <p> tag that marked adds for single lines.
            if (inline) {
                 // This is a bit of a hack, but necessary for inline rendering within other elements like <summary>.
                const trimmed = parsed.trim();
                if (trimmed.startsWith('<p>') && trimmed.endsWith('</p>')) {
                    return trimmed.slice(3, -4);
                }
                return parsed;
            }
            return parsed;
        }
        return `<p>Markdown parser not loaded. Displaying raw content:</p><pre><code>${content}</code></pre>`;
    }, [content, inline]);

    useMathJax([htmlContent]);

    if (inline) {
        // Render as a span without the block-level markdown-content class for inline contexts.
        return <span dangerouslySetInnerHTML={{ __html: htmlContent }} />;
    }

    return (
        <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
};

export default MarkdownRenderer;
