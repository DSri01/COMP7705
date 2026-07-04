/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateCveResearchDocumentDto } from '../models/CreateCveResearchDocumentDto';
import type { CveResearchDocumentResponseDto } from '../models/CveResearchDocumentResponseDto';
import type { UpdateCveResearchDocumentDto } from '../models/UpdateCveResearchDocumentDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CveResearchDocumentsService {
    /**
     * List research documents for a CVE
     * @param cveId
     * @returns CveResearchDocumentResponseDto Research documents
     * @throws ApiError
     */
    public static cveResearchDocumentsControllerList(
        cveId: string,
    ): CancelablePromise<Array<CveResearchDocumentResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/cves/{cveId}/research-documents',
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
     * Create a user-upload research document for a CVE
     * Body is title + content only; `source` is always stored as `user_upload`.
     * @param cveId
     * @param requestBody
     * @returns CveResearchDocumentResponseDto Document created
     * @throws ApiError
     */
    public static cveResearchDocumentsControllerCreate(
        cveId: string,
        requestBody: CreateCveResearchDocumentDto,
    ): CancelablePromise<CveResearchDocumentResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/cves/{cveId}/research-documents',
            path: {
                'cveId': cveId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid body or CVE id format`,
                404: `CVE not found`,
            },
        });
    }
    /**
     * Get a research document by id (scoped to CVE)
     * @param cveId
     * @param documentId
     * @returns CveResearchDocumentResponseDto Research document
     * @throws ApiError
     */
    public static cveResearchDocumentsControllerGetById(
        cveId: string,
        documentId: string,
    ): CancelablePromise<CveResearchDocumentResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/cves/{cveId}/research-documents/{documentId}',
            path: {
                'cveId': cveId,
                'documentId': documentId,
            },
            errors: {
                400: `Invalid CVE id format`,
                404: `CVE or document not found`,
            },
        });
    }
    /**
     * Update title/content of a research document
     * @param cveId
     * @param documentId
     * @param requestBody
     * @returns CveResearchDocumentResponseDto Document updated
     * @throws ApiError
     */
    public static cveResearchDocumentsControllerUpdate(
        cveId: string,
        documentId: string,
        requestBody: UpdateCveResearchDocumentDto,
    ): CancelablePromise<CveResearchDocumentResponseDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/cves/{cveId}/research-documents/{documentId}',
            path: {
                'cveId': cveId,
                'documentId': documentId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid CVE id or empty patch body`,
                404: `CVE or document not found`,
            },
        });
    }
    /**
     * Delete a research document
     * @param cveId
     * @param documentId
     * @returns void
     * @throws ApiError
     */
    public static cveResearchDocumentsControllerDelete(
        cveId: string,
        documentId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/cves/{cveId}/research-documents/{documentId}',
            path: {
                'cveId': cveId,
                'documentId': documentId,
            },
            errors: {
                400: `Invalid CVE id format`,
                404: `CVE or document not found`,
            },
        });
    }
}
