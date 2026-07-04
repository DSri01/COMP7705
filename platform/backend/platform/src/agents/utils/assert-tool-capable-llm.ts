import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ToolCapableLlm } from '../lib/tool-loop/tool-loop.js';

/**
 * Returns true when the model exposes LangChain {@link BaseChatModel.bindTools}.
 *
 * @param llm Chat model instance from a connector.
 */
export function isToolCapableLlm(llm: BaseChatModel): llm is ToolCapableLlm {
    return typeof llm.bindTools === 'function';
}

/**
 * Ensures the model supports tool binding before running a tool-calling agent.
 *
 * @param llm Chat model instance from a connector.
 * @throws When {@link BaseChatModel.bindTools} is missing.
 */
export function assertToolCapableLlm(llm: BaseChatModel): asserts llm is ToolCapableLlm {
    if (!isToolCapableLlm(llm)) {
        throw new Error(
            'Configured LLM does not support bindTools. ' +
                'Use a tool-capable model (for example an OpenRouter instruct model or Ollama granite4:3b).',
        );
    }
}
