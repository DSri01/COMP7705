import { z } from "zod";
import { SupportedModels as CustomOllamaSupportedModels } from "../agents/llm-connectors/custom-ollama.js";
import { SupportedModels as OpenRouterSupportedModels } from "../agents/llm-connectors/open-router.js";


export const FilePathSchema = z.string().min(1).array().min(1);

export const WorkerStateSchema = z.enum(["enabled", "disabled"]);

//--------------------------------------------------
// LLM Providers

export const SupportedLLMProviders = z.enum(['ollama', 'openRouter']);

export const CustomOllamaModelConfigSchema = z.object({
    provider: z.literal('ollama'),
    model: CustomOllamaSupportedModels,
    baseUrl: z.string().min(1),
    apiKey: z.string().min(1),
});


export const OpenRouterModelConfigSchema = z.object({
    provider: z.literal('openRouter'),
    model: OpenRouterSupportedModels,
    apiKey: z.string().min(1),
});

export const LLMProviderConfigSchema = z.discriminatedUnion('provider', [
    CustomOllamaModelConfigSchema,
    OpenRouterModelConfigSchema,
]);
//--------------------------------------------------

//--------------------------------------------------
// Web search providers (platform-assistant only)

export const SupportedWebSearchProviders = z.enum(['mockWikipedia', 'firecrawl']);

export const MockWikipediaWebSearchConfigSchema = z.object({
    provider: z.literal('mockWikipedia'),
});

export const FirecrawlWebSearchConfigSchema = z.object({
    provider: z.literal('firecrawl'),
    apiKey: z.string().min(1),
    maxResults: z.coerce.number().int().min(1).max(10),
});

export const WebSearchProviderConfigSchema = z.discriminatedUnion('provider', [
    MockWikipediaWebSearchConfigSchema,
    FirecrawlWebSearchConfigSchema
]);
//--------------------------------------------------


export const AppConfigurationSchema = z.object({
    db : z.object({
        host: z.string(),
        port: z.coerce.number().int().min(1).max(65535),
        username: z.string(),
        password: z.string(),
        database: z.string(),
    }),
    fs: z.object({
        path: z.string().min(1),
    }),
    server: z.object({
        port: z.coerce.number().int().min(1).max(65535),
    }),
    workers: z.object({
        storedFileUploadTimeout: z.object({
            state: WorkerStateSchema
        }),
        cisaKevFetch: z.object({
            state: WorkerStateSchema
        }),
        cveIntelRefresh: z.object({
            state: WorkerStateSchema
        }),
        imageCveDecisionExpiryRefresh: z.object({
            state: WorkerStateSchema
        }),
        containerRescan: z.object({
            state: WorkerStateSchema
        }),
    }),
    secrets: z.object({
        nvdApiKey: z.string().min(1).nullable(),
    }),
    containerScanner: z.object({
        url: z.string().min(1),
    }),
    agents: z.object({
        llmProvider: LLMProviderConfigSchema,
        webSearchProvider: WebSearchProviderConfigSchema,
    }),
});