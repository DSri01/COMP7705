/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateCveDto } from '../models/CreateCveDto';
import type { CveResponseDto } from '../models/CveResponseDto';
import type { UpdateCveResearchSummaryDto } from '../models/UpdateCveResearchSummaryDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CvesService {
    /**
     * List CVEs (includes severity)
     * @param offset Number of rows to skip
     * @param limit Max rows to return (capped at 200)
     * @returns CveResponseDto Paged list of CVEs
     * @throws ApiError
     */
    public static cvesControllerList(
        offset?: number,
        limit?: number,
    ): CancelablePromise<Array<CveResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/cves',
            query: {
                'offset': offset,
                'limit': limit,
            },
        });
    }
    /**
     * Register a CVE by id only
     * @param requestBody
     * @returns CveResponseDto CVE created
     * @throws ApiError
     */
    public static cvesControllerCreate(
        requestBody: CreateCveDto,
    ): CancelablePromise<CveResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/cves',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid CVE id format`,
                409: `CVE already exists`,
            },
        });
    }
    /**
     * Refresh NVD/EPSS intel and merge KEV from the database
     * @param cveId
     * @returns CveResponseDto CVE after intel refresh
     * @throws ApiError
     */
    public static cvesControllerRefreshIntel(
        cveId: string,
    ): CancelablePromise<CveResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/cves/{cveId}/intel/refresh',
            path: {
                'cveId': cveId,
            },
            errors: {
                400: `Invalid CVE id format`,
                404: `CVE not found`,
            },
        });
    }
    /**
     * Save manual research summary (full overwrite)
     * @param cveId
     * @param requestBody
     * @returns CveResponseDto CVE after research summary update
     * @throws ApiError
     */
    public static cvesControllerUpdateResearchSummary(
        cveId: string,
        requestBody: UpdateCveResearchSummaryDto,
    ): CancelablePromise<CveResponseDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/cves/{cveId}/research-summary',
            path: {
                'cveId': cveId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid CVE id format or invalid body`,
                404: `CVE not found`,
            },
        });
    }
    /**
     * Get a CVE by id
     * @param cveId
     * @returns CveResponseDto CVE details
     * @throws ApiError
     */
    public static cvesControllerGetById(
        cveId: string,
    ): CancelablePromise<CveResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/cves/{cveId}',
            path: {
                'cveId': cveId,
            },
            errors: {
                400: `Invalid CVE id format`,
                404: `CVE not found`,
            },
        });
    }
}
