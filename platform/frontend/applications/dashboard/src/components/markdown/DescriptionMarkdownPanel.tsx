import { SafeMarkdown } from './SafeMarkdown';

type DescriptionMarkdownPanelProps = {
    content: string;
};

/** Bordered panel for maximized project/component descriptions. */
export function DescriptionMarkdownPanel({ content }: DescriptionMarkdownPanelProps) {
    return (
        <div className="neon-input min-h-28 max-h-[32rem] overflow-auto">
            <SafeMarkdown content={content} />
        </div>
    );
}
