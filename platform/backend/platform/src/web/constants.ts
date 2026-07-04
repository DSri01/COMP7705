/** Project page linked from outbound HTTP User-Agent. */
export const WEB_FETCH_PROJECT_URL = 'https://wp2025.cs.hku.hk/msp25025/';

/** Identifies this bot honestly; does not impersonate a browser vendor. */
export const WEB_FETCH_USER_AGENT = `COMP7705-Platform/1.0 (+${WEB_FETCH_PROJECT_URL})`;

/** In-tool timeout for `web_fetch_url_markdown`. */
export const WEB_FETCH_TIMEOUT_MS = 30_000;

/** `cve_research_documents.title` column limit. */
export const AGENT_LOOKUP_TITLE_MAX_LENGTH = 400;

/** Per-segment caps for agent_lookup title composition. */
export const AGENT_LOOKUP_TITLE_PAGE_TITLE_MAX_LENGTH = 100;
export const AGENT_LOOKUP_TITLE_URL_MAX_LENGTH = 200;
export const AGENT_LOOKUP_TITLE_TIMESTAMP_MAX_LENGTH = 80;

/** Suffix template for agent_lookup titles; `{iso}` is replaced with ISO 8601 UTC. */
export const AGENT_LOOKUP_TITLE_FETCHED_AT_SUFFIX = ' — fetched at: ';

/** Separator between title segments (`{pageTitle} — {url} — fetched at: …`). */
export const AGENT_LOOKUP_TITLE_SEGMENT_SEPARATOR = ' — ';
