import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { StoredFile } from "../stored_files/definition.js";
import { Component } from "../components/definition.js";

export const ContainerImageScanResultCodeValues = [
  "ok",
  "container_not_uploaded",
  "scanning",
] as const;
export type ContainerImageScanResultCode = (typeof ContainerImageScanResultCodeValues)[number];

@Entity({ name: "container_images" })
@Index("UQ_container_images_component_id_chain_index", ["component", "chainIndex"], { unique: true })
export class ContainerImage {

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Component, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "component_id" })
  component!: Component;

  @Column({ type: "integer" })
  chainIndex!: number;

  @Index("UQ_container_images_stored_file_id", { unique: true })
  @ManyToOne(() => StoredFile, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "stored_file_id" })
  storedFile!: StoredFile;

  @Column({ type: "bigint" })
  createdAtUnixSeconds!: bigint;

  @Column({ type: "bigint", nullable: true })
  uploadFinishedAtUnixSeconds!: bigint | null;

  @Column({
    type: "enum",
    enum: ContainerImageScanResultCodeValues,
    enumName: "container_image_scan_result_code",
    name: "scan_result_code",
    default: "ok",
  })
  scanResultCode!: ContainerImageScanResultCode;

  @Column({
    type: "bigint",
    name: "scan_attempted_at_unix_seconds",
    default: 0,
    transformer: {
      to: (v: bigint) => v,
      from: (v: string | number | bigint) => BigInt(v),
    },
  })
  scanAttemptedAtUnixSeconds!: bigint;

  @Column({
    type: "bigint",
    name: "scan_finished_at_unix_seconds",
    default: 0,
    transformer: {
      to: (v: bigint) => v,
      from: (v: string | number | bigint) => BigInt(v),
    },
  })
  scanFinishedAtUnixSeconds!: bigint;
}