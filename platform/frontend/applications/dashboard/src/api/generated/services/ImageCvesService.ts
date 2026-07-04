/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DisableImageCveDto } from '../models/DisableImageCveDto';
import type { LinkImageCvesDto } from '../models/LinkImageCvesDto';
import type { LinkImageCvesResponseDto } from '../models/LinkImageCvesResponseDto';
import type { ReuseImageCveDecisionDto } from '../models/ReuseImageCveDecisionDto';
import type { UpdateImageCveAdviceDto } from '../models/UpdateImageCveAdviceDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ImageCvesService {
    /**
     * List CVE associations for the component current image
     * Returns all image-CVE rows for the latest chain index. Empty when none linked.
     * @param projectId
     * @param componentId
     * @returns any List of image CVE rows
     * @throws ApiError
     */
    public static imageCvesControllerList(
        projectId: string,
        componentId: string,
    ): CancelablePromise<{
        imageCves: Array<{
            imageCveId: string;
            cveId: string;
            source: 'fromScan' | 'manual' | 'fromChain';
            severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
            intelHighlights: Record<string, any> | null;
            vexStatus: 'not_affected' | 'affected' | 'under_investigation';
            vexStateKind: 'not_affected' | 'affected' | 'under_investigation_fresh' | 'under_investigation_expired' | 'under_investigation_carry_forward';
            expiryTimeUnixSeconds: string | null;
            disableState: ({
                state: 'enabled';
            } | {
                state: 'disabled';
                reason: string;
            });
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectId}/components/{componentId}/image-cves',
            path: {
                'projectId': projectId,
                'componentId': componentId,
            },
            errors: {
                404: `Project, component, or no container image`,
            },
        });
    }
    /**
     * Link existing CVEs to the current image
     * Each CVE id must already exist in the global `cves` table. Existing associations only update `source` to manual.
     * @param projectId
     * @param componentId
     * @param requestBody
     * @returns LinkImageCvesResponseDto Link completed
     * @throws ApiError
     */
    public static imageCvesControllerLink(
        projectId: string,
        componentId: string,
        requestBody: LinkImageCvesDto,
    ): CancelablePromise<LinkImageCvesResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectId}/components/{componentId}/image-cves',
            path: {
                'projectId': projectId,
                'componentId': componentId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid CVE id format`,
                404: `Component, image, or CVE not found`,
            },
        });
    }
    /**
     * List disabled CVE associations for the current image
     * @param projectId
     * @param componentId
     * @returns any List of currently disabled image CVE rows
     * @throws ApiError
     */
    public static imageCvesControllerListDisabled(
        projectId: string,
        componentId: string,
    ): CancelablePromise<{
        imageCves: Array<{
            imageCveId: string;
            cveId: string;
            source: 'fromScan' | 'manual' | 'fromChain';
            severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
            intelHighlights: Record<string, any> | null;
            vexStatus: 'not_affected' | 'affected' | 'under_investigation';
            vexStateKind: 'not_affected' | 'affected' | 'under_investigation_fresh' | 'under_investigation_expired' | 'under_investigation_carry_forward';
            expiryTimeUnixSeconds: string | null;
            disableState: ({
                state: 'enabled';
            } | {
                state: 'disabled';
                reason: string;
            });
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectId}/components/{componentId}/image-cves/disabled',
            path: {
                'projectId': projectId,
                'componentId': componentId,
            },
            errors: {
                404: `Project, component, or no container image`,
            },
        });
    }
    /**
     * Get one image-CVE association (detail)
     * @param projectId
     * @param componentId
     * @param imageCveId
     * @returns any Image CVE detail
     * @throws ApiError
     */
    public static imageCvesControllerGetById(
        projectId: string,
        componentId: string,
        imageCveId: string,
    ): CancelablePromise<{
        imageCveId: string;
        cveId: string;
        source: 'fromScan' | 'manual' | 'fromChain';
        severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
        intelHighlights: Record<string, any> | null;
        disableState: ({
            state: 'enabled';
        } | {
            state: 'disabled';
            reason: string;
        });
        decision: ({
            status: 'not_affected';
            justification: 'component_not_present' | 'vulnerable_code_not_present' | 'vulnerable_code_not_in_execute_path' | 'vulnerable_code_cannot_be_controlled_by_adversary' | 'inline_mitigations_already_exist';
            impact_statement: string;
            status_notes: string;
            expiryTimeUnixSeconds: string;
            createdAtUnixSeconds: string;
        } | {
            status: 'affected';
            action_statement: string;
            status_notes: string;
            expiryTimeUnixSeconds: string;
            createdAtUnixSeconds: string;
        } | {
            status: 'under_investigation';
            additionalData: ({
                type: 'fresh';
            } | {
                type: 'carry_forward';
                priorDecision: ({
                    status: 'not_affected';
                    justification: 'component_not_present' | 'vulnerable_code_not_present' | 'vulnerable_code_not_in_execute_path' | 'vulnerable_code_cannot_be_controlled_by_adversary' | 'inline_mitigations_already_exist';
                    impact_statement: string;
                    status_notes: string;
                    expiryTimeUnixSeconds: string;
                } | {
                    status: 'affected';
                    action_statement: string;
                    status_notes: string;
                    expiryTimeUnixSeconds: string;
                });
            } | {
                type: 'expired';
                expiredDecision: ({
                    status: 'not_affected';
                    justification: 'component_not_present' | 'vulnerable_code_not_present' | 'vulnerable_code_not_in_execute_path' | 'vulnerable_code_cannot_be_controlled_by_adversary' | 'inline_mitigations_already_exist';
                    impact_statement: string;
                    status_notes: string;
                    expiryTimeUnixSeconds: string;
                } | {
                    status: 'affected';
                    action_statement: string;
                    status_notes: string;
                    expiryTimeUnixSeconds: string;
                });
            });
            createdAtUnixSeconds: string;
        });
        advice: ({
            state: 'unset';
        } | {
            state: 'set';
            content: string;
            adviceGeneratedAtUnixSeconds: string;
        });
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectId}/components/{componentId}/image-cves/{imageCveId}',
            path: {
                'projectId': projectId,
                'componentId': componentId,
                'imageCveId': imageCveId,
            },
            errors: {
                404: `Project, component, image, or image CVE not found`,
            },
        });
    }
    /**
     * Disable an image CVE
     * Disables regardless of source. Decision expiry is not modified by disable/enable.
     * @param projectId
     * @param componentId
     * @param imageCveId
     * @param requestBody
     * @returns any Image CVE detail after disable
     * @throws ApiError
     */
    public static imageCvesControllerDisable(
        projectId: string,
        componentId: string,
        imageCveId: string,
        requestBody: DisableImageCveDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectId}/components/{componentId}/image-cves/{imageCveId}/disable',
            path: {
                'projectId': projectId,
                'componentId': componentId,
                'imageCveId': imageCveId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Project, component, image, or image CVE not found`,
            },
        });
    }
    /**
     * Enable a previously disabled image CVE
     * @param projectId
     * @param componentId
     * @param imageCveId
     * @returns any Image CVE detail after enable
     * @throws ApiError
     */
    public static imageCvesControllerEnable(
        projectId: string,
        componentId: string,
        imageCveId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectId}/components/{componentId}/image-cves/{imageCveId}/enable',
            path: {
                'projectId': projectId,
                'componentId': componentId,
                'imageCveId': imageCveId,
            },
            errors: {
                404: `Project, component, image, or image CVE not found`,
            },
        });
    }
    /**
     * Reuse prior decision snapshot with a new expiry
     * Allowed only when current decision is under_investigation due to expired or carry_forward context.
     * @param projectId
     * @param componentId
     * @param imageCveId
     * @param requestBody
     * @returns any Image CVE detail after reuse
     * @throws ApiError
     */
    public static imageCvesControllerReuseDecision(
        projectId: string,
        componentId: string,
        imageCveId: string,
        requestBody: ReuseImageCveDecisionDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectId}/components/{componentId}/image-cves/{imageCveId}/decision/reuse',
            path: {
                'projectId': projectId,
                'componentId': componentId,
                'imageCveId': imageCveId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid expiresAtUnixSeconds or expiresAtUnixSeconds not in the future`,
                404: `Project, component, image, or image CVE not found`,
                409: `Decision is not in reusable state (must be expired or carry_forward under_investigation)`,
            },
        });
    }
    /**
     * Reject decision reuse and reset to default under_investigation
     * Allowed only when current decision is under_investigation due to expired or carry_forward context.
     * @param projectId
     * @param componentId
     * @param imageCveId
     * @returns any Image CVE detail after reject
     * @throws ApiError
     */
    public static imageCvesControllerRejectDecisionReuse(
        projectId: string,
        componentId: string,
        imageCveId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectId}/components/{componentId}/image-cves/{imageCveId}/decision/reject',
            path: {
                'projectId': projectId,
                'componentId': componentId,
                'imageCveId': imageCveId,
            },
            errors: {
                404: `Project, component, image, or image CVE not found`,
                409: `Decision is not in rejectable state (must be expired or carry_forward under_investigation)`,
            },
        });
    }
    /**
     * Materialize expired resolved decision into under_investigation context
     * Transactional and idempotent. If expired, converts to under_investigation with expired context and clears expiry.
     * @param projectId
     * @param componentId
     * @param imageCveId
     * @returns any Image CVE detail after refresh (changed or unchanged)
     * @throws ApiError
     */
    public static imageCvesControllerRefreshDecisionExpiry(
        projectId: string,
        componentId: string,
        imageCveId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectId}/components/{componentId}/image-cves/{imageCveId}/decision/refresh-expiry',
            path: {
                'projectId': projectId,
                'componentId': componentId,
                'imageCveId': imageCveId,
            },
            errors: {
                404: `Project, component, image, or image CVE not found`,
            },
        });
    }
    /**
     * Save or overwrite the decision payload
     * Uses internal-style decision payload. under_investigation resets to fresh and clears expiry.
     * @param projectId
     * @param componentId
     * @param imageCveId
     * @param requestBody Discriminated by `status`; resolved statuses require a future int64 `expiryTimeUnixSeconds`.
     * @returns any Image CVE detail after decision update
     * @throws ApiError
     */
    public static imageCvesControllerUpdateDecision(
        projectId: string,
        componentId: string,
        imageCveId: string,
        requestBody: ({
            status: 'not_affected';
            justification: 'component_not_present' | 'vulnerable_code_not_present' | 'vulnerable_code_not_in_execute_path' | 'vulnerable_code_cannot_be_controlled_by_adversary' | 'inline_mitigations_already_exist';
            impact_statement: string;
            status_notes: string;
            expiryTimeUnixSeconds: string;
        } | {
            status: 'affected';
            action_statement: string;
            status_notes: string;
            expiryTimeUnixSeconds: string;
        } | {
            status: 'under_investigation';
        }),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/projects/{projectId}/components/{componentId}/image-cves/{imageCveId}/decision',
            path: {
                'projectId': projectId,
                'componentId': componentId,
                'imageCveId': imageCveId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid decision payload or expiryTimeUnixSeconds not in int64/future format for resolved statuses`,
                404: `Project, component, image, or image CVE not found`,
            },
        });
    }
    /**
     * Save manual advice (full overwrite)
     * @param projectId
     * @param componentId
     * @param imageCveId
     * @param requestBody
     * @returns any Image CVE detail after advice update
     * @throws ApiError
     */
    public static imageCvesControllerUpdateAdvice(
        projectId: string,
        componentId: string,
        imageCveId: string,
        requestBody: UpdateImageCveAdviceDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/projects/{projectId}/components/{componentId}/image-cves/{imageCveId}/advice',
            path: {
                'projectId': projectId,
                'componentId': componentId,
                'imageCveId': imageCveId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Project, component, image, or image CVE not found`,
            },
        });
    }
}
