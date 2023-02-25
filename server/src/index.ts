import "dotenv/config";
import "reflect-metadata";
import { __prod__, COOKIE_NAME } from "./constants";
import express from "express";
import { ApolloServer } from 'apollo-server-express';
import { UserResolver } from "./UserResolver";
import { buildSchema } from "type-graphql";
// import { createConnection } from "typeorm";
import { AppDataSource } from "./data-source";
import cookieParser from "cookie-parser";
import { verify } from "jsonwebtoken";
import cors from 'cors';
import Redis from "ioredis";
import { User } from "./entity/User";
import { createAccessToken, createRefreshToken } from "./auth";
import { sendRefreshToken } from "./sendRefreshToken";
import { sendEmail } from "./utils/sendEmail";




(async () => {
    sendEmail("bob@bob.com", "hello there");
    const session = require("express-session");
    const app = express();

    let RedisStore = require("connect-redis")(session)
    const redis = new Redis(); 

    app.use(
        cors({
            origin: "http://localhost:3000",
            credentials: true,
        })
    );

    app.use(
        session({
            name: COOKIE_NAME,
            store: new RedisStore({ 
                client: redis,
                //reduce no. of requests made to redis
                disableTouch: true,
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
                httpOnly: true,
                sameSite: 'lax',  // protecting csrf
                secure: __prod__,  // cookie only works in https
            },
            saveUninitialize: false,
            secret: 'onkcwaonjcaqon',
            resave: false,
        })
    )
    app.use(cookieParser());
    app.get("/", (_req, res) => res.send("obota"));
    app.post("/refresh_token", async (req, res) => {
        const token = req.cookies.jid;

        if (!token) {
            return res.send({ ok: false, accessToken: "no token" });
        }

        let payload: any = null;

        try {
            payload = verify(token, process.env.REFRESH_TOKEN_SECRET!);
        } catch (err) {
            console.log(err);
            return res.send({ ok: false, accessToken: ""});
        }

        // valid token, access token can be sent back
        const user = await User.findOneBy({ id: payload.userId });

        if (!user) {
            return res.send({ ok: false, accessToken: "" });
        }

        if (user.tokenVersion !== payload.tokenVersion) {
            return res.send({ ok: false, accessToken: "" });
        }

        //create new refresh token
        sendRefreshToken(res, createRefreshToken(user))

        return res.send({ ok: true, accessToken: createAccessToken(user) });
    });

    //creating a connection
    await AppDataSource.initialize();

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [UserResolver],
            validate: false
        }),
        context: ({ req, res }) => ({ req, res, redis })
    });

    await apolloServer.start()

    //adding graphql stuff to express server
    apolloServer.applyMiddleware({ 
        app, 
        cors: false 
    });

    app.listen(4000, () => {
        console.log("express server started.")
    })
})()


// AppDataSource.initialize().then(async () => {

//     console.log("Inserting a new user into the database...")
//     const user = new User()
//     user.firstName = "Timber"
//     user.lastName = "Saw"
//     user.age = 25
//     await AppDataSource.manager.save(user)
//     console.log("Saved a new user with id: " + user.id)

//     console.log("Loading users from the database...")
//     const users = await AppDataSource.manager.find(User)
//     console.log("Loaded users: ", users)

//     console.log("Here you can setup and run express / fastify / any other framework.")

// }).catch(error => console.log(error))

