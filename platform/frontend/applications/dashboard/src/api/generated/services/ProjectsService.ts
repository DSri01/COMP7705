/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateProjectDto } from '../models/CreateProjectDto';
import type { ImageCveStatsResponseDto } from '../models/ImageCveStatsResponseDto';
import type { ProjectResponseDto } from '../models/ProjectResponseDto';
import type { UpdateProjectDto } from '../models/UpdateProjectDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProjectsService {
    /**
     * List all projects
     * @returns ProjectResponseDto List of projects
     * @throws ApiError
     */
    public static projectsControllerList(): CancelablePromise<Array<ProjectResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects',
        });
    }
    /**
     * Create a new project
     * @param requestBody
     * @returns ProjectResponseDto Project created
     * @throws ApiError
     */
    public static projectsControllerCreate(
        requestBody: CreateProjectDto,
    ): CancelablePromise<ProjectResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get a project by ID
     * @param id
     * @returns ProjectResponseDto Project details
     * @throws ApiError
     */
    public static projectsControllerGetById(
        id: string,
    ): CancelablePromise<ProjectResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Update a project by ID
     * @param id
     * @param requestBody
     * @returns ProjectResponseDto Project updated
     * @throws ApiError
     */
    public static projectsControllerUpdate(
        id: string,
        requestBody: UpdateProjectDto,
    ): CancelablePromise<ProjectResponseDto> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/projects/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get project enabled image-CVE stats aggregated over latest image of each component (vexStatus - severity)
     * @param id
     * @returns ImageCveStatsResponseDto Project latest-image enabled CVE stats
     * @throws ApiError
     */
    public static projectsControllerGetStats(
        id: string,
    ): CancelablePromise<ImageCveStatsResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{id}/stats',
            path: {
                'id': id,
            },
            errors: {
                404: `Project not found`,
            },
        });
    }
}
