import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals";
import type { DataSource, EntityManager } from "typeorm";
import { refreshImageCveDecisionExpiry } from "../src/imageCveDecisionExpiryRefresh/definition.js";
import { Component } from "../src/db/entities/components/definition.js";
import { ContainerImage } from "../src/db/entities/container_images/definition.js";
import { ImageCve } from "../src/db/entities/image_cve/definition.js";

describe("refreshImageCveDecisionExpiry", () => {
    const componentFindOneMock = jest.fn<() => Promise<Component | null>>();
    const imageFindOneMock = jest.fn<() => Promise<ContainerImage | null>>();
    const imageCveFindOneMock = jest.fn<() => Promise<ImageCve | null>>();
    const imageCveSaveMock = jest.fn<(...args: unknown[]) => Promise<ImageCve>>();

    const managerGetRepositoryMock = jest.fn<(entity: unknown) => unknown>();
    const transactionMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();

    const managerMock = {
        getRepository: managerGetRepositoryMock,
    };

    const dataSourceMock = {
        transaction: transactionMock,
    };

    function makeRow(overrides: Partial<ImageCve> = {}): ImageCve {
        return {
            id: "icve-1",
            containerImage: {
                id: "img-1",
                chainIndex: 3,
                component: { id: "comp-1", project: { id: "proj-1" } },
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
            expiryTimeUnixSeconds: 100n,
            decisionRecordedAtUnixSeconds: 90n,
            ...overrides,
        } as ImageCve;
    }

    beforeEach(() => {
        jest.clearAllMocks();
        managerGetRepositoryMock.mockImplementation((entity) => {
            if (entity === Component) {
                return { findOne: componentFindOneMock };
            }
            if (entity === ContainerImage) {
                return { findOne: imageFindOneMock };
            }
            if (entity === ImageCve) {
                return { findOne: imageCveFindOneMock, save: imageCveSaveMock };
            }
            throw new Error(`unexpected entity ${String(entity)}`);
        });
        transactionMock.mockImplementation(async (...args: unknown[]) => {
            const callback = args[0] as (manager: EntityManager) => Promise<unknown>;
            return callback(managerMock as unknown as EntityManager);
        });
        imageCveSaveMock.mockImplementation(async (...args: unknown[]) => args[0] as ImageCve);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("returns not_found when scoped component does not exist", async () => {
        componentFindOneMock.mockResolvedValue(null);

        const result = await refreshImageCveDecisionExpiry(
            dataSourceMock as unknown as DataSource,
            { projectId: "proj-1", componentId: "comp-1", imageCveId: "icve-1" },
            () => 200n,
        );

        expect(result).toEqual({ ok: false, reason: "not_found" });
        expect(imageFindOneMock).not.toHaveBeenCalled();
        expect(imageCveFindOneMock).not.toHaveBeenCalled();
    });

    test("returns unchanged when decision is already under_investigation", async () => {
        componentFindOneMock.mockResolvedValue({ id: "comp-1" } as Component);
        imageFindOneMock.mockResolvedValue({ id: "img-1" } as ContainerImage);
        const row = makeRow({
            storedInternalStatement: { status: "under_investigation", context: { type: "fresh" } },
            expiryTimeUnixSeconds: 1n,
        });
        imageCveFindOneMock.mockResolvedValue(row);

        const result = await refreshImageCveDecisionExpiry(
            dataSourceMock as unknown as DataSource,
            { projectId: "proj-1", componentId: "comp-1", imageCveId: "icve-1" },
            () => 200n,
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.changed).toBe(false);
            expect(result.row).toBe(row);
            expect(result.nowUnixSeconds).toBe(200n);
        }
        expect(imageCveSaveMock).not.toHaveBeenCalled();
    });

    test("converts expired not_affected decision, clears expiry, and updates decision time", async () => {
        componentFindOneMock.mockResolvedValue({ id: "comp-1" } as Component);
        imageFindOneMock.mockResolvedValue({ id: "img-1" } as ContainerImage);
        const row = makeRow({
            storedInternalStatement: {
                status: "not_affected",
                justification: "component_not_present",
                impact_statement: "not present",
                status_notes: "verified",
            },
            expiryTimeUnixSeconds: 100n,
            decisionRecordedAtUnixSeconds: 50n,
        });
        imageCveFindOneMock.mockResolvedValue(row);

        const result = await refreshImageCveDecisionExpiry(
            dataSourceMock as unknown as DataSource,
            { projectId: "proj-1", componentId: "comp-1", imageCveId: "icve-1" },
            () => 200n,
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.changed).toBe(true);
        }
        expect(imageCveSaveMock).toHaveBeenCalledTimes(1);
        expect(row.expiryTimeUnixSeconds).toBeNull();
        expect(row.decisionRecordedAtUnixSeconds).toBe(200n);
        expect(row.storedInternalStatement.status).toBe("under_investigation");
        if (row.storedInternalStatement.status === "under_investigation") {
            expect(row.storedInternalStatement.context.type).toBe("expired");
            if (row.storedInternalStatement.context.type === "expired") {
                expect(row.storedInternalStatement.context.expiredDecision).toEqual({
                    status: "not_affected",
                    justification: "component_not_present",
                    impact_statement: "not present",
                    status_notes: "verified",
                });
            }
        }
    });

    test("converts expired affected decision with action snapshot", async () => {
        componentFindOneMock.mockResolvedValue({ id: "comp-1" } as Component);
        imageFindOneMock.mockResolvedValue({ id: "img-1" } as ContainerImage);
        const row = makeRow({
            storedInternalStatement: {
                status: "affected",
                action_statement: "upgrade image",
                status_notes: "reachable",
            },
            expiryTimeUnixSeconds: 10n,
        });
        imageCveFindOneMock.mockResolvedValue(row);

        const result = await refreshImageCveDecisionExpiry(
            dataSourceMock as unknown as DataSource,
            { projectId: "proj-1", componentId: "comp-1", imageCveId: "icve-1" },
            () => 200n,
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.changed).toBe(true);
        }
        expect(row.storedInternalStatement.status).toBe("under_investigation");
        if (row.storedInternalStatement.status === "under_investigation") {
            expect(row.storedInternalStatement.context.type).toBe("expired");
            if (row.storedInternalStatement.context.type === "expired") {
                expect(row.storedInternalStatement.context.expiredDecision).toEqual({
                    status: "affected",
                    action_statement: "upgrade image",
                    status_notes: "reachable",
                });
            }
        }
    });
});
