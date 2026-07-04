import type { WebSearchProviderConfigSchema } from '../../configuration/schema.js';
import type { z } from 'zod';

import { FirecrawlWebSearchProvider } from './providers/firecrawl.js';
import { createMockWikipediaWebSearchProvider } from './providers/mock-wikipedia.js';
import type { WebSearchProvider } from './types.js';

/**
 * Creates a {@link WebSearchProvider} from application configuration.
 * Mirrors {@link ../../agents/utils/create-llm.js!createLlmFromConfiguration}.
 */
export function createWebSearchProviderFromConfiguration(
    webSearchConfiguration: z.infer<typeof WebSearchProviderConfigSchema>,
): WebSearchProvider {
    if (webSearchConfiguration.provider === 'mockWikipedia') {
        return createMockWikipediaWebSearchProvider();
    }

    if (webSearchConfiguration.provider === 'firecrawl') {
        return new FirecrawlWebSearchProvider(
            webSearchConfiguration.apiKey,
            webSearchConfiguration.maxResults,
        );
    }

    const _exhaustive: never = webSearchConfiguration;
    throw new Error(`Invalid web search provider: ${String(_exhaustive)}`);
}
