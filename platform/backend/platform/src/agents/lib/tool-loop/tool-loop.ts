import { AIMessage, BaseMessage, BaseMessageLike, ToolMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

/** Minimal LangGraph state for a tool_actor loop. */
export type ToolLoopState = { toolMessages: BaseMessage[] };

export type ToolActorPromptBuilder<TState extends ToolLoopState> = (
    state: TState,
    tools: StructuredTool[],
) => string;

export type ToolCapableLlm = BaseChatModel & {
    bindTools: NonNullable<BaseChatModel['bindTools']>;
};

/** Runs LLM tool calls; errors become ToolMessages instead of throwing. */
export async function executeToolCalls(
    toolCalls: NonNullable<AIMessage['tool_calls']>,
    toolMap: Map<string, StructuredTool<z.ZodObject<z.ZodRawShape>>>,
): Promise<ToolMessage[]> {
    return Promise.all(
        toolCalls.map(async (tc) => {
            const toolCallId = tc.id ?? '';
            const tool = toolMap.get(tc.name);
            if (!tool) {
                return new ToolMessage({
                    content: `Error: unknown tool "${tc.name}". Available: [${[...toolMap.keys()].join(', ')}]`,
                    tool_call_id: toolCallId,
                    name: tc.name,
                });
            }
            const parsed = tool.schema.safeParse(tc.args);
            if (!parsed.success) {
                return new ToolMessage({
                    content: `Error: invalid arguments for tool "${tc.name}". ${parsed.error.message}`,
                    tool_call_id: toolCallId,
                    name: tc.name,
                });
            }
            try {
                const result = await tool.invoke(parsed.data);
                return new ToolMessage({
                    content: String(result),
                    tool_call_id: toolCallId,
                    name: tc.name,
                });
            } catch (err) {
                return new ToolMessage({
                    content: `Error: ${(err as Error).message}`,
                    tool_call_id: toolCallId,
                    name: tc.name,
                });
            }
        }),
    );
}

/** One LLM + tool execution step; appends to `state.toolMessages`. */
export function createToolActorNode<TState extends ToolLoopState>(
    llm: ToolCapableLlm,
    tools: StructuredTool<z.ZodObject<z.ZodRawShape>>[],
    buildPrompt: ToolActorPromptBuilder<TState>,
) {
    const boundLlm = llm.bindTools(tools);
    const toolMap = new Map(tools.map((t) => [t.name, t]));

    return async (state: TState): Promise<{ toolMessages: TState['toolMessages'] }> => {
        const system = buildPrompt(state, tools);
        const messages: BaseMessageLike[] = [{ role: 'system', content: system }, ...state.toolMessages];
        const aiMessage = (await boundLlm.invoke(messages)) as AIMessage;
        if (!aiMessage.tool_calls?.length) {
            return { toolMessages: [...state.toolMessages, aiMessage] };
        }
        const toolMessages = await executeToolCalls(aiMessage.tool_calls, toolMap);
        return { toolMessages: [...state.toolMessages, aiMessage, ...toolMessages] };
    };
}
