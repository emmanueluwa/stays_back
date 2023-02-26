import { Field, Int, ObjectType } from "type-graphql"
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn, BaseEntity } from "typeorm"

@ObjectType()
@Entity()
export class Post extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @CreateDateColumn()
  CreatedAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  UpdatedAt: Date;

  @Field()
  @Column({ unique: true })
  email!: string;

  @Field()
  @Column()
  title!: string;
}


