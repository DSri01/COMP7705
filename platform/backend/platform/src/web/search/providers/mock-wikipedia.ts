import type { WebSearchHit, WebSearchProvider, WebSearchResult } from '../types.js';

const WIKIPEDIA_BASE = 'https://en.wikipedia.org/wiki/';

type MockArticle = {
    title: string;
    slug: string;
    snippet: string;
};

/** Stable CVE/security keyword → Wikipedia articles for manual QA. */
const KEYWORD_ARTICLES: Record<string, MockArticle[]> = {
    log4j: [
        {
            title: 'Log4Shell',
            slug: 'Log4Shell',
            snippet: 'Remote code execution vulnerability in Apache Log4j 2 (CVE-2021-44228).',
        },
        {
            title: 'Apache Log4j',
            slug: 'Apache_Log4j',
            snippet: 'Java-based logging utility; source of the Log4Shell vulnerability.',
        },
    ],
    log4shell: [
        {
            title: 'Log4Shell',
            slug: 'Log4Shell',
            snippet: 'Remote code execution vulnerability in Apache Log4j 2 (CVE-2021-44228).',
        },
    ],
    ssrf: [
        {
            title: 'Server-side request forgery',
            slug: 'Server-side_request_forgery',
            snippet: 'Attack forcing server-side requests to unintended destinations.',
        },
    ],
    xss: [
        {
            title: 'Cross-site scripting',
            slug: 'Cross-site_scripting',
            snippet: 'Injection of malicious scripts into trusted web applications.',
        },
    ],
};

function articleToHit(article: MockArticle, rank: number): WebSearchHit {
    return {
        url: `${WIKIPEDIA_BASE}${article.slug}`,
        additionalData: {
            title: article.title,
            snippet: article.snippet,
            rank,
        },
    };
}

function slugFromToken(token: string): string {
    return token
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
}

function fallbackArticles(normalizedQuery: string): MockArticle[] {
    const tokens = normalizedQuery.split(/\s+/).filter((t) => t.length > 2);
    const primary = tokens[0] ?? 'search';
    const slug = slugFromToken(primary) || 'Search';

    return [
        {
            title: primary.charAt(0).toUpperCase() + primary.slice(1),
            slug,
            snippet: `Wikipedia article related to "${normalizedQuery}".`,
        },
        {
            title: `${primary} (computing)`,
            slug: `${slug}_(computing)`,
            snippet: `Computing topic overview for "${normalizedQuery}".`,
        },
        {
            title: 'Computer security',
            slug: 'Computer_security',
            snippet: 'General computer security context for vulnerability research.',
        },
    ];
}

function resolveArticles(normalizedQuery: string): MockArticle[] {
    for (const [keyword, articles] of Object.entries(KEYWORD_ARTICLES)) {
        if (normalizedQuery.includes(keyword)) {
            return articles;
        }
    }
    return fallbackArticles(normalizedQuery);
}

/** Deterministic mock search returning HTTPS Wikipedia URLs. */
export function createMockWikipediaWebSearchProvider(): WebSearchProvider {
    return {
        async search(query: string): Promise<WebSearchResult> {
            const trimmed = query.trim();
            if (trimmed.length === 0) {
                return { ok: false, error: 'Query must not be empty' };
            }

            const normalized = trimmed.toLowerCase();
            const articles = resolveArticles(normalized);
            const hits = articles.map((article, index) => articleToHit(article, index + 1));

            return { ok: true, hits };
        },
    };
}
