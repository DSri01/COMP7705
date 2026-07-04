/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ContainerImageResponseDto } from '../models/ContainerImageResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ContainerImagesService {
    /**
     * Create image placeholder in a component
     * @param projectId
     * @param componentId
     * @returns ContainerImageResponseDto Image placeholder created
     * @throws ApiError
     */
    public static containerImagesControllerCreate(
        projectId: string,
        componentId: string,
    ): CancelablePromise<ContainerImageResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectId}/components/{componentId}/images',
            path: {
                'projectId': projectId,
                'componentId': componentId,
            },
        });
    }
    /**
     * List images in a component by descending chain index
     * @param projectId
     * @param componentId
     * @returns ContainerImageResponseDto Images list
     * @throws ApiError
     */
    public static containerImagesControllerList(
        projectId: string,
        componentId: string,
    ): CancelablePromise<Array<ContainerImageResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectId}/components/{componentId}/images',
            path: {
                'projectId': projectId,
                'componentId': componentId,
            },
        });
    }
    /**
     * Get current image in a component
     * @param projectId
     * @param componentId
     * @returns ContainerImageResponseDto Current image
     * @throws ApiError
     */
    public static containerImagesControllerGetCurrent(
        projectId: string,
        componentId: string,
    ): CancelablePromise<ContainerImageResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectId}/components/{componentId}/images/current',
            path: {
                'projectId': projectId,
                'componentId': componentId,
            },
        });
    }
    /**
     * Get a specific image by ID in a component
     * @param projectId
     * @param componentId
     * @param imageId
     * @returns ContainerImageResponseDto Image details
     * @throws ApiError
     */
    public static containerImagesControllerGetById(
        projectId: string,
        componentId: string,
        imageId: string,
    ): CancelablePromise<ContainerImageResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/projects/{projectId}/components/{componentId}/images/{imageId}',
            path: {
                'projectId': projectId,
                'componentId': componentId,
                'imageId': imageId,
            },
        });
    }
    /**
     * Upload container tar for an image
     * @param projectId
     * @param componentId
     * @param imageId
     * @param formData
     * @returns ContainerImageResponseDto Image upload finalized
     * @throws ApiError
     */
    public static containerImagesControllerUpload(
        projectId: string,
        componentId: string,
        imageId: string,
        formData: {
            file: Blob;
        },
    ): CancelablePromise<ContainerImageResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/projects/{projectId}/components/{componentId}/images/{imageId}/upload',
            path: {
                'projectId': projectId,
                'componentId': componentId,
                'imageId': imageId,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
        });
    }
}
