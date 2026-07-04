/**
 * Downloads the chat transcript as markdown.
 * Filename: `{agentId}-{threadIdPrefix}-{exportedAtUnixSeconds}.md`
 */
export function downloadAgentChatMarkdown(
    markdown: string,
    agentId: string,
    threadId: string,
): void {
    const exportedAtUnixSeconds = String(Math.floor(Date.now() / 1000));
    const threadPrefix = threadId.slice(0, 8);
    const filename = `${agentId}-${threadPrefix}-${exportedAtUnixSeconds}.md`;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}
