import type { SupportedAgentId } from './supported-agents.js';

/** In-memory REST TUI state: selected agent and optional thread id. */
export class CliSession {
    agentId: SupportedAgentId | null = null;
    threadId: string | null = null;

    /** @throws If SET-AGENT has not been run. */
    requireAgent(): SupportedAgentId {
        if (!this.agentId) {
            throw new Error('Agent is not set. Use SET-AGENT <id> first (see HELP).');
        }
        return this.agentId;
    }

    /** @throws If agent or thread id is missing. */
    requireAgentAndThread(): { agentId: SupportedAgentId; threadId: string } {
        const agentId = this.requireAgent();
        if (!this.threadId) {
            throw new Error(
                'Thread id is not set. Use CREATE-THREAD or SET-THREAD <uuid> first (see HELP).',
            );
        }
        return { agentId, threadId: this.threadId };
    }
}
