import type { LLMProviderConfigSchema } from '../../configuration/schema.js';
import { assertToolCapableLlm } from './assert-tool-capable-llm.js';
import type { ToolCapableLlm } from '../lib/tool-loop/tool-loop.js';
import { createChatOllamaConnector } from '../llm-connectors/custom-ollama.js';
import { createOpenRouterConnector } from '../llm-connectors/open-router.js';
import { z } from 'zod';

/**
 * Creates a tool-capable chat model from application configuration.
 *
 * @param llmConfiguration Provider-specific model settings from the environment.
 * @returns LLM validated to support {@link ToolCapableLlm.bindTools}.
 * @throws When the constructed model does not expose bindTools.
 */
export function createLlmFromConfiguration(llmConfiguration: z.infer<typeof LLMProviderConfigSchema>): ToolCapableLlm {
    const llm =
        llmConfiguration.provider === 'openRouter'
            ? createOpenRouterConnector(
                  llmConfiguration.model,
                  llmConfiguration.apiKey,
              )
            : createChatOllamaConnector(
                  llmConfiguration.model,
                  llmConfiguration.baseUrl,
                  llmConfiguration.apiKey,
              );

    assertToolCapableLlm(llm);
    return llm;
}
