/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CveResearchDocumentResponseDto = {
    id: string;
    cveId: string;
    source: 'agent_lookup' | 'user_upload' | 'chat_summary' | 'nvd_api_fetch' | 'epss_api_fetch';
    title: string;
    content: string;
    createdAtUnixSeconds: string;
};

