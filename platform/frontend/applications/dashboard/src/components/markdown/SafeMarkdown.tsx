import { Component, memo, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

export type SafeMarkdownProps = {
    content: string;
    className?: string;
};

const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeSanitize];

type MarkdownErrorBoundaryProps = {
    content: string;
    className?: string;
    children: ReactNode;
};

type MarkdownErrorBoundaryState = {
    failed: boolean;
};

class MarkdownErrorBoundary extends Component<MarkdownErrorBoundaryProps, MarkdownErrorBoundaryState> {
    state: MarkdownErrorBoundaryState = { failed: false };

    static getDerivedStateFromError(): MarkdownErrorBoundaryState {
        return { failed: true };
    }

    render() {
        if (this.state.failed) {
            return (
                <pre
                    className={[
                        'whitespace-pre-wrap break-words font-sans text-sm text-[var(--text-primary)]',
                        this.props.className,
                    ]
                        .filter(Boolean)
                        .join(' ')}
                >
                    {this.props.content}
                </pre>
            );
        }
        return this.props.children;
    }
}

/** Renders markdown with GFM, sanitization, and a plain-text fallback on render errors. */
export const SafeMarkdown = memo(function SafeMarkdown({ content, className }: SafeMarkdownProps) {
    const text = typeof content === 'string' ? content : String(content ?? '');

    return (
        <MarkdownErrorBoundary content={text} className={className}>
            <div className={['markdown-body', className].filter(Boolean).join(' ')}>
                <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
                    {text}
                </ReactMarkdown>
            </div>
        </MarkdownErrorBoundary>
    );
});
