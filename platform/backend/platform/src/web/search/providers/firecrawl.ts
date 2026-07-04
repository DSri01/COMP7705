import type { WebSearchHit, WebSearchProvider, WebSearchResult } from '../types.js';

import type { Document, SearchResultWeb } from 'firecrawl';
import { Firecrawl } from 'firecrawl';

function isSearchResultWeb(item: SearchResultWeb | Document): item is SearchResultWeb {
    return 'url' in item && typeof item.url === 'string' && item.url.length > 0;
}
function searchResultWebToHit(item: SearchResultWeb, rank: number): WebSearchHit {
  return {
    url: item.url,
    additionalData: {
      rank,
      ...(item.title !== undefined && { title: item.title }),
      ...(item.description !== undefined && { snippet: item.description }),
      ...(item.category !== undefined && { category: item.category }),
    },
  };
}
function documentToHit(doc: Document, rank: number): WebSearchHit | null {
    const url = doc.metadata?.sourceURL ?? doc.metadata?.ogUrl;
    if (!url) {
        return null;
    }

    const title = doc.metadata?.title ?? doc.metadata?.ogTitle;
    const snippet = doc.summary ?? doc.metadata?.description ?? doc.metadata?.ogDescription;

    return {
        url,
        additionalData: {
            rank,
            ...(title !== undefined && { title }),
            ...(snippet !== undefined && { snippet }),
        },
    };
}
export function mapFirecrawlWebToHits(
  web: Array<SearchResultWeb | Document> | undefined,
): WebSearchHit[] {
  const hits: WebSearchHit[] = [];
  for (const item of web ?? []) {
    const rank = hits.length + 1;
    if (isSearchResultWeb(item)) {
      hits.push(searchResultWebToHit(item, rank));
    } else {
      const hit = documentToHit(item, rank);
      if (hit) hits.push(hit);
    }
  }
  return hits;
}


export class FirecrawlWebSearchProvider implements WebSearchProvider {
    private readonly apiKey: string;
    private readonly client: Firecrawl;
    private readonly maxResults: number;

    constructor(
        apiKey: string,
        maxResults: number = 2,
    ) {
        this.apiKey = apiKey;
        this.client = new Firecrawl({ apiKey: this.apiKey });
        this.maxResults = maxResults;
    }

    search = async (query: string): Promise<WebSearchResult> => {
        const trimmedQuery = query.trim();
        if (trimmedQuery.length === 0) {
            return { ok: false, error: 'Query must not be empty' };
        }

        const searchResult = await this.client.search(trimmedQuery, {
            limit: this.maxResults,
            sources: ['web'],
        });

        const hits = mapFirecrawlWebToHits(searchResult.web);
        if (hits.length === 0) {
            return { ok: false, error: 'No web search results found' };
        }

        return { ok: true, hits };
    };
}