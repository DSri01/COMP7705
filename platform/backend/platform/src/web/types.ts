export type FetchUrlSuccess = {
    ok: true;
    url: string;
    html: string;
};

export type FetchUrlFailure = {
    ok: false;
    error: string;
};

export type FetchUrlResult = FetchUrlSuccess | FetchUrlFailure;

export type ParsedWebPage = {
    url: string;
    title: string;
    content: string;
    fetchedAtUnixSeconds: bigint;
};

export type FetchAndParseSuccess = {
    ok: true;
    url: string;
    title: string;
    content: string;
    fetchedAtUnixSeconds: bigint;
};

export type FetchAndParseFailure = {
    ok: false;
    error: string;
};

export type FetchAndParseResult = FetchAndParseSuccess | FetchAndParseFailure;

/** JSON-safe CLI / tool payload (bigint as decimal string). */
export type FetchAndParseJsonPayload = {
    ok: true;
    url: string;
    title: string;
    content: string;
    fetchedAtUnixSeconds: string;
};
