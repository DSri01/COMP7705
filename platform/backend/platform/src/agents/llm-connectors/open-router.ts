import { ChatOpenAI } from "@langchain/openai";
import z from "zod";
export const SupportedModels = z.enum([
    // suitable models (updated on: 20260530)
    // 'deepseek/deepseek-v3.2',
    // 'z-ai/glm-4.7-flash',
    // 'deepseek/deepseek-v4-flash',
    'deepseek/deepseek-v4-pro',
    'tencent/hy3-preview',
    'openrouter/owl-alpha',
    'xiaomi/mimo-v2.5',

    // may perform poorly (updated on: 20260530)
    'qwen/qwen3.6-flash',

    // free but rate limited (updated on: 20260530)
    'deepseek/deepseek-v4-flash:free',
    'moonshotai/kimi-k2.6:free',
    'meta-llama/llama-3.3-70b-instruct:free'

]);

/**
 * Creates an OpenRouter connector using the OpenAI-compatible API.
 */
export function createOpenRouterConnector(
    model: z.infer<typeof SupportedModels>,
    apiKey: string,
): ChatOpenAI {
    return new ChatOpenAI({
        model: model,
        apiKey: apiKey,
        configuration: {
            baseURL: 'https://openrouter.ai/api/v1',
        },
    });
}