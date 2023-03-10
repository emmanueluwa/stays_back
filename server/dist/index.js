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
const cors_1 = __importDefault(require("cors"));
const ioredis_1 = __importDefault(require("ioredis"));
const createUserLoader_1 = require("./utils/createUserLoader");
const main = async () => {
    await data_source_1.AppDataSource.initialize();
    await data_source_1.AppDataSource.runMigrations();
    const app = (0, express_1.default)();
    let RedisStore = require("connect-redis")(express_session_1.default);
    const redis = new ioredis_1.default();
    app.set('trust proxy', 1);
    app.use((0, cors_1.default)({
        credentials: true,
        origin: process.env.CORS_ORIGIN
    }));
    app.use((0, express_session_1.default)({
        name: process.env.COOKIE_NAME,
        store: new RedisStore({
            client: redis,
            disableTouch: true,
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
            httpOnly: true,
            sameSite: 'lax',
            secure: constants_1.__prod__,
            domain: constants_1.__prod__ ? ".peteine.com" : undefined,
        },
        saveUninitialized: false,
        secret: process.env.SESSION_SECRET,
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
            origin: [process.env.CORS_ORIGIN],
            credentials: true
        },
    });
    app.listen(parseInt(process.env.PORT), () => {
        console.log("express server started.");
    });
};
main().catch((err) => {
    console.error(err);
});
//# sourceMappingURL=index.js.map