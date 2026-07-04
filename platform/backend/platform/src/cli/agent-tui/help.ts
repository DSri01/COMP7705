import { DEFAULT_AGENTS_BASE_URL } from './parse-args.js';
import { SUPPORTED_AGENTS } from './supported-agents.js';

export function printHelp(): void {
    const agentLines = SUPPORTED_AGENTS.map((a) => `    ${a.id} — ${a.description}`).join('\n');

    console.log(`
Platform Agent REST TUI — command reference

Syntax: VERB [arguments...]   (optional brackets: [VERB] args)

Session (Metasploit-style options)
  SET-AGENT <id>           Select agent for subsequent REST calls
  SET-THREAD <threadId>    Set thread id (agent must be set; thread must exist on server)
  SET-BASE-URL <url>       Change agents REST base (default at launch: ${DEFAULT_AGENTS_BASE_URL})
  SHOW                     Print current agent id, thread id, and API base URL
  LIST-AGENTS              List supported agent ids (synced with manifest)

REST API verbs (require SET-AGENT; thread verbs also require SET-THREAD)
  CREATE-THREAD            POST …/:agentId/threads — sets thread id from response
  LIST-THREADS             GET  …/:agentId/threads (newest first; shows createdAt)
  GET-MESSAGES             GET  …/:agentId/threads/:threadId/messages
  EXPORT                   GET  …/:agentId/threads/:threadId/messages/export
  SEND <message>           POST …/:agentId/threads/:threadId/messages
                           (newMessageIndex = current message count)

Other
  HELP                     Show this help
  EXIT | QUIT              Leave the TUI

Supported agents:
${agentLines}

Notes:
  - Agent and thread start unset; REST verbs error without configuring them (CLI keeps running).
  - CREATE-THREAD automatically SET-THREAD to the new id.
  - SEND fetches message history first to compute the next newMessageIndex.
  - Direct Nest (no reverse proxy): SET-BASE-URL http://localhost:<port>/agents
`.trim());
}
