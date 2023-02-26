"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("reflect-metadata");
const constants_1 = require("./constants");
const express_1 = __importDefault(require("express"));
const apollo_server_express_1 = require("apollo-server-express");
const UserResolver_1 = require("./UserResolver");
const PostResolver_1 = require("./PostResolver");
const type_graphql_1 = require("type-graphql");
const data_source_1 = require("./data-source");
const cors_1 = __importDefault(require("cors"));
const ioredis_1 = __importDefault(require("ioredis"));
const main = async () => {
    await data_source_1.AppDataSource.initialize();
    const session = require("express-session");
    const app = (0, express_1.default)();
    let RedisStore = require("connect-redis")(session);
    const redis = new ioredis_1.default();
    app.use((0, cors_1.default)({
        origin: "http://localhost:3000",
        credentials: true,
    }));
    app.use(session({
        name: constants_1.COOKIE_NAME,
        store: new RedisStore({
            client: redis,
            disableTouch: true,
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
            httpOnly: true,
            sameSite: 'lax',
            secure: constants_1.__prod__,
        },
        saveUninitialize: false,
        secret: 'onkcwaonjcaqon',
        resave: false,
    }));
    const apolloServer = new apollo_server_express_1.ApolloServer({
        schema: await (0, type_graphql_1.buildSchema)({
            resolvers: [UserResolver_1.UserResolver, PostResolver_1.PostResolver],
            validate: false
        }),
        context: ({ req, res }) => ({ req, res, redis })
    });
    await apolloServer.start();
    apolloServer.applyMiddleware({
        app,
        cors: false
    });
    app.listen(4000, () => {
        console.log("express server started.");
    });
};
main().catch((err) => {
    console.error(err);
});
//# sourceMappingURL=index.js.map