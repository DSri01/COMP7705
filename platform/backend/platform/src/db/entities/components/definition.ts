import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    ManyToOne,
} from "typeorm";
import { Project } from "../projects/definition.js";


@Entity({ name: "components" })
export class Component {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "varchar", length: 120, unique: true })
    name!: string;

    @Column({ type: "text" })
    description!: string;

    @ManyToOne(() => Project, { nullable: false, onDelete: "RESTRICT" })
    @JoinColumn({ name: "project_id" })
    project!: Project;

    @Column({ type: "bigint" })
    createdAtUnixSeconds!: bigint;
    
    @Column({ type: "bigint" })
    updatedAtUnixSeconds!: bigint;
}