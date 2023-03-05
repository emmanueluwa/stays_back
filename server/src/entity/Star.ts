import { ObjectType } from "type-graphql"
import { Entity, Column, BaseEntity, ManyToOne, PrimaryColumn } from "typeorm"
import { Post } from "./Post";
import { User } from "./User";

@ObjectType()
@Entity()
export class Star extends BaseEntity {
  @Column({ type: "int" })
  value: number;

  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => User, (user) => user.stars)
  user: User;

  @PrimaryColumn()
  postId: number;

  @ManyToOne(() => Post, (post) => post.stars, {
    onDelete: "CASCADE",
  })
  post: Post;
}


