/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ComponentResponseDto } from '../models/ComponentResponseDto';
import type { CreateComponentDto } from '../models/CreateComponentDto';
import type { ImageCveStatsResponseDto } from '../models/ImageCveStatsResponseDto';
import type { UpdateComponentDto } from '../models/UpdateComponentDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ComponentsService {
    /**
     * List components in a project
     * @param projectId
     * @returns ComponentResponseDto List of components
     * @throws ApiError
     */
    public static componentsControllerList(
        projectId: string,
    ): CancelablePromise<Array<ComponentResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectId}/components',
            path: {
                'projectId': projectId,
            },
        });
    }
    /**
     * Create a component in a project
     * @param projectId
     * @param requestBody
     * @returns ComponentResponseDto Component created
     * @throws ApiError
     */
    public static componentsControllerCreate(
        projectId: string,
        requestBody: CreateComponentDto,
    ): CancelablePromise<ComponentResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectId}/components',
            path: {
                'projectId': projectId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get a component by ID within a project
     * @param projectId
     * @param componentId
     * @returns ComponentResponseDto Component details
     * @throws ApiError
     */
    public static componentsControllerGetById(
        projectId: string,
        componentId: string,
    ): CancelablePromise<ComponentResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectId}/components/{componentId}',
            path: {
                'projectId': projectId,
                'componentId': componentId,
            },
        });
    }
    /**
     * Update a component by ID within a project
     * @param projectId
     * @param componentId
     * @param requestBody
     * @returns ComponentResponseDto Component updated
     * @throws ApiError
     */
    public static componentsControllerUpdate(
        projectId: string,
        componentId: string,
        requestBody: UpdateComponentDto,
    ): CancelablePromise<ComponentResponseDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/projects/{projectId}/components/{componentId}',
            path: {
                'projectId': projectId,
                'componentId': componentId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Generate OpenVEX document for the latest image in component chain
     * @param projectId
     * @param componentId
     * @returns any OpenVEX v0.2.0 document for latest image
     * @throws ApiError
     */
    public static componentsControllerExportVex(
        projectId: string,
        componentId: string,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectId}/components/{componentId}/vex',
            path: {
                'projectId': projectId,
                'componentId': componentId,
            },
        });
    }
    /**
     * Trigger asynchronous scan for the current component image
     * @param projectId
     * @param componentId
     * @returns any Scan trigger feedback
     * @throws ApiError
     */
    public static componentsControllerTriggerScan(
        projectId: string,
        componentId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectId}/components/{componentId}/scan',
            path: {
                'projectId': projectId,
                'componentId': componentId,
            },
        });
    }
    /**
     * Get enabled image-CVE stats for the latest image in this component (vexStatus - severity distribution)
     * @param projectId
     * @param componentId
     * @returns ImageCveStatsResponseDto Component latest-image enabled CVE stats
     * @throws ApiError
     */
    public static componentsControllerGetStats(
        projectId: string,
        componentId: string,
    ): CancelablePromise<ImageCveStatsResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectId}/components/{componentId}/stats',
            path: {
                'projectId': projectId,
                'componentId': componentId,
            },
            errors: {
                404: `Project or component not found`,
            },
        });
    }
}
