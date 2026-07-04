/** One web search hit. */
export type WebSearchHit = {
    url: string;
    additionalData: Record<string, unknown>;
};

/** Provider outcome — never throws; tool layer maps `ok: false` to `ERROR: …`. */
export type WebSearchResult =
    | { ok: true; hits: WebSearchHit[] }
    | { ok: false; error: string };

/** Pluggable web search backend for `web_search` (platform-assistant only). */
export interface WebSearchProvider {
    search(query: string): Promise<WebSearchResult>;
}
