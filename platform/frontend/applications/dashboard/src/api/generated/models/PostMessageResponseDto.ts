/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PostMessageResponseDto = {
    /**
     * Final assistant reply for this turn.
     */
    reply: string;
    /**
     * Index of the human message for this turn (same as request newMessageIndex).
     */
    userMessageIndex: number;
    /**
     * Index of the assistant reply (typically userMessageIndex + 1).
     */
    responseMessageIndex: number;
};

