import { Link, useParams } from 'react-router-dom';
import { AgentChatWindow, HTTP_AGENT_ID, isHttpAgentId } from '../components/agents/AgentChatWindow';
import PageHelpPanel from '../components/PageHelpPanel';
import { pageHelpMarkdown } from '../help/pageHelpMarkdown';

export default function AgentChatPage() {
    const { agentId } = useParams<{ agentId: string }>();

    if (!agentId || !isHttpAgentId(agentId)) {
        return (
            <section className="panel space-y-4">
                <p className="text-[var(--text-secondary)]">Unknown or missing agent.</p>
                <Link className="neon-link" to={`/agents/${HTTP_AGENT_ID}`}>
                    Open Platform Agent
                </Link>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            <PageHelpPanel markdown={pageHelpMarkdown.agentChat} />
            <Link className="neon-link text-sm" to="/">
                ← Home
            </Link>
            <AgentChatWindow agentId={agentId} />
        </section>
    );
}
