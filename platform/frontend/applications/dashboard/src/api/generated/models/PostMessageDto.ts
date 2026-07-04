/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PostMessageDto = {
    /**
     * User message text for this turn.
     */
    message: string;
    /**
     * Client-assigned index for this human message in the chat list. Must equal `messages.length` from GET …/messages. Retries with the same index and message return the cached reply.
     */
    newMessageIndex: number;
};

