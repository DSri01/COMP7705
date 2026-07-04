import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { Serialized } from '@langchain/core/load/serializable';
import { BaseMessage } from '@langchain/core/messages';
import { LLMResult } from '@langchain/core/outputs';

/**
 * Compact callback handler for LLM and tool observability in CLI runs.
 */
export class AgentLogger extends BaseCallbackHandler {
    name = 'AgentLogger';

    private llmStartMs = 0;

    override handleChatModelStart(_llm: Serialized, messages: BaseMessage[][]): void {
        this.llmStartMs = Date.now();
        const count = messages.flat().length;
        console.log(`\n  ┌ [LLM] ${count} message(s) in context`);
    }

    override handleLLMEnd(output: LLMResult): void {
        const elapsedSec = ((Date.now() - this.llmStartMs) / 1000).toFixed(1);

        const gen = output.generations?.[0]?.[0];
        const rawText = (gen as { text?: string })?.text ?? '';
        const cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        const preview = cleaned.slice(0, 140).replace(/\n/g, ' ');
        const ellipsis = cleaned.length > 140 ? '…' : '';

        const usage = (
            output.llmOutput as { usage_metadata?: { input_tokens?: number; output_tokens?: number } }
        )?.usage_metadata;

        console.log(`  └ [LLM] ← "${preview}${ellipsis}" (${elapsedSec}s)`);
        if (usage?.input_tokens != null) {
            console.log(`    tokens: ${usage.input_tokens} in / ${usage.output_tokens} out`);
        }
    }

    override handleToolStart(tool: Serialized, input: string): void {
        const name = Array.isArray(tool.id)
            ? (tool.id.at(-1) ?? 'unknown')
            : String(tool.id ?? 'unknown');

        let parsed: unknown;
        try {
            parsed = JSON.parse(input);
        } catch {
            parsed = input;
        }

        console.log(`\n  ┌ [TOOL: ${name}] ← ${JSON.stringify(parsed)}`);
    }

    override handleToolEnd(output: string): void {
        console.log(`  └ [TOOL] → ${output}`);
    }
}

/**
 * Logs a LangGraph node update from streamMode: "updates".
 */
export function logNodeUpdate(event: Record<string, unknown>): void {
    for (const [nodeName, update] of Object.entries(event)) {
        const u = update as Record<string, unknown>;
        const parts: string[] = [];

        if (Array.isArray(u['toolMessages'])) {
            parts.push(`toolMessages[${(u['toolMessages'] as unknown[]).length}]`);
        }
        if (typeof u['finalAnswer'] === 'string') {
            parts.push(`finalAnswer="${u['finalAnswer']}"`);
        }
        if (Array.isArray(u['chatHistory'])) {
            parts.push(`chatHistory[${(u['chatHistory'] as unknown[]).length}]`);
        }

        const summary = parts.length > 0 ? ` → ${parts.join(', ')}` : '';
        console.log(`\n[NODE: ${nodeName}]${summary}`);
    }
}
