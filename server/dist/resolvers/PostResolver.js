"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostResolver = void 0;
const isAuth_1 = require("../middleware/isAuth");
const type_graphql_1 = require("type-graphql");
const Post_1 = require("../entity/Post");
const User_1 = require("../entity/User");
const data_source_1 = require("../data-source");
const Star_1 = require("../entity/Star");
let PostInput = class PostInput {
};
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], PostInput.prototype, "title", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], PostInput.prototype, "text", void 0);
PostInput = __decorate([
    (0, type_graphql_1.InputType)()
], PostInput);
let PaginatedPosts = class PaginatedPosts {
};
__decorate([
    (0, type_graphql_1.Field)(() => [Post_1.Post]),
    __metadata("design:type", Array)
], PaginatedPosts.prototype, "posts", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", Boolean)
], PaginatedPosts.prototype, "hasMore", void 0);
PaginatedPosts = __decorate([
    (0, type_graphql_1.ObjectType)()
], PaginatedPosts);
let PostResolver = class PostResolver {
    textSnippet(post) {
        return post.text.slice(0, 50);
    }
    creator(post, { userLoader }) {
        return userLoader.load(post.creatorId);
    }
    async vote(postId, value, { req }) {
        const isStar = value !== -1;
        const realValue = isStar ? 1 : -1;
        const { userId } = req.session;
        const upStar = await Star_1.Star.findOne({ where: { postId, userId } });
        if (upStar && upStar.value !== realValue) {
            await data_source_1.AppDataSource.transaction(async (tm) => {
                await tm.query(`
          update star
          set value = $1
          where "postId" = $2 and "userId" = $3
        `, [realValue, postId, userId]);
                await tm.query(`
          update post
          set points = points + $1
          where id = $2;
        `, [2 * realValue, postId]);
            });
        }
        else if (!upStar) {
            await data_source_1.AppDataSource.transaction(async (tm) => {
                await tm.query(`
          insert into star ("userId", "postId", value)
          values ($1,$2,$3);
        `, [userId, postId, realValue]);
                await tm.query(`
          update post
          set points = points + $1
          where id = $2;
        `, [realValue, postId]);
            });
        }
        await data_source_1.AppDataSource.query(`
      START TRANSACTION;

      

      

      COMMIT;
      `, [userId, postId, realValue, realValue, postId]);
        return true;
    }
    async posts(limit, cursor, { req }) {
        const realLimit = Math.min(15, limit);
        const realLimitPlusOne = realLimit + 1;
        const replacements = [realLimitPlusOne];
        if (req.session.userId) {
            replacements.push(req.session.userId);
        }
        let cursorIndex = 3;
        if (cursor) {
            replacements.push(new Date(parseInt(cursor)));
            cursorIndex = replacements.length;
        }
        const posts = await data_source_1.AppDataSource.query(`
        select p.*,
        ${req.session.userId
            ? ',(select value from star where "userId" = $2 and "postId" = p.id) "voteStatus"'
            : 'null as "voteStatus"'}
        from post p
        ${cursor ? `where p."createdAt" < ${cursorIndex}` : ""}
        order by p."createdAt" DESC
        limit $1
      `, replacements);
        return {
            posts: posts.slice(0, realLimit),
            hasMore: posts.length === realLimitPlusOne,
        };
    }
    async post(id) {
        return Post_1.Post.findOneBy({ id: id });
    }
    async createPost(input, { req }) {
        return Post_1.Post.create(Object.assign(Object.assign({}, input), { creatorId: req.session.userId })).save();
    }
    async updatePost(id, title, text, { req }) {
        const result = await data_source_1.AppDataSource
            .createQueryBuilder()
            .update(Post_1.Post)
            .set({ title, text })
            .where('id = :id and "creatorId" = :creartorId', {
            id,
            creatorId: req.session.userId
        })
            .returning("*")
            .execute();
        return result.raw[0];
    }
    async deletePost(id, { req }) {
        await Post_1.Post.delete({ id, creatorId: req.session.userId });
        return true;
    }
};
__decorate([
    (0, type_graphql_1.FieldResolver)(() => String),
    __param(0, (0, type_graphql_1.Root)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Post_1.Post]),
    __metadata("design:returntype", void 0)
], PostResolver.prototype, "textSnippet", null);
__decorate([
    (0, type_graphql_1.FieldResolver)(() => User_1.User),
    __param(0, (0, type_graphql_1.Root)()),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Post_1.Post, Object]),
    __metadata("design:returntype", void 0)
], PostResolver.prototype, "creator", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)('postId', () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("value", () => type_graphql_1.Int)),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "vote", null);
__decorate([
    (0, type_graphql_1.Query)(() => PaginatedPosts),
    __param(0, (0, type_graphql_1.Arg)("limit", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("cursor", () => String, { nullable: true })),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "posts", null);
__decorate([
    (0, type_graphql_1.Query)(() => Post_1.Post, { nullable: true }),
    __param(0, (0, type_graphql_1.Arg)("id", () => type_graphql_1.Int)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "post", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Post_1.Post),
    __param(0, (0, type_graphql_1.Arg)("input")),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PostInput, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "createPost", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Post_1.Post, { nullable: true }),
    __param(0, (0, type_graphql_1.Arg)("id", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("title")),
    __param(2, (0, type_graphql_1.Arg)("text")),
    __param(3, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "updatePost", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Arg)("id", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "deletePost", null);
PostResolver = __decorate([
    (0, type_graphql_1.Resolver)(Post_1.Post)
], PostResolver);
exports.PostResolver = PostResolver;
//# sourceMappingURL=PostResolver.js.map