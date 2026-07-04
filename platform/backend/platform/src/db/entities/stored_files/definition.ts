import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Check,
} from "typeorm";

@Entity("stored_files")
@Check(
  "CHK_stored_files_upload_started_required",
  `"status" = 'awaiting_upload' OR "uploadStartedAtUnixSeconds" IS NOT NULL`,
)
@Check(
  "CHK_stored_files_extension_required_after_awaiting_upload",
  `"status" = 'awaiting_upload' OR "extension" IS NOT NULL`,
)
@Check(
  "CHK_stored_files_size_required_when_ready",
  `"status" <> 'ready' OR "sizeBytes" IS NOT NULL`,
)
export class StoredFile {

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 32, nullable: true })
  extension!: string | null; // filename extension (filename is id.extension))

  @Column({ type: "bigint", nullable: true })
  sizeBytes!: string | null; // bigint maps to string in TypeORM usually

  @Column({
    type: "enum",
    enum: ["awaiting_upload", "uploading", "ready", "failed"],
    default: "awaiting_upload",
  })
  status!: "awaiting_upload" | "uploading" | "ready" | "failed";

  @Column({ type: "bigint", nullable: true })
  uploadStartedAtUnixSeconds!: bigint | null;

  @Column({ type: "bigint" })
  createdAtUnixSeconds!: bigint;
}