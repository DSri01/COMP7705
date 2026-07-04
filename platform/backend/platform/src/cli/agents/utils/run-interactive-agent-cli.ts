import readline from 'node:readline/promises';

import { streamAgentTurn, type StreamableAgent } from './stream-agent-turn.js';

export interface RunInteractiveAgentCliOptions {
    agent: StreamableAgent;
    threadId: string;
    introLines: string[];
    toInput: (line: string) => Record<string, unknown>;
    /** Called before each user message (e.g. context manager beginTurn). */
    beforeTurn?: (threadId: string) => void;
    argvSeed?: string;
    recursionLimit?: number;
}

/**
 * Readline loop: prompts until \\exit, streaming each turn with observability.
 */
export async function runInteractiveAgentCli(options: RunInteractiveAgentCliOptions): Promise<void> {
    for (const line of options.introLines) {
        console.log(line);
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    let exit = false;
    let first = true;

    while (!exit) {
        const prompt = first && options.argvSeed ? options.argvSeed : await rl.question('>> ');
        first = false;

        const line = prompt.trim();
        if (line === '\\exit') {
            exit = true;
            break;
        }
        if (!line) {
            continue;
        }

        options.beforeTurn?.(options.threadId);

        const finalAnswer = await streamAgentTurn(options.agent, options.toInput(line), {
            threadId: options.threadId,
            recursionLimit: options.recursionLimit ?? 50,
        });

        console.log(`\n<< ${finalAnswer ?? 'No answer produced'}`);
    }

    rl.close();
}
