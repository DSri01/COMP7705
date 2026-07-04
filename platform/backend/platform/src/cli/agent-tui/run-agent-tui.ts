import readline from 'node:readline/promises';

import type { RestApiClient } from './api-client.js';
import { printHelp } from './help.js';
import { parseCommandLine } from './parse-command.js';
import { normalizeAgentsBaseUrl } from './parse-args.js';
import { CliSession } from './session.js';
import { isSupportedAgentId, SUPPORTED_AGENTS } from './supported-agents.js';

/** Dependencies for the interactive agent REST TUI loop. */
export interface RunAgentTuiOptions {
    api: RestApiClient;
}

function printError(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[!] ${message}`);
}

/** Read-eval-print loop for agent thread REST commands (see HELP). */
export async function runAgentTui({ api }: RunAgentTuiOptions): Promise<void> {
    const session = new CliSession();

    console.log('Platform Agent REST TUI');
    console.log(`API base: ${api.getBaseUrl()}`);
    console.log('Type HELP for commands. EXIT to quit.\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    let running = true;

    while (running) {
        let line: string;
        try {
            line = await rl.question('agent> ');
        } catch {
            break;
        }

        const parsed = parseCommandLine(line);
        if (!parsed) {
            continue;
        }

        try {
            switch (parsed.verb) {
                case 'HELP':
                case '?':
                    printHelp();
                    break;

                case 'EXIT':
                case 'QUIT':
                    running = false;
                    break;

                case 'SHOW':
                case 'STATUS':
                    console.log('  agentId :', session.agentId ?? '(not set)');
                    console.log('  threadId:', session.threadId ?? '(not set)');
                    console.log('  baseUrl :', api.getBaseUrl());
                    break;

                case 'SET-BASE-URL': {
                    const url = parsed.args[0]?.trim();
                    if (!url) {
                        throw new Error('Usage: SET-BASE-URL <url>');
                    }
                    api.setBaseUrl(normalizeAgentsBaseUrl(url));
                    console.log(`[+] baseUrl = ${api.getBaseUrl()}`);
                    break;
                }

                case 'LIST-AGENTS':
                    for (const agent of SUPPORTED_AGENTS) {
                        console.log(`  ${agent.id}`);
                        console.log(`    ${agent.description}`);
                    }
                    break;

                case 'SET-AGENT': {
                    const id = parsed.args[0]?.trim();
                    if (!id) {
                        throw new Error('Usage: SET-AGENT <agentId>');
                    }
                    if (!isSupportedAgentId(id)) {
                        throw new Error(
                            `Unknown agent "${id}". Use LIST-AGENTS. Supported: ${SUPPORTED_AGENTS.map((a) => a.id).join(', ')}`,
                        );
                    }
                    session.agentId = id;
                    session.threadId = null;
                    console.log(`[+] agentId = ${id} (thread cleared)`);
                    break;
                }

                case 'SET-THREAD': {
                    const agentId = session.requireAgent();
                    const threadId = parsed.args[0]?.trim();
                    if (!threadId) {
                        throw new Error('Usage: SET-THREAD <threadId>');
                    }
                    const exists = await api.threadExists(agentId, threadId);
                    if (!exists) {
                        throw new Error(
                            `Thread "${threadId}" not found for agent "${agentId}". Create one with CREATE-THREAD.`,
                        );
                    }
                    session.threadId = threadId;
                    console.log(`[+] threadId = ${threadId}`);
                    break;
                }

                case 'CREATE-THREAD': {
                    const agentId = session.requireAgent();
                    const { threadId } = await api.createThread(agentId);
                    session.threadId = threadId;
                    console.log(`[+] threadId = ${threadId}`);
                    break;
                }

                case 'LIST-THREADS': {
                    const agentId = session.requireAgent();
                    const { threads } = await api.listThreads(agentId);
                    if (threads.length === 0) {
                        console.log('(no threads registered for this agent in this server process)');
                    } else {
                        for (const row of threads) {
                            console.log(`  ${row.threadId}  createdAt=${row.createdAt}`);
                        }
                    }
                    break;
                }

                case 'GET-MESSAGES': {
                    const { agentId, threadId } = session.requireAgentAndThread();
                    const result = await api.getMessages(agentId, threadId);
                    console.log(`threadId: ${result.threadId} (${result.messages.length} messages)`);
                    for (const [i, msg] of result.messages.entries()) {
                        console.log(`  [${i}] ${msg.role}: ${msg.content}`);
                    }
                    break;
                }

                case 'EXPORT':
                case 'EXPORT-MARKDOWN': {
                    const { agentId, threadId } = session.requireAgentAndThread();
                    const markdown = await api.exportMarkdown(agentId, threadId);
                    console.log(markdown);
                    break;
                }

                case 'SEND':
                case 'MESSAGE': {
                    const { agentId, threadId } = session.requireAgentAndThread();
                    const message = parsed.args[0]?.trim();
                    if (!message) {
                        throw new Error('Usage: SEND <message text>');
                    }
                    const { messages } = await api.getMessages(agentId, threadId);
                    const newMessageIndex = messages.length;
                    console.log(`[*] POST message (newMessageIndex=${newMessageIndex})…`);
                    const reply = await api.postMessage(agentId, threadId, message, newMessageIndex);
                    console.log(`<< ${reply.reply}`);
                    console.log(
                        `    (userMessageIndex=${reply.userMessageIndex}, responseMessageIndex=${reply.responseMessageIndex})`,
                    );
                    break;
                }

                default:
                    throw new Error(`Unknown command "${parsed.verb}". Type HELP.`);
            }
        } catch (err) {
            printError(err);
        }
    }

    rl.close();
    console.log('Bye.');
}
