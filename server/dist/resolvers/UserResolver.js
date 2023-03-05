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
exports.UserResolver = void 0;
const type_graphql_1 = require("type-graphql");
const bcryptjs_1 = require("bcryptjs");
const User_1 = require("../entity/User");
const data_source_1 = require("../data-source");
const isAuth_1 = require("../middleware/isAuth");
const sendEmail_1 = require("../utils/sendEmail");
const uuid_1 = require("uuid");
const constants_1 = require("../constants");
const UsernamePasswordInput_1 = require("./UsernamePasswordInput");
require("dotenv").config();
let FieldError = class FieldError {
};
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], FieldError.prototype, "field", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], FieldError.prototype, "message", void 0);
FieldError = __decorate([
    (0, type_graphql_1.ObjectType)()
], FieldError);
let LoginResponse = class LoginResponse {
};
__decorate([
    (0, type_graphql_1.Field)(() => [FieldError], { nullable: true }),
    __metadata("design:type", Array)
], LoginResponse.prototype, "errors", void 0);
__decorate([
    (0, type_graphql_1.Field)(() => User_1.User, { nullable: true }),
    __metadata("design:type", User_1.User)
], LoginResponse.prototype, "user", void 0);
LoginResponse = __decorate([
    (0, type_graphql_1.ObjectType)()
], LoginResponse);
let UserResolver = class UserResolver {
    email(user, { req }) {
        if (req.session.userId === user.id) {
            return user.email;
        }
        return "";
    }
    async changePassword(token, newPassword, { redis, req }) {
        if (newPassword.length <= 2) {
            return { errors: [
                    {
                        field: "newPassword",
                        message: "length must be greater than 2",
                    },
                ],
            };
        }
        const key = constants_1.FORGET_PASSWORD_PREFIX + token;
        const userId = await redis.get(key);
        if (!userId) {
            return { errors: [
                    {
                        field: "token",
                        message: "expired token",
                    },
                ],
            };
        }
        const userIdNum = parseInt(userId);
        const user = await User_1.User.findOneBy({ id: userIdNum });
        if (!user) {
            return { errors: [
                    {
                        field: "token",
                        message: "user no longer exists",
                    },
                ],
            };
        }
        await User_1.User.update({ id: userIdNum }, { password: await (0, bcryptjs_1.hash)(newPassword, 12) });
        redis.del();
        req.session.userId = user.id;
        return { user };
    }
    async forgotPassword(email, { redis }) {
        const user = await User_1.User.findOne({ where: { email } });
        if (!user) {
            return true;
        }
        const token = (0, uuid_1.v4)();
        await redis.set(constants_1.FORGET_PASSWORD_PREFIX + token, user.id, "EX", 1000 * 60 * 60 * 24);
        await (0, sendEmail_1.sendEmail)(email, `<a href="http://localhost:3000/change-password/${token}">reset password</a>`);
        return true;
    }
    obota() {
        return "Obota!";
    }
    lare({ payload }) {
        console.log(payload);
        return `user id: ${payload.userId} lare!`;
    }
    users() {
        return User_1.User.find();
    }
    async me({ req }) {
        if (!req.session.userId) {
            return null;
        }
        return await User_1.User.findOneBy(req.session.userId);
    }
    async logout({ req, res }) {
        return new Promise((resolve => req.session.destroy(err => {
            res.clearCookie(constants_1.COOKIE_NAME);
            if (err) {
                console.log(err);
                resolve(false);
                return;
            }
            resolve(true);
        })));
    }
    async login(email, password, { req }) {
        const user = await User_1.User.findOne({ where: { email } });
        if (!user) {
            return {
                errors: [
                    {
                        field: "email",
                        message: "incorrect email/password",
                    },
                ],
            };
        }
        const valid = await (0, bcryptjs_1.compare)(password, user.password);
        if (!valid) {
            return {
                errors: [
                    {
                        field: "password",
                        message: "incorrect email/password",
                    },
                ],
            };
        }
        req.session.userId = user.id;
        return {
            user
        };
    }
    async register(options, { req }) {
        if (!options.email.includes('@')) {
            return {
                errors: [
                    {
                        field: "email",
                        message: "invalid email"
                    }
                ]
            };
        }
        if (options.password.length <= 3) {
            return {
                errors: [
                    {
                        field: "password",
                        message: "length must be greater than 3"
                    }
                ]
            };
        }
        const hashedPassword = await (0, bcryptjs_1.hash)(options.password, 12);
        let user;
        try {
            const result = await data_source_1.AppDataSource
                .createQueryBuilder()
                .insert()
                .into(User_1.User)
                .values({
                email: options.email,
                password: hashedPassword
            })
                .returning("*").execute();
            user = result.raw[0];
        }
        catch (err) {
            if (err.code === "23505") {
                return {
                    errors: [
                        {
                            field: "username",
                            message: "username taken",
                        },
                    ],
                };
            }
        }
        req.session.userId = user.id;
        return { user };
    }
};
__decorate([
    (0, type_graphql_1.FieldResolver)(() => String),
    __param(0, (0, type_graphql_1.Root)()),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [User_1.User, Object]),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "email", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => LoginResponse),
    __param(0, (0, type_graphql_1.Arg)('token')),
    __param(1, (0, type_graphql_1.Arg)('newPassword')),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "changePassword", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Arg)('email')),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "forgotPassword", null);
__decorate([
    (0, type_graphql_1.Query)(() => String),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "obota", null);
__decorate([
    (0, type_graphql_1.Query)(() => String),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "lare", null);
__decorate([
    (0, type_graphql_1.Query)(() => [User_1.User]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "users", null);
__decorate([
    (0, type_graphql_1.Query)(() => User_1.User, { nullable: true }),
    __param(0, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "me", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "logout", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => LoginResponse),
    __param(0, (0, type_graphql_1.Arg)('email')),
    __param(1, (0, type_graphql_1.Arg)('password')),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "login", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => LoginResponse),
    __param(0, (0, type_graphql_1.Arg)('options')),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UsernamePasswordInput_1.UsernamePasswordInput, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "register", null);
UserResolver = __decorate([
    (0, type_graphql_1.Resolver)(User_1.User)
], UserResolver);
exports.UserResolver = UserResolver;
//# sourceMappingURL=UserResolver.js.map