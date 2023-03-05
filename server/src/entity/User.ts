import { Field, Int, ObjectType } from "type-graphql"
import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, UpdateDateColumn, CreateDateColumn, OneToMany } from "typeorm"
import { Post } from "./Post"
import { Star } from "./Star"


@ObjectType()
//db table+
@Entity('users')
export class User extends BaseEntity {
    @Field(() => Int) //expose field
    @PrimaryGeneratedColumn()
    id: number

    @Field()
    //default is text column
    @Column({ unique: true })
    email: string

    @Column("text")
    password: string

    @OneToMany(() => Post, (post) => post.creator)
    posts: Post[];

    @OneToMany(() => Star, (star) => star.user)
    stars: Star[];

    @Field(() => String)
    @CreateDateColumn()
    createdAt: Date;

    @Field(() => String)
    @UpdateDateColumn()
    updatedAt: Date;
}


