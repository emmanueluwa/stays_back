import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";
import { Resolver, Query, Arg, Mutation, Field, InputType, Ctx, UseMiddleware, Int, FieldResolver, Root, ObjectType } from "type-graphql";
import { Post } from "../entity/Post";
import { User } from "../entity/User";
import { AppDataSource } from "../data-source";
import { Star } from "../entity/Star";

@InputType()
class PostInput {
  @Field()
  title: string
  @Field()
  text: string
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[]
  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  //instead of pulling down entire text body of post
  @FieldResolver(() => String)
  textSnippet(@Root() post: Post) {
    return post.text.slice(0, 50);
  }

  /*
    solving the n+1 problem
    
  */
  @FieldResolver(() => User)
  creator(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(post.creatorId);
  }

  /*
    solving the n+1 problem

    TODO:  COMEBACK, complete createStarLoader.ts to complete this solution
  */
//  @FieldResolver(() => Int, {nullable: true})
//  voteStatus(@Root() post: Post, @Ctx() { starLoader }: MyContext) {
//   return
//  }


  //star a post
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg('postId', () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() {req}: MyContext
  ) {
    const isStar = value !== -1;
    const realValue = isStar ? 1 : -1;
    const { userId } = req.session;

    const upStar = await Star.findOne({where: {postId, userId}})

    //user has starred post
    //user is changing vote
    if (upStar && upStar.value !== realValue) {
      await AppDataSource.transaction(async tm => {
        await tm.query(`
          update star
          set value = $1
          where "postId" = $2 and "userId" = $3
        `, [realValue, postId, userId]);

        //update points on post
        await tm.query(`
          update post
          set points = points + $1
          where id = $2;
        `, [2 * realValue, postId]); //changing upstar to downstar uses 2 points
      })

      
    } else if (!upStar) {
      //user has not voted yet
      await AppDataSource.transaction(async tm => {
        await tm.query(`
          insert into star ("userId", "postId", value)
          values ($1,$2,$3);
        `, [userId, postId, realValue]);

        await tm.query(`
          update post
          set points = points + $1
          where id = $2;
        `, [realValue, postId]) 
      })
    }

    // await Star.insert({
    //   userId,
    //   postId,
    //   value: realValue,
    // });
    await AppDataSource.query(
      `
      START TRANSACTION;

      

      

      COMMIT;
      `,
      [userId, postId, realValue, realValue, postId ]
    );
    return true
  }

  @Query(() => PaginatedPosts)
  async posts(
    //pagination also an option to do limit/offset
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
    @Ctx() {req}: MyContext
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(15, limit);
    const realLimitPlusOne = realLimit + 1;

    const replacements: any[] = [realLimitPlusOne];

    if (req.session.userId) {
      replacements.push(req.session.userId);
    }

    let cursorIndex = 3;
    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
      cursorIndex = replacements.length;
    }

    const posts = await AppDataSource.query(
      `
        select p.*,
        ${
          req.session.userId 
          ? ',(select value from star where "userId" = $2 and "postId" = p.id) "voteStatus"' 
          : 'null as "voteStatus"'
        }
        from post p
        ${cursor ? `where p."createdAt" < ${cursorIndex}` : ""}
        order by p."createdAt" DESC
        limit $1
      `,
      replacements
    );

    // const qb = await AppDataSource
    // .getRepository(Post)
    // .createQueryBuilder("p")
    // .innerJoinAndSelect(
    //   "p.creator",
    //   "u",
    //   'u.id = p."creatorId"',
    // )
    // .orderBy('p."createdAt"', "DESC")
    // .take(realLimitPlusOne)

    // if (cursor) {
    //   qb.where('"createdAt" < :cursor', {
    //     cursor: new Date(parseInt(cursor)),
    //   });
    // }

    // const posts = await qb.getMany()

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne,
    };
  }

  @Query(() => Post, { nullable: true })
  async post(@Arg("id", () => Int) id: number): Promise<Post | null> {
    
    return Post.findOneBy({ id: id });
  }

  /*
  TODO: change to admin only
  */
  @Mutation(() => Post)
  // @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: MyContext
    ): Promise<Post> {
    return Post.create({ 
      ...input,
      creatorId: req.session.userId,
     }).save();
  }

  /*
  TODO: change to admin only
  */
  @Mutation(() => Post, { nullable: true })
  // @UseMiddleware(isAuth)
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title") title: string,
    @Arg("text") text: string,
    @Ctx() { req }: MyContext
  ): Promise<Post | null> {
    const result = await AppDataSource
                .createQueryBuilder()
                .update(Post)
                .set({ title, text })
                .where('id = :id and "creatorId" = :creartorId', {
                   id, 
                   creatorId: req.session.userId 
                  })
                .returning("*")
                .execute();
                // console.log("result: ", result)

    return result.raw[0];
  }

  /*
  TODO: change to admin only
  */
  @Mutation(() => Boolean)
  // @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {

    //NOT CASCADE WAY

    // const post = await Post.findOneBy({ id: id });
    // if (!post) {
    //   return false
    // }
    // if (post.creatorId !== req.session.userId) {
    //   throw new Error('not authorised')
    // }
    // //user can only delete post they own
    // // await Post.delete({ id, cretorId: req.session.userId })

    // await Star.delete({ postId: id })
    // await Post.delete({ id });

    //CASCADE
    await Post.delete({ id, creatorId: req.session.userId });

    return true;
  }
  

}