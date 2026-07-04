/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ContainerImageResponseDto = {
    id: string;
    componentId: string;
    storedFileId: string;
    chainIndex: number;
    fileStatus: 'awaiting_upload' | 'uploading' | 'ready' | 'failed';
    fileExtension?: Record<string, any> | null;
    fileSizeBytes?: string | null;
    fileUploadStartedAtUnixSeconds?: string | null;
    createdAtUnixSeconds: string;
    uploadFinishedAtUnixSeconds?: string | null;
    scanResultCode: 'ok' | 'container_not_uploaded' | 'scanning';
    scanAttemptedAtUnixSeconds: string;
    scanFinishedAtUnixSeconds: string;
};

