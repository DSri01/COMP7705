/** Agents exposed on `/api/agents` (keep in sync with `src/agents/manifest.ts` `AGENT_IDS`). */
export const SUPPORTED_AGENTS = [
    {
        id: 'platform-assistant',
        description: 'Platform assistant: CVE/platform workflows, web research, task agents',
    },
] as const;

export type SupportedAgentId = (typeof SUPPORTED_AGENTS)[number]['id'];

/** Type guard for CLI `SET-AGENT` validation. */
export function isSupportedAgentId(value: string): value is SupportedAgentId {
    return SUPPORTED_AGENTS.some((a) => a.id === value);
}
