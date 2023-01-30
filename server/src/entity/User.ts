import { Field, Int, ObjectType } from "type-graphql"
import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm"


@ObjectType()
//db table
@Entity('users')
export class User extends BaseEntity {
    @Field(() => Int) //expose field
    @PrimaryGeneratedColumn()
    id: number

    @Field()
    //default is text column
    @Column("text")
    email: string

    @Column("text")
    password: string

    @Column("int", { default: 0 })
    tokenVersion: number

}


