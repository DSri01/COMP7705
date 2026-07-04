import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from "typeorm";


@Entity({ name: "projects" })
export class Project {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "varchar", length: 120, unique: true })
    name!: string;

    @Column({ type: "text" })
    description!: string;

    @Column({ type: "bigint" })
    createdAtUnixSeconds!: bigint;
    
    @Column({ type: "bigint" })
    updatedAtUnixSeconds!: bigint;
}