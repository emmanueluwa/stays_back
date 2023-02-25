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
const type_graphql_1 = require("type-graphql");
const data_source_1 = require("./data-source");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const jsonwebtoken_1 = require("jsonwebtoken");
const cors_1 = __importDefault(require("cors"));
const User_1 = require("./entity/User");
const auth_1 = require("./auth");
const sendRefreshToken_1 = require("./sendRefreshToken");
const sendEmail_1 = require("./utils/sendEmail");
(async () => {
    (0, sendEmail_1.sendEmail)("bob@bob.com", "hello there");
    const session = require("express-session");
    const app = (0, express_1.default)();
    let RedisStore = require("connect-redis")(session);
    const { createClient } = require("redis");
    let redisClient = createClient();
    app.use((0, cors_1.default)({
        origin: "http://localhost:3000",
        credentials: true,
    }));
    app.use(session({
        name: constants_1.COOKIE_NAME,
        store: new RedisStore({
            client: redisClient,
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
    app.use((0, cookie_parser_1.default)());
    app.get("/", (_req, res) => res.send("obota"));
    app.post("/refresh_token", async (req, res) => {
        const token = req.cookies.jid;
        if (!token) {
            return res.send({ ok: false, accessToken: "no token" });
        }
        let payload = null;
        try {
            payload = (0, jsonwebtoken_1.verify)(token, process.env.REFRESH_TOKEN_SECRET);
        }
        catch (err) {
            console.log(err);
            return res.send({ ok: false, accessToken: "" });
        }
        const user = await User_1.User.findOneBy({ id: payload.userId });
        if (!user) {
            return res.send({ ok: false, accessToken: "" });
        }
        if (user.tokenVersion !== payload.tokenVersion) {
            return res.send({ ok: false, accessToken: "" });
        }
        (0, sendRefreshToken_1.sendRefreshToken)(res, (0, auth_1.createRefreshToken)(user));
        return res.send({ ok: true, accessToken: (0, auth_1.createAccessToken)(user) });
    });
    await data_source_1.AppDataSource.initialize();
    const apolloServer = new apollo_server_express_1.ApolloServer({
        schema: await (0, type_graphql_1.buildSchema)({
            resolvers: [UserResolver_1.UserResolver]
        }),
        context: ({ req, res }) => ({ req, res })
    });
    await apolloServer.start();
    apolloServer.applyMiddleware({
        app,
        cors: false
    });
    app.listen(4000, () => {
        console.log("express server started.");
    });
})();
//# sourceMappingURL=index.js.map