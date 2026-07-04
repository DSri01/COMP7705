import { test, expect, describe, beforeEach, afterEach, jest } from "@jest/globals";
import type { DataSource } from "typeorm";
import type { PinoLogger } from "nestjs-pino";
import { ImageCveDecisionExpiryRefreshWorker } from "../../src/workers/imageCveDecisionExpiryRefresh/definition.js";
import { ContainerImage } from "../../src/db/entities/container_images/definition.js";
import { ImageCve } from "../../src/db/entities/image_cve/definition.js";
import { refreshImageCveDecisionExpiry } from "../../src/imageCveDecisionExpiryRefresh/definition.js";

jest.mock("../../src/imageCveDecisionExpiryRefresh/definition.js", () => ({
    refreshImageCveDecisionExpiry: jest.fn(),
}));

const refreshImageCveDecisionExpiryMock = jest.mocked(refreshImageCveDecisionExpiry);

describe("ImageCveDecisionExpiryRefreshWorker", () => {
    const imageFindMock = jest.fn<() => Promise<ContainerImage[]>>();
    const imageCveFindMock = jest.fn<() => Promise<ImageCve[]>>();
    const getRepositoryMock = jest.fn<(target: unknown) => unknown>();

    const dataSourceMock = {
        getRepository: getRepositoryMock,
    };

    const loggerMock: Pick<PinoLogger, "info" | "error"> = {
        info: jest.fn(),
        error: jest.fn(),
    };

    function makeImage(id: string, componentId: string, chainIndex: number): ContainerImage {
        return {
            id,
            chainIndex,
            component: { id: componentId } as ContainerImage["component"],
            createdAtUnixSeconds: 1n,
            uploadFinishedAtUnixSeconds: 1n,
        } as ContainerImage;
    }

    function makeImageCve(overrides: Partial<ImageCve> = {}): ImageCve {
        return {
            id: "icve-1",
            containerImage: {
                id: "img-1",
                chainIndex: 3,
                component: {
                    id: "comp-1",
                    project: { id: "proj-1" },
                },
            } as unknown as ContainerImage,
            cve: { cveId: "CVE-2021-44228" } as ImageCve["cve"],
            source: "manual",
            firstIntroducedChainIndex: 3,
            originalSource: "manual",
            isDisabled: false,
            disabledReason: "",
            advice: null,
            storedInternalStatement: {
                status: "not_affected",
                justification: "component_not_present",
                impact_statement: "not present",
                status_notes: "verified",
            },
            expiryTimeUnixSeconds: 1n,
            decisionRecordedAtUnixSeconds: 1n,
            ...overrides,
        } as ImageCve;
    }

    beforeEach(() => {
        jest.clearAllMocks();
        getRepositoryMock.mockImplementation((entity: unknown) => {
            if (entity === ContainerImage) {
                return { find: imageFindMock };
            }
            if (entity === ImageCve) {
                return { find: imageCveFindMock };
            }
            throw new Error(`Unexpected entity in getRepository mock: ${String(entity)}`);
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("process() returns success when no images exist", async () => {
        imageFindMock.mockResolvedValue([]);
        imageCveFindMock.mockResolvedValue([]);

        const worker = new ImageCveDecisionExpiryRefreshWorker(
            dataSourceMock as unknown as DataSource,
            60,
            loggerMock as PinoLogger,
            10,
        );
        const result = await worker.process();

        expect(result.success).toBe(true);
        expect(imageCveFindMock).not.toHaveBeenCalled();
        expect(refreshImageCveDecisionExpiryMock).not.toHaveBeenCalled();
    });

    test("process() refreshes only resolved expired candidates on latest images", async () => {
        imageFindMock.mockResolvedValue([
            makeImage("img-2-new", "comp-2", 5),
            makeImage("img-1-new", "comp-1", 3),
            makeImage("img-1-old", "comp-1", 2),
        ]);
        imageCveFindMock.mockResolvedValue([
            makeImageCve({ id: "icve-a" }),
            makeImageCve({
                id: "icve-b",
                storedInternalStatement: { status: "under_investigation", context: { type: "fresh" } },
            }),
            makeImageCve({
                id: "icve-c",
                storedInternalStatement: {
                    status: "affected",
                    action_statement: "upgrade",
                    status_notes: "reachable",
                },
                containerImage: {
                    id: "img-2-new",
                    chainIndex: 5,
                    component: {
                        id: "comp-2",
                        project: { id: "proj-2" },
                    },
                } as unknown as ContainerImage,
            }),
        ]);
        refreshImageCveDecisionExpiryMock.mockResolvedValue({ ok: true, changed: true } as never);

        const worker = new ImageCveDecisionExpiryRefreshWorker(
            dataSourceMock as unknown as DataSource,
            60,
            loggerMock as PinoLogger,
            10,
        );
        const result = await worker.process();

        expect(result.success).toBe(true);
        expect(imageFindMock).toHaveBeenCalledTimes(1);
        expect(imageCveFindMock).toHaveBeenCalledTimes(1);
        expect(refreshImageCveDecisionExpiryMock).toHaveBeenCalledTimes(2);
        expect(refreshImageCveDecisionExpiryMock.mock.calls[0]?.[1]).toEqual({
            projectId: "proj-1",
            componentId: "comp-1",
            imageCveId: "icve-a",
        });
        expect(refreshImageCveDecisionExpiryMock.mock.calls[1]?.[1]).toEqual({
            projectId: "proj-2",
            componentId: "comp-2",
            imageCveId: "icve-c",
        });
    });

    test("process() returns error result when refresh transaction helper throws", async () => {
        imageFindMock.mockResolvedValue([makeImage("img-1-new", "comp-1", 3)]);
        imageCveFindMock.mockResolvedValue([makeImageCve({ id: "icve-a" })]);
        refreshImageCveDecisionExpiryMock.mockRejectedValue(new Error("refresh failed"));

        const worker = new ImageCveDecisionExpiryRefreshWorker(
            dataSourceMock as unknown as DataSource,
            60,
            loggerMock as PinoLogger,
            10,
        );
        const result = await worker.process();

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.message).toContain("refresh failed");
        }
    });

    test("process() uses injected stale refresh batch size for candidate query", async () => {
        imageFindMock.mockResolvedValue([makeImage("img-1-new", "comp-1", 3)]);
        imageCveFindMock.mockResolvedValue([]);
        const batchSize = 23;

        const worker = new ImageCveDecisionExpiryRefreshWorker(
            dataSourceMock as unknown as DataSource,
            60,
            loggerMock as PinoLogger,
            batchSize,
        );
        await worker.process();

        expect(imageCveFindMock).toHaveBeenCalledTimes(1);
        const args = (imageCveFindMock as unknown as jest.Mock).mock.calls[0] as [Record<string, unknown>];
        const queryArg = args[0] as { take?: number };
        expect(queryArg.take).toBe(batchSize);
    });
});
