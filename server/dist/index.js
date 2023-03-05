"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("reflect-metadata");
const constants_1 = require("./constants");
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const apollo_server_express_1 = require("apollo-server-express");
const UserResolver_1 = require("./resolvers/UserResolver");
const PostResolver_1 = require("./resolvers/PostResolver");
const type_graphql_1 = require("type-graphql");
const data_source_1 = require("./data-source");
const ioredis_1 = __importDefault(require("ioredis"));
const Post_1 = require("./entity/Post");
const createUserLoader_1 = require("./utils/createUserLoader");
const main = async () => {
    await data_source_1.AppDataSource.initialize();
    await Post_1.Post.delete({});
    const app = (0, express_1.default)();
    let RedisStore = require("connect-redis")(express_session_1.default);
    const redis = new ioredis_1.default();
    app.use((0, express_session_1.default)({
        name: constants_1.COOKIE_NAME,
        store: new RedisStore({
            client: redis,
            disableTouch: true,
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
            httpOnly: true,
            sameSite: "lax",
            secure: false,
        },
        saveUninitialized: false,
        secret: 'onkcwaonjcaqon',
        resave: false,
    }));
    const apolloServer = new apollo_server_express_1.ApolloServer({
        schema: await (0, type_graphql_1.buildSchema)({
            resolvers: [UserResolver_1.UserResolver, PostResolver_1.PostResolver],
            validate: false
        }),
        context: ({ req, res }) => ({
            req,
            res,
            redis,
            userLoader: (0, createUserLoader_1.createUserLoader)(),
        }),
    });
    await apolloServer.start();
    apolloServer.applyMiddleware({
        app,
        cors: {
            origin: ["http://localhost:3000",],
            credentials: true
        },
    });
    app.listen(4000, () => {
        console.log("express server started.");
    });
};
main().catch((err) => {
    console.error(err);
});
//# sourceMappingURL=index.js.map