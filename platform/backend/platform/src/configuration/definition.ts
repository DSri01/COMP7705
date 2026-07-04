import { z } from "zod";
import path from "path";
import { checkIfPathExists, checkIfPathIsDirectory } from "../utils/file.js";
import {
    AppConfigurationSchema,
    CustomOllamaModelConfigSchema,
    FilePathSchema,
    FirecrawlWebSearchConfigSchema,
    LLMProviderConfigSchema,
    MockWikipediaWebSearchConfigSchema,
    OpenRouterModelConfigSchema,
    SupportedLLMProviders,
    SupportedWebSearchProviders,
    WebSearchProviderConfigSchema,
    WorkerStateSchema,
} from "./schema.js";

function ensureEnvironmentVariableIsSet(name: string): string {
    const value = process.env[name];
    if (value === undefined) {
        throw new Error(`Environment variable ${name} is not set`);
    }
    return value;
}

function loadNonEmptyOptionalEnvironmentVariable(name: string): string | null {
    const value = process.env[name];
    if (value === undefined || value.length === 0) {
        return null;
    }
    return value;
}

/**
 * 
 * Tests exist in the following file:
 * `__tests__/configuration/definition.test.ts`
 * 
 * @returns 
 */
export function loadConfiguration(): z.infer<typeof AppConfigurationSchema> {

    const llmProviderName = SupportedLLMProviders.parse(ensureEnvironmentVariableIsSet("AGENTS_LLM_PROVIDER"));

    let llmProvider: z.infer<typeof LLMProviderConfigSchema> | null = null;
    
    if (llmProviderName === 'ollama') {
        llmProvider = CustomOllamaModelConfigSchema.parse({
            provider: 'ollama',
            model: ensureEnvironmentVariableIsSet("AGENTS_OLLAMA_LLM_MODEL"),
            baseUrl: ensureEnvironmentVariableIsSet("AGENTS_OLLAMA_LLM_BASE_URL"),
            apiKey: ensureEnvironmentVariableIsSet("AGENTS_OLLAMA_LLM_API_KEY"),
        })
    }
    else if (llmProviderName === 'openRouter') {
        llmProvider = OpenRouterModelConfigSchema.parse({
            provider: 'openRouter',
            model: ensureEnvironmentVariableIsSet("AGENTS_OPENROUTER_LLM_MODEL"),
            apiKey: ensureEnvironmentVariableIsSet("AGENTS_OPENROUTER_LLM_API_KEY"),
        })
    }
    else {
        throw new Error(`Invalid LLM provider: ${llmProviderName}`);
    }

    const webSearchProviderName = SupportedWebSearchProviders.parse(
        ensureEnvironmentVariableIsSet("AGENTS_WEB_SEARCH_PROVIDER"),
    );

    let webSearchProvider: z.infer<typeof WebSearchProviderConfigSchema> | null = null;

    if (webSearchProviderName === 'mockWikipedia') {
        webSearchProvider = MockWikipediaWebSearchConfigSchema.parse({
            provider: 'mockWikipedia',
        });
    }
    else if (webSearchProviderName === 'firecrawl') {
        webSearchProvider = FirecrawlWebSearchConfigSchema.parse({
            provider: 'firecrawl',
            apiKey: ensureEnvironmentVariableIsSet("AGENTS_FIRECRAWL_WEB_SEARCH_API_KEY"),
            maxResults: parseInt(ensureEnvironmentVariableIsSet("AGENTS_FIRECRAWL_WEB_SEARCH_MAX_RESULTS")),
        });
    }
    else {
        throw new Error(`Invalid web search provider: ${webSearchProviderName}`);
    }

    const configuration: z.infer<typeof AppConfigurationSchema> = {
        db: {
            host: ensureEnvironmentVariableIsSet("DB_HOST"),
            port: parseInt(ensureEnvironmentVariableIsSet("DB_PORT")),
            username: ensureEnvironmentVariableIsSet("DB_USERNAME"),
            password: ensureEnvironmentVariableIsSet("DB_PASSWORD"),
            database: ensureEnvironmentVariableIsSet("DB_DATABASE"),
        },
        fs: {
            path: path.join(...(FilePathSchema.parse(JSON.parse(ensureEnvironmentVariableIsSet("FILE_STORAGE_PATH"))))),
        },
        server: {
            port: parseInt(ensureEnvironmentVariableIsSet("SERVER_PORT")),
        },
        workers: {
            storedFileUploadTimeout: {
                state: WorkerStateSchema.parse(ensureEnvironmentVariableIsSet("WORKERS__STORED_FILE_UPLOAD_TIMEOUT__STATE")),
            },
            cisaKevFetch: {
                state: WorkerStateSchema.parse(ensureEnvironmentVariableIsSet("WORKERS__CISA_KEV_FETCH__STATE")),
            },
            cveIntelRefresh: {
                state: WorkerStateSchema.parse(ensureEnvironmentVariableIsSet("WORKERS__CVE_INTEL_REFRESH__STATE")),
            },
            imageCveDecisionExpiryRefresh: {
                state: WorkerStateSchema.parse(ensureEnvironmentVariableIsSet("WORKERS__IMAGE_CVE_DECISION_EXPIRY_REFRESH__STATE")),
            },
            containerRescan: {
                state: WorkerStateSchema.parse(ensureEnvironmentVariableIsSet("WORKERS__CONTAINER_RESCAN__STATE")),
            },
        },
        secrets: {
            nvdApiKey: loadNonEmptyOptionalEnvironmentVariable("NVD_API_KEY"),
        },
        containerScanner: {
            url: ensureEnvironmentVariableIsSet("CONTAINER_SCANNER_URL"),
        },
        agents: {
            llmProvider: llmProvider,
            webSearchProvider: webSearchProvider,
        },
    }

    // checking if the file path exists and is a directory
    if (!checkIfPathExists(configuration.fs.path)) {
        throw new Error(`File storage path does not exist: ${configuration.fs.path}`);
    }
    if (!checkIfPathIsDirectory(configuration.fs.path)) {
        throw new Error(`File storage path is not a directory: ${configuration.fs.path}`);
    }

    return AppConfigurationSchema.parse(configuration);
}