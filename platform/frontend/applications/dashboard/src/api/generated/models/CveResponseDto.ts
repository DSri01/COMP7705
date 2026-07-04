/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CveResponseDto = {
    cveId: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
    /**
     * Curated nvd / epss / kev projection; null until populated.
     */
    intelHighlights?: Record<string, any> | null;
    intelLastAttemptAtUnixSeconds: string;
    intelUpdatedAtUnixSeconds: string;
    researchSummary: string;
};

