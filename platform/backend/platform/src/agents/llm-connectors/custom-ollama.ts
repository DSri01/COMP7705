import { ChatOllama } from "@langchain/ollama";
import z from "zod";

export const SupportedModels = z.enum([
    'granite4:3b',
]);

/**
 * Creates a custom Ollama connector for self-hosted Ollama instances.
 * 
 * @param model 
 * @param baseUrl 
 * @param apiKey 
 * @returns 
 */
export function createChatOllamaConnector(
    model: z.infer<typeof SupportedModels>,
    baseUrl: string,
    apiKey: string,
    format?: 'json',
): ChatOllama {
    return new ChatOllama({
        model: model,
        baseUrl: baseUrl,
        format: format,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
    });
}